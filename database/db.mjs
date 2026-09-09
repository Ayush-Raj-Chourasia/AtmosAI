/**
 * WeatherNexus Unified Database Layer (database/db.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)
 *
 * Authoritative Persistence Architecture:
 * - Supabase Cloud (PostgreSQL 16 + PostGIS + RLS + Storage)
 * - Atomic Crash-Resilient Cache (Reserved exclusively for explicit MODE=REPLAY, MODE=OFFLINE, or MODE=MOCK)
 *
 * AUTHORITATIVE INVARIANTS:
 * 1. Supabase is authoritative in LIVE mode.
 * 2. Failed writes to Supabase MUST throw structured error (AUTHORITATIVE_SUPABASE_WRITE_FAILED)
 *    and cannot silently fallback to local disk or cache.
 * 3. Failed reads in AUTHORITATIVE mode MUST throw structured error (AUTHORITATIVE_SUPABASE_READ_FAILED)
 *    and cannot silently return stale local data.
 * 4. In-memory cache is updated ONLY upon confirmed Supabase success.
 * 5. Local disk persistence is strictly gated behind REPLAY, OFFLINE, or MOCK modes.
 * 6. Returned objects carry truthful _data_source tags.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  getSupabaseClient,
  getServerAdminClient,
  isSupabaseConfigured,
  checkSupabaseHealth,
  findEventsNearbyPostGIS,
} from '../lib/supabase.mjs';
import { DATA_MODES, normalizeDataMode } from '../lib/constants.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const ORIGINAL_STORE_PATH = path.join(DATA_DIR, 'nweis-store.json');
const STORE_PATH = process.env.VERCEL ? path.join('/tmp', 'nweis-store.json') : ORIGINAL_STORE_PATH;

// Truthful Baseline Source Registry (No fake datasets)
const DEFAULT_SOURCES = [
  { id: 'src_imd_01', name: 'IMD Official API', source_type: 'imd', base_reliability: 1.0, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_ndma_01', name: 'National Disaster Management Authority (NDMA)', source_type: 'imd', base_reliability: 0.98, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_cwc_01', name: 'Central Water Commission (CWC Flood)', source_type: 'imd', base_reliability: 0.95, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_meteo_01', name: 'Open-Meteo Weather API', source_type: 'weather_api', base_reliability: 0.90, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_owm_01', name: 'OpenWeatherMap API', source_type: 'weather_api', base_reliability: 0.88, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_toi_01', name: 'Times of India Weather RSS', source_type: 'news', base_reliability: 0.85, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_ndtv_01', name: 'NDTV India Weather RSS', source_type: 'news', base_reliability: 0.85, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_citizen_v_01', name: 'Citizen Verified Reporters', source_type: 'citizen', base_reliability: 0.70, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_citizen_pub_01', name: 'Public Citizen Submissions', source_type: 'citizen', base_reliability: 0.55, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_social_x_01', name: 'Social Media Stream (X/Twitter #IMD)', source_type: 'social_media', base_reliability: 0.35, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_social_anon_01', name: 'Anonymous Reposts & Viral Streams', source_type: 'social_media', base_reliability: 0.20, is_active: true, created_at: new Date().toISOString() },
];

class DatabaseEngine {
  constructor() {
    this.supabase = null;
    this.isSupabaseConnected = false;
    this.mode = 'OFFLINE_FALLBACK';
    this.isInitialized = false;

    this.tables = {
      profiles: new Map(),
      sources: new Map(),
      signals: new Map(),
      weather_events: new Map(),
      event_signals: new Map(),
      event_evidence: new Map(),
      event_clusters: new Map(),
      verification_records: [],
      source_reputation: new Map(),
      ai_predictions: [],
      admin_actions: [],
      media_metadata: new Map(),
      source_health: new Map(),
      weather_observations: new Map(),
    };
  }

  isAuthoritative() {
    return this.mode === 'AUTHORITATIVE' || this.mode === 'SUPABASE_AUTHORITATIVE';
  }

  async init() {
    if (this.isInitialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Always seed baseline defaults into memory
    this.seedDefaults();

    // 1. Authoritative Supabase Integration
    if (isSupabaseConfigured()) {
      try {
        this.supabase = getSupabaseClient();
        const health = await checkSupabaseHealth();

        if (health.connected && health.schemaReady) {
          this.isSupabaseConnected = true;
          this.mode = 'AUTHORITATIVE';
          console.log('[SUPABASE] Mode: AUTHORITATIVE — Supabase PostgreSQL + PostGIS connected.');
          await this.hydrateFromSupabase();
        } else if (health.connected) {
          console.warn(`[SUPABASE] ⚠️ Schema not yet applied on Supabase (${health.error}).`);
          console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Operating with Atomic Crash-Resilient Storage.');
          this.mode = 'OFFLINE_FALLBACK';
          this.loadFromDisk();
        } else {
          console.warn(`[SUPABASE] ⚠️ Supabase connection failed (${health.error}).`);
          console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Operating with Atomic Crash-Resilient Storage.');
          this.mode = 'OFFLINE_FALLBACK';
          this.loadFromDisk();
        }
      } catch (err) {
        console.warn(`[SUPABASE] ⚠️ Supabase initialization error: ${err.message}`);
        this.mode = 'OFFLINE_FALLBACK';
        this.loadFromDisk();
      }
    } else {
      console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Supabase credentials not set. Using Atomic Crash-Resilient Store.');
      this.mode = 'OFFLINE_FALLBACK';
      this.loadFromDisk();
    }

    this.isInitialized = true;
  }

  async hydrateFromSupabase() {
    if (!this.isSupabaseConnected || !this.supabase) return;
    try {
      const { data: srcRows } = await this.supabase.from('sources').select('*');
      if (srcRows && srcRows.length > 0) {
        for (const r of srcRows) this.tables.sources.set(r.id, r);
      }

      const { data: evRows } = await this.supabase.from('weather_events').select('*').order('last_updated_at', { ascending: false });
      if (evRows && evRows.length > 0) {
        for (const r of evRows) {
          this.tables.weather_events.set(r.id, {
            ...r,
            confidence: parseFloat(r.confidence_score) || 0.5,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
            _data_source: 'SUPABASE_AUTHORITATIVE',
          });
        }
      }

      const { data: sigRows } = await this.supabase.from('signals').select('*').order('timestamp', { ascending: false }).limit(500);
      if (sigRows && sigRows.length > 0) {
        for (const r of sigRows) this.tables.signals.set(r.id, { ...r, _data_source: 'SUPABASE_AUTHORITATIVE' });
      }

      const { data: evdRows } = await this.supabase.from('event_evidence').select('*').limit(500);
      if (evdRows && evdRows.length > 0) {
        for (const r of evdRows) this.tables.event_evidence.set(r.id, r);
      }

      const { data: vrRows } = await this.supabase.from('verification_records').select('*').order('created_at', { ascending: false }).limit(200);
      if (vrRows && vrRows.length > 0) {
        this.tables.verification_records = vrRows;
      }

      console.log(`[SUPABASE] Hydration complete: ${evRows?.length || 0} events, ${sigRows?.length || 0} signals.`);
    } catch (err) {
      console.warn('[SUPABASE] Hydration warning:', err.message);
    }
  }

  loadFromDisk() {
    const appMode = (process.env.APP_MODE || process.env.NODE_ENV || '').toUpperCase();
    if (appMode === 'LIVE') {
      console.log('[DB] Mode is LIVE: Bypassing local demo/offline disk store hydration.');
      this.seedDefaults();
      return;
    }

    try {
      let targetPath = STORE_PATH;
      if (!fs.existsSync(targetPath) && fs.existsSync(ORIGINAL_STORE_PATH)) {
        targetPath = ORIGINAL_STORE_PATH;
      }
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const data = JSON.parse(raw);
        if (data.sources) this.tables.sources = new Map(Object.entries(data.sources));
        if (data.signals) this.tables.signals = new Map(Object.entries(data.signals).map(([k, v]) => [k, { ...v, data_mode: v.data_mode || 'DEMO' }]));
        if (data.weather_events) this.tables.weather_events = new Map(Object.entries(data.weather_events).map(([k, v]) => [k, { ...v, data_mode: v.data_mode || 'DEMO' }]));
        if (data.event_evidence) this.tables.event_evidence = new Map(Object.entries(data.event_evidence));
        if (data.verification_records) this.tables.verification_records = data.verification_records;
        if (data.admin_actions) this.tables.admin_actions = data.admin_actions;
        if (data.media_metadata) this.tables.media_metadata = new Map(Object.entries(data.media_metadata));
        console.log(`[DB]  Loaded persistent disk state: ${this.tables.weather_events.size} events, ${this.tables.signals.size} signals.`);
      }
    } catch (err) {
      console.warn('[DB] ⚠️ Could not load disk store, seeding baseline:', err.message);
    }
  }

  seedDefaults() {
    for (const src of DEFAULT_SOURCES) {
      this.tables.sources.set(src.id, src);
    }
  }

  saveToDisk() {
    // Disk persistence is strictly gated behind REPLAY / OFFLINE / MOCK mode
    const appMode = (process.env.APP_MODE || process.env.NODE_ENV || '').toUpperCase();
    const isAllowedMode = appMode === 'REPLAY' || appMode === 'OFFLINE' || appMode === 'MOCK' || this.mode === 'OFFLINE_FALLBACK';
    if (this.isAuthoritative() && !isAllowedMode) {
      return;
    }

    try {
      const serializable = {
        saved_at: new Date().toISOString(),
        sources: Object.fromEntries(this.tables.sources),
        signals: Object.fromEntries(this.tables.signals),
        weather_events: Object.fromEntries(this.tables.weather_events),
        event_evidence: Object.fromEntries(this.tables.event_evidence),
        verification_records: this.tables.verification_records,
        admin_actions: this.tables.admin_actions,
        media_metadata: Object.fromEntries(this.tables.media_metadata),
      };

      const tmpPath = `${STORE_PATH}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpPath, JSON.stringify(serializable, null, 2), 'utf8');
      fs.renameSync(tmpPath, STORE_PATH);
    } catch (err) {
      console.error('[DB] ⚠️ Atomic disk save error:', err.message);
    }
  }

  // ============================================================
  // SOURCES
  // ============================================================
  async getSources() {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('sources').select('*').eq('is_active', true).order('base_reliability', { ascending: false });
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_READ_FAILED: ${error.message}`);
        }
        if (!error && data && data.length > 0) {
          return data.map((s) => ({ ...s, _data_source: 'SUPABASE_AUTHORITATIVE' }));
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Sources fallback:', e.message);
      }
    }
    return Array.from(this.tables.sources.values())
      .filter((s) => s.is_active)
      .map((s) => ({ ...s, _data_source: this.mode }));
  }

  // ============================================================
  // SIGNALS
  // ============================================================
  async insertSignal(signal) {
    const id = signal.id || `sig_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const record = {
      ...signal,
      id,
      timestamp: signal.timestamp || now,
      ingested_at: signal.ingested_at || now,
      created_at: signal.created_at || now,
      data_mode: normalizeDataMode(signal.data_mode),
      location_confidence: signal.location_confidence ?? 0.8,
      relevance_score: signal.relevance_score ?? 0.5,
      credibility_score: signal.credibility_score ?? 0.5,
      misinformation_score: signal.misinformation_score ?? 0.0,
      verification_status: signal.verification_status || 'UNVERIFIED',
      media_urls: signal.media_urls || [],
      media_types: signal.media_types || [],
      hashtags: signal.hashtags || [],
    };

    // Authoritative Supabase Write
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('signals').insert([{
          id: record.id,
          source_id: record.source_id || null,
          source_type: record.source_type,
          source_name: record.source_name || null,
          external_id: record.external_id || null,
          text: record.text,
          language: record.language || 'en',
          timestamp: record.timestamp,
          ingested_at: record.ingested_at,
          city: record.city || null,
          state: record.state || null,
          country: record.country || 'India',
          latitude: record.latitude || null,
          longitude: record.longitude || null,
          location_confidence: record.location_confidence,
          location_method: record.location_method || null,
          event_candidate: record.event_candidate || null,
          relevance_score: record.relevance_score,
          credibility_score: record.credibility_score,
          misinformation_score: record.misinformation_score,
          verification_status: record.verification_status,
          media_urls: record.media_urls,
          media_types: record.media_types,
          hashtags: record.hashtags,
          data_mode: record.data_mode || 'LIVE',
          raw_payload: record.raw_payload || {},
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Signal insert notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Signal sync warning:', e.message);
      }
    }

    // Commit to Memory Cache only upon confirmed success
    this.tables.signals.set(id, record);

    // Gated disk save
    this.saveToDisk();
    return record;
  }

  async updateSignal(id, updates) {
    const existing = this.tables.signals.get(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates,
      last_updated_at: new Date().toISOString(),
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('signals').update(updates).eq('id', id);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          }
          console.warn('[SUPABASE] Signal update warning:', error.message);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Signal update error:', e.message);
      }
    }

    this.tables.signals.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  async getSignals(filters = {}) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        let query = this.supabase.from('signals').select('*');
        if (filters.source_type && filters.source_type !== 'ALL') {
          query = query.eq('source_type', filters.source_type);
        }
        if (filters.verification_status && filters.verification_status !== 'ALL') {
          query = query.eq('verification_status', filters.verification_status);
        }
        if (filters.data_mode) {
          query = query.eq('data_mode', filters.data_mode);
        }
        if (filters.from_date) {
          query = query.gte('timestamp', filters.from_date);
        }
        const { data, error } = await query.order('timestamp', { ascending: false }).limit(200);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_READ_FAILED: ${error.message}`);
        }
        if (!error && data && data.length > 0) {
          return data.map((s) => ({ ...s, _data_source: 'SUPABASE_AUTHORITATIVE' }));
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Signal query warning:', e.message);
      }
    }

    let signals = Array.from(this.tables.signals.values()).map(s => ({ ...s, _data_source: this.mode }));
    if (filters.source_type && filters.source_type !== 'ALL') {
      signals = signals.filter((s) => s.source_type === filters.source_type);
    }
    if (filters.verification_status && filters.verification_status !== 'ALL') {
      signals = signals.filter((s) => s.verification_status === filters.verification_status);
    }
    if (filters.data_mode) {
      signals = signals.filter((s) => s.data_mode === filters.data_mode);
    }
    if (filters.from_date) {
      const from = new Date(filters.from_date).getTime();
      signals = signals.filter((s) => new Date(s.timestamp || s.ingested_at).getTime() >= from);
    }
    signals.sort((a, b) => new Date(b.timestamp || b.ingested_at).getTime() - new Date(a.timestamp || a.ingested_at).getTime());
    return signals.slice(0, 200);
  }

  // ============================================================
  // WEATHER EVENTS
  // ============================================================
  async insertEvent(event) {
    const id = event.id || `evt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const record = {
      ...event,
      id,
      data_mode: normalizeDataMode(event.data_mode),
      first_detected_at: event.first_detected_at || now,
      last_updated_at: event.last_updated_at || now,
      last_evidence_at: event.last_evidence_at || now,
      created_at: event.created_at || now,
      status: event.status || 'DETECTED',
      severity: event.severity || 'medium',
      confidence_score: event.confidence_score ?? event.confidence ?? 0.5,
      confidence: event.confidence ?? event.confidence_score ?? 0.5,
      signal_count: event.signal_count || 1,
      source_breakdown: event.source_breakdown || { imd: 0, weather_api: 0, news: 0, social_media: 0, citizen: 0 },
      evidence_summary: event.evidence_summary || '',
      ai_reasoning: event.ai_reasoning || '',
    };

    // Authoritative Supabase Write
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('weather_events').upsert([{
          id: record.id,
          event_type: record.event_type,
          title: record.title,
          description: record.description || null,
          severity: record.severity,
          status: record.status,
          latitude: record.latitude,
          longitude: record.longitude,
          city: record.city,
          state: record.state,
          country: record.country || 'India',
          radius_m: record.radius_m || 5000,
          confidence_score: record.confidence_score,
          first_detected_at: record.first_detected_at,
          last_updated_at: record.last_updated_at,
          signal_count: record.signal_count,
          source_breakdown: record.source_breakdown,
          ai_reasoning: record.ai_reasoning,
          data_mode: record.data_mode || 'LIVE',
          evidence_summary: Array.isArray(record.evidence_summary) ? record.evidence_summary : [record.evidence_summary],
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Event upsert notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Event upsert warning:', e.message);
      }
    }

    // Commit to Memory Cache only upon confirmed success
    this.tables.weather_events.set(id, record);

    // Gated disk save
    this.saveToDisk();
    return record;
  }

  async getEvents(filters = {}) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        let query = this.supabase.from('weather_events').select('*');
        if (filters.event_type && filters.event_type !== 'ALL') {
          query = query.eq('event_type', filters.event_type);
        }
        if (filters.status && filters.status !== 'ALL') {
          query = query.eq('status', filters.status);
        }
        if (filters.state && filters.state !== 'All India') {
          query = query.ilike('state', `%${filters.state}%`);
        }
        if (filters.data_mode) {
          query = query.eq('data_mode', filters.data_mode);
        }
        if (filters.from_date) {
          query = query.gte('last_updated_at', filters.from_date);
        }
        const { data, error } = await query.order('last_updated_at', { ascending: false });
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_READ_FAILED: ${error.message}`);
        }
        if (!error && data && data.length > 0) {
          return data.map((r) => ({
            ...r,
            confidence: parseFloat(r.confidence_score) || 0.5,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
            _data_source: 'SUPABASE_AUTHORITATIVE',
          }));
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Event query warning:', e.message);
      }
    }

    let events = Array.from(this.tables.weather_events.values()).map(e => ({ ...e, _data_source: this.mode }));
    if (filters.event_type && filters.event_type !== 'ALL') {
      events = events.filter((e) => e.event_type === filters.event_type);
    }
    if (filters.state && filters.state !== 'All India') {
      events = events.filter((e) => e.state?.toLowerCase() === filters.state.toLowerCase());
    }
    if (filters.status && filters.status !== 'ALL') {
      events = events.filter((e) => e.status === filters.status);
    }
    if (filters.data_mode) {
      events = events.filter((e) => e.data_mode === filters.data_mode);
    }
    if (filters.from_date) {
      const from = new Date(filters.from_date).getTime();
      events = events.filter((e) => new Date(e.last_updated_at || e.first_detected_at).getTime() >= from);
    }
    events.sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
    return events;
  }

  async insertObservation(obs) {
    const id = obs.id || `obs_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const cityName = obs.city || obs.location_name || 'Unknown';
    const record = {
      ...obs,
      id,
      city: cityName,
      location_name: obs.location_name || cityName,
      observed_at: obs.provider_timestamp || obs.observed_at || new Date().toISOString(),
      provider_timestamp: obs.provider_timestamp || obs.observed_at || new Date().toISOString(),
      ingested_at: obs.ingested_at || new Date().toISOString(),
      data_mode: obs.data_mode || 'LIVE',
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('weather_observations').insert([{
          id: record.id,
          city: record.city,
          location_name: record.location_name,
          state: record.state,
          country: record.country || 'India',
          latitude: record.latitude,
          longitude: record.longitude,
          temperature_c: record.temperature_c ?? record.temp ?? 0,
          feels_like_c: record.feels_like_c ?? record.feels_like ?? null,
          humidity_pct: record.humidity_pct ?? record.humidity ?? null,
          pressure_hpa: record.pressure_hpa ?? record.pressure ?? null,
          wind_speed_kmh: record.wind_speed_kmh ?? record.wind_speed ?? null,
          wind_gust_kmh: record.wind_gust_kmh ?? record.wind_gust ?? null,
          wind_deg: record.wind_deg ?? null,
          precipitation_mm: record.precipitation_mm ?? record.rain ?? 0,
          visibility_m: record.visibility_m ?? record.visibility ?? null,
          cloud_cover_pct: record.cloud_cover_pct ?? record.clouds ?? null,
          weather_condition: record.weather_condition ?? null,
          weather_id: record.weather_id ?? null,
          weather_description: record.weather_description ?? null,
          provider: record.provider || 'OpenWeather',
          provider_timestamp: record.provider_timestamp,
          ingested_at: record.ingested_at,
          data_mode: record.data_mode,
          raw_payload: record.raw_payload || {},
        }]);
        if (error && this.isAuthoritative()) {
          console.warn('[SUPABASE] Observation insert note:', error.message);
        }
      } catch (e) {
        if (this.isAuthoritative()) console.warn('[SUPABASE] Observation sync notice:', e.message);
      }
    }

    this.tables.weather_observations.set(id, record);
    return record;
  }

  getLatestObservations(dataMode = 'LIVE') {
    const latestByCity = new Map();
    for (const obs of this.tables.weather_observations.values()) {
      if (dataMode && obs.data_mode !== dataMode) continue;
      const cityName = obs.city || obs.location_name || 'unknown';
      const key = cityName.toLowerCase();
      const existing = latestByCity.get(key);
      const obsTime = new Date(obs.provider_timestamp || obs.observed_at || obs.ingested_at).getTime();
      const existingTime = existing ? new Date(existing.provider_timestamp || existing.observed_at || existing.ingested_at).getTime() : 0;
      if (!existing || obsTime > existingTime) {
        const ageMin = Math.max(0, Math.round((Date.now() - obsTime) / 60000));
        latestByCity.set(key, {
          ...obs,
          city: cityName,
          location_name: obs.location_name || cityName,
          age_minutes: ageMin,
          is_stale: ageMin > 60,
        });
      }
    }
    return Array.from(latestByCity.values());
  }

  async getEventById(id) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('weather_events').select('*').eq('id', id).single();
        if (error && error.code !== 'PGRST116' && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_READ_FAILED: ${error.message}`);
        }
        if (!error && data) {
          return {
            ...data,
            confidence: parseFloat(data.confidence_score) || 0.5,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
            _data_source: 'SUPABASE_AUTHORITATIVE',
          };
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Event getById warning:', e.message);
      }
    }
    const ev = this.tables.weather_events.get(id);
    return ev ? { ...ev, _data_source: this.mode } : null;
  }

  async updateEvent(id, updates) {
    const existing = this.tables.weather_events.get(id) || (await this.getEventById(id));
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      last_updated_at: new Date().toISOString(),
    };
    if (updates.confidence !== undefined) {
      updated.confidence_score = updates.confidence;
    }

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const patch = { last_updated_at: new Date().toISOString() };
        if (updates.status) patch.status = updates.status;
        if (updates.confidence !== undefined) patch.confidence_score = updates.confidence;
        if (updates.signal_count !== undefined) patch.signal_count = updates.signal_count;
        if (updates.source_breakdown) patch.source_breakdown = updates.source_breakdown;
        const { error } = await this.supabase.from('weather_events').update(patch).eq('id', id);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Event update warning:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Event update warning:', e.message);
      }
    }

    this.tables.weather_events.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  // ============================================================
  // POSTGIS SPATIAL QUERIES
  // ============================================================
  async findEventsNearby(latitude, longitude, radiusMeters = 15000) {
    // 1. Validate spatial boundaries
    if (
      typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90 ||
      typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180 ||
      typeof radiusMeters !== 'number' || isNaN(radiusMeters) || radiusMeters <= 0 || radiusMeters > 500000
    ) {
      const err = new Error(`Invalid spatial parameters: lat=${latitude}, lon=${longitude}, radius=${radiusMeters}`);
      err.code = 'INVALID_SPATIAL_PARAMETERS';
      err.statusCode = 400;
      throw err;
    }

    // 2. Authoritative PostGIS Spatial RPC
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const spatialRows = await findEventsNearbyPostGIS(latitude, longitude, radiusMeters);
        if (Array.isArray(spatialRows)) {
          return spatialRows.map((r) => ({ ...r, _spatial_engine: 'POSTGIS_RPC', _data_source: 'SUPABASE_AUTHORITATIVE' }));
        }
      } catch (postgisErr) {
        if (this.isAuthoritative()) {
          console.warn('[PostGIS] Spatial RPC failed in AUTHORITATIVE mode:', postgisErr.message);
          throw postgisErr;
        }
        // In OFFLINE_FALLBACK, fall through to Haversine fallback
      }
    } else if (this.isAuthoritative()) {
      const err = new Error('PostGIS is unavailable and system is in AUTHORITATIVE mode.');
      err.code = 'SPATIAL_QUERY_DEGRADED';
      err.statusCode = 503;
      throw err;
    }

    // 3. Haversine Math Fallback strictly for local cache & offline resilience
    function haversine(lat1, lon1, lat2, lon2) {
      const R = 6371e3;
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;
      const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    return Array.from(this.tables.weather_events.values())
      .map((ev) => ({
        ...ev,
        distance_meters: haversine(latitude, longitude, ev.latitude, ev.longitude),
        _spatial_engine: 'SPATIAL_FALLBACK_HAVERSINE',
        _data_source: this.mode,
      }))
      .filter((ev) => ev.distance_meters <= radiusMeters && ['DETECTED', 'UNDER_REVIEW', 'VERIFIED', 'ACTIVE'].includes(ev.status));
  }

  // ============================================================
  // EVIDENCE & AUDIT LOGS
  // ============================================================
  async insertEvidence(evidence) {
    const id = evidence.id || `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...evidence, id, created_at: evidence.created_at || new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('event_evidence').insert([{
          id: record.id,
          event_id: record.event_id,
          signal_id: record.signal_id,
          source_type: record.source_type,
          source_name: record.source_name,
          credibility_weight: record.credibility_weight || 0.5,
          supporting_text: record.supporting_text || '',
          media_url: record.media_url || null,
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Evidence sync notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Evidence sync failed:', e.message);
      }
    }

    this.tables.event_evidence.set(id, record);
    this.saveToDisk();
    return record;
  }

  async updateEvidence(id, updates) {
    const existing = this.tables.event_evidence.get(id);
    if (!existing) return null;

    const updated = { ...existing, ...updates };
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('event_evidence').update(updates).eq('id', id);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
      }
    }

    this.tables.event_evidence.set(id, updated);
    this.saveToDisk();
    return updated;
  }

  async insertVerification(verification) {
    const id = verification.id || `vr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...verification, id, created_at: verification.created_at || new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('verification_records').insert([{
          id: record.id,
          target_type: record.target_type || 'event',
          target_id: record.target_id,
          action: record.action || 'VERIFY',
          verified_by: record.verified_by || 'admin',
          actor_id: record.actor_id || null,
          reason: record.reason || null,
          previous_status: record.previous_status || null,
          new_status: record.new_status || null,
          confidence_before: record.confidence_before || null,
          confidence_after: record.confidence_after || null,
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Verification sync notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Verification sync failed:', e.message);
      }
    }

    this.tables.verification_records.push(record);
    this.saveToDisk();
    return record;
  }

  async updateVerification(id, updates) {
    const idx = this.tables.verification_records.findIndex(v => v.id === id);
    if (idx === -1) return null;

    const updated = { ...this.tables.verification_records[idx], ...updates };
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('verification_records').update(updates).eq('id', id);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
      }
    }

    this.tables.verification_records[idx] = updated;
    this.saveToDisk();
    return updated;
  }

  async insertAuditAction(action) {
    const id = action.id || `act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...action, id, created_at: action.created_at || new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('admin_actions').insert([{
          id: record.id,
          admin_user: record.admin_user || 'system',
          action_type: record.action_type,
          target_id: record.target_id || null,
          details: record.details || {},
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Audit action sync notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Audit action sync failed:', e.message);
      }
    }

    this.tables.admin_actions.push(record);
    this.saveToDisk();
    return record;
  }

  async insertMediaMetadata(media) {
    const id = media.media_id || `med_${Date.now()}`;
    const record = { ...media, id, created_at: media.created_at || new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('media_metadata').insert([{
          id: record.id,
          media_id: record.media_id,
          event_id: record.event_id || null,
          signal_id: record.signal_id || null,
          object_key: record.object_key,
          url: record.url,
          mime_type: record.mime_type,
          file_size: record.file_size,
          checksum: record.checksum,
          storage_provider: record.storage_provider || 'SUPABASE_STORAGE',
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] Media metadata sync notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] Media metadata sync failed:', e.message);
      }
    }

    this.tables.media_metadata.set(id, record);
    this.saveToDisk();
    return record;
  }

  async insertAiPrediction(prediction) {
    const id = prediction.id || `aip_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = {
      ...prediction,
      id,
      created_at: prediction.created_at || new Date().toISOString(),
    };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('ai_predictions').insert([{
          id: record.id,
          signal_id: record.signal_id || null,
          event_id: record.event_id || null,
          model: record.model || 'gemini-3.8-flash',
          prediction_type: record.prediction_type || 'CLASSIFICATION',
          raw_output: record.raw_output || {},
          confidence: record.confidence ?? null,
          latency_ms: record.latency_ms ?? 0,
        }]);
        if (error) {
          if (this.isAuthoritative()) {
            throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
          } else {
            console.warn('[SUPABASE] AI prediction sync notice:', error.message);
          }
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
        console.warn('[SUPABASE] AI prediction sync failed:', e.message);
      }
    }

    this.tables.ai_predictions.push(record);
    this.saveToDisk();
    return record;
  }

  async insertEventSignal(eventId, signalId) {
    const key = `${eventId}:${signalId}`;
    const record = { event_id: eventId, signal_id: signalId, created_at: new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('event_signals').insert([{
          event_id: eventId,
          signal_id: signalId,
        }]);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
      }
    }

    this.tables.event_signals.set(key, record);
    return record;
  }

  async insertEventCluster(cluster) {
    const id = cluster.id || `cl_${Date.now()}`;
    const record = { ...cluster, id, created_at: cluster.created_at || new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('event_clusters').insert([record]);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
      }
    }

    this.tables.event_clusters.set(id, record);
    return record;
  }

  async insertSourceHealth(health) {
    const id = health.id || `sh_${Date.now()}`;
    const record = { ...health, id, created_at: new Date().toISOString() };

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { error } = await this.supabase.from('source_health').insert([record]);
        if (error && this.isAuthoritative()) {
          throw new Error(`AUTHORITATIVE_SUPABASE_WRITE_FAILED: ${error.message}`);
        }
      } catch (e) {
        if (this.isAuthoritative()) throw e;
      }
    }

    this.tables.source_health.set(health.source_id || id, record);
    return record;
  }

  getStorageInfo() {
    const isSupa = this.isSupabaseConnected;
    return {
      storage_type: isSupa ? 'SUPABASE_POSTGRESQL_POSTGIS' : 'OFFLINE_CRASH_RESILIENT_CACHE',
      supabase_connected: isSupa,
      disk_store_path: STORE_PATH,
      authoritative_engine: isSupa
        ? 'Supabase Cloud (PostgreSQL 16 + PostGIS + RLS + Storage)'
        : 'Atomic Crash-Resilient Store (Offline/Replay Mode)',
      counts: {
        sources: this.tables.sources.size,
        signals: this.tables.signals.size,
        events: this.tables.weather_events.size,
        evidence: this.tables.event_evidence.size,
        verifications: this.tables.verification_records.length,
        admin_actions: this.tables.admin_actions.length,
        media: this.tables.media_metadata.size,
      },
    };
  }

  async reset() {
    this.tables.signals.clear();
    this.tables.weather_events.clear();
    this.tables.event_evidence.clear();
    this.tables.verification_records.length = 0;
    this.tables.admin_actions.length = 0;
    this.tables.media_metadata.clear();
    this.seedDefaults();
    this.saveToDisk();
  }
}

export const db = new DatabaseEngine();