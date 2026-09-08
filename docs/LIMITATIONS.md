# N-WEIS System Limitations, Operational Constraints & Roadmap

**System Name:** National Weather Event Intelligence System (N-WEIS)  
**Problem Statement:** SIH26069 — Ministry of Earth Sciences (MoES) / IMD  
**Document Purpose:** Engineering Transparency, Real-World Boundary Conditions & Production Roadmap  

---

## 1. Real-World Constraints & Assumptions

In developing a hackathon prototype aligned with national disaster management standards, deliberate architectural tradeoffs and operational assumptions were established:

### 1.1 Ingestion Connectors & External API Quotas
- **IMD Official API:** While N-WEIS implements an end-to-end `ImdAdapter` supporting authenticated `LIVE` REST polling, official IMD National Met Centre API keys are government-restricted and not publicly issued. When running without an `IMD_API_KEY`, the adapter operates in audited `[REPLAY]` mode using authentic, historical IMD severe weather bulletins. It clearly advertises its mode in `/health` and `/api/v1/sources`.
- **Open-Meteo Weather API:** Operates under a free-tier rate limit (10,000 calls/day). The background connector polls 3 key coordinates every 60 seconds to respect rate limits while maintaining fresh telemetry.
- **Social Media Stream (#IMD):** Twitter/X v2 API requires expensive Enterprise Access for live firehose keyword streaming. In the absence of a `TWITTER_BEARER_TOKEN`, the connector streams geotagged historical and synthetic citizen tweets labeled `REPLAY / DEMO STREAM`.

### 1.2 Geolocation & Spatial Indexing
- **Toponymy Resolution:** The embedded gazetteer prioritizes major Indian metropolitan centers, state capitals, and flood-prone river basin districts. In remote rural hamlets without cellular tower triangulation or GPS tags, toponymy resolution defaults to the district headquarters centroid with degraded confidence ($0.25$).
- **PostGIS vs Standalone JSON Store:** Full PostGIS spatial topological operators (`ST_DWithin`, `ST_ConvexHull`) require a live PostgreSQL container with the PostGIS extension. In standalone lightweight mode (`data/nweis-store.json`), spherical Haversine distance calculations ($d \le 3.0$ km) are executed in-memory with equivalent spatial precision.

### 1.3 Machine Learning & Multimodal Verification
- **Skeptic Media Checksum:** The current prototype utilizes cryptographic SHA-256 and perceptual hash matching against a local registry of historical disaster hoaxes. In full national production, this would connect to an automated Reverse Image Search API (e.g. Google Cloud Vision API) and a deepfake detection transformer.
- **Natural Language Classification:** The classifier uses an optimized weighted token-scoring dictionary tailored to Indian meteorological terminology and regional vernacular (e.g. *loo*, *andhi*, *cloudburst*, *waterlogging*). Complex multi-paragraph meteorological research papers require larger language models (e.g. Gemini 2.5 Flash).

---

## 2. Security & Hardening Boundaries

- **Input Sanitization:** All incoming text fields in `POST /api/v1/signals` and `POST /api/v1/citizen-reports` are stripped of control characters and normalized to prevent NoSQL injection, script injection, and cross-site scripting (XSS).
- **Non-Root Execution:** The Docker container enforces execution under an unprivileged `node` user (`UID 1000`) rather than `root`.
- **Atomic File Operations:** File-based persistence uses a write-to-temp-then-rename strategy to eliminate file corruption caused by sudden system reboots or power interruptions.

---

## 3. Production Roadmap for National Scale Deployment

| Phase | Milestone | Technical Scope | Target Quarter |
|---|---|---|---|
| **Phase 1 (Current)** | Unified Hackathon Architecture | Standalone zero-dependency core, 5-layer dedup, 7-factor fusion, dual-tier persistence, GIS dashboard, CAP XML generation | Q3 2026 |
| **Phase 2** | MoES / IMD Cloud Integration | Integration with IMD's internal radar data feeds (DWR NetCDF/HDF5), CWC telemetric gauge API, and CDAC Meghdoot cloud | Q4 2026 |
| **Phase 3** | Telecom CBS Gateway Integration | Direct SMPP / CAP-C interface with Indian telecom providers (BSNL, Jio, Airtel) for sub-second cellular tower cell broadcast | Q1 2027 |
| **Phase 4** | Multilingual Speech Synthesis | Integration with Bhashini API for automated voice bulletin generation in all 22 official Indian languages | Q2 2027 |
| **Phase 5** | Drone & Satellite Corroboration | Automatic tasking of ISRO Cartosat / NISAR radar satellites and NDRF surveillance drones for real-time flood inundation mapping | Q3 2027 |
