import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SseService } from '../sse/sse.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SSE_EVENT_TYPES } from '../common/constants';

/**
 * Demo Seed Service
 * Creates realistic disaster scenarios for video demos and presentations.
 * 
 * Usage:
 * - POST /admin/demo/seed - Seeds the database with demo data
 * - POST /admin/demo/reset - Clears all demo data
 * - POST /admin/demo/test-notification - Sends a test push notification
 */
@Injectable()
export class DemoSeedService {
  private readonly logger = new Logger(DemoSeedService.name);

  // Demo data marker - all demo data will have this in raw_payload
  private readonly DEMO_MARKER = 'DEMO_SEED_DATA';

  constructor(
    private readonly supabase: SupabaseService,
    private readonly sseService: SseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private db() {
    return this.supabase.getClient() as any;
  }

  /**
   * Seed database with demo disaster scenario
   */
  async seed() {
    this.logger.log('🎬 Starting Demo Seed...');

    try {
      // Clear any existing demo data first
      await this.reset();

      // Create demo incidents with signals
      const incidents = await this.createDemoIncidents();
      
      // Create verification reports
      await this.createDemoVerifications(incidents);

      // Create agent traces for AI transparency demo
      await this.createDemoTraces(incidents);

      // Emit SSE event to refresh clients
      // this.sseService.emit(SSE_EVENT_TYPES.INCIDENT_UPDATE, {
      //   type: 'demo_seed_complete',
      //   count: incidents.length,
      // });

      this.logger.log(`✅ Demo Seed Complete: ${incidents.length} incidents created`);

      return {
        success: true,
        message: 'Demo data seeded successfully',
        incidents: incidents.map(i => ({
          id: i.id,
          type: i.type,
          city: i.city,
          status: i.status,
        })),
      };
    } catch (error) {
      this.logger.error('❌ Demo Seed Failed:', error);
      throw error;
    }
  }

  /**
   * Reset/clear all demo data
   */
  async reset() {
    this.logger.log('🗑️ Resetting Demo Data...');

    // Delete in order (respecting foreign keys)
    // 1. Agent traces (no FK constraint usually)
    await this.db()
      .from('agent_traces')
      .delete()
      .like('session_id', `${this.DEMO_MARKER}%`);

    // 2. Verifications
    const { data: demoIncidents } = await this.db()
      .from('incidents')
      .select('id')
      .like('summary', `%${this.DEMO_MARKER}%`);

    if (demoIncidents?.length) {
      const incidentIds = demoIncidents.map((i: any) => i.id);
      
      await this.db()
        .from('verifications')
        .delete()
        .in('incident_id', incidentIds);

      // 3. Incident lifecycle
      await this.db()
        .from('incident_lifecycle')
        .delete()
        .in('incident_id', incidentIds);

      // 4. Incident signals
      await this.db()
        .from('incident_signals')
        .delete()
        .in('incident_id', incidentIds);

      // 5. AI evaluations
      await this.db()
        .from('ai_evaluations')
        .delete()
        .in('incident_id', incidentIds);
    }

    // 6. Signals with demo marker
    await this.db()
      .from('signals')
      .delete()
      .like('text', `%${this.DEMO_MARKER}%`);

    // 7. Finally, demo incidents
    await this.db()
      .from('incidents')
      .delete()
      .like('summary', `%${this.DEMO_MARKER}%`);

    this.logger.log('✅ Demo Data Reset Complete');

    return { success: true, message: 'Demo data cleared' };
  }

  /**
   * Create demo incidents with signals
   */
  private async createDemoIncidents() {
    const now = new Date();
    const created: any[] = [];

    // ========================================
    // 1. HIGH SEVERITY: Jakarta Earthquake
    // ========================================
    const earthquakeSignals = await this.createSignals([
      {
        source: 'bmkg',
        text: `[${this.DEMO_MARKER}] BMKG: M6.5 Earthquake in South Jakarta, depth 10km`,
        event_type: 'earthquake',
        city_hint: 'Jakarta',
        lat: -6.2615,
        lng: 106.8106,
      },
      {
        source: 'tiktok',
        text: `[${this.DEMO_MARKER}] Strong earthquake just now! Building shaking hard!`,
        event_type: 'earthquake',
        city_hint: 'Jakarta',
        lat: -6.2088,
        lng: 106.8456,
      },
      {
        source: 'user_report',
        text: `[${this.DEMO_MARKER}] Earthquake felt strong at 20th floor apartment`,
        event_type: 'earthquake',
        city_hint: 'Jakarta',
        lat: -6.2297,
        lng: 106.8295,
      },
      {
        source: 'news',
        text: `[${this.DEMO_MARKER}] Breaking: M6.5 Earthquake shakes Jakarta, residents panic exiting buildings`,
        event_type: 'earthquake',
        city_hint: 'Jakarta',
        lat: -6.1751,
        lng: 106.8650,
      },
    ]);

    const earthquake = await this.createIncident({
      type: 'earthquake',
      city: 'Jakarta',
      status: 'alert',
      severity: 'high',
      confidence_score: 0.95,
      summary: `[${this.DEMO_MARKER}] M6.5 Earthquake shook South Jakarta. Epicenter at 10km depth. Strong vibrations felt in high-rise buildings. No structural damage reported yet.`,
      lat: -6.2615,
      lng: 106.8106,
      signals: earthquakeSignals,
    });
    created.push(earthquake);

    // ========================================
    // 2. MEDIUM SEVERITY: Surabaya Flood
    // ========================================
    const floodSignals = await this.createSignals([
      {
        source: 'user_report',
        text: `[${this.DEMO_MARKER}] Water entered house, 50cm high and rising!`,
        event_type: 'flood',
        city_hint: 'Surabaya',
        lat: -7.2575,
        lng: 112.7521,
      },
      {
        source: 'tiktok',
        text: `[${this.DEMO_MARKER}] Severe flooding in East Surabaya, cars submerged`,
        event_type: 'flood',
        city_hint: 'Surabaya',
        lat: -7.2647,
        lng: 112.7508,
      },
      {
        source: 'news',
        text: `[${this.DEMO_MARKER}] Heavy rain for 3 hours causes flooding in several Surabaya points`,
        event_type: 'flood',
        city_hint: 'Surabaya',
        lat: -7.2504,
        lng: 112.7688,
      },
    ]);

    const flood = await this.createIncident({
      type: 'flood',
      city: 'Surabaya',
      status: 'monitor',
      severity: 'medium',
      confidence_score: 0.82,
      summary: `[${this.DEMO_MARKER}] Floods hit East Surabaya due to heavy rain. Water levels 50-80cm in some locations. Traffic disrupted.`,
      lat: -7.2575,
      lng: 112.7521,
      signals: floodSignals,
    });
    created.push(flood);

    // ========================================
    // 3. LOW SEVERITY: Bandung Fire
    // ========================================
    const fireSignals = await this.createSignals([
      {
        source: 'user_report',
        text: `[${this.DEMO_MARKER}] Fire at Cimahi warehouse, thick smoke visible`,
        event_type: 'fire',
        city_hint: 'Bandung',
        lat: -6.8841,
        lng: 107.5421,
      },
      {
        source: 'tiktok',
        text: `[${this.DEMO_MARKER}] Big fire in West Bandung industrial area`,
        event_type: 'fire',
        city_hint: 'Bandung',
        lat: -6.8850,
        lng: 107.5390,
      },
    ]);

    const fire = await this.createIncident({
      type: 'fire',
      city: 'Bandung',
      status: 'monitor',
      severity: 'low',
      confidence_score: 0.71,
      summary: `[${this.DEMO_MARKER}] Warehouse fire in Cimahi industrial area. Firefighters on site. No casualties.`,
      lat: -6.8841,
      lng: 107.5421,
      signals: fireSignals,
    });
    created.push(fire);

    return created;
  }

  /**
   * Create signals in database
   */
  private async createSignals(signals: any[]) {
    const now = new Date();
    const created: any[] = [];

    for (const signal of signals) {
      const { data, error } = await this.db()
        .from('signals')
        .insert({
          source: signal.source,
          text: signal.text,
          event_type: signal.event_type,
          city_hint: signal.city_hint,
          lat: signal.lat,
          lng: signal.lng,
          status: 'processed',
          location: `POINT(${signal.lng} ${signal.lat})`,
          created_at: new Date(now.getTime() - Math.random() * 3600000).toISOString(),
          raw_payload: { demo: true, marker: this.DEMO_MARKER },
        })
        .select('id')
        .single();

      if (error) {
        this.logger.warn(`Failed to create signal: ${error.message}`);
      } else {
        created.push(data);
      }
    }

    return created;
  }

  /**
   * Create incident with linked signals
   */
  private async createIncident(data: {
    type: string;
    city: string;
    status: string;
    severity: string;
    confidence_score: number;
    summary: string;
    lat: number;
    lng: number;
    signals: any[];
  }) {
    const now = new Date();

    // Create incident
    const { data: incident, error: incidentError } = await this.db()
      .from('incidents')
      .insert({
        type: data.type,
        city: data.city,
        status: data.status,
        severity: data.severity,
        confidence_score: data.confidence_score,
        summary: data.summary,
        centroid: `POINT(${data.lng} ${data.lat})`,
        signal_count: data.signals.length,
        created_at: new Date(now.getTime() - Math.random() * 1800000).toISOString(),
        updated_at: now.toISOString(),
      })
      .select('id, type, city, status, severity, confidence_score')
      .single();

    if (incidentError) {
      this.logger.error(`Failed to create incident: ${incidentError.message}`);
      throw incidentError;
    }

    // Link signals to incident
    for (const signal of data.signals) {
      await this.db()
        .from('incident_signals')
        .insert({
          incident_id: incident.id,
          signal_id: signal.id,
        });
    }

    // Create lifecycle entry
    await this.db()
      .from('incident_lifecycle')
      .insert({
        incident_id: incident.id,
        old_status: null,
        new_status: data.status,
        reason: 'Demo seed: Initial creation',
        created_at: now.toISOString(),
      });

    return incident;
  }

  /**
   * Create demo verifications for incidents
   */
  private async createDemoVerifications(incidents: any[]) {
    const verificationTypes = ['confirm', 'still_happening', 'confirm', 'confirm'];
    
    for (const incident of incidents) {
      // More verifications for higher severity
      const count = incident.severity === 'high' ? 8 : incident.severity === 'medium' ? 5 : 3;
      
      for (let i = 0; i < count; i++) {
        await this.db()
          .from('verifications')
          .insert({
            incident_id: incident.id,
            user_id: null, // Anonymous for demo
            type: verificationTypes[i % verificationTypes.length],
            comment: i === 0 ? 'I saw this incident directly' : null,
            created_at: new Date(Date.now() - Math.random() * 1800000).toISOString(),
          });
      }
    }
  }

  /**
   * Create demo agent traces for AI transparency demo
   */
  private async createDemoTraces(incidents: any[]) {
    for (const incident of incidents) {
      const sessionId = `${this.DEMO_MARKER}_${incident.id}`;
      const now = new Date();

      const traces = [
        {
          step: 'Observer',
          input: { signals_count: incident.signal_count || 3 },
          output: {
            key_observations: [
              `Detected ${incident.type} event in ${incident.city}`,
              'Multiple independent sources reporting',
              'Temporal clustering indicates real-time event',
            ],
            entities_found: [incident.city, incident.type],
          },
        },
        {
          step: 'Classifier',
          input: { observations: 'Observer output' },
          output: {
            event_type: incident.type,
            event_type_confidence: 0.92,
            alternative_types: [],
          },
        },
        {
          step: 'Skeptic',
          input: { hypotheses: 'Classifier output' },
          output: {
            challenges: [
              'Checked for old footage reposting - PASSED',
              'Checked for duplicate sources - PASSED',
              'Verified geographic consistency - PASSED',
            ],
            credibility_score: 0.88,
            concerns: [],
          },
        },
        {
          step: 'Synthesizer',
          input: { critique: 'Skeptic output' },
          output: {
            summary: incident.summary?.replace(`[${this.DEMO_MARKER}] `, ''),
            confidence_score: incident.confidence_score,
            severity: incident.severity,
          },
        },
        {
          step: 'Action',
          input: { conclusion: 'Synthesizer output' },
          output: {
            action: 'CREATE_INCIDENT',
            recommended_status: incident.status,
            reasoning: `Confidence ${(incident.confidence_score * 100).toFixed(0)}% exceeds threshold. Multi-vector confirmation from ${incident.signal_count || 3} sources.`,
          },
        },
      ];

      for (let i = 0; i < traces.length; i++) {
        const trace = traces[i];
        await this.db()
          .from('agent_traces')
          .insert({
            session_id: sessionId,
            incident_id: incident.id,
            step: trace.step,
            input_context: trace.input,
            output_result: trace.output,
            model_used: 'gemini-3-pro',
            created_at: new Date(now.getTime() + i * 1000).toISOString(),
          });
      }
    }
  }

  /**
   * Send a test push notification
   * If userId is provided, sends to that user only.
   * Otherwise sends to all subscribed users.
   */
  async testPushNotification(options?: {
    userId?: string;
    title?: string;
    body?: string;
    eventType?: string;
  }) {
    this.logger.log('🔔 Sending Test Push Notification...');

    const title = options?.title || '🚨 Test Notification';
    const body = options?.body || 'This is a test notification from Disaster Pulse. If you see this, push notifications are working!';
    const eventType = options?.eventType || 'flood';

    try {
      const dummyIncidentId = '00000000-0000-0000-0000-000000000000';
      const link = `/incidents/${dummyIncidentId}`;

      let sentCount = 0;

      if (options?.userId) {
        // Send to specific user
        sentCount = await this.notificationsService.sendToUser(options.userId, {
          title,
          body,
          data: {
            type: 'test',
            event_type: eventType,
            timestamp: new Date().toISOString(),
            incidentId: dummyIncidentId,
            link,
          },
        });
        this.logger.log(`✅ Test notification sent to user ${options.userId}`);
      } else {
        // Send to all subscribed users
        sentCount = await this.notificationsService.sendToAllUsers({
          title,
          body,
          data: {
            type: 'test',
            event_type: eventType,
            timestamp: new Date().toISOString(),
            incidentId: dummyIncidentId,
            link,
          },
        });
        this.logger.log(`✅ Test notification sent to ${sentCount} device(s)`);
      }

      return {
        success: true,
        message: `Test notification sent successfully`,
        sentCount,
        payload: { title, body, eventType },
      };
    } catch (error) {
      this.logger.error('❌ Failed to send test notification:', error);
      throw error;
    }
  }

  /**
   * Send a simulated incident alert notification
   * Creates a realistic notification that mimics a real disaster alert
   */
  async testIncidentNotification(options?: {
    userId?: string;
    eventType?: 'earthquake' | 'flood' | 'fire' | 'landslide' | 'volcano';
    severity?: 'low' | 'medium' | 'high';
    city?: string;
  }) {
    this.logger.log('🚨 Sending Test Incident Notification...');

    const eventType = options?.eventType || 'earthquake';
    const severity = options?.severity || 'high';
    const city = options?.city || 'Jakarta';

    const eventNames: Record<string, string> = {
      earthquake: '🌍 Earthquake',
      flood: '🌊 Flood',
      fire: '🔥 Fire',
      landslide: '⛰️ Landslide',
      volcano: '🌋 Volcanic Eruption',
    };

    const severityLabels: Record<string, string> = {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
    };

    const title = `${eventNames[eventType]} - ${city}`;
    const body = `${eventNames[eventType]} detected in ${city}. Severity: ${severityLabels[severity] || severity}`;

    try {
      // Try to find a real incident for the link, otherwise use dummy
      const { data: latestIncident } = await this.db()
        .from('incidents')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const incidentId = latestIncident?.id || '00000000-0000-0000-0000-000000000000';
      const link = `/incidents/${incidentId}`;

      let sentCount = 0;

      if (options?.userId) {
        sentCount = await this.notificationsService.sendToUser(options.userId, {
          title,
          body,
          data: {
            type: 'incident_alert',
            event_type: eventType,
            severity,
            city,
            timestamp: new Date().toISOString(),
            incidentId,
            link,
          },
        });
      } else {
        sentCount = await this.notificationsService.sendToAllUsers({
          title,
          body,
          data: {
            type: 'incident_alert',
            event_type: eventType,
            severity,
            city,
            timestamp: new Date().toISOString(),
            incidentId,
            link,
          },
        });
      }

      this.logger.log(`✅ Incident notification sent to ${sentCount} device(s)`);

      return {
        success: true,
        message: `Incident notification sent successfully`,
        sentCount,
        payload: { title, body, eventType, severity, city },
      };
    } catch (error) {
      this.logger.error('❌ Failed to send incident notification:', error);
      throw error;
    }
  }
}
