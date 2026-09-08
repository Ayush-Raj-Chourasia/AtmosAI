# WeatherNexus: Comprehensive API Integration & Contract Reference

**Platform:** WeatherNexus (SIH26069 — National Weather Big Data Analytics Platform)  
**Authority:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  
**Version:** v2.0 (Authoritative Supabase & Production Gateway)  
**Base URLs:**
- Local Development: `http://localhost:3001`
- Cloud Production (Vercel Edge): `https://atmos-ai-api.vercel.app`

---

## 1. System Overview & Ingestion Flow

WeatherNexus exposes high-performance REST, Server-Sent Events (SSE), and GIS-interoperable export endpoints designed for consumption by state disaster management authorities (SDMA), district collectors (DDMA), and automated early warning broadcast networks.

```
+-------------------------------------------------------------------------+
|                      WeatherNexus API Gateway                           |
+-------------------------------------------------------------------------+
       │                     │                     │                │
       ▼                     ▼                     ▼                ▼
[Ingestion API]      [Situational Intel]   [Live Realtime]  [Open Formats]
• /citizen/reports   • /events             • /events/stream • /events/geojson
• /signals           • /events/:id         • Supabase RT    • /events/kml
• /sources           • /events/:id/sitrep                   • /events/csv
• /sensors           • /events/:id/cap                      • /events/:id/cap
```

---

## 2. Authentication & Authorization

| Role | Access Scope | Authentication Mechanism |
|---|---|---|
| `VIEWER` | Public read access to verified incidents, GeoJSON, KML, and telemetry. | Unauthenticated / Supabase Anon Key |
| `CITIZEN` | Submit geolocated weather observations and disaster photographs. | Rate-limited Anon / JWT |
| `ANALYST` | Query unverified signals, cross-source corroboration graphs, raw telemetry. | Supabase Bearer JWT (`role: ANALYST`) |
| `VERIFIER` | Duty forecasters; transition incidents (`VERIFIED`, `REJECTED`, `RESOLVED`). | Supabase Bearer JWT / Header `x-user-role: VERIFIER` |
| `ADMIN` | Full control: simulate decay, reset system state, adjust source reputation. | Supabase Service Role / Header `x-user-role: ADMIN` |

---

## 3. Endpoints Directory

### 3.1 Health & Diagnostics

#### `GET /health`
Returns system status, active database engine, connector health, and current memory/storage metrics.

**Response (HTTP 200):**
```json
{
  "status": "healthy",
  "system": "WeatherNexus: National Weather Event Intelligence System",
  "authority": "Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)",
  "version": "2.0.0",
  "timestamp": "2026-09-09T02:00:00.000Z",
  "database": {
    "engine": "Supabase Cloud (PostgreSQL 16 + PostGIS + RLS + Storage)",
    "mode": "AUTHORITATIVE",
    "supabase_connected": true,
    "events_count": 31,
    "signals_count": 3847
  },
  "connectors": {
    "imd": { "status": "REPLAY", "mode": "REPLAY" },
    "openweather": { "status": "ONLINE", "mode": "LIVE" },
    "openmeteo": { "status": "ONLINE", "mode": "LIVE" },
    "social_x": { "status": "DEGRADED", "mode": "DEGRADED" }
  },
  "ai_reasoning": {
    "provider": "GOOGLE_GEMINI",
    "model": "gemini-3.8-flash",
    "status": "ONLINE"
  }
}
```

---

### 3.2 Situational Intelligence & Weather Events

#### `GET /api/v1/events`
Query all active and verified meteorological incidents across India.

**Query Parameters:**
- `event_type` (optional): Filter by IMD hazard (`FLOOD`, `RAINFALL`, `THUNDERSTORM`, `HEATWAVE`, `COLD_WAVE`, `FOG`, `DUST_STORM`, `CYCLONE`, `STRONG_WIND`, `HAILSTORM`, `LIGHTNING`).
- `status` (optional): `DETECTED`, `UNDER_REVIEW`, `VERIFIED`, `ACTIVE`, `RESOLVED`.
- `state` (optional): State name filter (e.g. `Assam`, `Maharashtra`, `Delhi`).
- `from_date` (optional): ISO 8601 timestamp string.

