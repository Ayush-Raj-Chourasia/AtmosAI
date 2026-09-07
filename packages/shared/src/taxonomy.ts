/**
 * AtmosAI: Autonomous Meteorological & Extreme Weather Intelligence Platform
 * National Weather Taxonomy & Verification Lifecycle Definitions
 * Alignment: India Meteorological Department (IMD) & National Disaster Management Authority (NDMA)
 */

export const WEATHER_TAXONOMY = [
  'RAINFALL',
  'THUNDERSTORM',
  'FLOOD',
  'HEATWAVE',
  'FOG',
  'DUST_STORM',
  'STRONG_WIND',
  'OTHER',
] as const;

export type WeatherEventType = (typeof WEATHER_TAXONOMY)[number];

export const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const SIGNAL_VERIFICATION_STATUSES = [
  'UNVERIFIED',
  'PROCESSING',
  'VERIFIED',
  'SUSPECTED',
  'REJECTED',
] as const;
export type SignalVerificationStatus = (typeof SIGNAL_VERIFICATION_STATUSES)[number];

export const EVENT_LIFECYCLE_STATUSES = [
  'DETECTED',
  'UNDER_REVIEW',
  'VERIFIED',
  'ACTIVE',
  'RESOLVED',
] as const;
export type EventLifecycleStatus = (typeof EVENT_LIFECYCLE_STATUSES)[number];

export const SOURCE_TYPES = [
  'imd',
  'weather_api',
  'news',
  'social_media',
  'citizen',
  'public_dataset',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export interface WeatherCategoryConfig {
  label: string;
  description: string;
  icon: string;
  color: string;
  badgeClass: string;
  markerColor: string;
  keywords: string[];
}

export const WEATHER_CATEGORY_CONFIGS: Record<WeatherEventType, WeatherCategoryConfig> = {
  RAINFALL: {
    label: 'Heavy Rainfall',
    description: 'Continuous precipitation, cloudburst, or excessive downpour',
    icon: 'water_drop',
    color: 'blue',
    badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    markerColor: '#3b82f6',
    keywords: ['rain', 'rainfall', 'downpour', 'cloudburst', 'monsoon', 'drizzle', 'shower', 'barish'],
  },
  THUNDERSTORM: {
    label: 'Thunderstorm & Lightning',
    description: 'Severe lightning, convective storm, thunder squall, or hail',
    icon: 'thunderstorm',
    color: 'amber',
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    markerColor: '#f59e0b',
    keywords: ['thunderstorm', 'lightning', 'thunder', 'squall', 'hail', 'hailstorm', 'bijli', 'toofan'],
  },
  FLOOD: {
    label: 'Urban & Riverine Flooding',
    description: 'Waterlogging, inundated streets, breached embankments, overflow',
    icon: 'flood',
    color: 'cyan',
    badgeClass: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    markerColor: '#06b6d4',
    keywords: ['flood', 'waterlogging', 'submerged', 'inundation', 'overflow', 'deluge', 'jalbharao', 'baadh'],
  },
  HEATWAVE: {
    label: 'Heatwave Alert',
    description: 'Extreme thermal stress, maximum temperature departure > 4.5°C',
    icon: 'wb_sunny',
    color: 'rose',
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
    markerColor: '#f43f5e',
    keywords: ['heatwave', 'loo', 'hot', 'scorching', 'sunstroke', 'extreme heat', 'chubhanti garmi'],
  },
  FOG: {
    label: 'Dense Fog & Low Visibility',
    description: 'Radiation fog, dense fog causing runway/road visibility < 200m',
    icon: 'foggy',
    color: 'slate',
    badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
    markerColor: '#94a3b8',
    keywords: ['fog', 'dense fog', 'smog', 'mist', 'low visibility', 'kohra', 'dhund'],
  },
  DUST_STORM: {
    label: 'Dust Storm & Andhi',
    description: 'Suspended particulate storm, severe dust andhi, desert winds',
    icon: 'air',
    color: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    markerColor: '#f97316',
    keywords: ['dust storm', 'sandstorm', 'andhi', 'dust', 'gusty dust'],
  },
  STRONG_WIND: {
    label: 'Gale & Strong Winds',
    description: 'High wind gusts > 50 km/h, cyclonic winds, uprooted poles/trees',
    icon: 'storm',
    color: 'purple',
    badgeClass: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    markerColor: '#a855f7',
    keywords: ['strong wind', 'gale', 'cyclone', 'gust', 'storm wind', 'uprooted', 'tez hawa'],
  },
  OTHER: {
    label: 'Other Weather Incident',
    description: 'Unclassified meteorological or hydrometeorological event',
    icon: 'warning',
    color: 'emerald',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    markerColor: '#10b981',
    keywords: ['weather', 'climate', 'alert', 'met', 'incident'],
  },
};
