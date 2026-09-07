# N-WEIS: Judge Q&A & Technical Defense Guide
## SIH 2026 Problem Statement: SIH26069 | Ministry of Earth Sciences / IMD

> This guide provides comprehensive answers to technical, meteorological, and operational questions likely to be asked by SIH judges, IMD scientists, and NDMA evaluators.

---

### Category 1: AI, Confidence Scoring & Explainability

#### Q1: "How does your 7-factor fusion engine calculate confidence? Isn't it just an arbitrary weighted sum?"
**Answer:**
"No, it is a calibrated evidence fusion model based on multi-source Bayesian corroboration principles. The formula balances seven independent dimensions:
1. **Source Reliability Prior ($W_1$)**: Grounded in historical sensor precision. IMD and CWC official data carries a weight of 1.0; accredited news wire services 0.85; verified citizen reports 0.75; unverified social media 0.60.
2. **Taxonomic Keyword Alignment ($F_2$)**: Matches against the 8 IMD meteorological hazard definitions.
3. **Media & Sensor Telemetry Verification ($F_3$)**: Awards confidence boosts only when corroborated by geotagged media hashes or physical sensor readings (e.g., river stage exceeding danger levels).
4. **Spatial Density ($F_4$)**: Applies spatial clustering where multiple signals within a 3.0 km radius increase confidence logarithmically.
5. **Temporal Freshness ($F_5$)**: Exponential decay with hazard-calibrated half-lives.
6. **Cross-Source Corroboration ($F_6$)**: An incident *cannot* reach the 90% VERIFIED threshold unless corroborated by at least two independent source vectors (e.g., Citizen + IMD AWS, or News + Social).
7. **Ground Truth Sensor Synergy ($F_7$)**: Adds an automatic +15% boost when physical CWC or IMD sensors exceed danger marks.

Crucially, the system produces an **Explainable AI Narrative** for every event, detailing the exact mathematical contributions so duty meteorologists understand *why* an event scored 94%."

---

#### Q2: "How do you prevent malicious actors or coordinated bots from submitting fake citizen reports to generate false alarms?"
**Answer:**
"We implement a three-layer defense-in-depth architecture:
1. **Skeptic Agent (Quarantine Layer)**: Analyzes incoming text for sensationalism lexicons, clickbait patterns, and recycled media perceptual hashes (pHash). If sensationalism exceeds 65% or the image matches historical disaster archives, the report is immediately quarantined to `REJECTED` and barred from the fusion pipeline.
2. **Multi-Source Corroboration Invariant**: A flood of citizen reports from single or bot accounts *cannot* breach the 80% threshold without corroboration from independent news, social media, or official IMD/CWC sensors.
3. **Velocity Rate-Limiting & Geofencing**: IP and device clustering prevents mass report generation within identical geofences, and citizen reports require native GPS coordinates to receive high prior weighting."

---

### Category 2: Meteorology & Ground Truth Alignment

#### Q3: "How does your system align with official IMD and CWC monitoring infrastructure?"
**Answer:**
"N-WEIS includes native alignment with 11 national ground truth monitoring stations:
- **Central Water Commission (CWC)**: Real-time river gauges tracking water stage against official Warning Levels and Danger Levels (e.g., Brahmaputra Pandu at Guwahati: Danger Mark 49.68m MSL).
- **IMD Automatic Weather Stations (AWS)**: Tracks 24-hour cumulative rainfall and instantaneous rain rates against the IMD cloudburst threshold (64.5 mm/h).
- **IMD Doppler Weather Radar (DWR)**: Integrates 6-station radar sweep parameters (Delhi Palam, Kolkata, Mumbai, Guwahati, Jaipur, Bengaluru) tracking severe convection reflectivity (≥45 dBZ).
- **Airport Runway Visual Range (RVR)**: Aligns with CAT-III ILS visibility thresholds at IGI Airport New Delhi for dense fog detection (<50m visibility).

When physical sensors exceed danger marks, our system immediately correlates them with active events, updates the sensor badges on the map, boosts incident confidence, and emits real-time Server-Sent Events (SSE) to all operational consoles."

---

#### Q4: "Why does confidence decay? Isn't an event still real even after some hours?"
**Answer:**
"Weather is inherently dynamic. A severe thunderstorm or cloudburst may cause severe flash flooding that clears in 3 hours, whereas a heatwave persists for days. If a system does not decay unreinforced events, operators suffer from 'alert fatigue' caused by phantom events that resolved hours ago.

We developed hazard-specific half-life models:
$$\text{Confidence}(t) = \text{InitialConfidence} \times 0.5^{\frac{\Delta t}{T_{\text{half}}}}$$
- **Flash Floods / Cloudbursts**: $T_{\text{half}} = 180 \text{ min}$ (Cutoff: 6h)
- **Thunderstorms / Gusts**: $T_{\text{half}} = 120 \text{ min}$ (Cutoff: 4h)
- **Dense Fog**: $T_{\text{half}} = 75 \text{ min}$ (Cutoff: 4h)
- **Heatwaves**: $T_{\text{half}} = 720 \text{ min}$ (12h, Cutoff: 48h)

