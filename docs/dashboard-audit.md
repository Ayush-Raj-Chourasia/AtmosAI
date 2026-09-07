# Dashboard Audit — N-WEIS SIH26069

**Audit Date:** 2026-09-07
**Auditor:** Antigravity AI
**Server:** http://localhost:3001 (running, 9 active events, 51 signals)

---

## 1. Current Status

**PARTIALLY IMPLEMENTED**

A single-page dashboard exists at `public/index.html` served by `server-nweis.mjs` on port 3001.
It is CONNECTED to real backend data but is MISSING several SIH26069-required sections.

---

## 2. Dashboard Location

| Component | Details |
|-----------|---------|
| Frontend application | `public/index.html` — vanilla HTML/JS/Tailwind CDN, 2225 lines |
| Route / URL | http://localhost:3001/ |
| API Services | server-nweis.mjs on port 3001 |
| Next.js app | apps/web/ — EXISTS but NOT installed, NOT running |
| NestJS API | apps/api/ — EXISTS but NOT installed, NOT running |

---

## 3. What Already Works

| Feature | Status | File |
|---------|--------|------|
| India GIS map (Leaflet) | WORKING | public/index.html L799 |
| Event markers (color-coded) | WORKING | public/index.html L963 |
| Event clustering | WORKING | public/index.html |
| Marker click -> detail drawer | WORKING | public/index.html L1090 |
| Event type filter | WORKING | public/index.html filter bar |
| State filter | WORKING | public/index.html |
| Status filter | WORKING | public/index.html |
| Confidence threshold slider | WORKING | public/index.html |
| Real-time SSE stream | WORKING | /api/v1/events/stream |
| Demo scenarios (4) | WORKING | public/index.html demo bar |
| Citizen report modal | WORKING | public/index.html |
| KPI stats in header | WORKING | public/index.html header |
| Event Intelligence drawer | WORKING | public/index.html |
| Confidence gauge (SVG) | WORKING | public/index.html |
| Evidence display | WORKING | public/index.html |
| AI reasoning display | WORKING | public/index.html |
| Timeline | WORKING | public/index.html |
| Multilingual alerts | WORKING | public/index.html |
| CAP broadcast panel | WORKING | public/index.html |
| SDRF dispatch panel | WORKING | public/index.html |
| SITREP generation | WORKING | public/index.html |
| GeoJSON / KML / CSV export | WORKING | public/index.html |
| PWA offline mode | WORKING | public/sw.js |
| Verification state machine | BACKEND ONLY | server-nweis.mjs |
| Radar sweep animation | WORKING | public/index.html |

---

## 4. What Is Missing

| Feature | Status | Recommended |
|---------|--------|-------------|
| KPI cards row in main body | MISSING | Pull from /api/v1/admin/analytics |
| Date range filter | MISSING | Today/24h/7d/custom -> from_date param |
| Dedicated Analytics page | MISSING | Chart.js: events over time, by type, by state |
| Dedicated Signals page | MISSING | Table of /api/v1/signals |
| Verification Queue page | MISSING | UNDER_REVIEW events + Verify/Reject buttons |
| Source Health page | MISSING | Cards for each source with status |
| System Health page | MISSING | API/SSE/DB/AI status from /health |
| Admin Panel | MISSING | Separate /admin page with sidebar |
| Data Pipeline visualization | MISSING | Animated step-by-step flow for SIH judges |

---

## 5. Runtime Problems

| Problem | Details |
|---------|---------|
| Next.js app not installed | apps/web/node_modules missing — cannot run |
| NestJS API not installed | apps/api/node_modules missing — cannot run |
| next.config.ts wrong package name | transpilePackages: @disaster-app/shared should be @n-weis/shared |
| AdminSidebar shows Disaster Pulse | Old project name in apps/web — irrelevant since not running |
| CartoDB tile API key overlay | FIXED — replaced with OSM + dark CSS filter |

---

## 6. Recommended Fix

**Strategy: Extend public/index.html + server-nweis.mjs.**

DO NOT install Next.js or NestJS — zero-dependency approach is demo-safe.
All required APIs already exist in server-nweis.mjs.

Priority 1:
1. KPI cards row (analytics from /api/v1/admin/analytics)
2. Date range filter (Today/24h/7d)
3. Analytics tab with Chart.js (events over time, by type, source distribution, verification funnel)
4. Signals tab (table of raw signals)
5. Verification Queue tab (UNDER_REVIEW events with admin actions)
6. Source Health tab
7. System Health tab
8. Data Pipeline visualization

Priority 2:
9. Admin panel page at /admin route
