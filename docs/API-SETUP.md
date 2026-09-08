# N-WEIS API Credentials Setup & Configuration Guide
**SIH Problem Statement:** SIH26069 — National Weather Big Data Analytics Platform  
**Target Organization:** Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)  
**Theme:** Disaster Management  

---

## Overview

The National Weather Event Intelligence System (N-WEIS) is architected for **zero-dependency out-of-the-box operation**. When external credentials are not supplied, the system operates deterministically using authenticated historical replay streams, local rule engines, and crash-resilient atomic disk storage.

When production credentials are provided in `.env`, the system automatically transitions into **LIVE operational mode** across external APIs.

This guide provides step-by-step instructions for acquiring and configuring credentials for all 8 supported external services.

---

## 1. India Meteorological Department (IMD) Official API

- **Service:** Official IMD Weather & Hazard Warning Portal
- **Base URL:** `https://api.imd.gov.in`
- **Purpose:** Primary authoritative source for Cyclone, Flood, Heatwave, and Thunderstorm bulletins.
- **How to Obtain:**
  1. MoES / IMD departmental credentials or academic research API access request via the National Data Sharing and Accessibility Policy (NDSAP) portal at [data.gov.in](https://data.gov.in) or direct MoES developer gateway.
  2. For authorized disaster management agencies (NDRF/SDMA/SDRF), API keys are provisioned by the IMD Met Data Centre, Mausam Bhawan, New Delhi.
- **Environment Variable:**
  ```env
  IMD_API_KEY=your_imd_api_key_here
  IMD_BASE_URL=https://api.imd.gov.in
  ```
- **Fallback Behavior:** When `IMD_API_KEY` is not provided, the IMD connector operates in **REPLAY mode** utilizing verified ground-truth meteorological bulletins across Guwahati, New Delhi, Mumbai, and Rajasthan.

---

## 2. OpenWeatherMap (Secondary Weather Provider)

- **Service:** OpenWeather One Call & Current Weather Data API
- **Base URL:** `https://api.openweathermap.org/data/2.5`
- **Purpose:** Cross-border corroboration and secondary ground observation validation.
- **How to Obtain:**
  1. Visit [openweathermap.org](https://openweathermap.org/api) and sign up for a free account.
  2. Navigate to **API keys** in your account dashboard.
  3. Generate a new API key (activation takes 10–30 minutes).
- **Environment Variable:**
  ```env
  OPENWEATHER_API_KEY=your_openweather_api_key_here
  ```
- **Fallback Behavior:** When omitted, OpenWeather is marked as **OFFLINE/DEGRADED** and does not impact primary IMD or Open-Meteo ingestion pipelines.

---

## 3. Twitter / X API v2 (Social Media Stream)

- **Service:** X Developer Platform API v2 (Filtered Search & Recent Search)
- **Base URL:** `https://api.twitter.com/2`
- **Purpose:** Ingestion of real-time eyewitness observations tagging `#IMD`, `#weather`, `#rain`, `#flood`, `#cyclone`.
- **How to Obtain:**
  1. Apply for a Developer Account at [developer.x.com](https://developer.x.com).
  2. Create a new Project and App.
  3. Under **Keys and Tokens**, generate an **App-only Bearer Token**.
- **Environment Variable:**
  ```env
  TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
  ```
- **Fallback Behavior:** When omitted, the social stream operates in **REPLAY mode** using verified real social media posts from disaster events across Assam, Mumbai, and Bengaluru.

---

## 4. Google Gemini Multimodal AI (Google AI Studio)

- **Service:** Google Generative AI (`gemini-2.5-flash`)
- **Base URL:** `https://generativelanguage.googleapis.com/v1beta`
- **Purpose:** Server-side multimodal text entity extraction and visual damage verification.
- **How to Obtain:**
  1. Visit [aistudio.google.com](https://aistudio.google.com).
  2. Sign in with your Google account.
  3. Click **Get API key** and generate a new key.
- **Environment Variable:**
  ```env
  GEMINI_API_KEY=your_gemini_api_key_here
  GEMINI_FLASH_MODEL=gemini-2.5-flash
  ```
- **Fallback Behavior:** When omitted, N-WEIS operates using a deterministic **LOCAL_RULE_ENGINE** heuristic classifier with zero external network dependency.

---

## 5. PostgreSQL 16 + PostGIS (Spatial Database)

- **Service:** Authoritative Relational & Spatial Persistence Engine
- **Purpose:** Spatial indexing (`ST_DWithin`, `ST_Distance`), high-concurrency signal clustering, and immutable audit trails.
- **How to Obtain:**
  - **Local Docker:** Run `docker-compose up -d db` (configured automatically in `docker-compose.yml`).
  - **Cloud Providers:** Provision a PostgreSQL 16 instance with PostGIS enabled on:
    - [Supabase](https://supabase.com)
    - [Neon](https://neon.tech)
    - [AWS RDS](https://aws.amazon.com/rds/postgresql/)
- **Environment Variable:**
  ```env
  DATABASE_URL=postgresql://postgres:postgres@localhost:5432/nweis
  ```
- **Fallback Behavior:** When `DATABASE_URL` is omitted, N-WEIS falls back to an atomic, crash-resilient local JSON file store (`data/nweis-store.json`) with in-memory map indexing.

---

## 6. Redis (Caching & Job Queue)

- **Service:** In-memory distributed cache and Pub/Sub broker
- **Purpose:** Real-time event broadcasting, deduplication locks, and SSE client scaling.
- **How to Obtain:**
  - **Local Docker:** Run `docker-compose up -d redis` (included in `docker-compose.yml`).
  - **Cloud Providers:** Provision a Redis instance on:
    - [Upstash](https://upstash.com) (Serverless Redis)
    - [Redis Cloud](https://redis.com/try-free/)
- **Environment Variable:**
  ```env
  REDIS_URL=redis://localhost:6379
  ```
- **Fallback Behavior:** When omitted or unreachable, Redis transitions to **DEGRADED mode** and platform execution continues seamlessly with in-memory event queues and sets.

---

## 7. Cloudflare R2 (S3-Compatible Object Storage)

- **Service:** Cloudflare R2 / AWS S3 Object Storage
- **Purpose:** Zero-egress storage for citizen eyewitness photos and damage documentation.
- **How to Obtain:**
  1. Sign in to the [Cloudflare Dashboard](https://dash.cloudflare.com).
  2. Navigate to **R2 Object Storage**.
  3. Create a bucket (e.g. `nweis-citizen-media`).
  4. Under **Account Details**, generate an R2 API Token with **Object Read & Write** permissions.
  5. Note your Account ID, Access Key ID, and Secret Access Key.
- **Environment Variables:**
  ```env
  R2_ACCOUNT_ID=your_cloudflare_account_id_here
  R2_BUCKET_NAME=nweis-citizen-media
  R2_ACCESS_KEY_ID=your_r2_access_key_id_here
  R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
  ```
- **Fallback Behavior:** When omitted, media is stored in `public/uploads/` with SHA-256 integrity verification, and reports **MEDIA STORAGE = DEMO/LOCAL**.

---

## 8. Google Maps Platform (Optional Geocoding & Visualization)

- **Service:** Google Maps JavaScript API & Geocoding API
- **Purpose:** Optional secondary basemap layer (the primary system defaults to OpenStreetMap & Leaflet with zero API key requirement).
- **How to Obtain:**
  1. Visit the [Google Cloud Console](https://console.cloud.google.com).
  2. Enable the **Maps JavaScript API** and **Geocoding API**.
  3. Create an API key and restrict it by HTTP referrers.
- **Environment Variable:**
  ```env
  GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
  ```
- **Fallback Behavior:** OpenStreetMap and CartoDB tile layers run by default with no key required.

---

## Summary of Truthful Operational State Table

| Connector / Service | When Credentials Present | When Credentials Missing | When Request Fails |
|---|---|---|---|
| **IMD Adapter** | `LIVE` (HTTP 200) | `REPLAY` (Historical) | `DEGRADED` / `OFFLINE` |
| **OpenWeather** | `LIVE` (HTTP 200) | `OFFLINE` | `DEGRADED` |
| **Social Media Stream** | `LIVE` (Twitter v2 200) | `REPLAY` (Historical) | `DEGRADED` |
| **Open-Meteo API** | `LIVE` (Key-free) | `LIVE` (Key-free) | `DEGRADED` |
| **News RSS** | `LIVE` (Key-free) | `LIVE` (Key-free) | `DEGRADED` |
| **Gemini AI** | `ONLINE` (Multimodal) | `LOCAL_RULE_ENGINE` | `LOCAL_RULE_ENGINE` |
| **PostgreSQL + PostGIS** | `POSTGRESQL_POSTGIS` | `ATOMIC_JSON_STORE` | `ATOMIC_JSON_STORE` |
| **Redis** | `ONLINE` (Connected) | `DEGRADED` (In-Memory) | `DEGRADED` |
| **Cloudflare R2** | `CLOUDFLARE_R2` | `DEMO/LOCAL` | `DEMO/LOCAL` |
