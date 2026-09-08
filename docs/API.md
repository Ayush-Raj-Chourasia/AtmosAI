# N-WEIS API Specification & Integration Guide

**Base URL:** `http://localhost:3001` (or production host)  
**Standard:** REST + Server-Sent Events (SSE) + OASIS CAP v1.2 / ITU-T X.1303  
**Format:** JSON / XML / GeoJSON (RFC 7946) / KML 2.2 / CSV  

---

## 1. System Health & Source Telemetry

### `GET /health`
Returns system operational state, active database engine, connector telemetry, and service statuses.

**Response Example (200 OK):**
```json
{
  "name": "N-WEIS API",
  "status": "ONLINE",
  "target": "Ministry of Earth Sciences / India Meteorological Department (IMD)",
  "problemStatement": "SIH26069",
  "version": "1.0.0",
  "uptime_seconds": 124,
  "activeEvents": 8,
  "activeSignals": 16,
  "sseClients": 1,
  "database": "POSTGRESQL_POSTGIS" or "ATOMIC_JSON_STORE",
  "postgres_connected": true,
  "storage": {
    "storage_type": "POSTGRESQL_POSTGIS",
    "counts": { "sources": 8, "signals": 16, "events": 8, "evidence": 12 }
  },
  "connectors": {
    "weather_api": { "status": "ONLINE", "mode": "LIVE", "recordsAccepted": 10 },
    "imd_adapter": { "status": "ONLINE", "mode": "REPLAY", "recordsAccepted": 4 },
    "news_rss": { "status": "ONLINE", "mode": "LIVE" },
    "social_stream": { "status": "ONLINE", "mode": "REPLAY" },
    "public_dataset": { "status": "ONLINE", "mode": "DATASET_INGEST" }
  },
  "services": {
    "api": "ONLINE",
    "sse": "ONLINE",
    "database": "ONLINE",
    "ai_engine": "ONLINE",
    "geo_resolver": "ONLINE",
    "dedup_engine": "ONLINE",
    "connectors": "ONLINE"
  }
}
```

### `GET /api/v1/sources`
Returns real-time operational status, ingestion metrics, and reliability coefficients for all 8 ingestion vectors.

---

## 2. Signal & Crowdsourced Ingestion

### `POST /api/v1/signals`
Generic ingestion route for automated meteorological data feeds.

**Request Payload:**
```json
{
  "source_type": "weather_api | news | social_media | imd | citizen",
  "source_name": "Open-Meteo Mumbai Station",
  "external_id": "meteo_mum_1029",
  "text": "Intense rain recorded at Colaba observatory: 68 mm in past 2 hours. Localized waterlogging reported.",
  "latitude": 18.9067,
  "longitude": 72.8147,
  "city": "Mumbai",
  "state": "Maharashtra",
  "media_urls": []
}
```

### `POST /api/v1/citizen-reports`
Crowdsourced public incident reporting endpoint.

**Request Payload:**
```json
{
  "reporter_name": "Rohan Sharma",
  "text": "Severe waterlogging near Jalukbari flyover Guwahati, water waist deep. Vehicles stranded.",
  "latitude": 26.15,
  "longitude": 91.66,
  "city_hint": "Guwahati",
  "state_hint": "Assam",
  "event_type": "FLOOD",
  "photos": ["https://images.unsplash.com/photo-1547683905-f686c993aae5"]
}
```

### `POST /api/v1/public-datasets/ingest`
Triggers bulk ingestion of validated public meteorological records.

---

## 3. Incident Management & Intelligence

### `GET /api/v1/events`
Returns list of active weather incidents with filter query parameters.
- Query parameters:
  - `status`: `DETECTED` | `UNDER_REVIEW` | `VERIFIED` | `RESOLVED` | `FALSE_ALARM`
  - `event_type`: `FLOOD` | `THUNDERSTORM` | `RAINFALL` | `HEATWAVE` | `FOG` | `DUST_STORM` | `STRONG_WIND` | `OTHER`
  - `min_confidence`: e.g. `0.80`

### `GET /api/v1/events/:id`
Returns detailed incident record including 7-factor score breakdown and corroborated evidence signals.

### `PATCH /api/v1/events/:id/status` (or `POST /api/v1/events/:id/verify`)
Manual verification and lifecycle transition by Duty Meteorologist.

**Request Payload:**
```json
{
  "status": "VERIFIED",
  "reason": "Corroborated by CWC Pandu river gauge reading exceeding danger level",
  "officer_name": "Dr. M. Mohapatra (IMD DG / Duty Meteorologist)"
}
```

---

## 4. Operational Dispatches & Early Warnings

### `POST /api/v1/events/:id/broadcast-cap`
Generates OASIS CAP v1.2 XML for cellular emergency broadcast.
- Query param: `lang=hi|as|bn|kn` for Indic multilingual localization.

**Response Schema:**
```json
{
  "success": true,
  "broadcast_id": "CBC-1725774120-X8J2",
  "alert_id": "urn:oid:2.49.0.0.356.0.nweis.evt_guwahati_flood",
  "protocol": "OASIS CAP v1.2 / ITU-T X.1303 Cell Broadcast Service (CBS)",
  "target_area": {
    "city": "Guwahati",
    "state": "Assam",
    "center": [26.18, 91.75],
    "radius_km": 15.0,
    "telecom_towers_alerted": 48,
    "estimated_reach_population": 142000
  },
  "cap_xml": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>...",
  "dispatched_at": "2026-09-08T05:42:00.000Z"
}
```

### `POST /api/v1/events/:id/dispatch-volunteers`
Mobilizes State Disaster Response Forces (SDRF) and NDMA Aapda Mitra volunteers with SMS payloads conformant to 160-character cellular limit.

### `GET /api/v1/events/:id/sitrep`
Generates NDMA/IMD Situation Report with Grade-A operational directives and tamper-evident SHA-256 digital sign-off hash.

---

## 5. GIS & Data Interoperability

| Format | Endpoint | Standard Specification |
|---|---|---|
| **GeoJSON** | `GET /api/v1/events/geojson` | RFC 7946 FeatureCollection (OGC CRS84) |
| **KML** | `GET /api/v1/events/kml` | OGC KML 2.2 XML with 3D Placemarks |
| **CSV** | `GET /api/v1/events/csv` | Tabular RFC 4180 export with GIS coordinates |

---

## 6. Real-Time Streaming

### `GET /api/v1/events/stream`
Server-Sent Events (SSE) channel. Keeps browser dashboards synchronized with zero polling.

**Event Types Emitted:**
- `incident_update`: Fired whenever an event is created, reinforced, or decays.
- `signal_processed`: Fired when an incoming signal is corroborated into an event.
- `signal_rejected`: Fired when the Skeptic engine quarantines a fraudulent report.
- `cell_broadcast_alert`: Fired when a CAP broadcast is triggered.
- `volunteer_dispatch_alert`: Fired when SDRF volunteers are mobilized.
- `demo_scenario_loaded`: Fired when an admin scenario is executed.
