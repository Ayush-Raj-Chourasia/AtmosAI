/**
 * N-WEIS Live Weather API Connector (connectors/weather-api.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 *
 * Connects to Open-Meteo REST API for real-time observational meteorological data across India.
 * Key-free open API.
 */

import { BaseWeatherConnector } from './base-connector.mjs';

export class WeatherApiConnector extends BaseWeatherConnector {
  constructor() {
    super({
      id: 'src_meteo_01',
      name: 'Open-Meteo Weather API',
      type: 'weather_api',
      reliability: 0.90,
    });

    this.mode = 'LIVE';
    this.telemetry.status = 'STANDBY';
    this.telemetry.mode = 'LIVE';

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
      { city: 'Patna', state: 'Bihar', lat: 25.60, lng: 85.14 },
    ];
  }

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

  async fetchSignals(limit = 5) {
    const signals = [];
    const selectedStations = this.stations.slice(0, limit);
    let totalLatency = 0;
    this.telemetry.last_fetch = new Date().toISOString();

    for (const station of selectedStations) {
      try {
        const { data, latency } = await this.fetchStation(station);
        totalLatency += latency;
        this.telemetry.records_fetched++;

        const current = data.current;
        if (!current) continue;

        const temp = current.temperature_2m;
        const rain = current.rain || current.precipitation || 0;
        const wind = current.wind_speed_10m || 0;
        const humidity = current.relative_humidity_2m || 0;

        let eventCandidate = 'OTHER';
        let desc = `Ambient temperature ${temp}°C, humidity ${humidity}%, wind ${wind} km/h.`;

        if (rain >= 15.0) {
          eventCandidate = rain >= 50.0 ? 'FLOOD' : 'RAINFALL';
          desc = `Heavy active precipitation recorded: ${rain} mm/h. High localized flood & waterlogging potential.`;
        } else if (temp >= 42.0) {
          eventCandidate = 'HEATWAVE';
          desc = `Extreme daytime maximum temperature recorded: ${temp}°C. Severe thermal heatwave criteria met.`;
        } else if (wind >= 50.0) {
          eventCandidate = 'STRONG_WIND';
          desc = `Gale force wind gusts recorded: ${wind} km/h. Risk of structural and tree damage.`;
        } else if (humidity >= 95 && temp <= 15) {
          eventCandidate = 'FOG';
          desc = `High relative humidity (${humidity}%) and low temperature (${temp}°C) producing dense radiation fog.`;
        }

        const signal = this.normalize({
          source_id: this.id,
          source_type: this.type,
          source_name: `Open-Meteo (${station.city} AWS)`,
          external_id: `meteo_${station.city.toLowerCase()}_${Date.now()}`,
          text: `[AUTOMATIC WEATHER STATION] ${station.city}, ${station.state}: ${desc}`,
          city: station.city,
          state: station.state,
          country: 'India',
          latitude: station.lat,
          longitude: station.lng,
          location_confidence: 0.98,
          location_method: 'native_gps',
          event_candidate: eventCandidate,
          media_urls: [],
          media_types: [],
          hashtags: ['#OpenMeteo', '#WeatherObservation'],
          raw_payload: {
            temperature_c: temp,
            rain_mm: rain,
            wind_kmh: wind,
            humidity_pct: humidity,
            weather_code: current.weather_code,
            time: current.time,
          },
        });

        signals.push(signal);
        this.telemetry.records_accepted++;
      } catch (err) {
        this.telemetry.last_error = err.message;
        console.warn(`[WeatherApiConnector] Error fetching ${station.city}: ${err.message}`);
      }
    }

    if (signals.length > 0) {
      this.mode = 'LIVE';
      this.telemetry.status = 'ONLINE';
      this.telemetry.mode = 'LIVE';
      this.telemetry.last_success = new Date().toISOString();
      this.telemetry.latency_ms = Math.round(totalLatency / signals.length);
    } else {
      this.mode = 'DEGRADED';
      this.telemetry.status = 'DEGRADED';
      this.telemetry.mode = 'DEGRADED';
    }

    return signals;
  }
}

export const weatherApiConnector = new WeatherApiConnector();
