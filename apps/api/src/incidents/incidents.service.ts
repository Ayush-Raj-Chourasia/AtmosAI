/**
 * Incidents Service
 * Core service for incident processing, creation, merging, and lifecycle management.
 *
 * Responsibilities:
 * - Signal processing and routing
 * - Incident creation and merging
 * - AI reasoning integration
 * - Resolution and lifecycle management
 * - Notification triggers
 *
 * Query methods are delegated to IncidentsQueriesService.
 */

import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

// Internal modules
import { SupabaseService } from '../supabase/supabase.service';
import { SseService } from '../sse/sse.service';
import { ReasoningService } from '../reasoning/reasoning.service';
import { IncidentResolutionAgent } from '../reasoning/agents/incident-resolution.agent';
import { LocationMatcherAgent } from '../reasoning/agents/location-matcher.agent';
import { NotificationsService } from '../notifications/notifications.service';
import { RemoteConfigService } from '../config/remote-config.service';

// Lib utilities
import { reverseGeocodeCity } from '../lib/reverseGeocoding';
import { determineStatus } from '../lib/determineStatus';

// Shared constants
import {
  MAX_SIGNAL_AGE,
  THRESHOLDS,
  INCIDENT_CONFIG,
  SSE_EVENT_TYPES,
  RESOLUTION_SILENCE_HOURS,
  shouldBypassReasoning,
} from '../common/constants';
import {
  SOURCE_WEIGHTS,
  DEFAULT_SOURCE_WEIGHT,
  isOfficialSource,
  getSourceWeight,
} from '../common/source-weights';

// Types
import {
  Signal,
  Incident,
  IncidentStatus,
  Severity,
  EventType,
  ReasoningResult,
  CachedReasoning,
  BatchEvaluationResult,
  IncidentUpdatePayload,
  IncidentWithCentroid,
} from './incidents.types';

// Utilities
import {
  sortSignalsByTime,
  getSignalTime,
  filterFreshSignals,
  calculateCentroid,
  getDistanceFromLatLonInM,
  isValidBBox,
  transformIncidentWithCentroid,
  calculateIncrementalConfidenceBonus,
  clusterCity,
} from './incidents.utils';

// Queries service
import { IncidentsQueriesService } from './incidents.queries';

@Injectable()
export class IncidentsService {
  private readonly logger = new Logger(IncidentsService.name);

  private get db() {
    return this.supabase.getClient() as any;
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly reasoningService: ReasoningService,
    private readonly resolutionAgent: IncidentResolutionAgent,
    private readonly locationMatcherAgent: LocationMatcherAgent,
    private readonly sseService: SseService,
    private readonly notificationsService: NotificationsService,
    private readonly remoteConfig: RemoteConfigService,
    private readonly queriesService: IncidentsQueriesService,
  ) { }

  // ============================================================
  // SIGNAL PROCESSING
  // ============================================================

  /**
   * Main entry point for processing a single new signal.
   * Invoked by IncidentProcessor.
   *
   * @param signalId - UUID of the signal to process
   * @param lat - Latitude of the signal
   * @param lng - Longitude of the signal
   * @param happenedAt - Optional timestamp when the event occurred
   */
  async processSignal(
    signalId: string,
    lat: number,
    lng: number,
    happenedAt?: string,
  ): Promise<void> {
    this.logger.debug(
      `Processing signal ${signalId} at ${lat}, ${lng} (HappenedAt: ${happenedAt})`,
    );

    try {
      // 1. Fetch and validate signal
      const signal = await this.fetchAndValidateSignal(signalId);
      if (!signal) return;

      // 2. Reverse geocode to get city
      const city = await this.geocodeAndUpdateSignal(signal, lat, lng, happenedAt);

      // 3. Route signal to existing incident or create new
      const resolvedCity = clusterCity(city ?? signal.city_hint);
      const eventType = signal.event_type ?? 'other';
      const activeIncident = await this.findActiveIncident(resolvedCity, eventType);

      if (activeIncident) {
        // Verify location matches before merging (uses AI comparison)
        const shouldMerge = await this.shouldMergeToIncident(signal, activeIncident, resolvedCity);
        if (shouldMerge) {
          await this.mergeSignalToIncident(signal, activeIncident, resolvedCity);
        } else {
          this.logger.log(
            `Signal ${signal.id} location "${signal.city_hint}" doesn't match incident ${activeIncident.id} city "${activeIncident.city}", creating new incident`,
          );
          await this.tryCreateNewIncident(signal, resolvedCity, eventType);
        }
      } else {
        await this.tryCreateNewIncident(signal, resolvedCity, eventType);
      }

      // 4. Mark as processed
      await this.markSignalStatus(signalId, 'processed');
    } catch (error) {
      this.logger.error(`Error processing signal ${signalId}:`, error);
      await this.markSignalStatus(signalId, 'failed').catch((e) =>
        this.logger.error('Failed to mark signal as failed', e),
      );
      throw error;
    }
  }

  /**
   * Fetch signal from database and validate it's ready for processing
   */
  private async fetchAndValidateSignal(signalId: string): Promise<Signal | null> {
    const { data: signal, error } = await this.db
      .from('signals')
      .select('*')
      .eq('id', signalId)
      .single();

    if (error || !signal) {
      this.logger.error(`Signal ${signalId} not found or error fetching:`, error);
      return null;
    }

    if (signal.status === 'processed') {
      this.logger.debug(`Signal ${signalId} already processed. Skipping.`);
      return null;
    }

    // Check if already linked to an incident
    const { data: existingLink } = await this.db
      .from('incident_signals')
      .select('incident_id')
      .eq('signal_id', signalId)
      .maybeSingle();

    if (existingLink) {
      this.logger.debug(
        `Signal ${signalId} already linked to incident ${existingLink.incident_id}. Skipping.`,
      );
      await this.markSignalStatus(signalId, 'processed');
      return null;
    }

    return signal as Signal;
  }

