# N-WEIS: Smart India Hackathon (SIH 2026) Presentation Deck
## Problem Statement: SIH26069 | Ministry of Earth Sciences / India Meteorological Department (IMD)

> **Team Presentation Guide**: 10 Slides | 5–7 Minutes Pitch + Live Demo

---

### Slide 1: Title & Introduction
- **System Name**: **N-WEIS** (National Weather Event Intelligence System)
- **Tagline**: Real-Time Multi-Source Weather Event Fusion, Ground Truth Sensor Validation & Autonomous Multi-Agency Early Warning
- **Target Ministry**: Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)
- **Problem Statement ID**: SIH26069
- **Core Value Proposition**: Unifies fragmented weather observations from citizens, news, social media, and official telemetry into verified, actionable disaster intelligence in under 400ms.

---

### Slide 2: The Disaster Intelligence Dilemma
- **The Ground Reality**: During extreme weather events (monsoon cloudbursts, cyclones, urban flooding, heatwaves), disaster management authorities face **information asymmetry**:
  1. **Fragmented & Noise-Heavy Data**: Thousands of social posts, eyewitness videos, and rumors flood digital channels.
  2. **False Alarms & Misinformation**: Old cyclone footage and out-of-context images cause mass panic and deplete SDRF resources.
  3. **Verification Lag**: Traditional verification by telephone or field visits takes hours—too late for flash flood evacuations.
  4. **Last-Mile Disconnect**: Alerts fail to reach rural first responders and regional linguistic communities before power or connectivity drops.

---

### Slide 3: The N-WEIS Solution Architecture
- **Real-Time 5-Stage Multi-Source Pipeline**:
  - **Ingestion**: Ingests IMD AWS/DWR feeds, news RSS, citizen observations, and social media signals.
  - **4-Tier Geolocation**: Native GPS (95% conf) → Indian Landmark/Gazetteer (90%) → District/City centroid (85%) → State fallback.
  - **Skeptic Engine**: Multi-modal perceptual hashing, sensationalism lexicons, and velocity anomalies quarantine fraud before fusion.
  - **3-Layer Deduplication**: Exact SHA-256 hash → Jaccard semantic similarity (≥0.75) → Spatiotemporal proximity clustering (≤3km, ≤60min).
  - **Multi-Agency Early Warning**: Instant OASIS CAP v1.2 cell broadcast, SDRF/Aapda Mitra SMS dispatch, and automated NDMA SITREPs.

---

### Slide 4: Mathematical Rigor — 7-Factor Confidence Fusion
- **Explainable AI Confidence Formula**:
  $$\text{Score} = \sum_{i=1}^{7} (W_i \times F_i)$$
  - $F_1$ **Source Reliability Weight**: IMD (1.0) > News (0.85) > Citizen (0.75) > Social (0.60).
  - $F_2$ **AI Relevance & Category Match**: Keyword and semantic probability for 8 IMD categories.
  - $F_3$ **Media & Evidence Corroboration**: Geotagged images, video hashes, and sensor telemetry.
  - $F_4$ **Spatial Density**: Number of corroborating signals within local radius.
  - $F_5$ **Temporal Freshness**: Exponential decay based on hazard-specific half-lives.
  - $F_6$ **Multi-Source Corroboration**: Cross-validation across distinct observation vectors.
  - $F_7$ **Official Ground-Truth Synergy**: Corroboration against CWC river stages, IMD AWS rainfall rates, and DWR Doppler radar reflectivity.
- **Explainability**: Every event includes an explainable narrative detailing exactly why and how it was verified.

---

### Slide 5: Temporal Freshness & Hazard-Specific Confidence Decay
- **The Problem**: A flash flood dissipates in hours, while a heatwave lasts for days. Fixed alert timers fail.
- **Mathematical Decay Model**:
  $$\text{Freshness}(t) = 0.5^{\frac{\Delta t}{T_{\text{half}}}}$$
  $$\text{Confidence}(t) = \text{Score}_0 \times \text{Freshness}(t)$$
