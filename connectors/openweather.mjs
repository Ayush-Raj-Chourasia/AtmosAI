/**
 * WeatherNexus / AtmosAI OpenWeather One Call 4.0 & Live Weather Connector
 * SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
 *
 * Primary LIVE meteorological data provider for real-time observations and alerts.
 * Operates strictly with environment credentials; never hardcodes secrets or fakes data.
 */

import { BaseWeatherConnector } from './base-connector.mjs';
import { MONITORING_LOCATIONS } from '../lib/monitoring-locations.mjs';

export class OpenWeatherConnector extends BaseWeatherConnector {
  constructor() {
    super({
      id: 'src_owm_01',
      name: 'OpenWeatherMap API',
      type: 'weather_api',
      reliability: 0.88,
    });

    this.locations = MONITORING_LOCATIONS;
    this.oneCallBaseUrl = 'https://api.openweathermap.org/data/4.0/onecall';
    this.standardBaseUrl = 'https://api.openweathermap.org/data/2.5';

    // Daily call quota tracking (One Call provides 1,000 free calls/day)
    this.quota = {
      api_calls_today: 0,
      quota_date: new Date().toISOString().slice(0, 10),
      daily_free_limit: 1000,
      usage_limit_approaching: false,
      last_successful_fetch: null,
      last_failed_fetch: null,
      locations_success_count: 0,
      locations_failed_count: 0,
      api_error_count: 0,
    };

    this.oneCallSubscribed = null; // null = untested, true = active, false = subscription required
    this.activeApiTier = 'UNTESTED';

    const key = process.env.OPENWEATHER_API_KEY || null;
    if (key) {
      this.mode = 'LIVE';
      this.telemetry.status = 'STANDBY';
      this.telemetry.mode = 'LIVE';
    } else {
      this.mode = 'NOT_CONFIGURED';
      this.telemetry.status = 'NOT_CONFIGURED';
      this.telemetry.mode = 'NOT_CONFIGURED';
      this.telemetry.last_error = 'OPENWEATHER_API_KEY not configured. Live meteorological provider inactive.';
    }
  }

  get isConfigured() {
    return Boolean(process.env.OPENWEATHER_API_KEY);
  }

  get apiCallsToday() {
    return this.quota.api_calls_today;
  }

  get dailyLimit() {
    return this.quota.daily_free_limit;
  }

  async fetchCurrent(cityName) {
    const signals = await this.fetchSignals(12);
    if (!cityName) return signals;
    const match = signals.find(s => s.city?.toLowerCase() === cityName.toLowerCase());
    return match ? [match] : (signals.length > 0 ? [signals[0]] : []);
  }

  resetQuotaIfNewDay() {
    const today = new Date().toISOString().slice(0, 10);
    if (this.quota.quota_date !== today) {
      this.quota.quota_date = today;
      this.quota.api_calls_today = 0;
      this.quota.usage_limit_approaching = false;
      this.quota.locations_success_count = 0;
      this.quota.locations_failed_count = 0;
      this.quota.api_error_count = 0;
    }
  }

  incrementCallCount() {
    this.resetQuotaIfNewDay();
    this.quota.api_calls_today++;
    if (this.quota.api_calls_today >= 900) {
      this.quota.usage_limit_approaching = true;
      console.warn('[OpenWeatherConnector] ⚠️ OpenWeather usage limit approaching (calls today: ' + this.quota.api_calls_today + ' / ' + this.quota.daily_free_limit + ')');
    }
  }

