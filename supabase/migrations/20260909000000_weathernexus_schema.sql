-- ============================================================
-- WeatherNexus: National Weather Event Intelligence System
-- SIH 2026 Problem Statement SIH26069
-- Unified PostgreSQL + PostGIS Production Schema for Supabase
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
-- 0. PROFILES (Supabase Auth Users & Role-Based Access)
-- Roles: VIEWER (public), ANALYST (researchers), VERIFIER (duty forecasters), ADMIN (IMD executive)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'VIEWER' CHECK (
    role IN ('VIEWER', 'ANALYST', 'VERIFIER', 'ADMIN')
  ),
  agency TEXT DEFAULT 'India Meteorological Department',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
    event_candidate IN (
      'RAINFALL', 'THUNDERSTORM', 'FLOOD', 'HEATWAVE', 'COLD_WAVE',
      'FOG', 'DUST_STORM', 'CYCLONE', 'STRONG_WIND', 'HAILSTORM', 'LIGHTNING', 'OTHER'
    )
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
    event_type IN (
      'RAINFALL', 'THUNDERSTORM', 'FLOOD', 'HEATWAVE', 'COLD_WAVE',
      'FOG', 'DUST_STORM', 'CYCLONE', 'STRONG_WIND', 'HAILSTORM', 'LIGHTNING', 'OTHER'
    )
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

-- View/alias for ai_evaluations
CREATE OR REPLACE VIEW ai_evaluations AS SELECT * FROM ai_predictions;

CREATE TABLE IF NOT EXISTS admin_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user TEXT NOT NULL DEFAULT 'admin@imd.gov.in',
  action_type TEXT NOT NULL,
  target_id UUID,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 11. MEDIA METADATA (Supabase Object Storage Provenance & Checksums)
-- ============================================================
CREATE TABLE IF NOT EXISTS media_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id TEXT NOT NULL UNIQUE,
  event_id UUID REFERENCES weather_events(id) ON DELETE SET NULL,
  signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
  object_key TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  checksum TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'SUPABASE_STORAGE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_metadata_event_idx ON media_metadata (event_id);
CREATE INDEX IF NOT EXISTS media_metadata_signal_idx ON media_metadata (signal_id);
CREATE INDEX IF NOT EXISTS media_metadata_checksum_idx ON media_metadata (checksum);

-- ============================================================
-- 12. SOURCE HEALTH (Real-time Telemetry Monitor)
-- ============================================================
CREATE TABLE IF NOT EXISTS source_health (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'DEGRADED', 'OFFLINE', 'STANDBY', 'REPLAY')),
  latency_ms INT DEFAULT 0,
  records_fetched INT DEFAULT 0,
  records_accepted INT DEFAULT 0,
  last_fetch_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 13. SUPABASE STORAGE BUCKETS
-- Buckets: weather-evidence, citizen-media
-- ============================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('weather-evidence', 'weather-evidence', true),
           ('citizen-media', 'citizen-media', true)
    ON CONFLICT (id) DO NOTHING;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping storage bucket creation: %', SQLERRM;
END $$;

-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict Security: Service role has full bypass.
-- Public & Authenticated users have read access to published events & sources.
-- Citizen submissions allowed for signals and media uploads.
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_health ENABLE ROW LEVEL SECURITY;

-- Service Role Full Access Policies
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS service_role_all ON %I', tbl);
    EXECUTE format('CREATE POLICY service_role_all ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
  END LOOP;
END $$;

-- Public Read Policies
CREATE POLICY "Public Read Weather Events" ON weather_events FOR SELECT USING (true);
CREATE POLICY "Public Read Sources" ON sources FOR SELECT USING (is_active = true);
CREATE POLICY "Public Read Signals" ON signals FOR SELECT USING (verification_status IN ('VERIFIED', 'UNVERIFIED'));
CREATE POLICY "Public Read Evidence" ON event_evidence FOR SELECT USING (true);
CREATE POLICY "Public Read Media" ON media_metadata FOR SELECT USING (true);
CREATE POLICY "Public Read Health" ON source_health FOR SELECT USING (true);

-- Citizen / Anon Ingestion Policies
CREATE POLICY "Citizen Insert Signals" ON signals FOR INSERT WITH CHECK (source_type = 'citizen');
CREATE POLICY "Citizen Insert Media Metadata" ON media_metadata FOR INSERT WITH CHECK (true);

-- Authenticated Verifiers / Analysts
CREATE POLICY "Forecaster Manage Events" ON weather_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Forecaster Insert Verification" ON verification_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admin Manage Actions" ON admin_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 15. POSTGIS SPATIAL FUNCTIONS & STORED PROCEDURES
-- ============================================================
CREATE OR REPLACE FUNCTION find_events_nearby(
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  radius_meters DOUBLE PRECISION DEFAULT 15000
)
RETURNS TABLE (
  id UUID,
  event_type TEXT,
  title TEXT,
  severity TEXT,
  status TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  city TEXT,
  state TEXT,
  confidence_score NUMERIC,
  distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    id, event_type, title, severity, status, latitude, longitude, city, state, confidence_score,
    ST_Distance(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography) AS distance_meters
  FROM weather_events
  WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_meters)
    AND status IN ('DETECTED', 'UNDER_REVIEW', 'VERIFIED', 'ACTIVE')
  ORDER BY distance_meters ASC;
$$;

