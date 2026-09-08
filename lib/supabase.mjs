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

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null;

let serverAdminClientInstance = null;
let publicClientInstance = null;

/**
 * Get server-side admin Supabase client using secret/service-role key.
 * Strictly server-side only; bypasses RLS for system ingestion/workers.
 */
export function getServerAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    return null;
  }
  if (!serverAdminClientInstance) {
    serverAdminClientInstance = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return serverAdminClientInstance;
}

/**
 * Get public client configured with publishable/anon key.
 * Suitable for unauthenticated public reads.
 */
export function getPublicClient() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return null;
  }
  if (!publicClientInstance) {
    publicClientInstance = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: false,
      },
    });
  }
  return publicClientInstance;
}

export const getSupabasePublicClient = getPublicClient;

/**
 * Get user-scoped authenticated client enforcing Row Level Security (RLS).
 * Requires verified user JWT.
 */
export function getAuthenticatedClient(userJwt) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('[Supabase] Missing SUPABASE_URL or publishable key for authenticated client.');
  }
  if (!userJwt) {
    throw new Error('[Supabase] JWT required for getAuthenticatedClient.');
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${userJwt}`,
      },
    },
  });
}

/**
 * Get authoritative server-side Supabase client.
 * Uses service role key when available, falling back to anon key.
 */
export function getSupabaseClient() {
  const admin = getServerAdminClient();
  if (admin) return admin;
  const pub = getPublicClient();
  if (pub) return pub;
  throw new Error('[Supabase] Missing SUPABASE_URL or API key in environment.');
}

/**
 * Check whether Supabase configuration is present.
 */
export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && (SUPABASE_SECRET_KEY || SUPABASE_PUBLISHABLE_KEY));
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
 * Validates coordinate ranges: lat [-90, 90], lon [-180, 180], radius (0, 500000m].
 * Returns array of events from PostGIS, or null if unconfigured/invalid/unavailable.
 */
export async function findEventsNearbyPostGIS(latitude, longitude, radiusMeters = 15000) {
  if (
    typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180 ||
    typeof radiusMeters !== 'number' || isNaN(radiusMeters) || radiusMeters <= 0 || radiusMeters > 500000
  ) {
    return null;
  }

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
  hasPublishableKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  hasSecretKey: Boolean(SUPABASE_SECRET_KEY),
  hasAnonKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  hasServiceRoleKey: Boolean(SUPABASE_SECRET_KEY),
};