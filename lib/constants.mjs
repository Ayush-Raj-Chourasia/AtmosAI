/**
 * WeatherNexus Canonical Constants & Enumerations (lib/constants.mjs)
 * SIH26069 — National Weather Big Data Analytics Platform
 * Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)
 *
 * Centralized governance definitions for Data Modes, RBAC User Roles,
 * Event Lifecycle States, and Source Operational Statuses.
 */

export const DATA_MODES = Object.freeze({
  LIVE: 'LIVE',
  DEMO: 'DEMO',
  REPLAY: 'REPLAY',
  MOCK: 'MOCK',
  OFFLINE: 'OFFLINE',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  DEGRADED: 'DEGRADED',
});

export const USER_ROLES = Object.freeze({
  VIEWER: 'VIEWER',
  ANALYST: 'ANALYST',
  VERIFIER: 'VERIFIER',
  ADMIN: 'ADMIN',
});

export const EVENT_STATUSES = Object.freeze({
  DETECTED: 'DETECTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  VERIFIED: 'VERIFIED',
  ACTIVE: 'ACTIVE',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
  FALSE_ALARM: 'FALSE_ALARM',
});

export const SOURCE_STATUSES = Object.freeze({
  LIVE: 'LIVE',
  ONLINE: 'ONLINE',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  REPLAY: 'REPLAY',
  MOCK: 'MOCK',
  STANDBY: 'STANDBY',
  DISABLED: 'DISABLED',
  DEGRADED: 'DEGRADED',
  ERROR: 'ERROR',
});

export const HAZARD_CATEGORIES = Object.freeze([
  'RAINFALL',
  'THUNDERSTORM',
  'FLOOD',
  'HEATWAVE',
  'COLD_WAVE',
  'FOG',
  'DUST_STORM',
  'CYCLONE',
  'STRONG_WIND',
  'HAILSTORM',
  'LIGHTNING',
  'OTHER',
]);

/**
 * Normalizes an arbitrary data mode string into a valid canonical DATA_MODES value.
 * Defaults to 'DEMO' for synthetic safety if unrecognized.
 */
export function normalizeDataMode(mode) {
  if (!mode || typeof mode !== 'string') return DATA_MODES.DEMO;
  const upper = mode.trim().toUpperCase();
  if (upper in DATA_MODES) return DATA_MODES[upper];
  if (upper === 'CROWDSOURCED' || upper === 'SIMULATED') return DATA_MODES.DEMO;
  if (upper === 'HISTORICAL') return DATA_MODES.REPLAY;
  return DATA_MODES.DEMO;
}

/**
 * Validates if an incident state transition is permissible.
 * Invariant: REJECTED !== RESOLVED.
 * Invariant: RESOLVED cannot be reclassified as REJECTED or FALSE_ALARM.
 * Invariant: REJECTED/FALSE_ALARM cannot transition directly to VERIFIED without UNDER_REVIEW.
 */
export function isValidStateTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return { valid: false, error: 'Status values cannot be empty.' };
  if (fromStatus === toStatus) return { valid: true, error: null };

  const validStatuses = Object.values(EVENT_STATUSES);
  if (!validStatuses.includes(toStatus)) {
    return { valid: false, error: `Invalid target state: ${toStatus}` };
  }

  // Once an event is marked REJECTED/FALSE_ALARM, it cannot skip to VERIFIED or RESOLVED
  if ((fromStatus === 'REJECTED' || fromStatus === 'FALSE_ALARM') && (toStatus === 'VERIFIED' || toStatus === 'RESOLVED')) {
    return { valid: false, error: `Cannot transition directly from ${fromStatus} to ${toStatus}. Re-open to UNDER_REVIEW first.` };
  }

  // Terminal state: RESOLVED cannot be transitioned back to UNDER_REVIEW, DETECTED, REJECTED, or FALSE_ALARM
  if (fromStatus === 'RESOLVED') {
    return { valid: false, error: `Cannot transition from terminal status RESOLVED to ${toStatus}. Historical incidents are closed.` };
  }

  return { valid: true, error: null };
}
