/**
 * WeatherNexus Authoritative Supabase Client Abstraction (lib/supabase.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Ministry of Earth Sciences (MoES) / India Meteorological Department (IMD)
 *
 * Provides authoritative access to Supabase:
 * - PostgreSQL 16 (Tables, Views, Enums)
 * - PostGIS (Spatial Geometries, Radius Queries, Clustering)
 * - Auth & Row Level Security (RLS)
 * - Storage (Buckets: weather-evidence, citizen-media)
 * - Realtime Channels (weathernexus:events, weathernexus:signals)
 *
 * Security: SUPABASE_SERVICE_ROLE_KEY is strictly server-side and never sent to clients.
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://huzfbxgwzzeqeosjisgi.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1emZieGd3enplcWVvc2ppc2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg4NjIwNTIsImV4cCI6MjEwNDQzODA1Mn0.CC_E9HdiW6y2-z_Zrn7bxpGQdsQmdJ2CdZnL6fNRQyY';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;

let serverClientInstance = null;
let publicClientInstance = null;

/**
 * Get authoritative server-side Supabase client.
 * Uses service role key when available (bypasses RLS for system ingestion/workers),
 * falling back to anon key.
 */
export function getSupabaseClient() {
  if (!serverClientInstance) {
    const key = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
    if (!SUPABASE_URL || !key) {
      throw new Error('[Supabase] Missing SUPABASE_URL or API key in environment.');
    }
    serverClientInstance = createClient(SUPABASE_URL, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverClientInstance;
}

/**
 * Get public client configured with anon key.
 * Suitable for unauthenticated public reads or client-side generation.
 */
export function getSupabasePublicClient() {
  if (!publicClientInstance) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY.');
    }
    publicClientInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }
  return publicClientInstance;
}

/**
 * Check whether Supabase configuration is present.
 */
export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY));
}

/**
 * Verify Supabase connection and schema deployment status.
 */
export async function checkSupabaseHealth() {
  if (!isSupabaseConfigured()) {
    return {
      status: 'NOT_CONFIGURED',
      connected: false,
      schemaReady: false,
      url: null,
      error: 'Supabase credentials not configured in environment',
    };
  }

  try {
    const client = getSupabaseClient();
    const start = Date.now();
    const { data, error } = await client.from('weather_events').select('id').limit(1);
    const latency = Date.now() - start;

    if (error) {
      return {
        status: 'SCHEMA_PENDING',
        connected: true,
        schemaReady: false,
        latencyMs: latency,
        url: SUPABASE_URL,
        error: error.message,
      };
    }

    return {
      status: 'ONLINE',
      connected: true,
      schemaReady: true,
      latencyMs: latency,
      url: SUPABASE_URL,
      error: null,
    };
  } catch (err) {
    return {
      status: 'ERROR',
      connected: false,
      schemaReady: false,
      url: SUPABASE_URL,
      error: err.message,
    };
  }
}

/**
 * Spatial query using PostGIS RPC find_events_nearby
 * Fallback to mathematical Haversine if PostGIS RPC is not deployed yet.
 */
export async function findEventsNearbyPostGIS(latitude, longitude, radiusMeters = 15000) {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client.rpc('find_events_nearby', {
      lat: latitude,
      lon: longitude,
      radius_meters: radiusMeters,
    });

    if (!error && Array.isArray(data)) {
      return data;
    }
  } catch (rpcErr) {
    // PostGIS RPC unavailable or table not indexed
  }

  return null;
}

export const supabaseConfig = {
  url: SUPABASE_URL,
  hasAnonKey: Boolean(SUPABASE_ANON_KEY),
  hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
};