  /**
   * Reverse geocode signal location and update database
   */
  private async geocodeAndUpdateSignal(
    signal: Signal,
    lat: number,
    lng: number,
    happenedAt?: string,
  ): Promise<string | null> {
    const city = await reverseGeocodeCity(lat, lng);

    if (city) {
      const updateData: Partial<Signal> = { city_hint: city };

      // Ensure happened_at is set if provided
      if (happenedAt && !signal.happened_at) {
        updateData.happened_at = happenedAt;
        signal.happened_at = happenedAt;
      }

      await this.db.from('signals').update(updateData).eq('id', signal.id);
      signal.city_hint = city;
    }

    return city;
  }

  /**
   * Update signal status in database
   */
  private async markSignalStatus(
    signalId: string,
    status: 'processed' | 'failed',
  ): Promise<void> {
    await this.db.from('signals').update({ status }).eq('id', signalId);
  }

  /**
   * Find active (non-resolved) incident in city for event type
   */
  private async findActiveIncident(
    city: string,
    eventType: string,
  ): Promise<Incident | null> {
    const query = this.db
      .from('incidents')
      .select('id, city, status, time_start, time_end, event_type, severity, confidence_score')
      .eq('city', city)
      .neq('status', 'resolved');

    // Only filter by event_type if it's specific
    if (eventType !== 'other') {
      query.eq('event_type', eventType);
    }

    const { data, error } = await query
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) {
      this.logger.error(`Error finding active incident in ${city}:`, error);
      return null;
    }