  async healthCheck() {
    const key = process.env.OPENWEATHER_API_KEY || null;
    if (!key) {
      return {
        id: this.id,
        source_id: this.id,
        name: this.name,
        source_name: this.name,
        source_type: this.type,
        status: 'NOT_CONFIGURED',
        mode: 'NOT_CONFIGURED',
        latencyMs: 0,
        latency_ms: 0,
        records_fetched: this.telemetry.records_fetched || 0,
        recordsFetched: this.telemetry.records_fetched || 0,
        records_accepted: this.telemetry.records_accepted || 0,
        recordsAccepted: this.telemetry.records_accepted || 0,
        reliability: this.baseReliability,
        details: 'OPENWEATHER_API_KEY environment variable is not set.',
        apiCallsToday: this.quota.api_calls_today,
        calls_today: this.quota.api_calls_today,
        usageLimitApproaching: this.quota.usage_limit_approaching,
      };
    }

    const t0 = Date.now();
    try {
      // Test one station with standard check
      const testLoc = this.locations[0] || { lat: 28.61, lon: 77.20 };
      const url = `${this.standardBaseUrl}/weather?lat=${testLoc.lat}&lon=${testLoc.lon}&appid=${key}&units=metric`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const latency = Date.now() - t0;
      this.incrementCallCount();
      this.telemetry.latency_ms = latency;
      this.telemetry.last_fetch = new Date().toISOString();

      if (res.ok) {
        this.mode = 'LIVE';
        this.telemetry.status = 'ONLINE';
        this.telemetry.mode = 'LIVE';
        this.telemetry.last_success = new Date().toISOString();
        return {
          id: this.id,
          source_id: this.id,
          name: this.name,
          source_name: this.name,
          source_type: this.type,
          status: 'ONLINE',
          mode: 'LIVE',
          latencyMs: latency,
          latency_ms: latency,
          records_fetched: this.telemetry.records_fetched || 0,
          recordsFetched: this.telemetry.records_fetched || 0,
          records_accepted: this.telemetry.records_accepted || 0,
          recordsAccepted: this.telemetry.records_accepted || 0,
          reliability: this.baseReliability,
          api_tier: this.activeApiTier,
          lastCallType: this.activeApiTier,
          onecall_subscribed: this.oneCallSubscribed,
          apiCallsToday: this.quota.api_calls_today,
          calls_today: this.quota.api_calls_today,
          usageLimitApproaching: this.quota.usage_limit_approaching,
          locationsSuccessCount: this.quota.locations_success_count,
          locationsFailedCount: this.quota.locations_failed_count,
          lastFetch: this.telemetry.last_fetch,
          lastSuccess: this.telemetry.last_success,
          last_error: null,
          details: 'OpenWeather live API connected and responding.',
        };
      } else {
        const data = await res.json().catch(() => ({}));
        const status = res.status === 401 ? 'NOT_CONFIGURED' : 'DEGRADED';
        this.mode = status;
        this.telemetry.status = status;
        this.telemetry.last_error = data.message || `HTTP ${res.status}`;
        return {
          id: this.id,
          source_id: this.id,
          name: this.name,
          source_name: this.name,
          source_type: this.type,
          status,
          mode: status,
          latencyMs: latency,
          latency_ms: latency,
          records_fetched: this.telemetry.records_fetched || 0,
          recordsFetched: this.telemetry.records_fetched || 0,
          records_accepted: this.telemetry.records_accepted || 0,
          recordsAccepted: this.telemetry.records_accepted || 0,
          reliability: this.baseReliability,
          api_tier: this.activeApiTier,
          lastCallType: this.activeApiTier,
          onecall_subscribed: this.oneCallSubscribed,
          apiCallsToday: this.quota.api_calls_today,
          calls_today: this.quota.api_calls_today,
          usageLimitApproaching: this.quota.usage_limit_approaching,
          locationsSuccessCount: this.quota.locations_success_count,
          locationsFailedCount: this.quota.locations_failed_count,
          details: data.message || `HTTP ${res.status} ${res.statusText}`,
          last_error: data.message || `HTTP ${res.status}`,
        };
      }
    } catch (err) {
      const latency = Date.now() - t0;
      this.mode = 'DEGRADED';
      this.telemetry.status = 'DEGRADED';
      this.telemetry.last_error = err.message;
      return {
        id: this.id,
        source_id: this.id,
        name: this.name,
        source_name: this.name,
        source_type: this.type,
        status: 'DEGRADED',
        mode: 'DEGRADED',
        latencyMs: latency,
        latency_ms: latency,
        records_fetched: this.telemetry.records_fetched || 0,
        recordsFetched: this.telemetry.records_fetched || 0,
        records_accepted: this.telemetry.records_accepted || 0,
        recordsAccepted: this.telemetry.records_accepted || 0,
        reliability: this.baseReliability,
        api_tier: this.activeApiTier,
        lastCallType: this.activeApiTier,
        onecall_subscribed: this.oneCallSubscribed,
        apiCallsToday: this.quota.api_calls_today,
        calls_today: this.quota.api_calls_today,
        usageLimitApproaching: this.quota.usage_limit_approaching,
        locationsSuccessCount: this.quota.locations_success_count,
        locationsFailedCount: this.quota.locations_failed_count,
        details: err.message,
        last_error: err.message,
      };
    }
  }

