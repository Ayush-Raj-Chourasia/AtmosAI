# WeatherNexus: Supabase Authoritative Cloud Architecture

**Smart India Hackathon 2026 (SIH26069)**  
**Target Ministry:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)

---

## 1. Architectural Overview

WeatherNexus consolidates meteorological data ingestion, cross-verification, multimodal AI analysis, and incident alerting into a single unified cloud backend powered by **Supabase**:

- **Database Engine:** Managed PostgreSQL 16 with PostGIS spatial geography extensions.
- **Identity & Access Management:** Supabase Auth integrated with custom `profiles` table defining 4 operational roles (`VIEWER`, `ANALYST`, `VERIFIER`, `ADMIN`).
- **Object Storage:** Supabase Storage with dedicated public buckets:
  - `weather-evidence`: Satellite imagery, radar scans, and official bulletins.
  - `citizen-media`: Crowdsourced eyewitness ground photographs and videos.
- **Security & Integrity:** Row-Level Security (RLS) active on all 13 tables with strict service-role bypass and role-scoped permissions.
- **Real-Time Streaming:** Supabase Realtime pub/sub channels synchronized with server-side SSE (`/api/v1/events/stream`).
- **Dual-Mode Resiliency:** When Supabase connection is established and tables are detected, operates in **`AUTHORITATIVE`** mode. If remote schema is pending or offline, operates in zero-crash **`OFFLINE_FALLBACK`** mode using persistent atomic disk storage.

```
                                  +---------------------------------------+
                                  |            External Ingestion         |
                                  | IMD, OWM, Open-Meteo, X/Twitter, RSS  |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |       WeatherNexus Backend Engine     |
                                  |       (server-nweis / Vercel API)     |
                                  +-------------------+-------------------+
                                                      |
                   +----------------------------------+----------------------------------+
                   |                                                                     |
                   v                                                                     v
  [AUTHORITATIVE CLOUD MODE]                                                   [OFFLINE FALLBACK MODE]
+------------------------------------+                                  +------------------------------------+
|          Supabase Cloud            |                                  |       Atomic Disk Persistence      |
| - PostgreSQL 16 + PostGIS          |                                  | - data/nweis-store.json            |
| - Row Level Security (RLS)         |                                  | - Local public/uploads/ cache      |
| - Supabase Storage (2 buckets)     |                                  | - In-Memory Spatiotemporal Tree    |
| - Supabase Auth & Realtime         |                                  +------------------------------------+
+------------------------------------+
```

---

## 2. Supabase Table Schema & Catalog (13 Core Tables)

Migration Script: `supabase/migrations/20260909000000_weathernexus_schema.sql`

| # | Table Name | Purpose | PostGIS / Spatial | RLS Scope |
|---|---|---|---|---|
| 1 | `profiles` | Operational user identity & role governance | None | Self-edit, Public view |
| 2 | `sources` | 12 Baseline meteorological ingestion providers | None | Public read, Admin manage |
| 3 | `signals` | Raw & normalized weather observations | `geom GEOGRAPHY(POINT, 4326)` | Citizen insert, Public read |
| 4 | `weather_events` | Authoritatively fused & verified incidents | `geom GEOGRAPHY(POINT, 4326)` | Forecaster update, Public read |
| 5 | `event_signals` | Many-to-many junction joining signals to events | None | Forecaster manage, Public read |
| 6 | `event_evidence` | Corroboration graph and multi-source proof | None | Forecaster manage, Public read |
| 7 | `event_clusters` | SEDOM-DD spatiotemporal sub-event clustering | Spatial centroids | System generated, Public read |
| 8 | `verification_records`| Immutable human & AI verification audit trail | None | Authenticated insert, Public read |
| 9 | `source_reputation` | Dynamic source credibility tracking & weights | None | System evaluated, Public read |
| 10 | `ai_predictions` | Gemini multimodal predictions & reasoning logs | None | Service role insert, Viewable |
| 11 | `admin_actions` | Security governance and administrative logs | None | Admin manage, Verifier insert |
| 12 | `media_metadata` | Object storage provenance & SHA-256 checksums | None | Citizen insert, Public read |
| 13 | `source_health` | Live telemetry, latency, and operational mode | None | Public read, System manage |

---

## 3. PostGIS Spatial Capabilities

All spatial entities contain native WGS84 geography columns generated dynamically:
```sql
ALTER TABLE weather_events ADD COLUMN geom GEOGRAPHY(POINT, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;
CREATE INDEX weather_events_geom_idx ON weather_events USING GIST (geom);
```

Proximity filtering utilizes indexed ST_DWithin and ST_Distance:
```sql
SELECT id, event_type, status, confidence_score, city, state,
       ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
FROM weather_events
WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
  AND status IN ('DETECTED', 'UNDER_REVIEW', 'VERIFIED')
ORDER BY distance_meters ASC;
```

---

## 4. 11 Official IMD Hazard Categories

All database constraints and AI prompts strictly adhere to IMD operational hazard classification:
1. `RAINFALL` (Heavy, Very Heavy, Extremely Heavy / Cloudburst)
2. `THUNDERSTORM` (Severe Thunderstorm, Squall)
3. `FLOOD` (Urban Waterlogging, Flash Flood, River Inundation)
4. `HEATWAVE` (Severe Heatwave, Loo Winds)
5. `COLD_WAVE` (Severe Cold Wave, Ground Frost)
6. `FOG` (Dense to Very Dense Fog, Airport Low-Visibility)
7. `DUST_STORM` (Andhi, Sandstorm)
8. `CYCLONE` (Cyclonic Storm, Super Cyclone, Storm Surge)
9. `STRONG_WIND` (Gale, Destructive Wind Gusts)
10. `HAILSTORM` (Large Hailstones, Crop Damage Hail)
11. `LIGHTNING` (Cloud-to-Ground Lightning, Vajrapat)

---

## 5. Applying the Schema Migration to Supabase

To apply the schema to the remote Supabase project (`https://huzfbxgwzzeqeosjisgi.supabase.co`):

1. Open the **Supabase Dashboard** -> Select Project **`huzfbxgwzzeqeosjisgi`**.
2. Navigate to **SQL Editor** -> **New Query**.
3. Copy the contents of `supabase/migrations/20260909000000_weathernexus_schema.sql`.
4. Click **Run**.
5. All 13 tables, PostGIS indexes, RLS policies, and storage buckets will be instantly provisioned.
6. The server will detect the live tables and log:
   ```
   [SUPABASE] Mode: AUTHORITATIVE — Supabase PostgreSQL + PostGIS connected.
   [SUPABASE] Hydration complete: X events, Y signals.
   ```
