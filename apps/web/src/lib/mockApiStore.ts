'use client';

import { INITIAL_WEATHER_EVENTS, WeatherEventMock, DEMO_SCENARIOS } from './mockData';

const STORAGE_KEY = 'atmosai_local_weather_events';

export function getLocalEvents(): WeatherEventMock[] {
  if (typeof window === 'undefined') {
    return INITIAL_WEATHER_EVENTS;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse local weather events, using initial mock data', e);
  }

  return INITIAL_WEATHER_EVENTS;
}

export function saveLocalEvents(events: WeatherEventMock[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Failed to save local events', e);
  }
}

export function resetLocalEvents(): WeatherEventMock[] {
  saveLocalEvents(INITIAL_WEATHER_EVENTS);
  return INITIAL_WEATHER_EVENTS;
}

export function addCitizenReport(report: {
  event_type: WeatherEventMock['event_type'];
  title: string;
  description: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  severity?: WeatherEventMock['severity'];
}): WeatherEventMock {
  const current = getLocalEvents();

  // Simulated AI synthesis: Compute confidence based on inputs
  const simulatedConfidence = 0.85 + Math.random() * 0.10;

  const newEvent: WeatherEventMock = {
    id: `evt-citizen-${Date.now()}`,
    title: report.title || `Citizen Reported ${report.event_type} Observation`,
    event_type: report.event_type,
    severity: report.severity || 'high',
    status: 'VERIFIED',
    confidence_score: Math.min(0.98, Number(simulatedConfidence.toFixed(2))),
    latitude: report.latitude || 28.6139,
    longitude: report.longitude || 77.2090,
    city: report.city || 'National Territory',
    state: report.state || 'All India',
    description: report.description,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 1,
    evidence_matrix: [
      { factor: 'Citizen Ground Photo & Sensor Triangulation', weight: 0.40, score: 0.94, contribution: '+37.6%' },
      { factor: 'Nearest IMD Automatic Rain Gauge Correlation', weight: 0.35, score: 0.88, contribution: '+30.8%' },
      { factor: 'Spatial Proximity & Geofence Consistency', weight: 0.15, score: 0.92, contribution: '+13.8%' },
      { factor: 'Temporal Freshness Score (<10m)', weight: 0.10, score: 0.96, contribution: '+9.6%' },
    ],
    timeline: [
      { timestamp: 'Just now', source: 'Citizen Mobile App', action: 'Direct telemetry and observational media ingested', confidenceDelta: `${Math.round(simulatedConfidence * 100)}% (Verified)` },
    ],
  };

  const updated = [newEvent, ...current];
  saveLocalEvents(updated);
  return newEvent;
}

export function triggerScenario(scenarioId: string): WeatherEventMock[] {
  const current = getLocalEvents();
  const matched = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
  if (!matched) return current;

  // Check if scenario event exists in INITIAL_WEATHER_EVENTS
  const target = INITIAL_WEATHER_EVENTS.find((e) => e.event_type === matched.eventType);
  if (target) {
    const refreshed = {
      ...target,
      id: `scen-${scenarioId}-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [refreshed, ...current.filter((e) => e.id !== refreshed.id)];
    saveLocalEvents(updated);
    return updated;
  }

  return current;
}
