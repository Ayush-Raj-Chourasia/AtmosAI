-- ============================================================
-- Disaster Intelligence Platform
-- Full Baseline SQL Schema (PostgreSQL + PostGIS)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- USERS & TRUST
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_score NUMERIC NOT NULL DEFAULT 0.5 CHECK (trust_score BETWEEN 0 AND 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- USER PLACES (STATIC, USER-DEFINED LOCATIONS)
-- ============================================================

CREATE TABLE user_places (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  label TEXT NOT NULL,

  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  geom GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) STORED,

  radius_m INT NOT NULL DEFAULT 3000,
  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_place_preferences (
  user_place_id UUID PRIMARY KEY REFERENCES user_places(id) ON DELETE CASCADE,

  notify_flood BOOLEAN NOT NULL DEFAULT true,
  notify_earthquake BOOLEAN NOT NULL DEFAULT true,
  notify_landslide BOOLEAN NOT NULL DEFAULT true,
  notify_fire BOOLEAN NOT NULL DEFAULT true,
  notify_power_outage BOOLEAN NOT NULL DEFAULT true,

  min_confidence NUMERIC NOT NULL DEFAULT 0.7 CHECK (min_confidence BETWEEN 0 AND 1)
);

-- ============================================================
-- RAW TIKTOK LOG (DEDUPLICATION)
-- ============================================================

CREATE TABLE tiktok_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tiktok_id TEXT NOT NULL UNIQUE,
  author TEXT,
  text TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- RAW SIGNAL INGESTION
-- ============================================================

CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source TEXT NOT NULL CHECK (
    source IN ('user_report', 'social_media', 'news', 'sensor', 'tiktok_ai')
  ),

  text TEXT,

  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  geom GEOGRAPHY(POINT, 4326)
    GENERATED ALWAYS AS (CASE WHEN lat IS NOT NULL AND lng IS NOT NULL THEN ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography ELSE NULL END) STORED,

  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),

  event_type TEXT,
  city_hint TEXT,
  happened_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),

  raw_payload JSONB
);

CREATE INDEX signals_geom_idx ON signals USING GIST (geom);
CREATE INDEX signals_created_at_idx ON signals (created_at DESC);

-- ============================================================
-- USER REPORTS (STRUCTURED SIGNALS)
-- ============================================================

CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,

  confidence TEXT CHECK (
    confidence IN ('direct_observation', 'uncertain', 'hearsay')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, signal_id)
);

-- ============================================================
-- CLUSTERS (PLACE + TIME CONTAINERS)
-- ============================================================

CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  city TEXT NOT NULL,
  event_type_guess TEXT,

  time_start TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ NOT NULL,

  status TEXT NOT NULL CHECK (
    status IN ('monitor', 'alert', 'suppress', 'resolved')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX clusters_time_idx ON clusters (time_start DESC, time_end DESC);

CREATE TABLE cluster_signals (
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  PRIMARY KEY (cluster_id, signal_id)
);

CREATE TABLE cluster_metrics (
  cluster_id UUID PRIMARY KEY REFERENCES clusters(id) ON DELETE CASCADE,

  report_count INT NOT NULL DEFAULT 0,
  unique_reporters INT NOT NULL DEFAULT 0,
  verification_count INT NOT NULL DEFAULT 0,
  verification_velocity_per_min NUMERIC,

  media_count INT NOT NULL DEFAULT 0,
  sensor_alignment BOOLEAN,

  last_updated TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cluster_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,

  reason TEXT,
  triggered_by TEXT NOT NULL CHECK (
    triggered_by IN ('ai', 'system', 'admin')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- INCIDENTS (MULTIPLE PER CLUSTER)
-- ============================================================

CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL CHECK (
    event_type IN ('flood', 'landslide', 'fire', 'earthquake', 'power_outage', 'other')
  ),

  severity TEXT CHECK (severity IN ('low', 'medium', 'high')),
  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),

  status TEXT NOT NULL CHECK (
    status IN ('monitor', 'alert', 'suppress', 'resolved')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX incidents_cluster_idx ON incidents (cluster_id);
CREATE INDEX incidents_status_idx ON incidents (status);

CREATE TABLE incident_signals (
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  PRIMARY KEY (incident_id, signal_id)
);

CREATE TABLE incident_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cluster_id UUID NOT NULL REFERENCES clusters(id) ON DELETE CASCADE,
  from_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  to_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,

  relation_type TEXT NOT NULL CHECK (
    relation_type IN ('causes', 'increases_risk', 'correlated')
  ),

  strength NUMERIC CHECK (strength BETWEEN 0 AND 1),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (from_incident_id <> to_incident_id)
);

CREATE TABLE incident_lifecycle (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,

  reason TEXT,
  triggered_by TEXT NOT NULL CHECK (
    triggered_by IN ('ai', 'system', 'admin')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- VERIFICATIONS (PEER OBSERVATIONS)
-- ============================================================

CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (
    type IN ('confirm', 'still_happening', 'false', 'resolved')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (incident_id, user_id, type)
);

CREATE INDEX verifications_incident_idx
  ON verifications (incident_id, created_at DESC);

-- ============================================================
-- AI EVALUATIONS (IMMUTABLE)
-- ============================================================

CREATE TABLE ai_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  cluster_id UUID REFERENCES clusters(id) ON DELETE CASCADE,
  incident_id UUID REFERENCES incidents(id) ON DELETE CASCADE,

  model TEXT NOT NULL,

  confidence_score NUMERIC CHECK (confidence_score BETWEEN 0 AND 1),
  consistency_assessment TEXT CHECK (
    consistency_assessment IN ('strong', 'moderate', 'weak')
  ),
  recommended_action TEXT CHECK (
    recommended_action IN ('monitor', 'alert', 'suppress')
  ),

  explanation TEXT,
  raw_response JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (
    (cluster_id IS NOT NULL AND incident_id IS NULL)
    OR
    (cluster_id IS NULL AND incident_id IS NOT NULL)
  )
);

-- ============================================================
-- NOTIFICATIONS (DECISIONS, NOT MESSAGES)
-- ============================================================

CREATE TABLE user_notification_state (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_place_id UUID NOT NULL REFERENCES user_places(id) ON DELETE CASCADE,

  last_notified_status TEXT CHECK (
    last_notified_status IN ('monitor', 'alert', 'resolved')
  ),
  last_notified_at TIMESTAMPTZ,

  PRIMARY KEY (user_id, incident_id, user_place_id)
);

CREATE TABLE notification_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  user_place_id UUID NOT NULL REFERENCES user_places(id) ON DELETE CASCADE,

  notification_type TEXT NOT NULL CHECK (
    notification_type IN ('incident_alert', 'incident_resolved')
  ),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX notification_outbox_expires_idx
  ON notification_outbox (expires_at);

CREATE TABLE notification_audit (
  day DATE NOT NULL,
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  notified_user_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, incident_id)
);

-- ============================================================
-- HELPER VIEW (OPTIONAL)
-- ============================================================

CREATE VIEW cluster_active_incidents AS
SELECT
  c.id AS cluster_id,
  c.city,
  c.status AS cluster_status,
  COUNT(*) FILTER (WHERE i.status IN ('monitor', 'alert')) AS active_incidents,
  COUNT(*) FILTER (WHERE i.status = 'alert') AS alert_incidents
FROM clusters c
JOIN incidents i ON i.cluster_id = c.id
GROUP BY c.id;
