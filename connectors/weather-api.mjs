/**
 * N-WEIS Live Weather API Connector (connectors/weather-api.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Connects to Open-Meteo REST API for real-time observational meteorological data across India
 */

export class WeatherApiConnector {
  constructor() {
    this.sourceId = 'src_meteo_01';
    this.sourceName = 'Open-Meteo Weather API';
    this.sourceType = 'weather_api';
    this.baseReliability = 0.90;

    this.telemetry = {
      status: 'STANDBY',
      lastFetch: null,
      lastError: null,
      recordsFetched: 0,
      recordsAccepted: 0,
      latencyMs: 0,
      mode: 'LIVE'
    };

    // 10 Key High-Risk Meteorological Observation Coordinates in India
    this.stations = [
      { city: 'Guwahati', state: 'Assam', lat: 26.18, lng: 91.75 },
      { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
      { city: 'New Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
      { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
      { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
      { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
      { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
      { city: 'Bhubaneswar', state: 'Odisha', lat: 20.30, lng: 85.82 },
      { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.10, lng: 77.17 },
      { city: 'Patna', state: 'Bihar', lat: 25.60, lng: 85.14 }
    ];
  }

  async healthCheck() {
    return {
      sourceId: this.sourceId,
      sourceName: this.sourceName,
      sourceType: this.sourceType,
      status: this.telemetry.status,
      mode: this.telemetry.mode,
      lastFetch: this.telemetry.lastFetch,
      latencyMs: this.telemetry.latencyMs,
      recordsFetched: this.telemetry.recordsFetched,
      recordsAccepted: this.telemetry.recordsAccepted,
      reliability: this.baseReliability
    };
  }

  /**
   * Fetch live weather observations from Open-Meteo for a specific coordinate
   */
  async fetchStation(station) {
    const start = Date.now();
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const latency = Date.now() - start;

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return { data, latency };
    } catch (err) {
      clearTimeout(timeout);
      throw err;
    }
  }

  /**
   * Main fetch & normalize pipeline
   */
  async fetchSignals(limit = 5) {
    const signals = [];
    const selectedStations = this.stations.slice(0, limit);
    let totalLatency = 0;

    for (const station of selectedStations) {
      try {
        const { data, latency } = await this.fetchStation(station);
        totalLatency += latency;
        this.telemetry.recordsFetched++;

        const current = data.current;
        if (!current) continue;

        // Classify and form candidate
        const temp = current.temperature_2m;
        const rain = current.rain || current.precipitation || 0;
        const wind = current.wind_speed_10m || 0;
        const humidity = current.relative_humidity_2m || 0;

        let eventCandidate = 'OTHER';
        let severity = 'low';
        let desc = `Ambient temperature ${temp}°C, humidity ${humidity}%, wind ${wind} km/h.`;

        if (rain >= 15.0) {
          eventCandidate = rain >= 50.0 ? 'FLOOD' : 'RAINFALL';
          severity = rain >= 50.0 ? 'critical' : 'high';
          desc = `Heavy active precipitation recorded: ${rain} mm/h. High localized flood & waterlogging potential.`;
        } else if (temp >= 42.0) {
          eventCandidate = 'HEATWAVE';
          severity = temp >= 45.0 ? 'critical' : 'high';
          desc = `Extreme daytime maximum temperature recorded: ${temp}°C. Severe thermal heatwave criteria met.`;
        } else if (wind >= 50.0) {
          eventCandidate = 'STRONG_WIND';
          severity = wind >= 70.0 ? 'critical' : 'high';
          desc = `Gale force wind gusts recorded: ${wind} km/h. Risk of structural and tree damage.`;
        } else if (humidity >= 95 && temp <= 15) {
          eventCandidate = 'FOG';
          severity = 'medium';
          desc = `High relative humidity (${humidity}%) and low temperature (${temp}°C) producing dense radiation fog.`;
        }

        const signal = {
          source_id: this.sourceId,
          source_type: this.sourceType,
          source_name: `Open-Meteo (${station.city} Station)`,
          external_id: `meteo_${station.city.toLowerCase()}_${Date.now()}`,
          text: `[AUTOMATIC WEATHER STATION] ${station.city}, ${station.state}: ${desc}`,
          city: station.city,
          state: station.state,
          latitude: station.lat,
          longitude: station.lng,
          location_confidence: 0.98,
          location_method: 'native_gps',
          event_candidate: eventCandidate,
          relevance_score: eventCandidate !== 'OTHER' ? 0.90 : 0.40,
          credibility_score: this.baseReliability,
          misinformation_score: 0.02,
          verification_status: 'VERIFIED',
          raw_payload: {
            temperature_c: temp,
            rain_mm: rain,
            wind_kmh: wind,
            humidity_pct: humidity,
            weather_code: current.weather_code,
            time: current.time
          }
        };

        signals.push(signal);
        this.telemetry.recordsAccepted++;
      } catch (err) {
        this.telemetry.lastError = err.message;
        console.warn(`[WeatherApiConnector] Error fetching ${station.city}: ${err.message}`);
      }
    }

    this.telemetry.status = signals.length > 0 ? 'ONLINE' : 'DEGRADED';
    this.telemetry.lastFetch = new Date().toISOString();
    this.telemetry.latencyMs = selectedStations.length > 0 ? Math.round(totalLatency / selectedStations.length) : 0;

    return signals;
  }
}

export const weatherApiConnector = new WeatherApiConnector();
