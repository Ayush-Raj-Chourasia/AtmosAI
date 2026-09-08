/**
 * WeatherNexus Unified Database Layer (database/db.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 *
 * Authoritative Persistence Engine: Supabase (PostgreSQL + PostGIS) & Atomic Crash-Resilient Store
 * When Supabase credentials are configured: Supabase Cloud PostgreSQL + PostGIS is AUTHORITATIVE.
 * When Supabase tables are unavailable: Atomic disk storage (data/nweis-store.json) provides OFFLINE_FALLBACK.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');
const ORIGINAL_STORE_PATH = path.join(DATA_DIR, 'nweis-store.json');
const STORE_PATH = process.env.VERCEL ? path.join('/tmp', 'nweis-store.json') : ORIGINAL_STORE_PATH;
const SCHEMA_PATH = path.join(__dirname, '..', 'apps', 'api', 'src', 'database', 'schema.sql');

const DEFAULT_SOURCES = [
  { id: 'src_imd_01', name: 'IMD Official API', source_type: 'imd', base_reliability: 1.0, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_ndma_01', name: 'National Disaster Management Authority (NDMA)', source_type: 'imd', base_reliability: 0.98, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_cwc_01', name: 'Central Water Commission (CWC Flood)', source_type: 'imd', base_reliability: 0.95, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_meteo_01', name: 'Open-Meteo Weather API', source_type: 'weather_api', base_reliability: 0.9, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_owm_01', name: 'OpenWeatherMap API', source_type: 'weather_api', base_reliability: 0.88, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_toi_01', name: 'Times of India Weather RSS', source_type: 'news', base_reliability: 0.85, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_ndtv_01', name: 'NDTV India Weather RSS', source_type: 'news', base_reliability: 0.85, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_citizen_v_01', name: 'Citizen Verified Reporters', source_type: 'citizen', base_reliability: 0.7, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_citizen_pub_01', name: 'Public Citizen Submissions', source_type: 'citizen', base_reliability: 0.55, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_social_x_01', name: 'Social Media Stream (X/Twitter #IMD)', source_type: 'social_media', base_reliability: 0.35, is_active: true, created_at: new Date().toISOString() },
  { id: 'src_dataset_01', name: 'IMD Historical Rainfall Dataset (Public)', source_type: 'public_dataset', base_reliability: 0.85, is_active: true, created_at: new Date().toISOString() },
];

class DatabaseEngine {
  constructor() {
    this.pgPool = null;
    this.isPgConnected = false;
    this.supabase = null;
    this.isSupabaseConnected = false;
    this.supabaseUrl = process.env.SUPABASE_URL || 'https://huzfbxgwzzeqeosjisgi.supabase.co';
    this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || null;
    this.mode = 'OFFLINE_FALLBACK';
    this.isInitialized = false;

    this.tables = {
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
    };
  }

  async init() {
    if (this.isInitialized) return;

    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    // Always load existing disk state first to ensure baseline readiness
    this.loadFromDisk();

    // 1. Authoritative Supabase Integration
    if (this.supabaseUrl && this.supabaseKey) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        this.supabase = createClient(this.supabaseUrl, this.supabaseKey, {
          auth: { persistSession: false },
        });

        // Verify if tables are deployed in Supabase schema cache
        const { data, error } = await this.supabase.from('weather_events').select('id').limit(1);
        if (!error) {
          this.isSupabaseConnected = true;
          this.mode = 'AUTHORITATIVE';
          console.log('[SUPABASE] Mode: AUTHORITATIVE — Supabase PostgreSQL + PostGIS connected.');
          await this.hydrateFromSupabase();
        } else {
          console.warn(`[SUPABASE] ⚠️ Schema not yet applied on Supabase (${error.message}).`);
          console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Operating with Atomic Crash-Resilient Disk Storage.');
          this.mode = 'OFFLINE_FALLBACK';
        }
      } catch (err) {
        console.warn(`[SUPABASE] ⚠️ Supabase connection failed (${err.message}).`);
        console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Operating with Atomic Crash-Resilient Disk Storage.');
        this.mode = 'OFFLINE_FALLBACK';
      }
    } else {
      console.log('[SUPABASE] Mode: OFFLINE_FALLBACK — Supabase credentials not set. Using Atomic Crash-Resilient Disk Store.');
      this.mode = 'OFFLINE_FALLBACK';
    }

    // 2. Direct PostgreSQL fallback (if DATABASE_URL is set)
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && !this.isSupabaseConnected) {
      try {
        const pg = await import('pg');
        const { Pool } = pg.default || pg;
        this.pgPool = new Pool({
          connectionString: dbUrl,
          connectionTimeoutMillis: 3500,
        });
        const client = await this.pgPool.connect();
        this.isPgConnected = true;
        console.log('[DB]  Direct PostgreSQL/PostGIS connection established.');

        if (fs.existsSync(SCHEMA_PATH)) {
          const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');
          await client.query(sql);
          console.log('[DB]  PostgreSQL schema & PostGIS extensions verified.');
        }
        client.release();
        await this.hydrateFromPostgres();
      } catch (err) {
        console.warn(`[DB] ⚠️ Direct PostgreSQL connection failed (${err.message}).`);
      }
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
          });
        }
      }

      const { data: sigRows } = await this.supabase.from('signals').select('*').order('timestamp', { ascending: false }).limit(500);
      if (sigRows && sigRows.length > 0) {
        for (const r of sigRows) this.tables.signals.set(r.id, r);
      }

      console.log(`[SUPABASE]  Hydration complete: ${evRows?.length || 0} events, ${sigRows?.length || 0} signals.`);
    } catch (err) {
      console.warn('[SUPABASE] Hydration error:', err.message);
    }
  }

  async hydrateFromPostgres() {
    if (!this.isPgConnected || !this.pgPool) return;
    try {
      const srcRes = await this.pgPool.query('SELECT * FROM sources');
      for (const r of srcRes.rows) this.tables.sources.set(r.id, r);

      const evRes = await this.pgPool.query('SELECT * FROM weather_events ORDER BY last_updated_at DESC');
      for (const r of evRes.rows) {
        this.tables.weather_events.set(r.id, {
          ...r,
          confidence: parseFloat(r.confidence_score) || 0.5,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
        });
      }

      const sigRes = await this.pgPool.query('SELECT * FROM signals ORDER BY timestamp DESC LIMIT 500');
      for (const r of sigRes.rows) this.tables.signals.set(r.id, r);

      const evdRes = await this.pgPool.query('SELECT * FROM event_evidence');
      for (const r of evdRes.rows) this.tables.event_evidence.set(r.id, r);

      const vrRes = await this.pgPool.query('SELECT * FROM verification_records ORDER BY created_at DESC LIMIT 200');
      this.tables.verification_records = vrRes.rows;

      const actRes = await this.pgPool.query('SELECT * FROM admin_actions ORDER BY created_at DESC LIMIT 200');
      this.tables.admin_actions = actRes.rows;

      console.log(`[DB]  Authoritative PostgreSQL hydration complete: ${evRes.rows.length} events, ${sigRes.rows.length} signals.`);
    } catch (err) {
      console.warn('[DB] Hydration from PostgreSQL had warning:', err.message);
    }
  }

  loadFromDisk() {
    try {
      let targetPath = STORE_PATH;
      if (!fs.existsSync(targetPath) && fs.existsSync(ORIGINAL_STORE_PATH)) {
        targetPath = ORIGINAL_STORE_PATH;
      }
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf8');
        const data = JSON.parse(raw);
        if (data.sources) this.tables.sources = new Map(Object.entries(data.sources));
        if (data.signals) this.tables.signals = new Map(Object.entries(data.signals));
        if (data.weather_events) this.tables.weather_events = new Map(Object.entries(data.weather_events));
        if (data.event_evidence) this.tables.event_evidence = new Map(Object.entries(data.event_evidence));
        if (data.verification_records) this.tables.verification_records = data.verification_records;
        if (data.admin_actions) this.tables.admin_actions = data.admin_actions;
        if (data.media_metadata) this.tables.media_metadata = new Map(Object.entries(data.media_metadata));
        console.log(`[DB]  Loaded persistent disk state: ${this.tables.weather_events.size} events, ${this.tables.signals.size} signals.`);
      } else {
        this.seedDefaults();
      }
    } catch (err) {
      console.warn('[DB] ⚠️ Could not load disk store, seeding baseline:', err.message);
      this.seedDefaults();
    }
  }

  seedDefaults() {
    for (const src of DEFAULT_SOURCES) {
      this.tables.sources.set(src.id, src);
    }
  }

  saveToDisk() {
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
    if (this.isPgConnected && this.pgPool) {
      try {
        const res = await this.pgPool.query('SELECT * FROM sources WHERE is_active = true ORDER BY base_reliability DESC');
        return res.rows;
      } catch (e) {
        console.warn('[DB-PG] Fallback to cache:', e.message);
      }
    }
    return Array.from(this.tables.sources.values()).filter((s) => s.is_active);
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
      location_confidence: signal.location_confidence ?? 0.8,
      relevance_score: signal.relevance_score ?? 0.5,
      credibility_score: signal.credibility_score ?? 0.5,
      misinformation_score: signal.misinformation_score ?? 0.0,
      verification_status: signal.verification_status || 'UNVERIFIED',
      media_urls: signal.media_urls || [],
      media_types: signal.media_types || [],
      hashtags: signal.hashtags || [],
    };

    this.tables.signals.set(id, record);
    this.saveToDisk();

    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase.from('signals').insert([{
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
          raw_payload: record.raw_payload || {},
        }]);
      } catch (e) {
        console.warn('[SUPABASE] Signal sync warning:', e.message);
      }
    }

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO signals (
            id, source_id, source_type, source_name, external_id, text,
            language, timestamp, ingested_at, city, state, country,
            latitude, longitude, location_confidence, location_method,
            event_candidate, relevance_score, credibility_score, misinformation_score,
            verification_status, media_urls, media_types, hashtags, raw_payload
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25)
          ON CONFLICT (id) DO NOTHING`,
          [
            record.id, record.source_id || null, record.source_type, record.source_name || null, record.external_id || null, record.text,
            record.language || 'en', record.timestamp, record.ingested_at, record.city || null, record.state || null, record.country || 'India',
            record.latitude || null, record.longitude || null, record.location_confidence, record.location_method || null,
            record.event_candidate || null, record.relevance_score, record.credibility_score, record.misinformation_score,
            record.verification_status, JSON.stringify(record.media_urls), JSON.stringify(record.media_types), JSON.stringify(record.hashtags), JSON.stringify(record.raw_payload || {}),
          ]
        );
      } catch (e) {
        console.warn('[DB-PG] Signal insert failed:', e.message);
      }
    }
    return record;
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
        if (filters.from_date) {
          query = query.gte('timestamp', filters.from_date);
        }
        const { data, error } = await query.order('timestamp', { ascending: false }).limit(200);
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn('[SUPABASE] Signal query warning:', e.message);
      }
    }
    if (this.isPgConnected && this.pgPool) {
      try {
        let q = 'SELECT * FROM signals WHERE 1=1';
        const params = [];
        if (filters.source_type && filters.source_type !== 'ALL') {
          params.push(filters.source_type);
          q += ` AND source_type = $${params.length}`;
        }
        if (filters.verification_status && filters.verification_status !== 'ALL') {
          params.push(filters.verification_status);
          q += ` AND verification_status = $${params.length}`;
        }
        if (filters.from_date) {
          params.push(filters.from_date);
          q += ` AND timestamp >= $${params.length}`;
        }
        q += ' ORDER BY timestamp DESC LIMIT 200';
        const res = await this.pgPool.query(q, params);
        return res.rows;
      } catch (e) {
        console.warn('[DB-PG] Signal query fallback:', e.message);
      }
    }

    let signals = Array.from(this.tables.signals.values());
    if (filters.source_type && filters.source_type !== 'ALL') {
      signals = signals.filter((s) => s.source_type === filters.source_type);
    }
    if (filters.verification_status && filters.verification_status !== 'ALL') {
      signals = signals.filter((s) => s.verification_status === filters.verification_status);
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
      first_detected_at: event.first_detected_at || now,
      last_updated_at: event.last_updated_at || now,
      last_evidence_at: event.last_evidence_at || now,
      created_at: event.created_at || now,
      status: event.status || 'DETECTED',
      severity: event.severity || 'medium',
      confidence_score: event.confidence_score ?? event.confidence ?? 0.5,
      confidence: event.confidence ?? event.confidence_score ?? 0.5,
      signal_count: event.signal_count || 1,
      source_breakdown: event.source_breakdown || { imd: 0, weather_api: 0, news: 0, social_media: 0, citizen: 0, public_dataset: 0 },
      evidence_summary: event.evidence_summary || '',
      ai_reasoning: event.ai_reasoning || '',
    };

    this.tables.weather_events.set(id, record);
    this.saveToDisk();

    if (this.isSupabaseConnected && this.supabase) {
      try {
        await this.supabase.from('weather_events').upsert([{
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
          evidence_summary: [record.evidence_summary],
        }]);
      } catch (e) {
        console.warn('[SUPABASE] Event upsert warning:', e.message);
      }
    }

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO weather_events (
            id, event_type, title, description, severity, status,
            latitude, longitude, city, state, country, radius_m,
            confidence_score, first_detected_at, last_updated_at,
            signal_count, source_breakdown, ai_reasoning, evidence_summary
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT (id) DO UPDATE SET
            confidence_score = EXCLUDED.confidence_score,
            status = EXCLUDED.status,
            last_updated_at = EXCLUDED.last_updated_at,
            signal_count = EXCLUDED.signal_count,
            source_breakdown = EXCLUDED.source_breakdown`,
          [
            record.id, record.event_type, record.title, record.description || null, record.severity, record.status,
            record.latitude, record.longitude, record.city, record.state, record.country || 'India', record.radius_m || 5000,
            record.confidence_score, record.first_detected_at, record.last_updated_at,
            record.signal_count, JSON.stringify(record.source_breakdown), record.ai_reasoning, JSON.stringify([record.evidence_summary]),
          ]
        );
      } catch (e) {
        console.warn('[DB-PG] Event insert failed:', e.message);
      }
    }
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
        if (filters.from_date) {
          query = query.gte('last_updated_at', filters.from_date);
        }
        const { data, error } = await query.order('last_updated_at', { ascending: false });
        if (!error && data && data.length > 0) {
          return data.map((r) => ({
            ...r,
            confidence: parseFloat(r.confidence_score) || 0.5,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
          }));
        }
      } catch (e) {
        console.warn('[SUPABASE] Event query warning:', e.message);
      }
    }
    if (this.isPgConnected && this.pgPool) {
      try {
        let q = 'SELECT * FROM weather_events WHERE 1=1';
        const params = [];
        if (filters.event_type && filters.event_type !== 'ALL') {
          params.push(filters.event_type);
          q += ` AND event_type = $${params.length}`;
        }
        if (filters.status && filters.status !== 'ALL') {
          params.push(filters.status);
          q += ` AND status = $${params.length}`;
        }
        if (filters.state && filters.state !== 'All India') {
          params.push(filters.state);
          q += ` AND state ILIKE $${params.length}`;
        }
        if (filters.from_date) {
          params.push(filters.from_date);
          q += ` AND last_updated_at >= $${params.length}`;
        }
        q += ' ORDER BY last_updated_at DESC';
        const res = await this.pgPool.query(q, params);
        return res.rows.map((r) => ({
          ...r,
          confidence: parseFloat(r.confidence_score) || 0.5,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
        }));
      } catch (e) {
        console.warn('[DB-PG] Event query fallback:', e.message);
      }
    }

    let events = Array.from(this.tables.weather_events.values());
    if (filters.event_type && filters.event_type !== 'ALL') {
      events = events.filter((e) => e.event_type === filters.event_type);
    }
    if (filters.state && filters.state !== 'All India') {
      events = events.filter((e) => e.state?.toLowerCase() === filters.state.toLowerCase());
    }
    if (filters.status && filters.status !== 'ALL') {
      events = events.filter((e) => e.status === filters.status);
    }
    if (filters.from_date) {
      const from = new Date(filters.from_date).getTime();
      events = events.filter((e) => new Date(e.last_updated_at || e.first_detected_at).getTime() >= from);
    }
    events.sort((a, b) => new Date(b.last_updated_at).getTime() - new Date(a.last_updated_at).getTime());
    return events;
  }

  async getEventById(id) {
    if (this.isSupabaseConnected && this.supabase) {
      try {
        const { data, error } = await this.supabase.from('weather_events').select('*').eq('id', id).single();
        if (!error && data) {
          return {
            ...data,
            confidence: parseFloat(data.confidence_score) || 0.5,
            latitude: parseFloat(data.latitude),
            longitude: parseFloat(data.longitude),
          };
        }
      } catch (e) {
        console.warn('[SUPABASE] Event getById warning:', e.message);
      }
    }

    if (this.isPgConnected && this.pgPool) {
      try {
        const res = await this.pgPool.query('SELECT * FROM weather_events WHERE id = $1', [id]);
        if (res.rows.length > 0) {
          const r = res.rows[0];
          return {
            ...r,
            confidence: parseFloat(r.confidence_score) || 0.5,
            latitude: parseFloat(r.latitude),
            longitude: parseFloat(r.longitude),
          };
        }
      } catch (e) {
        console.warn('[DB-PG] Event getById fallback:', e.message);
      }
    }
    return this.tables.weather_events.get(id) || null;
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

    this.tables.weather_events.set(id, updated);
    this.saveToDisk();

    if (this.isSupabaseConnected && this.supabase) {
      try {
        const patch = { last_updated_at: new Date().toISOString() };
        if (updates.status) patch.status = updates.status;
        if (updates.confidence !== undefined) patch.confidence_score = updates.confidence;
        await this.supabase.from('weather_events').update(patch).eq('id', id);
      } catch (e) {
        console.warn('[SUPABASE] Event update warning:', e.message);
      }
    }

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `UPDATE weather_events SET
            status = COALESCE($1, status),
            confidence_score = COALESCE($2, confidence_score),
            last_updated_at = now()
           WHERE id = $3`,
          [updates.status || null, updates.confidence ?? null, id]
        );
      } catch (e) {
        console.warn('[DB-PG] Event update failed:', e.message);
      }
    }
    return updated;
  }

  // ============================================================
  // POSTGIS SPATIAL QUERIES
  // ============================================================
  async findEventsNearby(latitude, longitude, radiusMeters = 15000) {
    if (this.isPgConnected && this.pgPool) {
      try {
        const q = `
          SELECT id, event_type, status, confidence_score, city, state,
                 ST_Distance(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) AS distance_meters
          FROM weather_events
          WHERE ST_DWithin(geom, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
            AND status IN ('DETECTED', 'UNDER_REVIEW', 'VERIFIED')
          ORDER BY distance_meters ASC
        `;
        const res = await this.pgPool.query(q, [longitude, latitude, radiusMeters]);
        return res.rows;
      } catch (e) {
        console.warn('[DB-PG] PostGIS spatial query fallback:', e.message);
      }
    }

    // Haversine fallback for standalone/disk mode
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
      }))
      .filter((ev) => ev.distance_meters <= radiusMeters && ['DETECTED', 'UNDER_REVIEW', 'VERIFIED'].includes(ev.status));
  }

  // ============================================================
  // EVIDENCE & AUDIT LOGS
  // ============================================================
  async insertEvidence(evidence) {
    const id = evidence.id || `ev_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...evidence, id, created_at: evidence.created_at || new Date().toISOString() };
    this.tables.event_evidence.set(id, record);
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO event_evidence (id, event_id, signal_id, source_type, source_name, credibility_weight, supporting_text, media_url)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
          [id, record.event_id, record.signal_id, record.source_type, record.source_name, record.credibility_weight || 0.5, record.supporting_text || '', record.media_url || null]
        );
      } catch (e) {
        console.warn('[DB-PG] Evidence sync failed:', e.message);
      }
    }
    return record;
  }

  async insertVerification(verification) {
    const id = verification.id || `vr_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...verification, id, created_at: verification.created_at || new Date().toISOString() };
    this.tables.verification_records.push(record);
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO verification_records (id, target_type, target_id, action, verified_by, actor_id, reason, previous_status, new_status, confidence_before, confidence_after)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
          [
            id, record.target_type || 'event', record.target_id, record.action || 'VERIFY', record.verified_by || 'admin',
            record.actor_id || null, record.reason || null, record.previous_status || null, record.new_status || null,
            record.confidence_before || null, record.confidence_after || null,
          ]
        );
      } catch (e) {
        console.warn('[DB-PG] Verification sync failed:', e.message);
      }
    }
    return record;
  }

  async insertAuditAction(action) {
    const id = action.id || `act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = { ...action, id, created_at: action.created_at || new Date().toISOString() };
    this.tables.admin_actions.push(record);
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO admin_actions (id, admin_user, action_type, target_id, details)
           VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
          [id, record.admin_user || 'system', record.action_type, record.target_id || null, JSON.stringify(record.details || {})]
        );
      } catch (e) {
        console.warn('[DB-PG] Audit sync failed:', e.message);
      }
    }
    return record;
  }

  async insertMediaMetadata(media) {
    const id = media.media_id || `med_${Date.now()}`;
    const record = { ...media, id, created_at: media.created_at || new Date().toISOString() };
    this.tables.media_metadata.set(id, record);
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO media_metadata (media_id, event_id, signal_id, object_key, url, mime_type, file_size, checksum, storage_provider)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (media_id) DO NOTHING`,
          [record.media_id, record.event_id || null, record.signal_id || null, record.object_key, record.url, record.mime_type, record.file_size, record.checksum, record.storage_provider || 'DEMO/LOCAL']
        );
      } catch (e) {
        console.warn('[DB-PG] Media metadata sync failed:', e.message);
      }
    }
    return record;
  }

  async insertAiPrediction(prediction) {
    const id = prediction.id || `aip_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const record = {
      ...prediction,
      id,
      created_at: prediction.created_at || new Date().toISOString(),
    };
    this.tables.ai_predictions.push(record);
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query(
          `INSERT INTO ai_predictions (id, signal_id, event_id, model, prediction_type, raw_output, confidence, latency_ms, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (id) DO NOTHING`,
          [
            id,
            record.signal_id || null,
            record.event_id || null,
            record.model || 'gemini-2.5-flash',
            record.prediction_type || 'CLASSIFICATION',
            JSON.stringify(record.raw_output || {}),
            record.confidence ?? null,
            record.latency_ms ?? 0,
            record.created_at,
          ]
        );
      } catch (e) {
        console.warn('[DB-PG] AI prediction sync failed:', e.message);
      }
    }
    return record;
  }

  getStorageInfo() {
    const isSupa = this.isSupabaseConnected;
    return {
      storage_type: isSupa ? 'SUPABASE_POSTGRESQL' : (this.isPgConnected ? 'POSTGRESQL_POSTGIS' : 'PERSISTENT_DISK_STORE'),
      supabase_connected: isSupa,
      postgres_connected: this.isPgConnected,
      disk_store_path: STORE_PATH,
      authoritative_engine: isSupa
        ? 'Supabase Cloud (PostgreSQL 16 + PostGIS + RLS)'
        : (this.isPgConnected ? 'PostgreSQL 16 + PostGIS' : 'Atomic JSON Store (Fallback)'),
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
    this.saveToDisk();

    if (this.isPgConnected && this.pgPool) {
      try {
        await this.pgPool.query('TRUNCATE TABLE event_evidence, event_signals, verification_records, signals, weather_events CASCADE');
      } catch (e) {
        console.warn('[DB-PG] Reset failed:', e.message);
      }
    }
  }
}

export const db = new DatabaseEngine();