If new eyewitness reports or sensor spikes arrive, the freshness bar resets to 100%. If no new evidence arrives before the cutoff, the incident automatically transitions to `RESOLVED`."

---

### Category 3: Standards, Interoperability & Governance

#### Q5: "How does N-WEIS comply with government and international alerting standards?"
**Answer:**
"N-WEIS was built from the ground up to comply with official standards:
1. **OASIS CAP v1.2 / ITU-T X.1303**: Every verified event produces standard Common Alerting Protocol XML and JSON feeds with standardized OID alert identifiers (`urn:oid:2.49.0.0.356.0.nweis.*`), official sender URIs, and 15km circular broadcast geometries.
2. **Cell Broadcast Service (CBS)**: Interoperable with the National Disaster Management Authority (NDMA) Pan-India Cell Broadcast alert mechanism for instantaneous siren broadcasting to mobile phones without requiring phone numbers.
3. **RFC 7946 GeoJSON**: Native `GET /api/v1/events/geojson` endpoint formatted with standard WGS84 OGC CRS84 point geometries (`[longitude, latitude]`), allowing drag-and-drop ingestion into QGIS, ArcGIS, and ISRO Bhuvan GIS portals.
4. **NDMA Situation Reports (SITREP)**: Standardized incident reports with SHA-256 digital tamper seals, verification grades (Grade-A to Grade-C), and tactical directives for NDRF and SDMA forces."

---

#### Q6: "Can a fully automated AI system issue false cell broadcast sirens?"
**Answer:**
"No. N-WEIS implements a strict **Human-in-the-Loop (HITL) State Machine**:
- Events transition through formal lifecycle states: `DETECTED` → `UNDER_REVIEW` → `VERIFIED` → `RESOLVED`.
- State machine invariants block unauthorized shortcuts:
  - An event in `FALSE_ALARM` cannot transition directly to `VERIFIED`.
  - An event in `RESOLVED` cannot be rewritten as `FALSE_ALARM`.
  - Cellular sirens and high-grade alerts can be gated by the **IMD Duty Meteorologist Sign-Off** panel.
- Every single status transition logs an **immutable audit record** capturing the timestamp, from-status, to-status, authorizing officer name, and scientific justification."

---

### Category 4: Engineering, Architecture & Scalability

#### Q7: "Why did you build this in zero-dependency Node.js ESM rather than using heavy frameworks?"
**Answer:**
"In national disaster response, **operational resilience and low attack surfaces are paramount**:
1. **Zero Deployment Friction**: `server-nweis.mjs` runs natively on any standard Node.js runtime without needing `npm install` or pulling 500 MB of third-party packages that could fail during network disruptions or carry supply-chain vulnerabilities.
2. **Ultra-Low Memory Footprint**: The entire server uses less than 35 MB of RAM and boots in under 150ms.
3. **Sub-Second Throughput**: Native HTTP and Server-Sent Events achieve an average processing latency of **380ms** from raw signal ingestion to client map rendering.
4. **Docker Container**: Packages into an Alpine image under 50 MB, deployable to edge servers at district emergency operation centres (DEOCs) or central cloud clusters."

---

#### Q8: "How does the system perform when disaster strikes and field responders lose internet connectivity?"
**Answer:**
"N-WEIS is a fully certified **Progressive Web App (PWA)**:
- The Service Worker (`sw.js`) caches the entire application shell (HTML, Leaflet, styling, icons).
- When network drops, an amber `⚡ Offline Field Mode` banner activates automatically.
- Responders and citizens can continue filing ground reports; observations are cached in browser `localStorage`.
- As soon as cellular or satellite connectivity returns, the queue **automatically flushes** directly to `/api/v1/citizen/reports` without user intervention."

---

### Category 5: Last-Mile Inclusivity & Regional Languages

#### Q9: "India has massive linguistic diversity. How does N-WEIS ensure alerts reach non-English speakers?"
**Answer:**
"N-WEIS features an **Indic Localization Engine** supporting 6 Indian languages:
- **English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), Marathi (मराठी), and Kannada (ಕನ್ನಡ)**.
- Bulletins use authentic regional disaster terminology (e.g. *বিপদসীমা* for danger level in Assamese; *ঘূর্ণিঝড়* for cyclone in Bengali; *मेघगर्जना* for thunderstorm in Marathi).
- Includes browser-native **Web Speech API Voice Synthesis**, allowing users to click **'🔊 Play Audio Alert'** to hear alerts read aloud in their regional tongue, ensuring critical life-safety warnings reach illiterate citizens and rural communities."
