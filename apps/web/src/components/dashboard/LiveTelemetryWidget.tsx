'use client';

import React, { useState, useEffect } from 'react';
import GoogleIcon from '@/components/ui/GoogleIcon';
import { RefreshCw, Activity, Wind, Droplets, CloudRain, Thermometer } from 'lucide-react';

interface CityCoord {
  name: string;
  state: string;
  lat: number;
  lng: number;
}

const METRO_CITIES: CityCoord[] = [
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777 },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707 },
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362 },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873 },
];

interface TelemetryData {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  time: string;
}

export default function LiveTelemetryWidget() {
  const [selectedCity, setSelectedCity] = useState<CityCoord>(METRO_CITIES[0]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>('');

  const fetchLiveTelemetry = async (city: CityCoord) => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const current = json.current;
        setTelemetry({
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation || 0,
          windSpeed: current.wind_speed_10m,
          weatherCode: current.weather_code,
          time: current.time,
        });
        setLastFetched(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveTelemetry(selectedCity);
  }, [selectedCity]);

  const getWeatherDescription = (code: number) => {
    if (code === 0) return { label: 'Clear Sky', color: 'text-[#E07A5F]' };
    if (code >= 1 && code <= 3) return { label: 'Partly Cloudy', color: 'text-[#F7F4EC]' };
    if (code >= 51 && code <= 67) return { label: 'Active Rainfall', color: 'text-[#3D5A80]' };
    if (code >= 71 && code <= 77) return { label: 'Hail / Sleet', color: 'text-[#8b8e97]' };
    if (code >= 80 && code <= 82) return { label: 'Heavy Showers', color: 'text-[#FF5A1F]' };
    if (code >= 95 && code <= 99) return { label: 'Thunderstorm Squall', color: 'text-[#E76F51]' };
    return { label: 'Atmospheric Activity', color: 'text-[#1F8A70]' };
  };

  const weather = telemetry ? getWeatherDescription(telemetry.weatherCode) : { label: 'Loading...', color: 'text-white' };

  return (
    <div className="rounded-3xl border border-[#12141A]/10 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#12141A]/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#12141A] text-[#F7F4EC]">
            <Activity size={16} className="text-[#1F8A70]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#12141A] font-mono">
                Live Ground Telemetry &amp; WMO Model
              </h4>
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold text-[#1F8A70] bg-[#1F8A70]/10 px-1.5 py-0.5 rounded-full border border-[#1F8A70]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1F8A70] animate-pulse" />
                LIVE OPEN-METEO
              </span>
            </div>
            <p className="text-[11px] text-[#565b68]">
              Ground-truth calibration for {selectedCity.name}, {selectedCity.state}
            </p>
          </div>
        </div>

        {/* City Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {METRO_CITIES.map((c) => (
            <button
              key={c.name}
              onClick={() => setSelectedCity(c)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium transition-all shrink-0 cursor-pointer ${
                selectedCity.name === c.name
                  ? 'bg-[#12141A] text-[#F7F4EC] shadow-xs'
                  : 'bg-[#F7F4EC] text-[#565b68] hover:bg-[#e8e4d8]'
              }`}
            >
              {c.name}
            </button>
          ))}
          <button
            onClick={() => fetchLiveTelemetry(selectedCity)}
            disabled={loading}
            className="p-1 rounded-full hover:bg-black/5 text-[#565b68] transition-colors ml-1 cursor-pointer"
            title="Refresh Live Telemetry"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      {telemetry ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3.5">
          {/* Temperature */}
          <div className="bg-[#F7F4EC] rounded-2xl p-3 border border-[#12141A]/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-[#FF5A1F] shadow-xs">
              <Thermometer size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#565b68]">Surface Temp</p>
              <p className="text-[17px] font-bold text-[#12141A] font-mono leading-tight">
                {telemetry.temperature}°C
              </p>
              <span className={`text-[10px] font-medium ${weather.color}`}>{weather.label}</span>
            </div>
          </div>

          {/* Precipitation */}
          <div className="bg-[#F7F4EC] rounded-2xl p-3 border border-[#12141A]/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-[#3D5A80] shadow-xs">
              <CloudRain size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#565b68]">Precipitation</p>
              <p className="text-[17px] font-bold text-[#12141A] font-mono leading-tight">
                {telemetry.precipitation} <span className="text-[11px] font-normal text-[#565b68]">mm/h</span>
              </p>
              <span className="text-[10px] text-[#565b68]">
                {telemetry.precipitation > 0 ? 'Active Rain Event' : 'Dry / Normal'}
              </span>
            </div>
          </div>

          {/* Humidity */}
          <div className="bg-[#F7F4EC] rounded-2xl p-3 border border-[#12141A]/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-[#1F8A70] shadow-xs">
              <Droplets size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#565b68]">Relative Humidity</p>
              <p className="text-[17px] font-bold text-[#12141A] font-mono leading-tight">
                {telemetry.humidity}%
              </p>
              <span className="text-[10px] text-[#565b68]">
                {telemetry.humidity > 70 ? 'Moisture Saturated' : 'Normal Vapor'}
              </span>
            </div>
          </div>

          {/* Wind Speed */}
          <div className="bg-[#F7F4EC] rounded-2xl p-3 border border-[#12141A]/5 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white flex items-center justify-center text-[#E07A5F] shadow-xs">
              <Wind size={18} />
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#565b68]">Wind Velocity</p>
              <p className="text-[17px] font-bold text-[#12141A] font-mono leading-tight">
                {telemetry.windSpeed} <span className="text-[11px] font-normal text-[#565b68]">km/h</span>
              </p>
              <span className="text-[10px] text-[#565b68]">
                {telemetry.windSpeed > 30 ? 'Strong Gusts' : 'Light Breeze'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-[#565b68] flex items-center justify-center gap-2">
          <GoogleIcon name="sync" size={16} className="animate-spin text-[#FF5A1F]" />
          <span>Contacting meteorological telemetry station...</span>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-[#8b8e97] px-1">
        <span>Station GPS: {selectedCity.lat.toFixed(4)}°N, {selectedCity.lng.toFixed(4)}°E</span>
        <span>Synced at: {lastFetched || 'Just now'} IST</span>
      </div>
    </div>
  );
}