- **Calibrated Half-Lives ($T_{\text{half}}$)**:
  - `FLASH_FLOOD`: 180 min (Cutoff: 6 hrs)
  - `THUNDERSTORM`: 120 min (Cutoff: 4 hrs)
  - `FOG`: 75 min (Cutoff: 4 hrs)
  - `HEATWAVE`: 720 min (12 hrs, Cutoff: 48 hrs)
- **Lifecycle Degradation**: When confidence drops below threshold without new evidence, incidents degrade from `VERIFIED` → `UNDER_REVIEW` → auto-`RESOLVED`.

---

### Slide 6: Ground Truth Sensor Matrix & Doppler Radar Integration
- **Live Sensor Telemetry**:
  - **11 National Stations**: Central Water Commission (CWC) River Gauges, IMD Automatic Weather Stations (AWS), IMD Doppler Weather Radar (DWR), Airport Runway Visual Range (RVR), and Lake Sluice Gauges.
  - **Doppler Radar (DWR) 6-Station Sweeps**: Rotating 360° radar sweep beams across Delhi Palam, Kolkata, Mumbai, Guwahati, Jaipur, and Bengaluru with real-time dBZ reflectivity contours.
  - **Telemetry Surge Alarms**: Instant detection when rainfall rate exceeds IMD cloudburst threshold (64.5 mm/h) or river levels breach danger marks (e.g. CWC Brahmaputra 49.68m).

---

### Slide 7: Actionable Multi-Agency Dissemination
- **OASIS CAP v1.2 / ITU-T X.1303 Standard**:
  - Generates standardized XML/JSON Common Alerting Protocol alerts with 15km circular geofenced broadcast zones.
  - Integrates with National Cell Broadcast Service (CBS) for instant population siren push without phone numbers.
- **SDRF & Aapda Mitra SMS Dispatch Engine**:
  - Automatically routes alerts to localized SDRF units (e.g. Assam SDRF Pandu, 8th NDRF Ghaziabad) and Aapda Mitra volunteer corps.
  - Enforces strict GSM 160-character budget with emergency toll-free helplines (1077 / 112).
- **Official NDMA/IMD SITREP Reports**:
  - Generates formal Situation Reports with digital tamper seals (SHA-256), verification grades, and tactical directives.

---

### Slide 8: Inclusion, Accessibility & Offline Resiliency
- **6 Indic Languages**:
  - Native alerts generated in English, Hindi (हिंदी), Assamese (অসমীয়া), Bengali (বাংলা), Marathi (मराठी), and Kannada (ಕನ್ನಡ).
  - Integrated Web Speech API browser voice broadcast for illiterate citizens and visually impaired users.
- **PWA Offline Field Resiliency**:
  - Service Worker caches the complete application shell.
  - When field connectivity fails, amber `⚡ Offline Field Mode` engages.
  - Citizen reports are safely queued in `localStorage` and automatically flushed upon reconnection.
- **RFC 7946 GeoJSON Interoperability**:
  - Direct 1-click export for GIS integration into QGIS, ArcGIS, and ISRO Bhuvan portals.

---

### Slide 9: Technical Highlights & Zero-Dependency Portability
- **Zero Runtime Dependencies**: Pure Node.js ESM utilizing native modules (`http`, `url`, `fs`, `crypto`). No `node_modules` vulnerabilities or deployment friction.
- **Sub-Second Real-Time Updates**: Native Server-Sent Events (SSE) push incident, sensor, and broadcast updates to dashboards in <400ms.
- **Micro-Container Footprint**: Alpine-based Docker image weighs under 50 MB, starts in 800ms, and runs on edge devices or central cloud clusters.
- **Rigorous Verification**: 84/84 automated test assertions passing across 14 comprehensive test suites.

---

### Slide 10: Conclusion & National Impact
- **Operational Benefits**:
  - **90% Reduction** in manual verification time (from hours to seconds).
  - **Zero False Alarm Propagation** via Skeptic filter and state machine invariants.
  - **Seamless Interoperability** with IMD, NDMA, SDMA, and CWC workflows.
- **Next Steps**:
  - Direct integration with IMD NWFC API gateways and CWC telemetry portals.
  - Pilot deployment across Assam SDMA (Brahmaputra basin) and Bengaluru BBMP urban flood monitoring.
