# WeatherNexus: Production Readiness & Deployment Guide

**Platform:** WeatherNexus (SIH26069 — National Weather Big Data Analytics Platform)  
**Authority:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  
**Target Environments:** Vercel Edge Serverless & Standalone Node.js 20+

---

## 1. Environment Variable Inventory & Secret Hygiene

All production credentials must be set in environment configuration (`.env` or Vercel Environment Variables). **Never** commit secrets to source control.

| Environment Variable | Required? | Source / Provider | Security Scope | Purpose |
|---|---|---|---|---|
| `PORT` | Optional | Platform runtime | Server | HTTP listen port (Default: 3001). |
| `SUPABASE_URL` | **Required** | Supabase Project Settings | Server + Public | Supabase API endpoint URL. |
| `SUPABASE_ANON_KEY` | **Required** | Supabase API Settings | Server + Public | Public client token for unauthenticated reads. |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | Supabase API Settings | **Server Only** | Administrative bypass token for background ingestion. |
| `OPENWEATHER_API_KEY` | **Required** | OpenWeather Dashboard | **Server Only** | Secondary weather observation API. |
| `GEMINI_API_KEY` | **Required** | Google AI Studio | **Server Only** | Multimodal reasoning & structured JSON extraction. |
| `GEMINI_MODEL` | Optional | Google Gemini | **Server Only** | Model ID (Default: `gemini-3.8-flash`). |
| `TWITTER_BEARER_TOKEN` | Optional | X Developer Portal | **Server Only** | Real-time social observation ingestion. |
| `TWITTER_API_BASE_URL` | Optional | X Developer Portal | **Server Only** | API base URL (`https://api.x.com/2`). |

> **Secret Isolation:** The public client bundle **never** receives `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `OPENWEATHER_API_KEY`, or `TWITTER_BEARER_TOKEN`.

---

## 2. Supabase Cloud Configuration & PostGIS Setup

WeatherNexus relies on Supabase for authoritative persistence:
1. **PostgreSQL 16:** 13 core relational tables and views.
2. **PostGIS Extension:** Enables `GEOGRAPHY(POINT, 4326)` columns, spatial GiST indexing, and `find_events_nearby` stored procedure.
3. **Row Level Security (RLS):** Policies restricting mutations to service-role and authenticated duty forecasters.
4. **Storage Buckets:** `weather-evidence` and `citizen-media` for uploaded photographic and radar assets.

### Applying Migrations:
```bash
# In Supabase SQL Editor, execute:
supabase/migrations/20260909000000_weathernexus_schema.sql
```

---

## 3. Deployment Modes

### Mode A: Vercel Serverless Edge (Recommended for Cloud Hosting)
WeatherNexus includes a serverless bridge in `api/index.mjs` and `vercel.json`:
```bash
# Build production bundle
npx vercel build --prod --yes

# Deploy prebuilt bundle to production
npx vercel deploy --prebuilt --prod
```
Live production endpoint: `https://atmos-ai-api.vercel.app`

### Mode B: Standalone Node.js Container / Bare Metal
Zero-dependency operation without external daemon requirements:
```bash
# Start standalone HTTP & SSE server
node server-nweis.mjs
```

---

## 4. Disaster Resilience & Offline Field Resiliency (PWA)

During catastrophic cyclone or flood events, field teams and local forecasters may suffer telecommunications blackouts:
1. **PWA Offline Service Worker:** Caches all static operational assets (`sw.js`).
2. **Local Crash-Resilient Cache:** In `MODE=OFFLINE` or `MODE=REPLAY`, all records persist atomically to local disk storage (`data/nweis-store.json`).
3. **Offline Field Queue:** Citizen reports submitted without internet connectivity queue in browser `IndexedDB/localStorage` and auto-synchronize when cellular/satellite connectivity restores.