  /**
   * Fetches real live weather observations across Indian monitoring locations.
   * Uses One Call 4.0 as primary endpoint; transparently falls back to Standard 2.5
   * if the account key does not have the separate One Call by Call subscription activated.
   */
  async fetchSignals(limit = this.locations.length) {
    const apiKey = process.env.OPENWEATHER_API_KEY || null;

    if (!apiKey) {
      this.mode = 'NOT_CONFIGURED';
      this.telemetry.status = 'NOT_CONFIGURED';
      this.telemetry.mode = 'NOT_CONFIGURED';
      this.telemetry.last_error = 'OPENWEATHER_API_KEY not configured. Cannot fetch live observations.';
      return [];
    }

    this.resetQuotaIfNewDay();
    const targets = this.locations.slice(0, limit);
    const signals = [];
    let totalLatency = 0;
    let successCount = 0;
    let failedCount = 0;
    this.telemetry.last_fetch = new Date().toISOString();

    for (const loc of targets) {
      const start = Date.now();
      let observation = null;
      let alerts = [];

      try {
        // Attempt One Call 4.0 first unless confirmed not subscribed
        if (this.oneCallSubscribed !== false) {
          const oneCallUrl = `${this.oneCallBaseUrl}/current?lat=${loc.lat}&lon=${loc.lon}&units=metric&appid=${apiKey}`;
          this.incrementCallCount();
          const res4 = await fetch(oneCallUrl, { signal: AbortSignal.timeout(6000) });
          const latency4 = Date.now() - start;

          if (res4.ok) {
            const json4 = await res4.json();
            this.oneCallSubscribed = true;
            this.activeApiTier = 'ONECALL_4.0';
            const cur = json4.data?.[0];
            if (cur) {
              observation = {
                provider: 'OpenWeather One Call 4.0',
                dt: cur.dt,
                temp: cur.temp,
                feels_like: cur.feels_like,
                pressure: cur.pressure,
                humidity: cur.humidity,
                dew_point: cur.dew_point,
                uvi: cur.uvi,
                clouds: cur.clouds,
                visibility: cur.visibility,
                wind_speed: (cur.wind_speed || 0) * 3.6,
                wind_gust: (cur.wind_gust || 0) * 3.6,
                wind_deg: cur.wind_deg || 0,
                rain_1h: cur.rain?.['1h'] || 0,
                snow_1h: cur.snow?.['1h'] || 0,
                weather: cur.weather?.[0] || { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
                sunrise: cur.sunrise,
                sunset: cur.sunset,
                alerts_ids: cur.alerts || [],
                raw: json4,
              };

              // Fetch detailed alerts if present
              if (Array.isArray(cur.alerts) && cur.alerts.length > 0) {
                for (const alertId of cur.alerts.slice(0, 3)) {
                  try {
                    const alertUrl = `${this.oneCallBaseUrl}/alert/${encodeURIComponent(alertId)}?appid=${apiKey}`;
                    this.incrementCallCount();
                    const aRes = await fetch(alertUrl, { signal: AbortSignal.timeout(4000) });
                    if (aRes.ok) {
                      const aData = await aRes.json();
                      alerts.push(aData);
                    }
                  } catch (aErr) {
                    console.warn(`[OpenWeatherConnector] Alert detail fetch warning for ${alertId}:`, aErr.message);
                  }
                }
              }
            }
            totalLatency += latency4;
          } else {
            const errData = await res4.json().catch(() => ({}));
            if (res4.status === 401 && errData.message && errData.message.includes('One Call')) {
              // Documented OpenWeather limitation: One Call requires separate credit card subscription
              this.oneCallSubscribed = false;
              this.telemetry.onecall_notice = errData.message;
              console.log('[OpenWeatherConnector] Notice: ' + errData.message + '. Operating via OpenWeather Standard API.');
            } else if (res4.status === 401) {
              throw new Error('OpenWeather authentication failed: ' + (errData.message || 'Invalid API key'));
            }
          }
        }

        // Standard 2.5 API Fallback if One Call 4.0 is not subscribed or returned empty
        if (!observation) {
          const stdUrl = `${this.standardBaseUrl}/weather?lat=${loc.lat}&lon=${loc.lon}&units=metric&appid=${apiKey}`;
          this.incrementCallCount();
          const stdRes = await fetch(stdUrl, { signal: AbortSignal.timeout(6000) });
          const latencyStd = Date.now() - start;
          totalLatency += latencyStd;

          if (!stdRes.ok) {
            const errJson = await stdRes.json().catch(() => ({}));
            throw new Error(`OpenWeather API error (HTTP ${stdRes.status}): ${errJson.message || stdRes.statusText}`);
          }

          const stdJson = await stdRes.json();
          this.activeApiTier = 'STANDARD_2.5';
          observation = {
            provider: 'OpenWeather Standard 2.5',
            dt: stdJson.dt,
            temp: stdJson.main?.temp ?? 0,
            feels_like: stdJson.main?.feels_like ?? 0,
            pressure: stdJson.main?.pressure ?? 1013,
            humidity: stdJson.main?.humidity ?? 0,
            dew_point: null,
            uvi: null,
            clouds: stdJson.clouds?.all ?? 0,
            visibility: stdJson.visibility ?? 10000,
            wind_speed: (stdJson.wind?.speed ?? 0) * 3.6,
            wind_gust: (stdJson.wind?.gust ?? 0) * 3.6,
            wind_deg: stdJson.wind?.deg ?? 0,
            rain_1h: stdJson.rain?.['1h'] || stdJson.rain?.['3h'] || 0,
            snow_1h: stdJson.snow?.['1h'] || stdJson.snow?.['3h'] || 0,
            weather: stdJson.weather?.[0] || { id: 800, main: 'Clear', description: 'clear sky', icon: '01d' },
            sunrise: stdJson.sys?.sunrise,
            sunset: stdJson.sys?.sunset,
            alerts_ids: [],
            raw: stdJson,
          };
        }

        successCount++;
        this.quota.locations_success_count++;

        // Provider Timestamp Preservation
        const observedAt = observation.dt ? new Date(observation.dt * 1000).toISOString() : new Date().toISOString();
        const ingestedAt = new Date().toISOString();
        const rain = observation.rain_1h;
        const temp = observation.temp;
        const wind = observation.wind_speed;
        const weatherId = observation.weather.id;
        const weatherMain = observation.weather.main;
        const weatherDesc = observation.weather.description;

        // Derived Event Classification Rules
        let candidate = 'OTHER';
        let floodIndicator = false;
        let classificationReason = 'Normal meteorological baseline';

        if (weatherId >= 200 && weatherId <= 232) {
          candidate = 'THUNDERSTORM';
          classificationReason = `Live convective activity detected: ${weatherDesc} (Code: ${weatherId})`;
        } else if (rain >= 15.0) {
          candidate = 'RAINFALL';
          classificationReason = `Intense precipitation rate: ${rain.toFixed(1)} mm/h`;
          if (rain >= 50.0) {
            floodIndicator = true;
            classificationReason += ' [FLOOD_RISK_INDICATOR: Cumulative rain >= 50mm, awaiting hydrological proof]';
          }
        } else if (wind >= 50.0 || observation.wind_gust >= 60.0) {
          candidate = 'STRONG_WIND';
          classificationReason = `Sustained gale/squall: Wind ${wind.toFixed(0)} km/h, Gust ${observation.wind_gust.toFixed(0)} km/h`;
        } else if ((temp >= 42.0 && !loc.is_coastal) || (temp >= 40.0 && loc.is_coastal)) {
          candidate = 'HEATWAVE';
          classificationReason = `Extreme surface temperature: ${temp.toFixed(1)}°C (threshold: ${loc.is_coastal ? '40°C coastal' : '42°C plains'})`;
        } else if (weatherId === 741 || observation.visibility < 1000) {
          candidate = 'FOG';
          classificationReason = `Dense surface obscuration: Visibility ${observation.visibility}m, Fog code ${weatherId}`;
        } else if (weatherId === 751 || weatherId === 761 || weatherId === 731) {
          candidate = 'DUST_STORM';
          classificationReason = `Atmospheric lithometeor: Sand/dust condition (Code: ${weatherId})`;
        } else if (rain > 2.5) {
          candidate = 'RAINFALL';
          classificationReason = `Active light-to-moderate rain: ${rain.toFixed(1)} mm/h (${weatherDesc})`;
        }

        const signal = this.normalize({
          source_id: this.id,
          source_type: this.type,
          source_name: `OpenWeather (${loc.city})`,
          external_id: `owm_${loc.city.toLowerCase().replace(/\s+/g, '')}_${observation.dt}`,
          text: `[OPENWEATHER LIVE OBSERVATION] ${loc.city}, ${loc.state}: ${weatherDesc}. Temp: ${temp.toFixed(1)}°C, Humidity: ${observation.humidity}%, Pressure: ${observation.pressure} hPa, Wind: ${wind.toFixed(0)} km/h, Rain: ${rain.toFixed(1)} mm/h.${floodIndicator ? ' [FLOOD_RISK_INDICATOR: Cumulative rain >= 50mm]' : ''}`,
          timestamp: observedAt,
          observed_at: observedAt,
          ingested_at: ingestedAt,
          provider_timestamp: observedAt,
          city: loc.city,
          state: loc.state,
          country: 'India',
          latitude: loc.lat,
          longitude: loc.lon,
          location_confidence: 0.98,
          location_method: 'native_gps',
          event_candidate: candidate,
          flood_indicator: floodIndicator,
          classification_reason: classificationReason,
          classification_type: 'DERIVED',
          precipitation_mm: rain,
          temperature_c: temp,
          feels_like_c: observation.feels_like,
          humidity_pct: observation.humidity,
          pressure_hpa: observation.pressure,
          wind_speed_kmh: wind,
          wind_gust_kmh: observation.wind_gust,
          wind_deg: observation.wind_deg,
          visibility_m: observation.visibility,
          weather_condition: weatherMain,
          weather_description: weatherDesc,
          weather_id: weatherId,
          sunrise_time: observation.sunrise ? new Date(observation.sunrise * 1000).toISOString() : null,
          sunset_time: observation.sunset ? new Date(observation.sunset * 1000).toISOString() : null,
          data_mode: 'LIVE',
          hashtags: ['#OpenWeather', `#${loc.city.replace(/\s+/g, '')}`, '#LiveMeteo'],
          raw_payload: observation.raw,
        });

        signals.push(signal);

        // Ingest Government/National Weather Alerts if returned
        for (const al of alerts) {
          const alertSignal = this.normalize({
            source_id: this.id,
            source_type: this.type,
            source_name: `OpenWeather Alert (${al.sender_name || loc.city})`,
            external_id: `owm_alert_${loc.city.toLowerCase()}_${al.start || Date.now()}`,
            text: `[OFFICIAL WEATHER ALERT: ${al.event || 'Severe Weather'}] ${loc.city}, ${loc.state} — Source: ${al.sender_name || 'National Meteorological Authority'}. ${al.description || ''}`,
            timestamp: al.start ? new Date(al.start * 1000).toISOString() : observedAt,
            observed_at: al.start ? new Date(al.start * 1000).toISOString() : observedAt,
            ingested_at: ingestedAt,
            provider_timestamp: al.start ? new Date(al.start * 1000).toISOString() : observedAt,
            city: loc.city,
            state: loc.state,
            country: 'India',
            latitude: loc.lat,
            longitude: loc.lon,
            location_confidence: 0.99,
            location_method: 'native_gps',
            event_candidate: this.mapAlertToCandidate(al.event),
            classification_type: 'PROVIDER_DIRECT',
            provider_event: al.event,
            provider_source: al.sender_name,
            alert_start: al.start ? new Date(al.start * 1000).toISOString() : null,
            alert_end: al.end ? new Date(al.end * 1000).toISOString() : null,
            data_mode: 'LIVE',
            hashtags: ['#WeatherAlert', `#${loc.city.replace(/\s+/g, '')}`],
            raw_payload: al,
          });
          signals.push(alertSignal);
        }
      } catch (err) {
        failedCount++;
        this.quota.locations_failed_count++;
        this.quota.api_error_count++;
        this.quota.last_failed_fetch = new Date().toISOString();
        this.telemetry.last_error = err.message;
        console.warn(`[OpenWeatherConnector] Warning: ${loc.city} fetch failed (${err.message}).`);
      }
    }

    if (signals.length > 0) {
      this.mode = 'LIVE';
      this.telemetry.status = failedCount > 0 ? 'DEGRADED' : 'ONLINE';
      this.telemetry.mode = 'LIVE';
      this.telemetry.last_success = new Date().toISOString();
      this.quota.last_successful_fetch = this.telemetry.last_success;
      this.telemetry.latency_ms = Math.round(totalLatency / (successCount || 1));
      this.telemetry.records_fetched += signals.length;
      this.telemetry.records_accepted += signals.length;
    } else {
      this.mode = 'DEGRADED';
      this.telemetry.status = 'DEGRADED';
      this.telemetry.mode = 'DEGRADED';
    }

    return signals;
  }

  mapAlertToCandidate(alertTitle = '') {
    const norm = alertTitle.toLowerCase();
    if (/cyclon|typhoon/i.test(norm)) return 'CYCLONE';
    if (/thunderstorm|squall|lightning/i.test(norm)) return 'THUNDERSTORM';
    if (/flood|inundat/i.test(norm)) return 'FLOOD';
    if (/heavy rain|precipitation|downpour/i.test(norm)) return 'RAINFALL';
    if (/heat|hot/i.test(norm)) return 'HEATWAVE';
    if (/cold|frost/i.test(norm)) return 'COLD_WAVE';
    if (/fog|smog/i.test(norm)) return 'FOG';
    if (/wind|gale|storm/i.test(norm)) return 'STRONG_WIND';
    if (/dust|sand/i.test(norm)) return 'DUST_STORM';
    return 'OTHER';
  }

  getTelemetry() {
    return {
      ...this.telemetry,
      active_api_tier: this.activeApiTier,
      onecall_subscribed: this.oneCallSubscribed,
      quota: { ...this.quota },
      monitoring_locations_count: this.locations.length,
    };
  }
}

export const openWeatherConnector = new OpenWeatherConnector();
