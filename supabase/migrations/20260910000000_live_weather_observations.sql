-- ============================================================
-- WeatherNexus / AtmosAI Migration: Live Weather Observations & Data Modes
-- SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
-- ============================================================

-- 1. Ensure data_mode column exists on signals and weather_events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'signals' AND column_name = 'data_mode'
  ) THEN
    ALTER TABLE signals ADD COLUMN data_mode TEXT NOT NULL DEFAULT 'LIVE'
      CHECK (data_mode IN ('LIVE', 'DEMO', 'REPLAY', 'MOCK', 'OFFLINE'));
    CREATE INDEX IF NOT EXISTS signals_data_mode_idx ON signals (data_mode);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weather_events' AND column_name = 'data_mode'
  ) THEN
    ALTER TABLE weather_events ADD COLUMN data_mode TEXT NOT NULL DEFAULT 'LIVE'
      CHECK (data_mode IN ('LIVE', 'DEMO', 'REPLAY', 'MOCK', 'OFFLINE'));
    CREATE INDEX IF NOT EXISTS weather_events_data_mode_idx ON weather_events (data_mode);
  END IF;
END $$;

-- 2. Time-series table for granular meteorological observations
CREATE TABLE IF NOT EXISTS weather_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'India',
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  
  temperature_c NUMERIC NOT NULL,
  feels_like_c NUMERIC,
  humidity_pct NUMERIC,
  pressure_hpa NUMERIC,
  wind_speed_kmh NUMERIC,
  wind_gust_kmh NUMERIC,
  wind_deg NUMERIC,
  precipitation_mm NUMERIC DEFAULT 0,
  visibility_m INT,
  cloud_cover_pct INT,
  
  weather_condition TEXT,
  weather_id INT,
  weather_description TEXT,
  
  provider TEXT NOT NULL DEFAULT 'OpenWeather',
  provider_timestamp TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_mode TEXT NOT NULL DEFAULT 'LIVE' CHECK (data_mode IN ('LIVE', 'DEMO', 'REPLAY', 'MOCK', 'OFFLINE')),
  raw_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS obs_city_state_idx ON weather_observations (state, city);
CREATE INDEX IF NOT EXISTS obs_provider_time_idx ON weather_observations (provider_timestamp DESC);
CREATE INDEX IF NOT EXISTS obs_data_mode_idx ON weather_observations (data_mode);

-- PostGIS Point for weather_observations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weather_observations' AND column_name = 'geom') THEN
    ALTER TABLE weather_observations ADD COLUMN geom GEOGRAPHY(POINT, 4326)
      GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
    CREATE INDEX IF NOT EXISTS weather_observations_geom_idx ON weather_observations USING GIST (geom);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping PostGIS column on weather_observations: %', SQLERRM;
END $$;
