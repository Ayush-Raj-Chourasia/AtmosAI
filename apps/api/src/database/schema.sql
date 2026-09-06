-- ============================================================
-- N-WEIS: National Weather Event Intelligence System
-- SIH 2026 Problem Statement SIH26069
-- Unified PostgreSQL + PostGIS Production Schema
-- Target: Ministry of Earth Sciences / India Meteorological Department (IMD)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PostGIS extension (enabled if installed in PostgreSQL)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS extension not available: %', SQLERRM;
END $$;

-- ============================================================
-- 1. SOURCES
-- ============================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('imd', 'weather_api', 'news', 'social_media', 'citizen', 'public_dataset')
  ),
  endpoint_url TEXT,
  base_reliability NUMERIC NOT NULL DEFAULT 0.5 CHECK (base_reliability BETWEEN 0 AND 1),
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Baseline Sources
INSERT INTO sources (name, source_type, base_reliability, is_active)
VALUES
  ('IMD Official API', 'imd', 1.00, true),
  ('National Disaster Management Authority (NDMA)', 'imd', 0.98, true),
  ('Central Water Commission (CWC Flood)', 'imd', 0.95, true),
  ('Open-Meteo Weather API', 'weather_api', 0.90, true),
  ('OpenWeatherMap API', 'weather_api', 0.88, true),
  ('Times of India Weather RSS', 'news', 0.85, true),
  ('NDTV India Weather RSS', 'news', 0.85, true),
  ('Citizen Verified Reporters', 'citizen', 0.70, true),
  ('Public Citizen Submissions', 'citizen', 0.55, true),
  ('Social Media Stream (X/Twitter #IMD)', 'social_media', 0.35, true),
  ('Anonymous Reposts & Viral Streams', 'social_media', 0.20, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- 2. SIGNALS (Normalized Raw Weather Ingestion)
-- ============================================================
CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (
    source_type IN ('imd', 'weather_api', 'news', 'social_media', 'citizen', 'public_dataset')
  ),
  source_name TEXT,
  external_id TEXT,
  text TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  city TEXT,
  state TEXT,
  country TEXT NOT NULL DEFAULT 'India',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_confidence NUMERIC NOT NULL DEFAULT 0.5 CHECK (location_confidence BETWEEN 0 AND 1),
  location_method TEXT,
  
  event_candidate TEXT CHECK (
    event_candidate IN ('RAINFALL', 'THUNDERSTORM', 'FLOOD', 'HEATWAVE', 'FOG', 'DUST_STORM', 'STRONG_WIND', 'OTHER')
  ),
  relevance_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (relevance_score BETWEEN 0 AND 1),
  credibility_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (credibility_score BETWEEN 0 AND 1),
  misinformation_score NUMERIC NOT NULL DEFAULT 0.0 CHECK (misinformation_score BETWEEN 0 AND 1),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
    verification_status IN ('UNVERIFIED', 'PROCESSING', 'VERIFIED', 'SUSPECTED', 'REJECTED')
  ),
  
  media_urls JSONB DEFAULT '[]'::jsonb,
  media_types JSONB DEFAULT '[]'::jsonb,
  hashtags JSONB DEFAULT '[]'::jsonb,
  author JSONB DEFAULT '{}'::jsonb,
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signals_timestamp_idx ON signals (timestamp DESC);
CREATE INDEX IF NOT EXISTS signals_status_idx ON signals (verification_status);
CREATE INDEX IF NOT EXISTS signals_event_idx ON signals (event_candidate);
CREATE INDEX IF NOT EXISTS signals_city_state_idx ON signals (state, city);

-- PostGIS Geometry for Signals
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'signals' AND column_name = 'geom') THEN
    ALTER TABLE signals ADD COLUMN geom GEOGRAPHY(POINT, 4326)
      GENERATED ALWAYS AS (CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography ELSE NULL END) STORED;
    CREATE INDEX IF NOT EXISTS signals_geom_idx ON signals USING GIST (geom);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping PostGIS column on signals: %', SQLERRM;
END $$;

