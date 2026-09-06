/**
 * Incident Types
 * TypeScript interfaces for incident-related data structures
 */

import { MultiVectorResult } from '../reasoning/reasoning.service';

// ============================================================
// DATABASE RECORD TYPES
// ============================================================

/** Signal record from database */
export interface Signal {
  id: string;
  source: string;
  text: string | null;
  lat: number;
  lng: number;
  city_hint?: string;
  created_at: string;
  happened_at?: string;
  status?: SignalStatus;
  event_type?: EventType;
  raw_payload?: Record<string, unknown>;
  media_url?: string;
  media_type?: string;
}

/** Signal status values */
export type SignalStatus = 'pending' | 'processed' | 'failed';

/** Event type values */
export type EventType =
  | 'flood'
  | 'landslide'
  | 'fire'
  | 'earthquake'
  | 'volcano'
  | 'whirlwind'
  | 'tornado'
  | 'tsunami'
  | 'other';

/** Incident status values */
export type IncidentStatus = 'monitor' | 'alert' | 'resolved';

/** Severity levels */
export type Severity = 'low' | 'medium' | 'high';

/** Incident record from database */
export interface Incident {
  id: string;
  city: string;
  status: IncidentStatus;
  severity: Severity;
  event_type: EventType;
  confidence_score: number;
  summary?: string | null;
  time_start: string;
  time_end: string;
  signal_count?: number;
  needs_full_eval?: boolean;
  last_evaluated_at?: string | null;
  cached_reasoning?: CachedReasoning | null;
  created_at: string;
  updated_at: string;
}

/** Cached reasoning result stored on incident */
export interface CachedReasoning {
  conclusion: ReasoningConclusion;
  decision: ReasoningDecision;
  multiVector: MultiVectorResult;
  signal_count: number;
  evaluated_at: string;
}

/** AI reasoning conclusion */
export interface ReasoningConclusion {
  final_classification: string;
  severity: Severity;
  confidence_score: number;
  description?: string;
}

/** AI reasoning decision */
export interface ReasoningDecision {
  action: 'CREATE_INCIDENT' | 'MERGE_INCIDENT' | 'WAIT_FOR_MORE_DATA' | 'DISMISS';
  reason: string;
  target_incident_id?: string;
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

/** Incident with calculated centroid for map display */
export interface IncidentWithCentroid {
  id: string;
  type: EventType;
  severity: Severity;
  confidence: number;
  lat: number;
  lng: number;
  city: string;
  summary?: string | null;
  status: IncidentStatus;
  created_at: string;
  updated_at: string;
  signal_count: number;
  distance?: number;
  incident_feedback: IncidentFeedback[];
}

/** User feedback on incident */
export interface IncidentFeedback {
  id?: string;
  user_id: string;
  type: 'confirm' | 'reject';
  comment?: string;
  created_at?: string;
  users?: {
    name?: string;
    avatar_url?: string;
  };
}

/** Lifecycle event record */
export interface LifecycleEvent {
  id: string;
  incident_id: string;
  from_status: IncidentStatus | null;
  to_status: IncidentStatus;
  changed_by: string;
  triggered_by: string;
  reason: string;
  created_at: string;
}

// ============================================================
// INTERNAL PROCESSING TYPES
// ============================================================

/** Result from reasoning service */
export interface ReasoningResult {
  conclusion: ReasoningConclusion;
  decision: ReasoningDecision;
  sessionId: string;
  multiVector: MultiVectorResult;
}

/** Batch evaluation result */
export interface BatchEvaluationResult {
  evaluated: number;
  errors: number;
}

// ============================================================
// SSE EVENT TYPES
// ============================================================

/** SSE event payload for incident updates */
export interface IncidentUpdatePayload {
  id: string;
  city?: string;
  event_type?: EventType;
  status?: IncidentStatus;
  severity?: Severity;
  confidence_score?: number;
  signal_count?: number;
  summary?: string | null;
  updated_at: string;
  incremental?: boolean;
}
