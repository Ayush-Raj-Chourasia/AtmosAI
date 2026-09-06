import { Injectable, Logger } from '@nestjs/common';
import {
  Signal,
  SignalInsert,
  WeatherEvent,
  CitizenWeatherReportDto,
  SourceType,
  WeatherEventType,
} from '@n-weis/shared';
import { DatabaseService } from '../database/database.service';
import { SignalNormalizerService, RawSignalInput } from '../processing/signal-normalizer.service';
import { WeatherClassifierService } from '../ai/weather-classifier.service';
import { RelevanceScorerService } from '../ai/relevance-scorer.service';
import { MultimodalService } from '../ai/multimodal.service';
import { CredibilityService } from '../intelligence/credibility.service';
import { MisinformationService } from '../intelligence/misinformation.service';
import { DeduplicationService } from '../intelligence/deduplication.service';
import { EvidenceFusionService } from '../intelligence/evidence-fusion.service';
import { SseService } from '../sse/sse.service';

export interface IngestionResult {
  signal: Signal;
  isDuplicate: boolean;
  duplicateDetails?: string;
  isMisinformation: boolean;
  misinformationReason?: string;
  associatedEvent?: WeatherEvent | null;
  confidenceScore?: number;
}

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly normalizer: SignalNormalizerService,
    private readonly classifier: WeatherClassifierService,
    private readonly relevanceScorer: RelevanceScorerService,
    private readonly multimodal: MultimodalService,
    private readonly credibility: CredibilityService,
    private readonly misinformation: MisinformationService,
    private readonly deduplication: DeduplicationService,
    private readonly evidenceFusion: EvidenceFusionService,
    private readonly sse: SseService,
  ) {}

  /**
   * Universal Ingestion Gateway: Processes a raw signal through the complete 12-step N-WEIS pipeline
   */
  async ingestSignal(raw: RawSignalInput): Promise<IngestionResult> {
    this.logger.log(` Ingesting raw signal from [${raw.source_type}]: "${raw.text.slice(0, 60)}..."`);

    // STEP 1 & 2 & 3: Normalization & WGS84 Geolocation
    const normalized = this.normalizer.normalize(raw);

    // STEP 4 & 5: AI Multimodal & Weather Classification
    const classification = await this.classifier.classify(normalized.text, normalized.media_urls || []);
    normalized.event_candidate = classification.eventType;

    const mediaAnalysis = await this.multimodal.analyzeMedia(
      normalized.media_urls || [],
      normalized.text,
      normalized.event_candidate
    );

    // STEP 6: Relevance Scoring (Hanny GeoAI)
    const relevance = this.relevanceScorer.calculateRelevance(
      normalized.text,
      normalized.latitude ?? null,
      normalized.longitude ?? null,
      normalized.timestamp || new Date().toISOString(),
      normalized.source_type,
      normalized.event_candidate
    );
    normalized.relevance_score = relevance.compositeScore;

    // STEP 7 & 8: Source Credibility
    const baseCredibility = await this.credibility.calculateCredibility(
      normalized.source_type,
      normalized.source_id,
      normalized.author
    );

    // STEP 9: Misinformation & Skeptic Check
    const authCheck = this.misinformation.evaluateAuthenticity(
      normalized.text,
      normalized.source_type,
      baseCredibility,
      mediaAnalysis,
      normalized.event_candidate,
      normalized.location_confidence || 0.5,
      normalized.source_type === 'imd'
    );
    normalized.credibility_score = authCheck.credibilityScore;
    normalized.misinformation_score = authCheck.misinformationProbability;
    normalized.verification_status = authCheck.verificationStatus;

    // Persist signal to database
    const savedSignal = await this.db.insertSignal(normalized);

    // If Fake / Rejected: Stop here, do not fuse into real-time weather event
    if (authCheck.verificationStatus === 'REJECTED') {
      this.logger.warn(` Signal ${savedSignal.id} flagged as MISINFORMATION (${authCheck.explanation})`);
      await this.db.insertVerificationRecord({
        id: `vr_${Date.now()}`,
        target_type: 'signal',
        target_id: savedSignal.id,
        action: 'REJECT',
        verified_by: 'ai_engine',
        reason: authCheck.explanation,
        previous_status: 'UNVERIFIED',
        new_status: 'REJECTED',
        created_at: new Date().toISOString(),
      });

      this.sse.addEvent({
        data: { type: 'signal_rejected', signal: savedSignal, reason: authCheck.explanation },
      } as any);

      return {
        signal: savedSignal,
        isDuplicate: false,
        isMisinformation: true,
        misinformationReason: authCheck.explanation,
        associatedEvent: null,
      };
    }

    // STEP 10: Deduplication Check
    const existingSignals = await this.db.getSignals(200);
    const dedupResult = this.deduplication.evaluateDuplicate(savedSignal, existingSignals);

    if (dedupResult.isDuplicate) {
      this.logger.log(` Signal ${savedSignal.id} identified as duplicate (${dedupResult.duplicateLayer}): ${dedupResult.explanation}`);
    }

    // STEP 11 & 12: Spatial-Temporal Clustering & Evidence Fusion into WeatherEvent
    let associatedEvent: WeatherEvent | null = null;

    if (savedSignal.latitude !== null && savedSignal.longitude !== null && savedSignal.event_candidate) {
      associatedEvent = await this.fuseIntoEvent(savedSignal, existingSignals);
    }

    // Broadcast Real-time SSE update
    this.sse.addEvent({
      data: {
        type: 'signal_processed',
        signal: savedSignal,
        event: associatedEvent,
      },
    } as any);

    if (associatedEvent) {
      this.sse.addEvent({
        data: {
          type: 'incident_update',
          event: associatedEvent,
        },
      } as any);
    }

    return {
      signal: savedSignal,
      isDuplicate: dedupResult.isDuplicate,
      duplicateDetails: dedupResult.explanation,
      isMisinformation: false,
      associatedEvent,
      confidenceScore: associatedEvent?.confidence_score,
    };
  }

  /**
   * Ingest a citizen weather report
   */
  async ingestCitizenReport(dto: CitizenWeatherReportDto): Promise<IngestionResult> {
    const raw: RawSignalInput = {
      source_type: 'citizen',
      source_name: dto.reporter_name ? `Citizen (${dto.reporter_name})` : 'Public Citizen Report',
      text: dto.text,
      latitude: dto.latitude,
      longitude: dto.longitude,
      city: dto.city_hint,
      state: dto.state_hint,
      media_urls: dto.photos || [],
      media_types: (dto.photos || []).map(() => 'image'),
      author: {
        username: dto.reporter_name || 'Anonymous Citizen',
        trust_score: dto.confidence === 'direct_observation' ? 0.75 : 0.50,
      },
      raw_payload: dto,
    };

    return this.ingestSignal(raw);
  }

  /**
   * Spatiotemporal correlation & Evidence Fusion helper
   */
  private async fuseIntoEvent(signal: Signal, existingSignals: Signal[]): Promise<WeatherEvent> {
    const events = await this.db.getEvents();

    // Look for existing active event within 15km and same event type
    let targetEvent = events.find(e => {
      if (e.event_type !== signal.event_candidate) return false;
      const dist = this.deduplication.calculateHaversineDistanceKm(
        e.latitude,
        e.longitude,
        signal.latitude!,
        signal.longitude!
      );
      return dist <= 15.0 && e.status !== 'RESOLVED';
    });

    // Gather all related signals for this geographic cluster
    const clusterSignals = existingSignals.filter(s => {
      if (s.event_candidate !== signal.event_candidate) return false;
      if (s.latitude === null || s.longitude === null) return false;
      const dist = this.deduplication.calculateHaversineDistanceKm(
        signal.latitude!,
        signal.longitude!,
        s.latitude,
        s.longitude
      );
      return dist <= 15.0 && s.verification_status !== 'REJECTED';
    });

    if (!clusterSignals.some(s => s.id === signal.id)) {
      clusterSignals.push(signal);
    }

    const eventId = targetEvent ? targetEvent.id : `evt_${Date.now()}`;
    const fusion = this.evidenceFusion.fuseSignals(eventId, signal.event_candidate!, clusterSignals);

    // Save individual evidence pieces
    for (const ev of fusion.piecesOfEvidence) {
      await this.db.insertEvidence(ev);
    }

    if (targetEvent) {
      // Update existing event
      const updated = await this.db.updateEvent(targetEvent.id, {
        confidence_score: fusion.confidenceScore,
        status: fusion.status,
        severity: fusion.severity,
        signal_count: clusterSignals.length,
        source_breakdown: fusion.sourceBreakdown,
        ai_reasoning: fusion.aiReasoning,
        evidence_summary: fusion.evidenceSummary,
        verified_at: fusion.status === 'VERIFIED' ? (targetEvent.verified_at || new Date().toISOString()) : targetEvent.verified_at,
      });
      return updated || targetEvent;
    } else {
      // Create new weather event
      const title = `${signal.event_candidate} — ${signal.city || signal.state || 'India'}`;
      const newEvent = await this.db.insertEvent({
        id: eventId,
        event_type: signal.event_candidate!,
        title,
        description: `Verified ${signal.event_candidate?.toLowerCase()} event detected from multi-source observations in ${signal.city || signal.state || 'region'}.`,
        severity: fusion.severity,
        status: fusion.status,
        latitude: signal.latitude!,
        longitude: signal.longitude!,
        city: signal.city || 'Regional Center',
        state: signal.state || 'India',
        radius_m: 5000,
        confidence_score: fusion.confidenceScore,
        signal_count: clusterSignals.length,
        source_breakdown: fusion.sourceBreakdown,
        ai_reasoning: fusion.aiReasoning,
        evidence_summary: fusion.evidenceSummary,
        verified_at: fusion.status === 'VERIFIED' ? new Date().toISOString() : null,
      });
      return newEvent;
    }
  }
}
