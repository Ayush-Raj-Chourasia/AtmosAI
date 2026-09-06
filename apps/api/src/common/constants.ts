/**
 * Common Constants
 * Centralized configuration values used across services
 */

// ============================================================
// AI MODEL CONFIGURATION
// ============================================================

/** Fast model for simpler tasks (observation, enrichment, location matching) */
export const GEMINI_FLASH_MODEL = process.env.GEMINI_FLASH_MODEL || 'maia/gemini-2.5-flash';

/** Pro model for complex reasoning tasks (classification, skeptic, synthesis, action) */
export const GEMINI_PRO_MODEL = process.env.GEMINI_PRO_MODEL || 'maia/gemini-3-pro-preview';

// ============================================================
// SIGNAL AGE LIMITS (in hours)
// ============================================================

/** Maximum age of signals per event type (hours) */
export const MAX_SIGNAL_AGE: Record<string, number> = {
  earthquake: 12,      // Very time-sensitive
  accident: 6,         // Cleared relatively quickly
  power_outage: 12,    // Can last half a day
  fire: 24,            // Major fires can persist
  flood: 48,           // Floods often last days
  landslide: 48,       // After-effects linger
  whirlwind: 6,        // Short duration events
  tornado: 6,          // Short duration events
  tsunami: 24,         // High impact, lasting effects
  volcano: 72,         // Eruptions can last days
  other: 24,           // Default
};

// ============================================================
// CONFIDENCE THRESHOLDS
// ============================================================

/** Confidence thresholds for status determination and alerts */
export const THRESHOLDS = {
  /** Confidence level to trigger alert status (0.8 = 80%) */
  ALERT_CONFIDENCE: 0.8,

  /** Confidence level for monitor status (0.6 = 60%) */
  MONITOR_CONFIDENCE: 0.6,

  /** Minimum confidence change to warrant AI re-evaluation */
  SIGNIFICANT_CONFIDENCE_CHANGE: 0.1,

  /** Resolution confidence threshold */
  RESOLUTION_CONFIDENCE: 0.8,
} as const;

// ============================================================
// INCIDENT CONFIGURATION
// ============================================================

/** Incident processing configuration */
export const INCIDENT_CONFIG = {
  /** Minimum signals required to create an incident */
  MIN_SIGNALS_FOR_INCIDENT: 1,

  /** Maximum incidents to process in batch evaluation */
  BATCH_EVAL_LIMIT: 10,
} as const;

// ============================================================
// NOTIFICATION & DISPLAY RADIUS
// ============================================================

/** Default notification radius in meters (50km) */
export const DEFAULT_NOTIFICATION_RADIUS_M = 50000;

/** Minimum radius for seismic events (earthquake, tsunami) in meters (100km) */
export const SEISMIC_MIN_RADIUS_M = 100000;

/** Event types considered seismic (wider notification/display radius) */
export const SEISMIC_EVENT_TYPES = ['earthquake', 'tsunami'] as const;

// ============================================================
// SSE EVENT TYPES
// ============================================================

/** Server-Sent Events type constants */
export const SSE_EVENT_TYPES = {
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_RESOLVED: 'incident_resolved',
  INCIDENT_CONFIDENCE_CHANGE: 'incident_confidence_change',
  /** Legacy event type for backward compatibility */
  INCIDENT_UPDATE: 'incident_update',
} as const;

// ============================================================
// RESOLUTION SILENCE PERIODS (in hours)
// ============================================================

/** Required silence period before auto-resolving incidents */
export const RESOLUTION_SILENCE_HOURS: Record<string, number> = {
  low: 1,
  medium: 4,
  // 'high' uses MAX_SIGNAL_AGE[event_type]
} as const;

// ============================================================
// TRUSTED SOURCES (Skip LLM reasoning)
// ============================================================

/** Sources that bypass AI reasoning for specific event types */
export const TRUSTED_SOURCES: Record<string, string[]> = {
  bmkg: ['earthquake', 'volcano', 'tsunami'],
  bnpb: ['earthquake', 'flood', 'volcano', 'landslide', 'fire', 'whirlwind', 'tornado', 'tsunami'],
  bpbd: ['earthquake', 'flood', 'volcano', 'landslide', 'fire', 'whirlwind', 'tornado', 'tsunami'],
} as const;

/**
 * Check if a source+eventType combo should bypass LLM reasoning
 */
export function shouldBypassReasoning(source: string, eventType: string): boolean {
  const trustedEvents = TRUSTED_SOURCES[source.toLowerCase()];
  return trustedEvents?.includes(eventType) ?? false;
}

