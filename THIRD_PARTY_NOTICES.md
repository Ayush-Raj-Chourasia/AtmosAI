# Third Party Notices and IP Attributions

N-WEIS (National Weather Event Intelligence System) integrates and adapts architectural patterns, algorithms, and concepts from open-source research and engineering repositories. In accordance with Section 42 of the N-WEIS PRD, this document details all third-party projects, licenses, authors, and modifications.

---

### 1. Disaster Pulse
* **Repository:** [https://github.com/denyherianto/disaster-pulse](https://github.com/denyherianto/disaster-pulse)
* **Author:** Deny Herianto (Danny)
* **License:** MIT License
* **Components Used:**
  * Turborepo monorepo setup (Next.js 15, NestJS, shared package)
  * Reactive Server-Sent Events (SSE) pattern
  * Observer-Classifier-Skeptic-Synthesizer multi-agent reasoning flow
  * Leaflet map visualization and cluster presentation
  * Citizen report submission flow
* **Modifications in N-WEIS:**
  * Replaced Indonesian disaster taxonomy with the official SIH 2026 8-category weather taxonomy (`RAINFALL`, `THUNDERSTORM`, `FLOOD`, `HEATWAVE`, `FOG`, `DUST_STORM`, `STRONG_WIND`, `OTHER`).
  * Converted Indonesian geographical bounds, coordinates, and BMKG/BNPB domain models into India national coordinates (Ministry of Earth Sciences / IMD, NDMA, CWC).
  * Implemented dual-mode database (PostgreSQL/PostGIS with standalone fallback).

---

### 2. Geo-Knowledge-Guided GPT
* **Repository:** [Geo-Knowledge-Guided GPT](https://github.com/cug-gisa/Geo-Knowledge-Guided-GPT)
* **License Notice:** GPL-3.0
* **Handling in N-WEIS (Clean-room Implementation):**
  * Per Section 8 and Section 42 of the PRD, **no source code from this repository is copied into N-WEIS**.
  * The geographic entity reasoning methodology (hierarchical parsing: `landmark + spatial relation + area` to candidate geocode) is independently designed and implemented from scratch in TypeScript to respect licensing requirements.

---

### 3. SEDOM-DD (Sub-Events Detection on sOcial Media During Disasters)
* **Repository:** [https://github.com/SCAlabUnical/SEDOM-DD](https://github.com/SCAlabUnical/SEDOM-DD)
* **Authors:** SCAlab Unical
* **Methodology Used:**
  * Sub-event detection methodology via spatial-temporal clustering (DBSCAN + text similarity).
  * Adaptive spatial window (5–15 km) and temporal window (30–60 minutes) for weather event clustering.

---

### 4. Hanny Multimodal GeoAI
* **Authors / Reference:** Hanny et al.
* **Methodology Used:**
  * Multimodal spatial-temporal feature engineering for relevance scoring:
    $$\text{Relevance} = f(\text{Text Relevance}, \text{Spatial Relevance}, \text{Temporal Relevance}, \text{Source Weight})$$

---

### 5. CrisisGrid
* **Repository:** [https://github.com/sanketdhuri9604/CrisisGrid](https://github.com/sanketdhuri9604/CrisisGrid)
* **Components Used:**
  * 3-layer deduplication logic (exact identifier -> semantic similarity -> spatiotemporal proximity).
  * Incident lifecycle transitions and operational triage workflows.

---

### 6. DisasterGuard
* **Repository:** [https://github.com/Ankita7033/DisasterGuard](https://github.com/Ankita7033/DisasterGuard)
* **Components Used:**
  * Indian weather API polling patterns.
  * AI inference with deterministic rule fallback architecture.

---

### 7. Project Samudra Sachet
* **Repository:** Project Samudra Sachet
* **Components Used:**
  * Citizen mobile/web reporting UX concepts with offline capability and media verification.
