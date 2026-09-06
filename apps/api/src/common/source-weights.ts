/**
 * Source Weight Configuration
 * Defines trust weights for different signal sources
 *
 * Used by:
 * - incidents.service.ts (incremental confidence updates)
 * - reasoning.service.ts (multi-vector detection)
 *
 * Weight Guidelines (per EVIDENCE_WEIGHTING.md):
 * - Official sources (BMKG, BNPB): 0.30-0.50 base
 * - User reports: 0.20-0.30 (direct observation)
 * - Social media: 0.15-0.25 (media evidence)
 * - News: 0.15-0.25 (media evidence)
 */

/** Trust weights by signal source type */
export const SOURCE_WEIGHTS: Record<string, number> = {
  // Official sources (highest trust)
  bmkg: 0.40,
  bnpb: 0.40,
  official: 0.40,

  // User reports (direct observation)
  user_report: 0.25,
  user: 0.25,

  // Social media (media evidence)
  social_media: 0.20,
  tiktok: 0.20,
  twitter: 0.20,
  instagram: 0.20,

  // News (media evidence)
  news: 0.20,
  rss: 0.20,
};

/** Default weight for unknown sources */
export const DEFAULT_SOURCE_WEIGHT = 0.10;

/** Official source identifiers for urgent signal detection */
export const OFFICIAL_SOURCES = ['bmkg', 'bnpb', 'official'] as const;

/** Source categories for multi-vector detection */
export const SOURCE_CATEGORIES = {
  official: ['bmkg', 'bnpb', 'official'],
  user_report: ['user_report', 'user'],
  social_media: ['social_media', 'tiktok', 'twitter', 'instagram'],
  news: ['news', 'rss'],
} as const;

/**
 * Get weight for a signal source
 */
export function getSourceWeight(source: string): number {
  return SOURCE_WEIGHTS[source.toLowerCase()] ?? DEFAULT_SOURCE_WEIGHT;
}

/**
 * Check if source is considered official/trusted
 */
export function isOfficialSource(source: string): boolean {
  return OFFICIAL_SOURCES.includes(source.toLowerCase() as (typeof OFFICIAL_SOURCES)[number]);
}
