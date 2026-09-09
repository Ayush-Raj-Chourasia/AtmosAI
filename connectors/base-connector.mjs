/**
 * N-WEIS Unified Connector Base Interface
 * SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
 *
 * All multi-source meteorological connectors must implement this contract.
 */

export class BaseWeatherConnector {
  /**
   * @param {Object} options
   * @param {string} options.id - Unique source identifier (e.g. 'src_meteo_01')
   * @param {string} options.name - Human readable source name
   * @param {string} options.type - 'weather_api' | 'imd' | 'social_media' | 'news' | 'citizen' | 'public_dataset'
   * @param {number} options.reliability - Baseline credibility weight (0.0 to 1.0)
   */
  constructor({ id, name, type, reliability = 0.80 }) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.baseReliability = reliability;

    /**
     * Operational Mode:
     * - 'LIVE': Authenticated, live external API/feed communication succeeded
     * - 'REPLAY': Verified historical/reference dataset stream clearly labeled
     * - 'MOCK': Used strictly in offline testing environments
     * - 'DEGRADED': Credentials provided or attempted, but API failed/errored
     * - 'OFFLINE': Connector disabled or network unavailable
     */
    this.mode = 'OFFLINE';

    /**
     * Runtime Telemetry & Health Tracking
     */
    this.telemetry = {
      status: 'OFFLINE', // 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'REPLAY' | 'MOCK'
      mode: 'OFFLINE',
      last_fetch: null,
      last_success: null,
      last_error: null,
      records_fetched: 0,
      records_accepted: 0,
      latency_ms: 0,
      reliability: this.baseReliability,
    };
  }

  /**
   * Healthcheck contract returning live operational telemetry.
   * Never hardcodes status or latency.
   */
  async healthCheck() {
    return {
      source_id: this.id,
      source_name: this.name,
      source_type: this.type,
      status: this.telemetry.status,
      mode: this.mode,
      last_fetch: this.telemetry.last_fetch,
      lastFetch: this.telemetry.last_fetch,
      last_success: this.telemetry.last_success,
      last_error: this.telemetry.last_error,
      records_fetched: this.telemetry.records_fetched,
      recordsFetched: this.telemetry.records_fetched,
      records_accepted: this.telemetry.records_accepted,
      recordsAccepted: this.telemetry.records_accepted,
      latency_ms: this.telemetry.latency_ms,
      latencyMs: this.telemetry.latency_ms,
      reliability: this.baseReliability,
    };
  }

  /**
   * Abstract signal retrieval method. Must be implemented by subclasses.
   * @param {number} [limit=10]
   * @returns {Promise<Array<Object>>}
   */
  async fetchSignals(limit = 10) {
    throw new Error(`fetchSignals() must be implemented by subclass ${this.constructor.name}`);
  }

  /**
   * Normalizes arbitrary input record into standard SIH26069 Canonical Signal contract.
   * Preserves full source provenance and attribution.
   *
   * @param {Object} raw
   * @returns {Object} Canonical Signal
   */
  normalize(raw) {
    return {
      ...raw,
      source_id: raw.source_id || this.id,
      source_type: raw.source_type || this.type,
      source_name: raw.source_name || this.name,
      mode: raw.data_mode || this.mode,
      external_id: raw.external_id || null,
      text: (raw.text || '').trim(),
      timestamp: raw.provider_timestamp || raw.observed_at || raw.timestamp || new Date().toISOString(),
      provider_timestamp: raw.provider_timestamp || raw.observed_at || raw.timestamp || new Date().toISOString(),
      observed_at: raw.observed_at || raw.provider_timestamp || raw.timestamp || new Date().toISOString(),
      city: raw.city || null,
      state: raw.state || null,
      country: raw.country || 'India',
      latitude: typeof raw.latitude === 'number' ? raw.latitude : null,
      longitude: typeof raw.longitude === 'number' ? raw.longitude : null,
      location_confidence: typeof raw.location_confidence === 'number' ? raw.location_confidence : 0,
      location_method: raw.location_method || (raw.latitude ? 'native_gps' : 'unresolved'),
      event_candidate: raw.event_candidate || 'OTHER',
      flood_indicator: Boolean(raw.flood_indicator),
      temperature_c: typeof raw.temperature_c === 'number' ? raw.temperature_c : null,
      humidity_pct: typeof raw.humidity_pct === 'number' ? raw.humidity_pct : null,
      pressure_hpa: typeof raw.pressure_hpa === 'number' ? raw.pressure_hpa : null,
      wind_speed_kmh: typeof raw.wind_speed_kmh === 'number' ? raw.wind_speed_kmh : null,
      precipitation_mm: typeof raw.precipitation_mm === 'number' ? raw.precipitation_mm : null,
      rainfall_mm: raw.rainfall_mm ?? raw.precipitation_mm ?? null,
      weather_condition: raw.weather_condition || null,
      weather_description: raw.weather_description || null,
      classification_type: raw.classification_type || 'DERIVED',
      classification_reason: raw.classification_reason || null,
      data_mode: raw.data_mode || this.mode || 'DEMO',
      media_urls: Array.isArray(raw.media_urls) ? raw.media_urls : (raw.media_url ? [raw.media_url] : []),
      media_types: Array.isArray(raw.media_types) ? raw.media_types : [],
      hashtags: Array.isArray(raw.hashtags) ? raw.hashtags : [],
      raw_payload: raw.raw_payload || raw,
    };
  }
}