**Response (HTTP 200):**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": "evt_1788870192_a8f9",
      "event_type": "FLOOD",
      "title": "FLOOD - Guwahati, Assam",
      "description": "Verified flood incident detected from multi-source observations in Guwahati.",
      "severity": "critical",
      "status": "VERIFIED",
      "latitude": 26.18,
      "longitude": 91.75,
      "city": "Guwahati",
      "state": "Assam",
      "confidence_score": 0.94,
      "signal_count": 5,
      "source_breakdown": { "imd": 1, "weather_api": 2, "news": 1, "citizen": 1 },
      "evidence_summary": [
        "Corroborated by official IMD bulletin/warning",
        "1 independent news reporting source(s)",
        "1 citizen ground-level report(s)",
        "Verified multimedia assets showing active inundation"
      ],
      "ai_reasoning": "FLOOD confidence is 94% based on 4 independent observation vectors across 5 localized signals.",
      "first_detected_at": "2026-09-09T01:40:00.000Z",
      "last_updated_at": "2026-09-09T01:45:00.000Z"
    }
  ]
}
```

#### `GET /api/v1/events/:id`
Fetch complete incident dossier including corroborating evidence graph and lifecycle audit log.

#### `GET /api/v1/events/:id/sitrep`
Generate official Situation Report (SITREP) formatted for National Disaster Response Force (NDRF) and State Emergency Operation Centres (SEOC).

#### `GET /api/v1/events/:id/cap`
Generate OASIS Common Alerting Protocol (CAP v1.2) XML compliant with ITU-T X.1303 for cell broadcast towers and CAP-CP ingestion. Pass `?format=json` for JSON representation.

---

### 3.3 Citizen Ground Ingestion & Media

#### `POST /api/v1/citizen/reports`
Ingest citizen weather observations with optional geolocation and base64 disaster photos.

**Request Payload:**
```json
{
  "reporter_name": "Debajit Baruah",
  "text": "Flood water entered residential houses in Pandu Port area! Danger sirens active.",
  "latitude": 26.175,
  "longitude": 91.778,
  "city": "Guwahati",
  "state": "Assam",
  "event_type": "FLOOD",
  "media_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "media_filename": "pandu_flood.jpg",
  "media_mime_type": "image/jpeg"
}
```

**Response (HTTP 201):**
```json
{
  "success": true,
  "data": {
    "id": "sig_1788870192_c39b",
    "source_type": "citizen",
    "verification_status": "UNVERIFIED",
    "relevance_score": 0.85,
    "credibility_score": 0.70,
    "misinformation_score": 0.05
  },
  "media_stored": [
    {
      "media_id": "med_1788870192000",
      "url": "https://storage.supabase.co/weather-evidence/pandu_flood.jpg",
      "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "storage_provider": "SUPABASE_STORAGE"
    }
  ]
}
```

---

### 3.4 Open GIS Interoperability Engine

| Endpoint | Standard Format | Target GIS Consumer |
|---|---|---|
| `GET /api/v1/events/geojson` | RFC 7946 FeatureCollection | QGIS, ArcGIS Online, ISRO Bhuvan |
| `GET /api/v1/events/kml` | OGC KML 2.2 XML | Google Earth Pro 3D GIS |
| `GET /api/v1/events/csv` | Disaster Operations Tabular CSV | MS Excel, District Emergency Operations Centre (DEOC) |
| `GET /api/v1/events/stream` | Server-Sent Events (SSE) | Real-time Operations Dashboard |

---

### 3.5 Duty Forecaster Verification & Governance

#### `POST /api/v1/events/:id/verify`
Transitions event to `VERIFIED` status, records human operator ID, and freezes confidence calibration.

**Request Payload:**
```json
{
  "actor_id": "forecaster@imd.gov.in",
  "verified_by": "imd_official",
  "reason": "CWC river gauge confirmed danger mark exceeded by 0.8m."
}
```

#### `POST /api/v1/events/:id/resolve`
Marks incident as `RESOLVED`. State machine invariant permanently prevents transition back to `DETECTED`.