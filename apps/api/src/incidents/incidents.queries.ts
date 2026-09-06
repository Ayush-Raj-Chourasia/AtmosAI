/**
 * Incidents Query Service
 * Extracted query methods for incident retrieval
 *
 * This service handles all read-only queries for incidents,
 * separating concerns from the main processing service.
 */

import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  Incident,
  IncidentWithCentroid,
  IncidentFeedback,
  LifecycleEvent,
  Signal,
} from './incidents.types';
import {
  transformIncidentWithCentroid,
  getDistanceFromLatLonInM,
  isValidBBox,
} from './incidents.utils';
import { SEISMIC_MIN_RADIUS_M, SEISMIC_EVENT_TYPES } from '../common/constants';

/** Raw incident select query for viewport/nearby */
const INCIDENT_SELECT_QUERY = `
  id,
  status,
  severity,
  event_type,
  confidence_score,
  city,
  summary,
  created_at,
  updated_at,
  incident_signals!inner (
    signals!inner (
      lat,
      lng
    )
  ),
  incident_feedback (
    user_id,
    type,
    users (
      name,
      avatar_url
    )
  )
`;

/** Detailed incident select query */
const INCIDENT_DETAIL_QUERY = `
  *,
  incident_signals (
    signals (
      *
    )
  ),
  verifications (
    type,
    created_at
  ),
  incident_feedback (
    id,
    user_id,
    type,
    comment,
    created_at,
    users (
      name,
      avatar_url
    )
  ),
  incident_lifecycle (
    id,
    to_status,
    changed_by,
    reason,
    created_at
  )
`;

@Injectable()
export class IncidentsQueriesService {
  private get db() {
    return this.supabase.getClient();
  }

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Validate bounding box coordinates
   */
  isValidBBox(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): boolean {
    return isValidBBox(minLat, minLng, maxLat, maxLng);
  }

  /**
   * Get all incidents within a viewport bounding box
   */
  async getIncidentsInViewport(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): Promise<IncidentWithCentroid[]> {
    const { data: incidents, error } = await (this.db as any)
      .from('incidents')
      .select(INCIDENT_SELECT_QUERY)
      .in('status', ['alert', 'monitor', 'resolved']);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // Transform to centroid-based format
    const mapIncidents = (incidents as any[])
      .map((inc) => transformIncidentWithCentroid(inc))
      .filter((inc): inc is IncidentWithCentroid => inc !== null);

    // Check if this is an "All Indonesia" view
    const isIndonesiaView =
      Math.abs(minLat - -11) < 0.1 &&
      Math.abs(maxLat - 6) < 0.1 &&
      Math.abs(minLng - 95) < 0.1 &&
      Math.abs(maxLng - 141) < 0.1;

    // Filter by bounding box
    return mapIncidents.filter((inc) => {
      // Special case: "All Indonesia" shows all ongoing incidents
      if (isIndonesiaView && ['alert', 'monitor'].includes(inc.status)) {
        return true;
      }

      return (
        inc.lat >= minLat &&
        inc.lat <= maxLat &&
        inc.lng >= minLng &&
        inc.lng <= maxLng
      );
    });
  }

  /**
   * Get all incidents within a radius from a point
   * Note: Earthquake and tsunami incidents use a minimum 100km radius
   * to ensure users are aware of seismic events in their wider region
   */
  async getNearbyIncidents(
    lat: number,
    lng: number,
    radiusM: number,
  ): Promise<IncidentWithCentroid[]> {
    const { data: incidents, error } = await (this.db as any)
      .from('incidents')
      .select(INCIDENT_SELECT_QUERY)
      .in('status', ['alert', 'monitor', 'resolved']);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch incidents');
    }

    // Transform and calculate distances
    const candidates = (incidents as any[])
      .map((inc) => transformIncidentWithCentroid(inc))
      .filter((inc): inc is IncidentWithCentroid => inc !== null);

    // Filter by distance and add distance property
    // For seismic events (earthquake/tsunami), use at least 100km radius to ensure wider awareness
    const results = candidates
      .map((inc) => ({
        ...inc,
        distance: getDistanceFromLatLonInM(lat, lng, inc.lat, inc.lng),
      }))
      .filter((inc) => {
        const effectiveRadius = (SEISMIC_EVENT_TYPES as readonly string[]).includes(inc.type)
          ? Math.max(radiusM, SEISMIC_MIN_RADIUS_M)
          : radiusM;
        return inc.distance <= effectiveRadius;
      });

    // Sort by distance
    return results.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
  }

  /**
   * Get a single incident by ID with all related data
   */
  async getIncidentById(id: string): Promise<any> {
    const { data: incident, error } = await (this.db as any)
      .from('incidents')
      .select(INCIDENT_DETAIL_QUERY)
      .eq('id', id)
      .single();

    if (error || !incident) {
      throw new NotFoundException('Incident not found');
    }

    // Transform nested signals structure to flat array
    const flatIncident = {
      ...incident,
      signals: incident.incident_signals.map((is: any) => is.signals),
      lifecycle:
        incident.incident_lifecycle?.sort(
          (a: any, b: any) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ) ?? [],
    };

    delete (flatIncident as any).incident_signals;
    delete (flatIncident as any).incident_lifecycle;

    return flatIncident;
  }

  /**
   * Get signals for an incident
   */
  async getIncidentSignals(incidentId: string): Promise<Signal[]> {
    const { data, error } = await (this.db as any)
      .from('incident_signals')
      .select(
        `
        signals (
          id,
          source,
          text,
          media_url,
          media_type,
          city_hint,
          event_type,
          created_at,
          happened_at
        )
      `,
      )
      .eq('incident_id', incidentId);

    if (error) {
      throw new InternalServerErrorException('Failed to fetch signals');
    }

    return data?.map((is: any) => is.signals) ?? [];
  }

  /**
   * Get lifecycle events for an incident
   */
  async getIncidentLifecycle(incidentId: string): Promise<LifecycleEvent[]> {
    const { data, error } = await (this.db as any)
      .from('incident_lifecycle')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch lifecycle');
    }

    return data ?? [];
  }

  /**
   * Get agent traces for an incident
   */
  async getIncidentTraces(incidentId: string): Promise<any[]> {
    const { data, error } = await (this.db as any)
      .from('agent_traces')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException('Failed to fetch traces');
    }

    return data ?? [];
  }
}
