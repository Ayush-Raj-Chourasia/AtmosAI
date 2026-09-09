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
 * SECURITY INVARIANT:
 * - Three distinct client tiers: Public, Authenticated User (RLS), Server Privileged (Admin).
 * - Privileged server operations MUST explicitly use getServerAdminClient().
 * - Privileged operations MUST NEVER silently downgrade to publishable/anon keys.
 * - SUPABASE_SECRET_KEY is strictly server-side and never exposed to clients/browser.
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
 * 
 * SECURITY INVARIANT:
 * Throws a clear configuration error if SUPABASE_SECRET_KEY is missing.
 * Never silently downgrades to publishable/anon key.
 */
export function getServerAdminClient() {
  if (!SUPABASE_URL) {
    throw new Error('[Supabase Security] Missing SUPABASE_URL in environment configuration.');
  }
  if (!SUPABASE_SECRET_KEY) {
    throw new Error(
      '[Supabase Security] Server admin client requires SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY). ' +
      'Privileged operations cannot execute with unprivileged keys.'
    );
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
 * Suitable for unauthenticated public reads and telemetry inspection.
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
    throw new Error('[Supabase Security] Missing SUPABASE_URL or publishable key for authenticated client.');
  }
  if (!userJwt || typeof userJwt !== 'string' || userJwt.trim().length === 0) {
    throw new Error('[Supabase Security] Verified user JWT required for getAuthenticatedClient. Method requires a non-empty user JWT.');
  }
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${userJwt.trim()}`,
      },
    },
  });
}

/**
 * Get authoritative server-side Supabase client for database engine operations.
 * Strictly uses getServerAdminClient() if secret key is present;
 * for read-only / public operations falls back to getPublicClient().
 * Never allows privileged writes to silently execute with unprivileged keys.
 */
export function getSupabaseClient() {
  if (SUPABASE_SECRET_KEY) {
    return getServerAdminClient();
  }
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
 * 
 * Strict Error Semantics (Section 10 & 11):
 * - Invalid parameters (bounds, NaN, null, negative radius) -> throws structured 400 INVALID_SPATIAL_PARAMETERS.
 * - PostGIS RPC execution failure -> throws structured 503 POSTGIS_RPC_FAILED.
 * - Successful query with zero results -> returns empty array [].
 * 
 * @param {number} latitude - WGS84 latitude [-90, 90]
 * @param {number} longitude - WGS84 longitude [-180, 180]
 * @param {number} radiusMeters - Search radius in meters (0, 500000]
 * @returns {Promise<Array>} Array of nearby weather events
 */
export async function findEventsNearbyPostGIS(latitude, longitude, radiusMeters = 15000) {
  if (
    typeof latitude !== 'number' || isNaN(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== 'number' || isNaN(longitude) || longitude < -180 || longitude > 180 ||
    typeof radiusMeters !== 'number' || isNaN(radiusMeters) || radiusMeters <= 0 || radiusMeters > 500000
  ) {
    const err = new Error(`Invalid spatial query parameters: lat=${latitude}, lon=${longitude}, radius=${radiusMeters}`);
    err.code = 'INVALID_SPATIAL_PARAMETERS';
    err.statusCode = 400;
    throw err;
  }

  let client;
  try {
    client = getSupabaseClient();
  } catch (e) {
    const err = new Error(`PostGIS client initialization failed: ${e.message}`);
    err.code = 'POSTGIS_NOT_CONFIGURED';
    err.statusCode = 503;
    throw err;
  }

  const { data, error } = await client.rpc('find_events_nearby', {
    lat: latitude,
    lon: longitude,
    radius_meters: radiusMeters,
  });

  if (error) {
    const rpcErr = new Error(`PostGIS RPC find_events_nearby failed: ${error.message}`);
    rpcErr.code = 'POSTGIS_RPC_FAILED';
    rpcErr.statusCode = 503;
    rpcErr.details = error;
    throw rpcErr;
  }

  // Returns array: [] means query succeeded and 0 events were found within radius
  return Array.isArray(data) ? data : [];
}

export const supabaseConfig = {
  url: SUPABASE_URL,
  hasPublishableKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  hasSecretKey: Boolean(SUPABASE_SECRET_KEY),
  hasAnonKey: Boolean(SUPABASE_PUBLISHABLE_KEY),
  hasServiceRoleKey: Boolean(SUPABASE_SECRET_KEY),
};