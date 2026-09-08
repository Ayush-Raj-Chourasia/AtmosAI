# N-WEIS Database Schema & Persistence Architecture

**Database Engines:** PostgreSQL 16 + PostGIS 3.4 & Crash-Resilient Atomic Disk Storage  
**Schema Authority:** `apps/api/src/database/schema.sql`  
**Data Access Layer:** `database/db.mjs`  

---

## 1. Authoritative Relational & Spatial Schema (10 Tables)

The N-WEIS schema is designed to support high-throughput spatiotemporal meteorological indexing and immutable auditing.

```
                      +-----------------------------+
                      |           sources           |
                      +-----------------------------+
                                     | 1
                                     |
                                     | N
+--------------------+ 1     N +-----------------------------+
|   weather_events   |---------|           signals           |
+--------------------+         +-----------------------------+
          | 1                                | 1
          |                                  |
          | N                                | N
+--------------------+         +-----------------------------+
|   event_evidence   |         |    verification_records     |
+--------------------+         +-----------------------------+
          | 1
          |
          | N
+--------------------+
|   admin_actions    |
+--------------------+
```

### Table 1: `sources`
Tracks heterogeneous ingestion providers, baseline credibility, and operational telemetry.
- `id` (VARCHAR PK): Unique identifier (`src_imd`, `src_meteo_01`, `src_social`).
- `name` (VARCHAR): Human-readable name.
- `source_type` (VARCHAR): `imd`, `weather_api`, `news`, `social_media`, `citizen`, `public_dataset`.
- `base_reliability` (FLOAT): Initial credibility score (0.0 to 1.0).
- `mode` (VARCHAR): `LIVE`, `REPLAY`, `MOCK`, `OFFICIAL`.
- `status` (VARCHAR): `ONLINE`, `STANDBY`, `DEGRADED`.
- `created_at` / `updated_at` (TIMESTAMPTZ).

### Table 2: `signals`
Central ingestion log for every normalized meteorological observation.
- `id` (VARCHAR PK): e.g. `sig_1725773940123_abcde`.
- `source_id` (VARCHAR FK -> sources.id).
- `external_id` (VARCHAR): Source platform reference identifier.
- `text` (TEXT): Normalized observation text.
- `latitude` / `longitude` (DECIMAL(9,6)): Geocoded coordinates.
- `geom` (GEOMETRY(Point, 4326)): Native PostGIS point geometry with GIST spatial indexing.
- `city` / `state` (VARCHAR): Toponymy resolution.
- `location_confidence` (FLOAT): Coordinate precision score.
- `event_candidate` (VARCHAR): Class from IMD 8-Category Taxonomy.
- `credibility_score` / `misinformation_score` (FLOAT).
- `verification_status` (VARCHAR): `VERIFIED`, `UNVERIFIED`, `REJECTED`.
- `is_duplicate` (BOOLEAN): Deduplication flag.
- `parent_signal_id` (VARCHAR): Reference to primary signal if duplicate.
- `raw_payload` (JSONB): Complete source payload for forensic verification.

### Table 3: `weather_events`
Active or historical disaster incidents synthesized from corroborated signals.
- `id` (VARCHAR PK): e.g. `evt_guwahati_flood_101`.
- `event_type` (VARCHAR): `FLOOD`, `THUNDERSTORM`, `RAINFALL`, `HEATWAVE`, `FOG`, `DUST_STORM`, `STRONG_WIND`, `OTHER`.
- `severity` (VARCHAR): `minor`, `moderate`, `severe`, `critical`.
- `status` (VARCHAR): `DETECTED`, `UNDER_REVIEW`, `VERIFIED`, `RESOLVED`, `FALSE_ALARM`.
- `confidence` (FLOAT): 7-Factor Fused Confidence ($0.0 \dots 1.0$).
- `latitude` / `longitude` (DECIMAL(9,6)): Centroid coordinates.
- `geom` (GEOMETRY(Point, 4326)): PostGIS centroid geometry.
- `radius_km` (FLOAT): Impact perimeter radius.
- `city` / `state` (VARCHAR): Impact administrative boundaries.
- `first_detected_at` / `last_evidence_at` (TIMESTAMPTZ): Temporal bounds.

### Table 4: `event_signals` (Junction Table)
Many-to-many relationship mapping signals to associated weather incidents.

### Table 5: `event_evidence`
Immutable record of observational evidence reinforcing an incident.
- `id` (VARCHAR PK).
- `event_id` (VARCHAR FK -> weather_events.id).
- `signal_id` (VARCHAR FK -> signals.id).
- `source_type` (VARCHAR).
- `supporting_text` (TEXT).
- `media_url` (TEXT).
- `created_at` (TIMESTAMPTZ).

### Table 6: `verification_records`
Quarantine and moderation log for flagged misinformation or administrative overrides.

### Table 7: `source_reputation`
Dynamic Bayesian reputation tracker for sources based on verified true vs false reports.

### Table 8: `admin_actions` (Lifecycle Audit Trail)
Tamper-evident audit log recording every FSM state transition with actor, timestamp, and rationale.

### Table 9: `ai_predictions`
Predicted trajectory, wind gust modeling, and estimated precipitation totals.

### Table 10: `event_clusters`
Aggregated spatiotemporal clusters for multi-district disaster heatmaps.

---

## 2. PostGIS Spatial Query Patterns

When running on PostgreSQL with PostGIS enabled, N-WEIS utilizes native spatial indexing:

### 1. Spatial Proximity Clustering (5 km Radius)
```sql
SELECT id, event_type, confidence,
       ST_DistanceSphere(geom, ST_MakePoint($1, $2)) AS distance_meters
FROM weather_events
WHERE status IN ('DETECTED', 'UNDER_REVIEW', 'VERIFIED')
  AND ST_DWithin(geom::geography, ST_MakePoint($1, $2)::geography, 15000)
ORDER BY distance_meters ASC;
```

### 2. Spatiotemporal Cluster Bounding Box
```sql
SELECT ST_AsGeoJSON(ST_ConvexHull(ST_Collect(geom))) AS polygon_geojson,
       COUNT(*) AS total_signals
FROM signals
WHERE event_candidate = 'FLOOD'
  AND ingested_at >= NOW() - INTERVAL '6 hours';
```

---

## 3. Atomic Disk Persistence Fallback

For local demonstrations, hackathon judging, or edge deployment without external database dependencies:
1. State is serialized as standard JSON to a temporary file: `data/nweis-store.json.tmp`.
2. The file is flushed to physical disk (`fs.writeFileSync`).
3. An atomic rename (`fs.renameSync`) swaps the temporary file to `data/nweis-store.json`.
4. This ensures that even if power is abruptly severed mid-write, the database file remains 100% integral and uncorrupted.

---

## 4. Database Management CLI

| Command | Purpose |
|---|---|
| `npm run db:migrate` | Applies `apps/api/src/database/schema.sql` to PostgreSQL instance |
| `npm run db:seed` | Populates database with 4 realistic Indian disaster scenarios & telemetry |
| `npm run db:reset` | Flushes all tables and resets state to clean baseline |
