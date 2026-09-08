/**
 * WeatherNexus OpenWeather API Connector (Secondary Weather Provider)
 * SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
 *
 * Provides secondary meteorological observations for multi-source corroboration.
 * Non-fatal: failures never crash the platform.
 */

import { BaseWeatherConnector } from './base-connector.mjs';

export class OpenWeatherConnector extends BaseWeatherConnector {
  constructor() {
    super({
      id: 'src_openweather_01',
      name: 'OpenWeatherMap API',
      type: 'weather_api',
      reliability: 0.88,
    });

    this.apiKey = process.env.OPENWEATHER_API_KEY || null;
    this.baseUrl = process.env.OPENWEATHER_BASE_URL || 'https://api.openweathermap.org/data/2.5';

    // Key observation coordinates in India
    this.stations = [
      { city: 'Guwahati', state: 'Assam', lat: 26.18, lng: 91.75 },
      { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
      { city: 'New Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
      { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
      { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
      { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
      { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
      { city: 'Bhubaneswar', state: 'Odisha', lat: 20.30, lng: 85.82 },
    ];

    if (this.apiKey) {
      this.mode = 'LIVE';
      this.telemetry.status = 'STANDBY';
      this.telemetry.mode = 'LIVE';
    } else {
      this.mode = 'OFFLINE';
      this.telemetry.status = 'OFFLINE';
      this.telemetry.mode = 'OFFLINE';
      this.telemetry.last_error = 'OPENWEATHER_API_KEY not configured. Secondary weather provider inactive.';
    }
  }

  async fetchSignals(limit = 3) {
    this.apiKey = process.env.OPENWEATHER_API_KEY || null;

    if (!this.apiKey) {
      this.mode = 'OFFLINE';
      this.telemetry.status = 'OFFLINE';
      this.telemetry.mode = 'OFFLINE';
      this.telemetry.last_error = 'OPENWEATHER_API_KEY not configured';
      return [];
    }

    const signals = [];
    const targets = this.stations.slice(0, limit);
    let totalLatency = 0;
    let fetchedCount = 0;
    this.telemetry.last_fetch = new Date().toISOString();

    for (const st of targets) {
      const url = `${this.baseUrl}/weather?lat=${st.lat}&lon=${st.lng}&appid=${this.apiKey}&units=metric`;
      const start = Date.now();
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);

      try {
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);
        const latency = Date.now() - start;
        totalLatency += latency;
        fetchedCount++;
        this.telemetry.records_fetched++;

        if (!res.ok) {
          throw new Error(`OpenWeather API error: HTTP ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        const temp = data.main?.temp ?? 0;
        const humidity = data.main?.humidity ?? 0;
        const pressure = data.main?.pressure ?? 1013;
        const rain = data.rain?.['1h'] || data.rain?.['3h'] || 0;
        const wind = (data.wind?.speed ?? 0) * 3.6; // convert m/s to km/h
        const description = data.weather?.[0]?.description || 'Clear';
        const weatherCondition = data.weather?.[0]?.main || 'Clear';
        const observedAt = data.dt ? new Date(data.dt * 1000).toISOString() : new Date().toISOString();

        let candidate = 'OTHER';
        if (rain >= 15.0) candidate = rain >= 50.0 ? 'FLOOD' : 'RAINFALL';
        else if (temp >= 42.0) candidate = 'HEATWAVE';
        else if (wind >= 50.0) candidate = 'STRONG_WIND';
        else if (humidity >= 95 && temp <= 15) candidate = 'FOG';

        const signal = this.normalize({
          source_id: this.id,
          source_type: this.type,
          source_name: `OpenWeather (${st.city})`,
          external_id: `owm_${st.city.toLowerCase()}_${data.dt || Date.now()}`,
          text: `[OPENWEATHER OBSERVATION] ${st.city}, ${st.state}: ${description}. Temp: ${temp.toFixed(1)}°C, Humidity: ${humidity}%, Pressure: ${pressure} hPa, Wind: ${wind.toFixed(0)} km/h, Rain: ${rain} mm.`,
          timestamp: observedAt,
          observed_at: observedAt,
          city: st.city,
          state: st.state,
          country: 'India',
          latitude: st.lat,
          longitude: st.lng,
          location_confidence: 0.95,
          location_method: 'native_gps',
          event_candidate: candidate,
          pressure_hpa: pressure,
          precipitation_mm: rain,
          weather_condition: weatherCondition,
          media_urls: [],
          media_types: [],
          hashtags: ['#OpenWeather', `#${st.city.replace(/\s+/g, '')}`],
          raw_payload: data,
        });

        signals.push(signal);
        this.telemetry.records_accepted++;
      } catch (err) {
        clearTimeout(timer);
        this.telemetry.last_error = err.message;
        console.warn(`[OpenWeatherConnector] Warning: ${st.city} fetch failed (${err.message}).`);
      }
    }

    if (signals.length > 0) {
      this.mode = 'LIVE';
      this.telemetry.status = 'ONLINE';
      this.telemetry.mode = 'LIVE';
      this.telemetry.last_success = new Date().toISOString();
      this.telemetry.latency_ms = Math.round(totalLatency / fetchedCount);
    } else {
      this.mode = 'DEGRADED';
      this.telemetry.status = 'DEGRADED';
      this.telemetry.mode = 'DEGRADED';
    }

    return signals;
  }
}

export const openWeatherConnector = new OpenWeatherConnector();
