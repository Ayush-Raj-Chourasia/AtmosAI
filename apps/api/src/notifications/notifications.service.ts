import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { SupabaseService } from '../supabase/supabase.service';
import {
  DEFAULT_NOTIFICATION_RADIUS_M,
  SEISMIC_MIN_RADIUS_M,
  SEISMIC_EVENT_TYPES,
} from '../common/constants';

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface UserPlaceWithPrefs {
  id: string;
  user_id: string;
  lat: number;
  lng: number;
  radius_m: number;
  notify_enabled: boolean | null;
  user_place_preferences: {
    notify_flood?: boolean;
    notify_earthquake?: boolean;
    notify_landslide?: boolean;
    notify_fire?: boolean;
    notify_power_outage?: boolean;
    min_confidence?: number;
  } | null;
}

/**
 * Calculate distance between two points using Haversine formula
 * @returns Distance in meters
 */
function getDistanceFromLatLonInM(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371e3; // Earth's radius in metres
  const deg2rad = (deg: number) => deg * (Math.PI / 180);
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    // Initialize Firebase Admin SDK
    if (!admin.apps.length) {
      const serviceAccountBase64 = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_BASE64');
      
      if (serviceAccountBase64) {
        try {
          const serviceAccount = JSON.parse(
            Buffer.from(serviceAccountBase64, 'base64').toString('utf8')
          );
          
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
          });
          
          this.logger.log('Firebase Admin SDK initialized successfully');
        } catch (error) {
          this.logger.error('Failed to initialize Firebase Admin SDK:', error);
        }
      } else {
        this.logger.warn('FIREBASE_SERVICE_ACCOUNT_BASE64 not configured, push notifications disabled');
      }
    }
  }

  private get db() {
    // Cast to any since push_subscriptions table isn't in generated types yet
    return this.supabase.getClient() as any;
  }

  /**
   * Subscribe a user device to push notifications
   */
  async subscribe(userId: string, fcmToken: string, deviceInfo?: Record<string, any>): Promise<boolean> {
    try {
      const { error } = await this.db
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            fcm_token: fcmToken,
            device_info: deviceInfo,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'fcm_token' }
        );

      if (error) {
        this.logger.error('Failed to subscribe:', error);
        return false;
      }

      this.logger.log(`User ${userId} subscribed to push notifications`);
      return true;
    } catch (error) {
      this.logger.error('Error in subscribe:', error);
      return false;
    }
  }

  /**
   * Unsubscribe a user from push notifications
   */
  async unsubscribe(userId: string): Promise<boolean> {
    try {
      const { error } = await this.db
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        this.logger.error('Failed to unsubscribe:', error);
        return false;
      }

      this.logger.log(`User ${userId} unsubscribed from push notifications`);
      return true;
    } catch (error) {
      this.logger.error('Error in unsubscribe:', error);
      return false;
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: NotificationPayload): Promise<number> {
    const { data: subscriptions } = await this.db
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (!subscriptions?.length) {
      this.logger.debug(`No active subscriptions for user ${userId}`);
      return 0;
    }

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to users in a specific area (by user_places)
   * Only notifies users whose monitored places are within the incident radius
   */
  async sendToUsersInArea(
    incidentLat: number,
    incidentLng: number,
    incidentRadiusM: number,
    payload: NotificationPayload,
    eventType?: string,
    confidence?: number,
  ): Promise<number> {
    this.logger.log(
      `[sendToUsersInArea] Starting geospatial notification for incident at (${incidentLat}, ${incidentLng}), radius: ${incidentRadiusM}m, eventType: ${eventType}`,
    );

    // Find users with active places - include lat/lng for distance calculation
    const { data: userPlaces, error: placesError } = await this.db
      .from('user_places')
      .select(`
        id,
        user_id,
        lat,
        lng,
        radius_m,
        notify_enabled,
        user_place_preferences (
          notify_flood,
          notify_earthquake,
          notify_landslide,
          notify_fire,
          notify_power_outage,
          min_confidence
        )
      `)
      .eq('is_active', true);

    if (placesError) {
      this.logger.error('[sendToUsersInArea] Error fetching user places:', placesError);
      return 0;
    }

    if (!userPlaces?.length) {
      this.logger.debug('[sendToUsersInArea] No active user places found');
      return 0;
    }

    this.logger.debug(`[sendToUsersInArea] Found ${userPlaces.length} active user places to check`);

    // Filter by geospatial distance and preferences
    const eligibleUserIds = new Set<string>();
    const affectedPlaces: Array<{ userId: string; placeId: string; distance: number; label?: string }> = [];

    for (const place of userPlaces as UserPlaceWithPrefs[]) {
      // Skip if notify_enabled is explicitly false
      if (place.notify_enabled === false) {
        this.logger.debug(`[sendToUsersInArea] Skipping place ${place.id} - notifications disabled`);
        continue;
      }

      // Calculate distance between incident and user's place
      const distance = getDistanceFromLatLonInM(
        incidentLat,
        incidentLng,
        place.lat,
        place.lng,
      );

      // Check if the place is within range
      // User is affected if: incident is within their monitoring radius OR they are within incident radius
      const userMonitoringRadius = place.radius_m || 3000; // Default 3km
      const isWithinRange = distance <= Math.max(incidentRadiusM, userMonitoringRadius);

      if (!isWithinRange) {
        this.logger.debug(
          `[sendToUsersInArea] Place ${place.id} too far: ${Math.round(distance)}m (max: ${Math.max(incidentRadiusM, userMonitoringRadius)}m)`,
        );
        continue;
      }

      // Check event type preference
      const prefs = place.user_place_preferences;
      if (eventType && prefs) {
        const prefKey = `notify_${eventType}` as keyof typeof prefs;
        if (prefs[prefKey] === false) {
          this.logger.debug(
            `[sendToUsersInArea] User ${place.user_id} opted out of ${eventType} notifications`,
          );
          continue;
        }

        // Check minimum confidence threshold
        if (confidence !== undefined && prefs.min_confidence !== undefined) {
          if (confidence < prefs.min_confidence) {
            this.logger.debug(
              `[sendToUsersInArea] Skipping user ${place.user_id} - confidence ${confidence} below threshold ${prefs.min_confidence}`,
            );
            continue;
          }
        }
      }

      eligibleUserIds.add(place.user_id);
      affectedPlaces.push({
        userId: place.user_id,
        placeId: place.id,
        distance: Math.round(distance),
      });
    }

    this.logger.log(
      `[sendToUsersInArea] Found ${eligibleUserIds.size} eligible users with ${affectedPlaces.length} affected places`,
    );

    if (eligibleUserIds.size === 0) {
      this.logger.log('[sendToUsersInArea] No users in affected area');
      return 0;
    }

    // Log affected places for debugging
    affectedPlaces.forEach((ap) => {
      this.logger.debug(
        `[sendToUsersInArea] Affected: User ${ap.userId}, Place ${ap.placeId}, Distance: ${ap.distance}m`,
      );
    });

    // Get active FCM tokens for eligible users
    const { data: subscriptions, error: subsError } = await this.db
      .from('push_subscriptions')
      .select('fcm_token, user_id')
      .in('user_id', Array.from(eligibleUserIds))
      .eq('is_active', true);

    if (subsError) {
      this.logger.error('[sendToUsersInArea] Error fetching subscriptions:', subsError);
      return 0;
    }

    if (!subscriptions?.length) {
      this.logger.log(
        `[sendToUsersInArea] No active FCM subscriptions for ${eligibleUserIds.size} eligible users`,
      );
      return 0;
    }

    this.logger.log(
      `[sendToUsersInArea] Sending notifications to ${subscriptions.length} devices for ${eligibleUserIds.size} users`,
    );

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    const successCount = await this.sendToTokens(tokens, payload);

    this.logger.log(
      `[sendToUsersInArea] Notification delivery complete: ${successCount}/${tokens.length} successful`,
    );

    return successCount;
  }

  /**
   * Send push notification to all subscribed users
   */
  async sendToAllUsers(payload: NotificationPayload): Promise<number> {
    const { data: subscriptions } = await this.db
      .from('push_subscriptions')
      .select('fcm_token')
      .eq('is_active', true);

    if (!subscriptions?.length) return 0;

    const tokens = subscriptions.map((s: any) => s.fcm_token);
    return this.sendToTokens(tokens, payload);
  }

  /**
   * Send push notification to multiple tokens
   */
  private async sendToTokens(tokens: string[], payload: NotificationPayload): Promise<number> {
    if (!admin.apps.length) {
      this.logger.warn('Firebase Admin not initialized, skipping push notification');
      return 0;
    }

    if (tokens.length === 0) return 0;

    try {
      const message: admin.messaging.MulticastMessage = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data,
        webpush: {
          fcmOptions: {
            link: payload.data?.link || '/',
          },
          notification: {
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            vibrate: [200, 100, 200],
            requireInteraction: true,
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      this.logger.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed`);

      // Handle invalid tokens
      if (response.failureCount > 0) {
        const invalidTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        });

        if (invalidTokens.length > 0) {
          await this.deactivateTokens(invalidTokens);
        }
      }

      return response.successCount;
    } catch (error) {
      this.logger.error('Error sending push notifications:', error);
      return 0;
    }
  }

  /**
   * Deactivate invalid tokens
   */
  private async deactivateTokens(tokens: string[]): Promise<void> {
    try {
      await this.db
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('fcm_token', tokens);

      this.logger.log(`Deactivated ${tokens.length} invalid FCM tokens`);
    } catch (error) {
      this.logger.error('Error deactivating tokens:', error);
    }
  }

  /**
   * Send notification for a new/updated incident
   * Only notifies users with places in the affected area
   */
  async notifyIncident(incident: {
    id: string;
    city: string;
    event_type: string;
    severity: string;
    status: string;
    summary?: string;
    lat?: number;
    lng?: number;
    confidence?: number;
  }): Promise<number> {
    this.logger.log(
      `[notifyIncident] Processing notification for incident ${incident.id} (${incident.event_type}) in ${incident.city}`,
    );

    const eventTypeLabels: Record<string, string> = {
      flood: '🌊 Flood',
      earthquake: '🌍 Earthquake',
      landslide: '⛰️ Landslide',
      fire: '🔥 Fire',
      power_outage: '💡 Power Outage',
      whirlwind: '🌪️ Whirlwind',
      tornado: '🌪️ Tornado',
      tsunami: '🌊 Tsunami',
      volcano: '🌋 Volcanic Eruption',
      other: '⚠️ Incident',
    };

    const severityLabels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    };

    const title = `${eventTypeLabels[incident.event_type] || '⚠️ Incident'} - ${incident.city}`;
    const body = incident.summary ||
      `${eventTypeLabels[incident.event_type] || 'Incident'} detected in ${incident.city}. Severity: ${severityLabels[incident.severity] || incident.severity}`;

    const payload: NotificationPayload = {
      title,
      body,
      data: {
        incidentId: incident.id,
        eventType: incident.event_type,
        severity: incident.severity,
        city: incident.city,
        link: `/incidents/${incident.id}`,
      },
    };

    // If we have coordinates, notify only users in the affected area
    if (incident.lat && incident.lng) {
      // Use larger radius for seismic events (earthquake/tsunami) as they affect wider areas
      const notificationRadiusM = (SEISMIC_EVENT_TYPES as readonly string[]).includes(incident.event_type)
        ? SEISMIC_MIN_RADIUS_M
        : DEFAULT_NOTIFICATION_RADIUS_M;

      this.logger.log(
        `[notifyIncident] Incident has coordinates (${incident.lat}, ${incident.lng}), sending geospatial notifications with radius ${notificationRadiusM / 1000}km`,
      );

      const successCount = await this.sendToUsersInArea(
        incident.lat,
        incident.lng,
        notificationRadiusM,
        payload,
        incident.event_type,
        incident.confidence,
      );

      this.logger.log(
        `[notifyIncident] Geospatial notification complete for incident ${incident.id}: ${successCount} notifications sent`,
      );

      return successCount;
    }

    // No coordinates - log warning and skip notification
    // We should NOT broadcast to all Indonesia if we don't know the location
    this.logger.warn(
      `[notifyIncident] Incident ${incident.id} has no coordinates - skipping notification (not broadcasting to all users)`,
    );
    return 0;
  }
}