    return data?.[0] ?? null;
  }

  // ============================================================
  // SIGNAL MERGING
  // ============================================================

  /**
   * Check if a signal should be merged into an existing incident
   * Uses AI to validate that the signal's location matches the incident's location
   */
  private async shouldMergeToIncident(
    signal: Signal,
    incident: Incident,
    signalCity: string,
  ): Promise<boolean> {
    // Quick check: if clustered cities match exactly, proceed
    if (signalCity === incident.city) {
      this.logger.debug(`City exact match: "${signalCity}"`);
    } else {
      // Use AI to compare locations when clustered names differ
      const isSameLocation = await this.compareLocationsWithAI(
        signal.city_hint ?? signalCity,
        incident.city,
      );

      if (!isSameLocation) {
        this.logger.debug(
          `AI determined locations are different: signal "${signal.city_hint}" vs incident "${incident.city}"`,
        );
        return false;
      }

      this.logger.debug(
        `AI confirmed same location: signal "${signal.city_hint}" ≈ incident "${incident.city}"`,
      );
    }

    // Event type should match (unless incident is 'other')
    const signalEventType = signal.event_type ?? 'other';
    if (incident.event_type !== 'other' && signalEventType !== 'other') {
      if (signalEventType !== incident.event_type) {
        this.logger.debug(
          `Event type mismatch: signal "${signalEventType}" vs incident "${incident.event_type}"`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * Use LocationMatcherAgent to compare two location strings and determine if they refer to the same area
   * Handles variations like "Jakarta Selatan" vs "South Jakarta", formatted addresses, etc.
   */
  private async compareLocationsWithAI(
    location1: string,
    location2: string,
  ): Promise<boolean> {
    try {
      const { result } = await this.locationMatcherAgent.run({
        location1,
        location2,
      });

      this.logger.debug(
        `LocationMatcherAgent: "${location1}" vs "${location2}" => ${result.same_location} (${result.reason})`,
      );

      return result.same_location === true;
    } catch (error: any) {
      this.logger.error('LocationMatcherAgent failed:', error?.message || error);
      // Fallback to strict string comparison on error
      return clusterCity(location1) === clusterCity(location2);
    }
  }

  /**
   * Merge a signal into an existing incident
   * Uses incremental confidence update (no AI call) for efficiency
   */
  private async mergeSignalToIncident(
    signal: Signal,
    incident: Incident,
    signalCity: string,
  ): Promise<void> {
    this.logger.log(
      `Merging signal ${signal.id} (city: ${signalCity}) into incident ${incident.id} (city: ${incident.city})`,
    );

    // 1. Link signal to incident
    const { error: linkError } = await this.db
      .from('incident_signals')
      .upsert(
        { incident_id: incident.id, signal_id: signal.id },
        { onConflict: 'incident_id, signal_id', ignoreDuplicates: true },
      );

    if (linkError) {
      this.logger.error(
        `Failed to link signal ${signal.id} to incident ${incident.id}:`,
        linkError,
      );
      return;
    }

    // 2. Calculate incremental confidence update
    const { newConfidence, newSignalCount, incrementalBonus } =
      this.calculateIncrementalUpdate(signal, incident);

    // 3. Check if this is an URGENT signal (bypass batch)
    const isUrgent = this.checkSignalUrgency(signal, incident.confidence_score, newConfidence);

    this.logger.debug(
      `Incremental update for ${incident.id}: ` +
      `confidence ${incident.confidence_score.toFixed(2)} → ${newConfidence.toFixed(2)} ` +
      `(+${incrementalBonus.toFixed(3)} from ${signal.source}), urgent=${isUrgent}`,
    );

    // 4. Update incident with incremental changes
    const signalTime = getSignalTime(signal);
    await this.db
      .from('incidents')
      .update({
        time_end: signalTime > incident.time_end ? signalTime : incident.time_end,
        confidence_score: newConfidence,
        signal_count: newSignalCount,
        // Only mark for full eval if signal is urgent - reduces batch cron LLM calls
        needs_full_eval: isUrgent,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident.id);

    // 5. Notify frontend via SSE
    this.emitIncidentUpdate({
      id: incident.id,
      confidence_score: newConfidence,
      signal_count: newSignalCount,
      updated_at: new Date().toISOString(),
      incremental: true,
    });

    // 6. Handle urgent vs deferred evaluation
    if (isUrgent) {
      this.logger.log(
        `⚡ Urgent signal detected (${signal.source}), triggering immediate AI evaluation`,
      );
      await this.evaluateIncidentState(incident.id, {
        ...incident,
        confidence_score: newConfidence,
      });
    } else {
      this.logger.debug(
        `📋 Non-urgent signal, deferring AI evaluation to batch cron`,
      );
    }
  }

  /**
   * Calculate incremental confidence update for signal merge
   */
  private calculateIncrementalUpdate(
    signal: Signal,
    incident: Incident,
  ): { newConfidence: number; newSignalCount: number; incrementalBonus: number } {
    const sourceWeight = getSourceWeight(signal.source);
    const oldConfidence = incident.confidence_score ?? 0.5;
    const oldSignalCount = incident.signal_count ?? 1;

    // Diminishing returns formula
    const incrementalBonus = calculateIncrementalConfidenceBonus(
      oldConfidence,
      sourceWeight,
    );
    const newConfidence = Math.min(oldConfidence + incrementalBonus, 1.0);

    return {
      newConfidence,
      newSignalCount: oldSignalCount + 1,
      incrementalBonus,
    };
  }

  /**
   * Check if signal warrants immediate AI evaluation (bypassing batch)
   */
  private checkSignalUrgency(
    signal: Signal,
    oldConfidence: number,
    newConfidence: number,
  ): boolean {
    // OPTIMIZED: Removed isOfficialSource check - trusted sources already bypass reasoning
    // on creation. Re-triggering AI on every official signal merge was causing excess calls.
    const isHighSeverity = (signal.raw_payload as Record<string, any>)?.ai_analysis?.severity === 'high';
    const crossedAlertThreshold =
      newConfidence >= THRESHOLDS.ALERT_CONFIDENCE &&
      oldConfidence < THRESHOLDS.ALERT_CONFIDENCE;

    // Only trigger immediate AI eval for truly urgent cases:
    // 1. High severity signals (e.g., mass casualty, critical infrastructure)
    // 2. Crossing alert threshold (needs status upgrade decision)
    return isHighSeverity || crossedAlertThreshold;
  }

  // ============================================================
  // INCIDENT CREATION
  // ============================================================

  /**
   * Attempt to create a new incident from signal
   * Requires minimum signals threshold or trusted source to proceed
   */
  private async tryCreateNewIncident(
    signal: Signal,
    city: string,
    eventType: string,
  ): Promise<void> {
    if (eventType === 'other') {
      this.logger.debug(`Skipping incident creation for type 'other' (Signal ${signal.id})`);
      return;
    }

    // 1. Find candidate signals in same city
    const unlinkedSignals = await this.findCandidateSignals(signal, city);

    // 2. Check trusted source bypass (skip LLM for verified sources)
    const isTrustedSource = shouldBypassReasoning(signal.source, eventType);

    // 3. Not enough signals and not trusted - wait for more
    if (
      unlinkedSignals.length < INCIDENT_CONFIG.MIN_SIGNALS_FOR_INCIDENT &&
      !isTrustedSource
    ) {
      this.logger.debug(
        `Signal ${signal.id} waiting for more corroboration (${unlinkedSignals.length}/${INCIDENT_CONFIG.MIN_SIGNALS_FOR_INCIDENT} signals in ${city})`,
      );
      return;
    }

    let reasoningResult: ReasoningResult;

    // 4. Either use default for trusted sources or run reasoning loop
    const result = await this.runReasoningForCreation(unlinkedSignals, city);
    if (!result) return;
    reasoningResult = result;

    // 5. Create incident with reasoning result
    const newIncident = await this.createIncidentFromSignals(
      unlinkedSignals,
      city,
      eventType,
      reasoningResult,
    );
    if (!newIncident) return;

    // 6. Link signals and send notifications
    await this.finalizeIncidentCreation(newIncident, unlinkedSignals, reasoningResult);
  }

  /**
   * Create default reasoning result for trusted sources (no LLM call)
   * For BMKG signals, checks bmkg_category in raw_payload to determine severity:
   * - 'alert' (M >= 5.0) → severity: 'high', status: 'alert'
   * - 'monitor' (felt earthquakes) → severity: 'medium', status: 'monitor'
   */
  private createDefaultReasoningResult(
    signals: Signal[],
    eventType: string,
    triggerSignal?: Signal,
  ): ReasoningResult {
    // Check for BMKG category in trigger signal's raw_payload
    const bmkgCategory = triggerSignal?.raw_payload?.bmkg_category as string | undefined;

    // Determine severity based on BMKG category or default to high for trusted sources
    let severity: Severity = 'high';
    let description = `Official ${eventType} report`;

    if (bmkgCategory === 'monitor') {
      severity = 'medium';
      description = `BMKG felt earthquake report (monitor)`;
    } else if (bmkgCategory === 'alert') {
      severity = 'high';
      description = `BMKG significant earthquake alert (M >= 5.0)`;
    }

    return {
      conclusion: {
        final_classification: eventType,
        severity,
        confidence_score: 0.95, // High confidence for official sources
        description,
      },
      decision: {
        action: 'CREATE_INCIDENT',
        reason: bmkgCategory
          ? `Trusted BMKG source (category: ${bmkgCategory})`
          : 'Trusted official source bypass',
      },
      sessionId: '',
      multiVector: {
        sourceBreakdown: {
          official: signals.length,
          user_report: 0,
          social_media: 0,
          news: 0,
          total: signals.length,
          unique_sources: [...new Set(signals.map(s => s.source))],
        },
        diversityBonus: 0.1,
        categoryCount: 1,
        hasOfficialSource: true,
      },
    };
  }

  /**
   * Find unlinked signals in the same city
   */
  private async findCandidateSignals(
    signal: Signal,
    city: string,
  ): Promise<Signal[]> {
    const { data: candidates, error } = await this.db
      .from('signals')
      .select('id, city_hint, created_at, happened_at, source, text, lat, lng')
      .eq('city_hint', city)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error || !candidates) return [signal];

    // Filter out already linked signals
    const candidateIds = candidates.map((c: Signal) => c.id);
    const { data: alreadyLinked } = await this.db
      .from('incident_signals')
      .select('signal_id')
      .in('signal_id', candidateIds);

    const linkedSet = new Set(alreadyLinked?.map((al: any) => al.signal_id) ?? []);
    const unlinkedSignals = candidates.filter((c: Signal) => !linkedSet.has(c.id));

    // Ensure current signal is included
    if (!unlinkedSignals.find((s: Signal) => s.id === signal.id)) {
      unlinkedSignals.push(signal);
    }

    return unlinkedSignals;
  }

  /**
   * Run AI reasoning loop and check for CREATE decision
   */
  private async runReasoningForCreation(
    signals: Signal[],
    city: string,
  ): Promise<ReasoningResult | null> {
    try {
      this.logger.log(
        `Running Reasoning Loop for potential incident in ${city} (${signals.length} signals)...`,
      );

      const reasoningSignals = signals.map((s) => ({
        source: s.source,
        text: s.text ?? '',
        created_at: s.created_at,
      }));

      const result = await this.reasoningService.runReasoningLoop(reasoningSignals, []);

      this.logger.log(
        `Action Strategy Decision: ${result.decision.action} (Reason: ${result.decision.reason})`,
      );

      if (result.decision.action === 'WAIT_FOR_MORE_DATA') {
        this.logger.log(`Aborting incident creation: Waiting for more data.`);
        return null;
      }

      if (result.decision.action === 'DISMISS') {
        this.logger.log(`Aborting incident creation: Dismissed as benign/noise.`);
        return null;
      }

      return result as ReasoningResult;
    } catch (err) {
      this.logger.error(`Reasoning Loop failed, aborting incident creation:`, err);
      // Fail safe: don't create incidents when reasoning fails
      // Signals remain pending and will be retried on next cron run
      return null;
    }
  }

  /**
   * Create incident record in database
   */
  private async createIncidentFromSignals(
    signals: Signal[],
    city: string,
    eventType: string,
    reasoningResult: ReasoningResult,
  ): Promise<{ id: string } | null> {
    const sortedSignals = sortSignalsByTime(signals);
    const timeStart = getSignalTime(sortedSignals[0]);
    const timeEnd = getSignalTime(sortedSignals[sortedSignals.length - 1]);

    const { conclusion, decision, multiVector } = reasoningResult;

    // Check for BMKG category override in signals
    const bmkgSignal = signals.find(s => s.source === 'bmkg' && s.raw_payload?.bmkg_category);
    const bmkgCategory = bmkgSignal?.raw_payload?.bmkg_category as string | undefined;

    let initialStatus: 'monitor' | 'alert';

    if (bmkgCategory) {
      // BMKG signals: use category directly for status
      // 'alert' (M >= 5.0) → status 'alert'
      // 'monitor' (felt earthquakes) → status 'monitor'
      initialStatus = bmkgCategory === 'alert' ? 'alert' : 'monitor';
      this.logger.log(`BMKG category override: ${bmkgCategory} → status: ${initialStatus}`);
    } else {
      // Standard logic for non-BMKG signals
      const shouldAlert =
        decision.action === 'CREATE_INCIDENT' ||
        decision.action === 'MERGE_INCIDENT' ||
        conclusion.severity === 'high';

      initialStatus = shouldAlert
        ? determineStatus({
          signalCount: signals.length,
          confidence: conclusion.confidence_score,
          severity: conclusion.severity,
        })
        : 'monitor';
    }

    this.logger.log(
      `Creating NEW Incident in ${city} for ${eventType} with ${signals.length} signals`,
    );

    const { data: newIncident, error } = await this.db
      .from('incidents')
      .insert({
        city,
        event_type: conclusion.final_classification || eventType,
        time_start: timeStart,
        time_end: timeEnd,
        status: initialStatus,
        confidence_score: conclusion.confidence_score,
        severity: conclusion.severity,
        summary: conclusion.description ?? null,
        signal_count: signals.length,
        needs_full_eval: !reasoningResult.sessionId,
        last_evaluated_at: reasoningResult.sessionId ? new Date().toISOString() : null,
        cached_reasoning: reasoningResult.sessionId
          ? {
            conclusion,
            decision,
            multiVector,
            signal_count: signals.length,
            evaluated_at: new Date().toISOString(),
          }
          : null,
      })
      .select('id')
      .single();

    if (error || !newIncident) {
      this.logger.error('Failed to create incident:', error);
      return null;
    }

    return newIncident;
  }

  /**
   * Finalize incident creation: link signals, log lifecycle, send notifications
   */
  private async finalizeIncidentCreation(
    incident: { id: string },
    signals: Signal[],
    reasoningResult: ReasoningResult,
  ): Promise<void> {
    const { conclusion, decision } = reasoningResult;

    // Update agent traces with incident ID
    if (reasoningResult.sessionId) {
      await this.reasoningService.updateTracesIncidentId(
        reasoningResult.sessionId,
        incident.id,
      );
    }

    const initialStatus = conclusion.severity === 'high' ? 'alert' : 'monitor';

    this.logger.log(
      `✅ Created incident ${incident.id} (confidence: ${conclusion.confidence_score?.toFixed(2) ?? 'N/A'}, status: ${initialStatus})`,
    );

    // Emit SSE event
    this.sseService.addEvent({
      data: {
        id: incident.id,
        event_type: conclusion.final_classification,
        status: initialStatus,
        confidence_score: conclusion.confidence_score,
        severity: conclusion.severity,
        summary: conclusion.description,
      },
      type: SSE_EVENT_TYPES.INCIDENT_CREATED,
    } as MessageEvent);

    // Link signals
    const links = signals.map((s) => ({
      incident_id: incident.id,
      signal_id: s.id,
    }));
    await this.db.from('incident_signals').insert(links);

    // Log lifecycle event
    await this.logLifecycleEvent(
      incident.id,
      null,
      initialStatus as IncidentStatus,
      'system',
      `Initial creation from ${signals.length} signals (AI: ${decision.action})`,
    );

    // Calculate centroid for notifications
    const centroid = calculateCentroid(
      signals.map((s) => ({ lat: s.lat, lng: s.lng })),
    );

    // Send push notification to users with places in affected area
    await this.notificationsService.notifyIncident({
      id: incident.id,
      city: signals[0]?.city_hint ?? '',
      event_type: conclusion.final_classification ?? 'other',
      severity: conclusion.severity,
      status: initialStatus,
      summary: conclusion.description,
      lat: centroid.lat,
      lng: centroid.lng,
      confidence: conclusion.confidence_score,
    });
  }

  // ============================================================
  // AI EVALUATION
  // ============================================================

  /**
   * Run full AI evaluation on an incident
   */
  private async evaluateIncidentState(
    incidentId: string,
    currentIncident: Incident | null,
  ): Promise<void> {
    this.logger.log(`Evaluating state for Incident ${incidentId}...`);

    // Get event type
    const eventType = await this.resolveEventType(incidentId, currentIncident);

    // Fetch fresh signals
    const signalsContext = await this.fetchFreshSignalsForIncident(
      incidentId,
      eventType,
    );
    if (signalsContext.length === 0) {
      this.logger.debug(
        `No fresh signals for ${eventType} in incident ${incidentId}. Skipping reasoning.`,
      );
      return;
    }

    // Run AI reasoning
    const reasoningResult = await this.reasoningService.runReasoningLoop(
      signalsContext,
      currentIncident ? [currentIncident as any] : [],
      incidentId,
    );

    const { conclusion, decision, multiVector } = reasoningResult;

    // Apply updates based on whether incident exists
    if (currentIncident) {
      await this.applyReasoningToExistingIncident(
        currentIncident,
        conclusion,
        decision,
        multiVector,
        signalsContext.length,
      );
    } else {
      await this.applyReasoningToNewIncident(
        incidentId,
        eventType,
        signalsContext.length,
        conclusion,
        decision,
        multiVector,
      );
    }
  }

  /**
   * Resolve event type for an incident
   */
  private async resolveEventType(
    incidentId: string,
    currentIncident: Incident | null,
  ): Promise<string> {
    if (currentIncident?.event_type) {
      return currentIncident.event_type;
    }

    const { data: incident } = await this.db
      .from('incidents')
      .select('event_type')
      .eq('id', incidentId)
      .single();

    return incident?.event_type ?? 'other';
  }

  /**
   * Fetch fresh signals for an incident (filtered by age)
   */
  private async fetchFreshSignalsForIncident(
    incidentId: string,
    eventType: string,
  ): Promise<Array<{ source: string; text: string; created_at: string }>> {
    const { data: signalsData, error } = await this.db
      .from('incident_signals')
      .select('signals(source, text, created_at, happened_at)')
      .eq('incident_id', incidentId)
      .order('signals(created_at)', { ascending: false } as any)
      .limit(50);

    if (error) {
      this.logger.error('Error fetching signals:', error);
      return [];
    }

    let signals = signalsData?.map((s: any) => s.signals) ?? [];

    // Filter by age
    const maxAgeHours = MAX_SIGNAL_AGE[eventType] ?? MAX_SIGNAL_AGE['other'];
    const now = Date.now();

    signals = signals.filter((s: any) => {
      const eventTime = s.happened_at
        ? new Date(s.happened_at).getTime()
        : new Date(s.created_at).getTime();
      const ageHours = (now - eventTime) / (1000 * 60 * 60);
      return ageHours <= maxAgeHours;
    });

    return signals;
  }

  /**
   * Apply reasoning result to existing incident
   */
  private async applyReasoningToExistingIncident(
    incident: Incident,
    conclusion: any,
    decision: any,
    multiVector: any,
    signalCount: number,
  ): Promise<void> {
    const newSeverity = conclusion.severity;
    const newConfidence = conclusion.confidence_score;
    const newEventType = conclusion.final_classification;

    const severityChanged = newSeverity !== incident.severity;
    const confidenceChanged =
      Math.abs(newConfidence - incident.confidence_score) >
      THRESHOLDS.SIGNIFICANT_CONFIDENCE_CHANGE;

    // Check event type change
    const validTypes: EventType[] = [
      'flood',
      'landslide',
      'fire',
      'earthquake',
      'whirlwind',
      'tornado',
      'volcano',
      'tsunami',
      'other',
    ];
    let eventTypeChanged = false;
    let targetEventType = incident.event_type;

    if (validTypes.includes(newEventType) && newEventType !== incident.event_type) {
      if (incident.event_type === 'other' || newEventType !== 'other') {
        eventTypeChanged = true;
        targetEventType = newEventType;
      }
    }

    if (severityChanged || confidenceChanged || eventTypeChanged) {
      this.logger.log(
        `Updating Incident ${incident.id}: Type ${incident.event_type}->${targetEventType}, Sev ${incident.severity}->${newSeverity}`,
      );

      const { error } = await this.db
        .from('incidents')
        .update({
          event_type: targetEventType,
          severity: newSeverity,
          confidence_score: newConfidence,
          summary: conclusion.description,
          needs_full_eval: false,
          last_evaluated_at: new Date().toISOString(),
          cached_reasoning: {
            conclusion,
            decision,
            multiVector,
            signal_count: signalCount,
            evaluated_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', incident.id);

      if (error) {
        this.logger.error(`Failed to update incident ${incident.id}`, error);
      } else {
        this.emitIncidentUpdate({
          id: incident.id,
          event_type: targetEventType,
          severity: newSeverity,
          confidence_score: newConfidence,
          summary: conclusion.description,
          updated_at: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Apply reasoning result to new incident (set initial properties)
   */
  private async applyReasoningToNewIncident(
    incidentId: string,
    eventType: string,
    signalCount: number,
    conclusion: any,
    decision: any,
    multiVector: any,
  ): Promise<void> {
    const shouldAlert =
      decision.action === 'CREATE_INCIDENT' ||
      decision.action === 'MERGE_INCIDENT' ||
      conclusion.severity === 'high';

    const status = shouldAlert
      ? determineStatus({
        signalCount,
        confidence: conclusion.confidence_score,
        severity: conclusion.severity,
      })
      : 'monitor';

    if (status !== 'monitor') {
      await this.logLifecycleEvent(
        incidentId,
        'monitor',
        status as IncidentStatus,
        'ai',
        `AI Decision: ${decision.action}`,
      );
    }

    await this.db
      .from('incidents')
      .update({
        status,
        confidence_score: conclusion.confidence_score,
        severity: conclusion.severity,
        event_type: conclusion.final_classification || eventType,
        summary: conclusion.description,
        needs_full_eval: false,
        last_evaluated_at: new Date().toISOString(),
        cached_reasoning: {
          conclusion,
          decision,
          multiVector,
          signal_count: signalCount,
          evaluated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    this.emitIncidentUpdate({
      id: incidentId,
      status: status as IncidentStatus,
      confidence_score: conclusion.confidence_score,
      severity: conclusion.severity,
      event_type: conclusion.final_classification || eventType,
      summary: conclusion.description,
      updated_at: new Date().toISOString(),
    });

    // Send push notification if alert - get coordinates from incident signals
    if (status === 'alert' || conclusion.severity === 'high') {
      // Get incident signals to calculate centroid for geospatial notification
      const { data: incidentSignals } = await this.db
        .from('incident_signals')
        .select('signals(lat, lng)')
        .eq('incident_id', incidentId);

      let centroid: { lat: number; lng: number } | null = null;
      let city = '';

      if (incidentSignals?.length) {
        const coords = incidentSignals
          .map((is: any) => is.signals)
          .filter((s: any) => s?.lat && s?.lng);

        if (coords.length > 0) {
          centroid = calculateCentroid(coords);

          // Get city from incident
          const { data: incidentData } = await this.db
            .from('incidents')
            .select('city')
            .eq('id', incidentId)
            .single();

          city = incidentData?.city || '';
        }
      }

      await this.notificationsService.notifyIncident({
        id: incidentId,
        city,
        event_type: conclusion.final_classification || eventType,
        severity: conclusion.severity,
        status,
        summary: conclusion.description,
        lat: centroid?.lat,
        lng: centroid?.lng,
        confidence: conclusion.confidence_score,
      });
    }
  }

  // ============================================================
  // CRON JOBS
  // ============================================================

  /**
   * Pending signals cron job - processes signals stuck in 'pending' status
   * This is a fallback mechanism when the queue fails or is not running
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handlePendingSignalsCron(): Promise<void> {
    if (!(await this.remoteConfig.isCronEnabled('incidents'))) {
      this.logger.debug('Pending signals cron is disabled via Remote Config');
      return;
    }

    this.logger.debug('Running pending signals fallback job...');
    await this.processPendingSignals();
  }

  /**
   * Process signals that are stuck in 'pending' status
   * Only processes signals older than 2 minutes to avoid race conditions with queue
   */
  private async processPendingSignals(): Promise<void> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    const { data: pendingSignals, error } = await this.db
      .from('signals')
      .select('id, lat, lng, happened_at')
      .eq('status', 'pending')
      .lt('created_at', twoMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(20);

    if (error) {
      this.logger.error('Failed to fetch pending signals:', error);
      return;
    }

    if (!pendingSignals?.length) {
      this.logger.debug('No stale pending signals found');
      return;
    }

    this.logger.log(`Processing ${pendingSignals.length} stale pending signals...`);

    for (const signal of pendingSignals) {
      try {
        await this.processSignal(
          signal.id,
          signal.lat,
          signal.lng,
          signal.happened_at,
        );
      } catch (err) {
        this.logger.error(`Failed to process pending signal ${signal.id}:`, err);
      }
    }
  }

  /**
   * Resolution cron job - checks for incidents to auto-resolve
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleResolutionCron(): Promise<void> {
    if (!(await this.remoteConfig.isCronEnabled('incidents'))) {
      this.logger.debug('Incidents resolution cron is disabled via Remote Config');
      return;
    }

    this.logger.debug('Running incident resolution job...');
    await this.processIncidentResolution();
  }

  /**
   * Process all active incidents for potential resolution
   */
  async processIncidentResolution(): Promise<void> {
    const { data: activeIncidents, error } = await this.db
      .from('incidents')
      .select('id, severity, event_type, created_at, updated_at')
      .in('status', ['alert', 'monitor']);

    if (error || !activeIncidents) return;

    for (const incident of activeIncidents) {
      await this.checkIncidentResolution(incident);
    }
  }

  /**
   * Check if an incident should be resolved based on silence period
   */
  private async checkIncidentResolution(incident: any): Promise<void> {
    const now = new Date();
    const lastActivity = new Date(incident.updated_at || incident.created_at);
    const diffHours = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);

    const eventType = incident.event_type || 'other';
    const requiredSilenceHours = MAX_SIGNAL_AGE[eventType] ?? MAX_SIGNAL_AGE['other'];

    if (diffHours < requiredSilenceHours) return;

    const { data: recentSignals } = await this.db
      .from('incident_signals')
      .select('signals(source, text, created_at)')
      .eq('incident_id', incident.id)
      .order('created_at', { ascending: false } as any)
      .limit(10);

    const signals = recentSignals?.map((rs: any) => rs.signals) ?? [];

    if (signals.length === 0) {
      await this.resolveIncidentInDb(
        incident.id,
        `Silence > ${requiredSilenceHours}h (No signals)`,
      );
      return;
    }

    try {
      const { result } = await this.resolutionAgent.run({
        incidentSeverity: incident.severity,
        signals,
      });

      if (result.resolution_confidence >= THRESHOLDS.RESOLUTION_CONFIDENCE) {
        await this.resolveIncidentInDb(
          incident.id,
          `AI Confidence ${result.resolution_confidence}: ${result.reason}`,
        );
      }
    } catch (err) {
      this.logger.error(`Resolution Analysis Failed for ${incident.id}:`, err);
    }
  }

  /**
   * Resolve an incident in the database
   */
  private async resolveIncidentInDb(id: string, reason: string): Promise<void> {
    this.logger.log(`Resolving incident ${id}: ${reason}`);

    await this.logLifecycleEvent(id, 'active', 'resolved', 'ai', reason);

    await this.db.from('incidents').update({ status: 'resolved' }).eq('id', id);
  }

  /**
   * Batch evaluation cron job - processes incidents needing full AI eval
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleBatchEvaluationCron(): Promise<BatchEvaluationResult> {
    if (!(await this.remoteConfig.isCronEnabled('batch_eval'))) {
      this.logger.debug('Batch evaluation cron is disabled via Remote Config');
      return { evaluated: 0, errors: 0 };
    }

    this.logger.log('🔄 Running batch AI evaluation job...');
    const result = await this.processBatchEvaluation();
    this.logger.log(`Batch evaluation finished: ${result.evaluated} incidents processed`);
    return result;
  }

  /**
   * Process all incidents marked as needs_full_eval
   * OPTIMIZED: Groups incidents by city+eventType for single reasoning per group
   */
  async processBatchEvaluation(): Promise<BatchEvaluationResult> {
    let evaluated = 0;
    let errors = 0;

    // Fetch pending incidents
    const { data: pendingIncidents, error } = await this.db
      .from('incidents')
      .select('id, city, event_type, severity, confidence_score, signal_count, last_evaluated_at')
      .eq('needs_full_eval', true)
      .neq('status', 'resolved')
      .order('updated_at', { ascending: false })
      .limit(INCIDENT_CONFIG.BATCH_EVAL_LIMIT);

    if (error) {
      this.logger.error('Failed to fetch pending incidents for batch eval', error);
      return { evaluated: 0, errors: 1 };
    }

    if (!pendingIncidents?.length) {
      this.logger.debug('No incidents pending evaluation');
      return { evaluated: 0, errors: 0 };
    }

    // Group incidents by city + event_type for batch processing
    const groupedIncidents = new Map<string, typeof pendingIncidents>();
    for (const incident of pendingIncidents) {
      const key = `${incident.city}:${incident.event_type}`;
      const group = groupedIncidents.get(key) || [];
      group.push(incident);
      groupedIncidents.set(key, group);
    }

    this.logger.log(
      `📊 Batch evaluating ${pendingIncidents.length} incidents in ${groupedIncidents.size} groups...`,
    );

    // Process each group with single reasoning call
    for (const [groupKey, incidents] of groupedIncidents) {
      try {
        // Combine all signals from incidents in this group
        const allSignals = await this.fetchSignalsForGroup(incidents);

        if (allSignals.length === 0) {
          this.logger.debug(`No signals for group ${groupKey}, skipping`);
          continue;
        }

        this.logger.log(
          `🔄 Batch reasoning for ${incidents.length} incidents in ${groupKey} (${allSignals.length} signals)`,
        );

        // Single reasoning call for entire group
        const reasoningResult = await this.reasoningService.runReasoningLoop(
          allSignals,
          incidents.map((i) => ({ id: i.id, type: i.event_type, city: i.city })),
          incidents[0].id, // Use first incident for trace
        );

        // Apply result to all incidents in group
        for (const incident of incidents) {
          try {
            await this.applyBatchReasoningToIncident(incident, reasoningResult);
            evaluated++;
          } catch (err) {
            this.logger.error(`Failed to apply reasoning to ${incident.id}:`, err);
            errors++;
          }
        }
      } catch (err) {
        this.logger.error(`Batch eval failed for group ${groupKey}:`, err);
        errors += incidents.length;
      }
    }

    // OPTIMIZATION: Removed stale incidents individual evaluation loop
    // This was causing up to STALE_EVAL_LIMIT extra LLM calls per cron run,
    // bypassing the batch grouping optimization above.
    // Incidents will be re-evaluated when they receive new signals that trigger needs_full_eval,
    // or manually via runFullEvaluation if needed.

    return { evaluated, errors };
  }

  /**
   * Fetch signals for a group of incidents (for batch processing)
   */
  private async fetchSignalsForGroup(
    incidents: { id: string }[],
  ): Promise<{ source: string; text: string; created_at: string }[]> {
    const allSignals: { source: string; text: string; created_at: string }[] = [];

    for (const incident of incidents) {
      const { data: signalsData } = await this.db
        .from('incident_signals')
        .select('signals(source, text, created_at)')
        .eq('incident_id', incident.id)
        .limit(20);

      if (signalsData) {
        const signals = signalsData.map((s: any) => s.signals).filter(Boolean);
        allSignals.push(...signals);
      }
    }

    return allSignals;
  }

  /**
   * Apply batch reasoning result to a single incident
   */
  private async applyBatchReasoningToIncident(
    incident: any,
    reasoningResult: any,
  ): Promise<void> {
    const { conclusion, decision, multiVector } = reasoningResult;

    const { error } = await this.db
      .from('incidents')
      .update({
        severity: conclusion.severity,
        confidence_score: conclusion.confidence_score,
        summary: conclusion.description,
        needs_full_eval: false,
        last_evaluated_at: new Date().toISOString(),
        cached_reasoning: {
          conclusion,
          decision,
          multiVector,
          evaluated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', incident.id);

    if (error) {
      throw error;
    }
  }

  /**
   * Run full AI evaluation on a single incident
   */
  private async runFullEvaluation(
    incidentId: string,
    incident: any,
  ): Promise<void> {
    this.logger.debug(`Running full AI evaluation for incident ${incidentId}`);

    await this.evaluateIncidentState(incidentId, incident);

    await this.db
      .from('incidents')
      .update({
        needs_full_eval: false,
        last_evaluated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);
  }

  // ============================================================
  // SSE HELPERS
  // ============================================================

  /**
   * Emit incident update via SSE
   */
  private emitIncidentUpdate(payload: IncidentUpdatePayload): void {
    this.sseService.addEvent({
      data: payload,
      type: SSE_EVENT_TYPES.INCIDENT_UPDATE,
    } as MessageEvent);
  }

  // ============================================================
  // LIFECYCLE LOGGING
  // ============================================================

  /**
   * Log a lifecycle event for an incident
   */
  async logLifecycleEvent(
    incidentId: string,
    fromStatus: string | null,
    toStatus: IncidentStatus | string,
    changedBy: string,
    reason: string,
  ): Promise<void> {
    const { error } = await this.db.from('incident_lifecycle').insert({
      incident_id: incidentId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      triggered_by: 'system',
      reason,
    });

    if (error) {
      this.logger.error(
        `Failed to log lifecycle event for incident ${incidentId}`,
        error,
      );
    }
  }

  // ============================================================
  // PUBLIC API (delegated to queries service)
  // ============================================================

  /**
   * Validate bounding box coordinates
   */
  isValidBBox(minLat: number, minLng: number, maxLat: number, maxLng: number): boolean {
    return this.queriesService.isValidBBox(minLat, minLng, maxLat, maxLng);
  }

  /**
   * Get incidents in viewport
   */
  async getIncidentsInViewport(
    minLat: number,
    minLng: number,
    maxLat: number,
    maxLng: number,
  ): Promise<IncidentWithCentroid[]> {
    return this.queriesService.getIncidentsInViewport(minLat, minLng, maxLat, maxLng);
  }

  /**
   * Get nearby incidents
   */
  async getNearbyIncidents(
    lat: number,
    lng: number,
    radiusM: number,
  ): Promise<IncidentWithCentroid[]> {
    return this.queriesService.getNearbyIncidents(lat, lng, radiusM);
  }

  /**
   * Get incident by ID
   */
  async getIncidentById(id: string): Promise<any> {
    return this.queriesService.getIncidentById(id);
  }

  /**
   * Resolve an incident manually
   */
  async resolveIncident(id: string): Promise<{ success: boolean }> {
    const { error } = await this.db
      .from('incidents')
      .update({ status: 'resolved' })
      .eq('id', id);

    if (error) {
      throw new InternalServerErrorException('Failed to resolve incident');
    }

    return { success: true };
  }

  /**
   * Get signals for an incident
   */
  async getIncidentSignals(incidentId: string): Promise<Signal[]> {
    return this.queriesService.getIncidentSignals(incidentId);
  }

  /**
   * Get lifecycle events for an incident
   */
  async getIncidentLifecycle(incidentId: string): Promise<any[]> {
    return this.queriesService.getIncidentLifecycle(incidentId);
  }

  /**
   * Get agent traces for an incident
   */
  async getIncidentTraces(incidentId: string): Promise<any[]> {
    return this.queriesService.getIncidentTraces(incidentId);
  }

  /**
   * Submit user feedback on an incident
   */
  async submitFeedback(
    incidentId: string,
    userId: string,
    type: 'confirm' | 'reject',
  ): Promise<{ success: boolean; feedback_id?: string }> {
    const { data, error } = await this.db
      .from('incident_feedback')
      .upsert(
        {
          incident_id: incidentId,
          user_id: userId,
          type,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'incident_id, user_id' },
      )
      .select('id')
      .single();

    if (error) {
      this.logger.error('Failed to submit feedback:', error);
      throw new InternalServerErrorException('Failed to submit feedback');
    }

    return { success: true, feedback_id: data?.id };
  }
}