-- ============================================================
-- 3. WEATHER EVENTS (Verified, Fused Weather Incidents)
-- ============================================================
CREATE TABLE IF NOT EXISTS weather_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (
    event_type IN ('RAINFALL', 'THUNDERSTORM', 'FLOOD', 'HEATWAVE', 'FOG', 'DUST_STORM', 'STRONG_WIND', 'OTHER')
  ),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'DETECTED' CHECK (
    status IN ('DETECTED', 'UNDER_REVIEW', 'VERIFIED', 'ACTIVE', 'RESOLVED')
  ),
  
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  radius_m INT NOT NULL DEFAULT 5000,
  
  confidence_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (confidence_score BETWEEN 0 AND 1),
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  
  signal_count INT NOT NULL DEFAULT 1,
  source_breakdown JSONB DEFAULT '{"imd":0,"weather_api":0,"news":0,"social_media":0,"citizen":0,"public_dataset":0}'::jsonb,
  ai_reasoning TEXT,
  evidence_summary JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS weather_events_status_idx ON weather_events (status);
CREATE INDEX IF NOT EXISTS weather_events_type_idx ON weather_events (event_type);
CREATE INDEX IF NOT EXISTS weather_events_state_city_idx ON weather_events (state, city);
CREATE INDEX IF NOT EXISTS weather_events_time_idx ON weather_events (last_updated_at DESC);

-- PostGIS Geometry for Weather Events
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weather_events' AND column_name = 'geom') THEN
    ALTER TABLE weather_events ADD COLUMN geom GEOGRAPHY(POINT, 4326)
      GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
    CREATE INDEX IF NOT EXISTS weather_events_geom_idx ON weather_events USING GIST (geom);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping PostGIS column on weather_events: %', SQLERRM;
END $$;

-- ============================================================
-- 4. EVENT SIGNALS (M:N Join)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_signals (
  event_id UUID NOT NULL REFERENCES weather_events(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, signal_id)
);

-- ============================================================
-- 5. EVENT EVIDENCE (Corroboration Graph)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES weather_events(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_name TEXT NOT NULL,
  credibility_weight NUMERIC NOT NULL DEFAULT 0.5,
  corroboration_factor NUMERIC NOT NULL DEFAULT 1.0,
  supporting_text TEXT NOT NULL,
  media_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_evidence_event_idx ON event_evidence (event_id);

-- ============================================================
-- 6. EVENT CLUSTERS (SEDOM-DD Spatiotemporal Sub-events)
-- ============================================================
CREATE TABLE IF NOT EXISTS event_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_index INT NOT NULL,
  event_type_guess TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius_km NUMERIC NOT NULL DEFAULT 5.0,
  signal_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_start TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. VERIFICATION RECORDS (Human & AI Audit Trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS verification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('signal', 'event')),
  target_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('VERIFY', 'REJECT', 'SUSPECT', 'MERGE', 'SPLIT', 'RESOLVE')),
  verified_by TEXT NOT NULL CHECK (verified_by IN ('ai_engine', 'admin', 'imd_official', 'citizen_consensus')),
  actor_id TEXT,
  reason TEXT,
  previous_status TEXT,
  new_status TEXT,
  confidence_before NUMERIC,
  confidence_after NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS verification_records_target_idx ON verification_records (target_id, created_at DESC);

-- ============================================================
-- 8. SOURCE REPUTATION (Dynamic Credibility Tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS source_reputation (
  source_id UUID PRIMARY KEY REFERENCES sources(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  baseline_score NUMERIC NOT NULL DEFAULT 0.5,
  reputation_score NUMERIC NOT NULL DEFAULT 0.5,
  total_signals INT NOT NULL DEFAULT 0,
  verified_signals INT NOT NULL DEFAULT 0,
  misleading_signals INT NOT NULL DEFAULT 0,
  last_evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9. AI PREDICTIONS & AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
  event_id UUID REFERENCES weather_events(id) ON DELETE SET NULL,
  model TEXT NOT NULL,
  prediction_type TEXT NOT NULL,
  raw_output JSONB NOT NULL,
  confidence NUMERIC,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user TEXT NOT NULL DEFAULT 'admin@imd.gov.in',
  action_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
