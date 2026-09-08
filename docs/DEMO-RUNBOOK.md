# WeatherNexus: SIH 2026 Judge Demonstration Runbook

**Platform:** WeatherNexus (SIH26069 — National Weather Big Data Analytics Platform)  
**Target Ministry:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  
**Demo Duration:** 8 to 12 minutes  

---

## 1. Executive Demonstration Narrative

WeatherNexus bridges the critical intelligence gap between official meteorological sensor networks and ground-truth citizen reality. During severe weather crises, official sensors provide high reliability but low spatial density; social media provides hyper-local reports but suffers from noise and misinformation.

WeatherNexus fuses both streams through **7-Factor Corroboration** and **Multi-Layer Deduplication**, presenting an authoritative operational common operating picture.

---

## 2. 7 Regional Disaster Scenarios Matrix

The platform includes 7 pre-calibrated regional disaster scenarios reflecting real meteorological dynamics across India:

| Scene # | Scenario Name | Primary Location | Hazard Type | Confidence | Corroborating Evidence Sources |
|---|---|---|---|---|---|
| **1** | **Guwahati Riverine Flood** | Guwahati, Assam | `FLOOD` | **94%** | IMD Red Alert Bulletin, CWC Pandu Gauge (49.8m), Citizen Photo, Times of India |
| **2** | **Delhi NCR Squall & Dust** | New Delhi, Delhi | `THUNDERSTORM` | **89%** | IMD Safdarjung Radar (52 dBZ), Palam AWS (72 km/h gust), Social Stream #IMD |
| **3** | **Mumbai Coastal Downpour** | Mumbai, Maharashtra | `RAINFALL` | **82%** | Colaba AWS (112mm rain), Hindmata citizen report, High tide warning |
| **4** | **Rajasthan Extreme Heatwave**| Churu / Jaipur, Rajasthan | `HEATWAVE` | **96%** | IMD Synoptic Station (47.4°C), Western Met Heat Bulletin, Health Advisory |
| **5** | **Kolkata Cyclone Remal** | Kolkata / Diamond Harbour, WB | `CYCLONE` | **92%** | DWR Kolkata radar vortex, Bay of Bengal buoy surge (1.8m), NDMA alert |
| **6** | **Bengaluru Urban Cloudburst**| Bengaluru, Karnataka | `RAINFALL` | **88%** | IMD Bengaluru AWS (68 mm/hr), Bellandur citizen video, Traffic police RSS |
| **7** | **Delhi Airport Dense Fog** | IGI Airport, New Delhi | `FOG` | **87%** | IGI Runway Visual Range (RVR < 50m CAT III), Safdarjung Met Observatory |

---

## 3. Step-by-Step 5-Minute Demonstration Script

### Step 1: Open the Operations Command Dashboard
1. Navigate to `http://localhost:3001` (or production: `https://atmos-ai-api.vercel.app`).
2. Point out the **Live Doppler Radar sweep stations** (Delhi, Mumbai, Kolkata, Chennai, Guwahati, Bengaluru) scanning the national airspace.
3. Show the **real-time SSE status indicator** in the top bar (`LIVE STREAM` in emerald).

### Step 2: Trigger the Guwahati Flood Scenario (Scene 1)
1. In the Quick-Bar, click **"🌊 Guwahati Flood (94% Confirmed)"**.
2. Observe Leaflet map smoothly fly to Guwahati (`26.18° N, 91.75° E`).
3. Click the pulsing red flood incident marker to open the **Incident Dossier Drawer**.
4. Highlight:
   - **Confidence Score:** 94% with breakdown.
   - **Corroborating Evidence Matrix:** Shows IMD bulletin, CWC river gauge (exceeding danger level by 0.8m), and citizen report.
   - **AI Reasoning:** Structured Gemini analysis confirming multi-source cross-corroboration.

### Step 3: Demonstrate Citizen Photo Ingestion & Media Verification
1. Click the **"Citizen Report"** button in the top right.
2. Enter observation: `"Water level at Bharalu river confluence has crossed the embankment. Water entered houses in Pandu Port area!"`
3. Click Submit.
4. Show how the new report immediately reinforces the active event, restoring temporal freshness to 100% and updating the evidence log.

### Step 4: Duty Forecaster Sign-Off & Official SITREP Export
1. In the Incident Drawer, demonstrate the **Duty Forecaster Sign-Off**:
   - Operator selects `VERIFIED`, enters reason: `"CWC gauge confirmed danger level breach."`, and submits.
   - Show the immutable audit trail with timestamp and forecaster ID.
2. Click **"Generate SITREP"**:
   - Modal displays the official Ministry of Earth Sciences Situation Report ready for SEOC/NDRF dispatch with cryptographic tamper seal.
3. Click **"CAP Alert"**:
   - Displays OASIS CAP 1.2 XML compliant with ITU-T X.1303 for cell broadcast towers.

### Step 5: GIS & Open Data Interoperability
1. Click **"🗺️ GeoJSON"** to instantly export RFC 7946 standard data for QGIS/ArcGIS.
2. Click **"🌐 KML"** to show Google Earth 3D interoperability.
3. Click **"📑 CSV"** to demonstrate tabular export for District Emergency Operations Centres.