/**
 * AtmosAI: Autonomous Meteorological & Extreme Weather Intelligence Platform
 * Central Unified TypeScript Schemas & Data Contracts
 */

import {
  WeatherEventType,
  SeverityLevel,
  SignalVerificationStatus,
  EventLifecycleStatus,
  SourceType,
} from './taxonomy';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// 1. SOURCES
// ============================================================
export interface Source {
  id: string;
  name: string;
  source_type: SourceType;
  endpoint_url?: string | null;
  base_reliability: number; // 0.0 to 1.0
  is_active: boolean;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 2. SIGNALS (Normalized Raw Weather Observations)
// ============================================================
export interface Signal {
  id: string;
  source_id: string;
  source_type: SourceType;
  source_name?: string;
  external_id?: string | null;
  text: string;
  language: string;
  timestamp: string; // ISO UTC
  ingested_at: string; // ISO UTC
  city?: string | null;
  state?: string | null;
  country: string; // 'India'
  latitude?: number | null;
  longitude?: number | null;
  location_confidence: number; // 0.0 to 1.0
  location_method?: 'native_gps' | 'exif_gps' | 'metadata' | 'gazetteer' | 'geo_reasoning' | 'geocoder' | 'manual' | null;
  
  event_candidate?: WeatherEventType | null;
  relevance_score: number; // 0.0 to 1.0 (Hanny-style spatial-temporal-text relevance)
  credibility_score: number; // 0.0 to 1.0
  misinformation_score: number; // 0.0 to 1.0 (1.0 = highly suspected fake)
  verification_status: SignalVerificationStatus;
  
  media_urls: string[];
  media_types: ('image' | 'video')[];
  hashtags: string[];
  author?: {
    id?: string;
    username?: string;
    verified?: boolean;
    trust_score?: number;
  } | null;
  
  raw_payload?: Record<string, any> | null;
  created_at: string;
}

export interface SignalInsert {
  id?: string;
  source_id: string;
  source_type: SourceType;
  source_name?: string;
  external_id?: string | null;
  text: string;
  language?: string;
  timestamp?: string;
  ingested_at?: string;
  city?: string | null;
  state?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  location_confidence?: number;
  location_method?: string | null;
  event_candidate?: WeatherEventType | null;
  relevance_score?: number;
  credibility_score?: number;
  misinformation_score?: number;
  verification_status?: SignalVerificationStatus;
  media_urls?: string[];
  media_types?: ('image' | 'video')[];
  hashtags?: string[];
  author?: any;
  raw_payload?: any;
}

// ============================================================
// 3. WEATHER EVENTS (Fused, Verified Spatiotemporal Weather Incidents)
// ============================================================
export interface WeatherEvent {
  id: string;
  event_type: WeatherEventType;
  title: string;
  description: string;
  severity: SeverityLevel;
  status: EventLifecycleStatus;
  
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country: string; // 'India'
  radius_m: number; // Geodesic boundary
  
  confidence_score: number; // 0.0 to 1.0 (e.g. 0.94 = 94%)
  
  first_detected_at: string; // ISO UTC
  last_updated_at: string; // ISO UTC
  verified_at?: string | null;
  resolved_at?: string | null;
  
  // Evidence counts and summaries
  signal_count: number;
  source_breakdown: {
    imd: number;
    weather_api: number;
    news: number;
    social_media: number;
    citizen: number;
    public_dataset: number;
  };
  
  ai_reasoning?: string | null;
  evidence_summary?: string[];
}

export interface WeatherEventInsert {
  id?: string;
  event_type: WeatherEventType;
  title: string;
  description?: string;
  severity?: SeverityLevel;
  status?: EventLifecycleStatus;
  latitude: number;
  longitude: number;
  city: string;
  state: string;
  country?: string;
  radius_m?: number;
  confidence_score?: number;
  first_detected_at?: string;
  last_updated_at?: string;
  verified_at?: string | null;
  resolved_at?: string | null;
  signal_count?: number;
  source_breakdown?: any;
  ai_reasoning?: string | null;
  evidence_summary?: string[];
}

// ============================================================
// 4. EVENT EVIDENCE & CORROBORATION
// ============================================================
export interface EventEvidence {
  id: string;
  event_id: string;
  signal_id: string;
  source_type: SourceType;
  source_name: string;
  credibility_weight: number;
  corroboration_factor: number;
  supporting_text: string;
  media_url?: string | null;
  created_at: string;
}

// ============================================================
// 5. EVENT CLUSTERS (SEDOM-DD Spatiotemporal Sub-events)
// ============================================================
export interface EventCluster {
  id: string;
  cluster_index: number;
  event_type_guess: WeatherEventType;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  signal_ids: string[];
  time_start: string;
  time_end: string;
  created_at: string;
}

// ============================================================
// 6. SOURCE REPUTATION
// ============================================================
export interface SourceReputation {
  source_id: string;
  source_name: string;
  source_type: SourceType;
  baseline_score: number;
  reputation_score: number; // Dynamic
  total_signals: number;
  verified_signals: number;
  misleading_signals: number;
  last_evaluated_at: string;
}

// ============================================================
// 7. VERIFICATION RECORDS (Human & AI Verification Trail)
// ============================================================
export interface VerificationRecord {
  id: string;
  target_type: 'signal' | 'event';
  target_id: string;
  action: 'VERIFY' | 'REJECT' | 'SUSPECT' | 'MERGE' | 'SPLIT' | 'RESOLVE';
  verified_by: 'ai_engine' | 'admin' | 'imd_official' | 'citizen_consensus';
  actor_id?: string;
  reason?: string;
  previous_status?: string;
  new_status?: string;
  confidence_before?: number;
  confidence_after?: number;
  created_at: string;
}

// ============================================================
// 8. CITIZEN WEATHER REPORT PAYLOAD
// ============================================================
export interface CitizenWeatherReportDto {
  text: string;
  latitude?: number;
  longitude?: number;
  city_hint?: string;
  state_hint?: string;
  event_type?: WeatherEventType;
  severity?: SeverityLevel;
  photos?: string[];
  videos?: string[];
  confidence: 'direct_observation' | 'uncertain' | 'hearsay';
  reporter_name?: string;
  reporter_phone?: string;
}

// ============================================================
// 9. MAP QUERY PARAMETERS
// ============================================================
export interface EventMapQueryParams {
  bbox?: string; // minLng,minLat,maxLng,maxLat
  event_type?: string; // Comma separated or single
  severity?: string;
  state?: string;
  start?: string;
  end?: string;
  status?: string;
  min_confidence?: number;
}
