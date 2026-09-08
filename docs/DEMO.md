# N-WEIS Live Demonstration & Judge Walkthrough Guide

**Problem Statement:** SIH26069 — National Weather Big Data Analytics Platform  
**Target Audience:** Smart India Hackathon 2026 Judges & MoES/IMD Evaluators  
**System URL:** `http://localhost:3001`  

---

## 1. Quick Start Demonstration Launch

To start the system with full data persistence and multi-source connectors:
```bash
# Start the unified N-WEIS server
node server-nweis.mjs

# Open the dashboard in browser
http://localhost:3001
```

---

## 2. Walkthrough Script for Judges (5-Minute Presentation)

### Step 1: System Overview & GIS Command Center (0:00 - 1:00)
- **Point to the Leaflet GIS Map:** Show the real-time Indian weather incidents populated with color-coded severity rings (Red: Flood/Heatwave, Orange: Severe Storm, Amber: Rainfall).
- **Radar Overlays & Ground Truth Sensors:** Toggle the "Ground Truth Sensors" overlay to reveal the official IMD Automatic Weather Stations and CWC River Gauges (e.g. CWC Brahmaputra Pandu Gauge, Safdarjung AWS).
- **Real-Time Telemetry Counters:** Point to the top status bar: *Total Signals Ingested*, *Active Corroborated Events*, *Verified Rate*, and *Connected SSE Stream*.

### Step 2: Multi-Source Fusion & 7-Factor Confidence (1:00 - 2:30)
- **Click on the Guwahati Flood Event:**
  - Open the incident detail drawer on the right.
  - Show the **94% Fused Confidence Score**.
  - Show the **Multi-Source Evidence Breakdown**:
    1. *Official IMD Bulletin:* [REPLAY/LIVE] Red alert warning for Kamrup Metropolitan.
    2. *Open-Meteo AWS:* Rain rate exceeding threshold.
    3. *News RSS:* Times of India report on Brahmaputra river level.
    4. *Citizen Report:* Geotagged observation from Jalukbari with waist-deep water photo.
  - Explain the **7-Factor Formula**: Explain how source credibility, cross-source corroboration, sensor proximity, and temporal freshness combine mathematically rather than using a black box.

### Step 3: Misinformation Quarantine (Skeptic Engine) (2:30 - 3:15)
- Open the **"Signals" / "Verification Queue"** tab.
- Filter by status: `REJECTED`.
- Show the quarantined report: *"FAKE HOAX: Recycled 2015 Chennai flood image claimed as Guwahati"*.
- Highlight that N-WEIS intercepted the fake post via perceptual media hashing and lexical sensationalism screening, preventing false alarms and saving emergency responder resources.

### Step 4: Temporal Decay & Staleness Simulation (3:15 - 4:00)
- Click the **"Simulate 2 Hours Elapsed"** button in the Demo Scenarios toolbar.
- Watch the live SSE broadcast update the Guwahati event:
  - Confidence decays from 94% to 59% (180m half-life).
  - Status degrades gracefully from `VERIFIED` to `UNDER_REVIEW`.
  - Explain to the judges: *"Natural disasters are dynamic. If no new evidence arrives, confidence decays exponentially to prevent zombie alerts."*

### Step 5: Disaster Response Dissemination & Interoperability (4:00 - 5:00)
- **Broadcast OASIS CAP Alert:** Click **"Broadcast CAP Alert"** on the verified event.
  - Show the generated OASIS CAP v1.2 XML with Indian OID identifier and 15 km circular broadcast geofence.
  - Select language: Switch between English, Hindi (हिंदी), and Assamese (অসমীয়া).
- **Dispatch Volunteers:** Click **"Mobilize SDRF / Volunteers"**.
  - Show the 160-character cellular SMS dispatch routed to Assam SDRF Pandu Battalion and 450 Aapda Mitra volunteers.
- **Export SITREP & GIS Formats:**
  - Download official NDMA/IMD SITREP with digital sign-off hash.
  - Export GeoJSON (`/api/v1/events/geojson`) and KML (`/api/v1/events/kml`) to prove interoperability with national GIS systems.

---

## 3. Pre-Programmed Demonstration Scenarios

Judges can test the system across 7 diverse Indian geographic and meteorological contexts using the top toolbar buttons or API triggers:

| Scenario Name | City & State | Primary Hazard | Corroborating Vectors | Key Demonstration Feature |
|---|---|---|---|---|
| **Guwahati Flood** | Guwahati, Assam | FLOOD | IMD + News + Citizen + Social + CWC Gauge | 94% Confidence, River Gauge alignment, NDRF boat mobilization |
| **Delhi Convective Squall** | New Delhi, Delhi | THUNDERSTORM | Safdarjung AWS + Twitter #IMD + News | 45m fast half-life, Safdarjung gust front alignment |
| **Mumbai Coastal Downpour** | Mumbai, Maharashtra | RAINFALL | Colaba AWS + Traffic Citizen Reports | Coastal waterlogging, train line disruption alerts |
| **Rajasthan Heatwave** | Churu & Bikaner, Rajasthan | HEATWAVE | IMD AWS + District Hospital Reports | 47°C temperature threshold, Heat Action Plan directive |
| **Kolkata Cyclone Storm** | Kolkata, West Bengal | STRONG_WIND | Cyclone Alert + Port Gauges | Gale force wind gusts, Sunderbans coastal evacuation |
| **Bengaluru Cloudburst** | Bengaluru, Karnataka | RAINFALL | AWS Rain Rate + Tech Corridor Reports | 64.5 mm/hr cloudburst threshold, Bellandur waterlogging |
| **Delhi Winter Radiation Fog** | Delhi NCR | FOG | Palam Airport RVR Sensor + NHAI Reports | CAT-III ILS aviation advisory, Highway convoy pilot |

---

## 4. Live Verification Commands for Judges

Run these commands in terminal during the evaluation to verify real backend data flow:

```bash
# 1. Verify healthcheck, persistent storage, and connector telemetry
curl http://localhost:3001/health

# 2. Ingest a real citizen report and verify 201 Created response
curl -X POST http://localhost:3001/api/v1/citizen-reports \
  -H "Content-Type: application/json" \
  -d '{"reporter_name":"Judge Test","text":"Water level rising on GS Road Guwahati","latitude":26.16,"longitude":91.77,"city_hint":"Guwahati","state_hint":"Assam","event_type":"FLOOD"}'

# 3. Trigger public dataset ingestion
curl -X POST http://localhost:3001/api/v1/public-datasets/ingest

# 4. Verify automated test suite (90/90 passing)
node test-nweis.mjs
```
