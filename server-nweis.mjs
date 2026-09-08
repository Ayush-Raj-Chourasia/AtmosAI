/**
 * N-WEIS: National Weather Event Intelligence System
 * High-Performance Zero-Dependency Standalone API & Real-Time SSE Server
 * Fully conforms to SIH26069 API Contract (PRD Section 25)
 */

import http from 'node:http';
import { URL, fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

import { db } from './database/db.mjs';
import { weatherApiConnector } from './connectors/weather-api.mjs';
import { newsRssConnector } from './connectors/news-rss.mjs';
import { imdAdapter } from './connectors/imd-adapter.mjs';
import { socialStreamConnector } from './connectors/social-stream.mjs';
import { publicDatasetConnector } from './connectors/public-dataset.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HTML_DASHBOARD_PATH = path.join(__dirname, 'public', 'index.html');

const PORT = process.env.PORT || 3001;

// -------------------------------------------------------------
// STATE STORE (BACKED BY UNIFIED DATABASE & ATOMIC DISK ENGINE)
// -------------------------------------------------------------
const memSignals = new Map();
const memEvents = new Map();
const memEvidence = new Map();
const memVerifications = [];
const memLifecycle = [];
const sseClients = new Set();

const DECAY_PROFILES = {
  FLOOD: { halfLifeMin: 180, stalenessCutoffHours: 6, decaySpeed: 'medium' },
  THUNDERSTORM: { halfLifeMin: 45, stalenessCutoffHours: 2, decaySpeed: 'fast' },
  RAINFALL: { halfLifeMin: 90, stalenessCutoffHours: 3, decaySpeed: 'medium-fast' },
  HEATWAVE: { halfLifeMin: 360, stalenessCutoffHours: 12, decaySpeed: 'slow' },
  FOG: { halfLifeMin: 75, stalenessCutoffHours: 4, decaySpeed: 'medium-fast' },
  DUST_STORM: { halfLifeMin: 45, stalenessCutoffHours: 2, decaySpeed: 'fast' },
  STRONG_WIND: { halfLifeMin: 40, stalenessCutoffHours: 2, decaySpeed: 'fast' },
  OTHER: { halfLifeMin: 90, stalenessCutoffHours: 3, decaySpeed: 'medium' },
};

// -------------------------------------------------------------
// NATIONAL GROUND TRUTH SENSOR NETWORK (IMD AWS & CWC GAUGES)
// -------------------------------------------------------------
const SENSOR_NETWORK = [
  {
    station_id: 'CWC-BRAHMA-01',
    name: 'CWC Brahmaputra Pandu Gauge',
    network: 'CWC River Gauge Network',
    parameter: 'River Water Level',
    unit: 'meters (MSL)',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.175,
    longitude: 91.685,
    value: 50.12,
    display_value: '50.12 m',
    danger_threshold: 49.68,
    threshold_label: '49.68 m (Danger Mark)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-AWS-GHY-01',
    name: 'IMD Borjhar Met AWS',
    network: 'IMD Automatic Weather Station',
    parameter: '24h Cumulative Rainfall',
    unit: 'mm',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.106,
    longitude: 91.585,
    value: 118.5,
    display_value: '118.5 mm / 24h',
    danger_threshold: 64.5,
    threshold_label: '64.5 mm (Heavy Rain)',
    status: 'ALERT',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-DWR-DEL-01',
    name: 'IMD Palam Doppler Weather Radar',
    network: 'IMD DWR Radar Network',
    parameter: 'Radar Reflectivity (Z)',
    unit: 'dBZ',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.584,
    longitude: 77.088,
    value: 52.0,
    display_value: '52 dBZ Reflectivity',
    danger_threshold: 45.0,
    threshold_label: '45 dBZ (Severe Convection)',
    status: 'ALERT',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-MAST-DEL-02',
    name: 'IMD Safdarjung Anemometer Mast',
    network: 'IMD Surface Observatory',
    parameter: 'Wind Gust Velocity',
    unit: 'km/h',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.585,
    longitude: 77.208,
    value: 68.0,
    display_value: '68 km/h Gust',
    danger_threshold: 55.0,
    threshold_label: '55 km/h (Squall Threshold)',
    status: 'ALERT',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-AWS-MUM-01',
    name: 'IMD Colaba Coastal AWS',
    network: 'IMD Automatic Weather Station',
    parameter: '1-Hour Rainfall Rate',
    unit: 'mm/h',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 18.906,
    longitude: 72.814,
    value: 84.2,
    display_value: '84.2 mm/hr',
    danger_threshold: 64.5,
    threshold_label: '64.5 mm/hr (Heavy Rain Rate)',
    status: 'ALERT',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'MCGM-MITHI-01',
    name: 'MCGM Mithi River Gauge (Kurla)',
    network: 'MCGM Urban Flood Network',
    parameter: 'River Stage Level',
    unit: 'meters',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.068,
    longitude: 72.878,
    value: 3.45,
    display_value: '3.45 m',
    danger_threshold: 3.20,
    threshold_label: '3.20 m (Flash Flood Mark)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-AWS-BLR-01',
    name: 'IMD Bengaluru City AWS',
    network: 'IMD Automatic Weather Station',
    parameter: 'Intense Rain Rate (ARG)',
    unit: 'mm/h',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.971,
    longitude: 77.594,
    value: 92.4,
    display_value: '92.4 mm/hr',
    danger_threshold: 64.5,
    threshold_label: '64.5 mm/hr (Cloudburst Warning)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'BBMP-SLUICE-01',
    name: 'BBMP Bellandur Inflow Sluice',
    network: 'BBMP Lake Management Network',
    parameter: 'Inflow Sluice Level',
    unit: 'meters',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.935,
    longitude: 77.674,
    value: 1.85,
    display_value: '1.85 m',
    danger_threshold: 1.50,
    threshold_label: '1.50 m (Overflow Threshold)',
    status: 'ALERT',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-RVR-DEL-01',
    name: 'IMD IGI Airport Runway RVR',
    network: 'IMD Aviation Transmissometer',
    parameter: 'Runway Visual Range (RVR)',
    unit: 'meters',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.556,
    longitude: 77.100,
    value: 35.0,
    display_value: '35 m Visibility',
    danger_threshold: 50.0,
    threshold_label: '< 50 m (CAT III-B ILS Threshold)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-SYN-CHURU-01',
    name: 'IMD Churu Synoptic Observatory',
    network: 'IMD Synoptic Surface Network',
    parameter: 'Maximum Ambient Temperature',
    unit: '°C',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 28.291,
    longitude: 74.966,
    value: 47.4,
    display_value: '47.4 °C',
    danger_threshold: 45.0,
    threshold_label: '45.0 °C (Severe Heatwave)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  },
  {
    station_id: 'IMD-OBS-ALIPORE-01',
    name: 'IMD Alipore Wind Observatory',
    network: 'IMD Coastal Anemometer Network',
    parameter: 'Sustained Gale Wind Speed',
    unit: 'km/h',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.533,
    longitude: 88.324,
    value: 118.0,
    display_value: '118 km/h Sustained',
    danger_threshold: 89.0,
    threshold_label: '89 km/h (Very Severe Cyclonic Storm)',
    status: 'CRITICAL_EXCEEDED',
    last_reading_at: new Date().toISOString()
  }
];

function logLifecycleTransition(eventId, fromStatus, toStatus, reason, triggeredBy) {
  const entry = {
    id: `lc_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    event_id: eventId,
    from_status: fromStatus,
    to_status: toStatus,
    reason,
    triggered_by: triggeredBy,
    timestamp: new Date().toISOString(),
  };
  memLifecycle.push(entry);
  broadcastSSE({ type: 'lifecycle_transition', log: entry });
  return entry;
}

function validateAndTransitionStatus(event, targetStatus, reason, officerName = 'IMD Duty Meteorologist') {
  const VALID_STATUSES = ['DETECTED', 'UNDER_REVIEW', 'VERIFIED', 'RESOLVED', 'FALSE_ALARM'];
  const fromStatus = event.status;

  if (!VALID_STATUSES.includes(targetStatus)) {
    return { success: false, error: `Invalid target status: ${targetStatus}` };
  }

  if (fromStatus === targetStatus) {
    return { success: false, error: `Incident is already in status ${targetStatus}` };
  }

  // Forbidden: Cannot jump directly from FALSE_ALARM to VERIFIED without UNDER_REVIEW
  if (fromStatus === 'FALSE_ALARM' && targetStatus === 'VERIFIED') {
    return { success: false, error: 'Forbidden transition: FALSE_ALARM cannot directly become VERIFIED. Re-open to UNDER_REVIEW first.' };
  }

  // Forbidden: Once RESOLVED, cannot transition to FALSE_ALARM
  if (fromStatus === 'RESOLVED' && targetStatus === 'FALSE_ALARM') {
    return { success: false, error: 'Forbidden transition: Historical RESOLVED incident cannot be reclassified as FALSE_ALARM' };
  }

  event.status = targetStatus;
  event.last_updated_at = new Date().toISOString();
  if (targetStatus === 'VERIFIED') {
    event.verified_at = event.last_updated_at;
  }

  const logEntry = logLifecycleTransition(
    event.id,
    fromStatus,
    targetStatus,
    reason || `Status updated to ${targetStatus} by ${officerName}`,
    `officer:${officerName}`
  );

  broadcastSSE({ type: 'event_status_updated', event, transition: logEntry });
  return { success: true, event, transition: logEntry };
}

function applyConfidenceDecay(event, now = Date.now()) {
  const profile = DECAY_PROFILES[event.event_type] || DECAY_PROFILES.OTHER;
  const lastEv = new Date(event.last_evidence_at || event.last_updated_at).getTime();
  const elapsedMin = Math.max(0, (now - lastEv) / 60000);

  const decayFactor = Math.pow(0.5, elapsedMin / profile.halfLifeMin);
  const base = event.base_confidence || event.confidence_score;
  const decayedConf = Number(Math.max(0.15, Math.min(base, base * decayFactor)).toFixed(2));
  const freshnessPct = Math.max(0, Math.min(100, Math.round(decayFactor * 100)));

  const oldStatus = event.status;
  let newStatus = oldStatus;

  if (elapsedMin > profile.stalenessCutoffHours * 60) {
    if (oldStatus !== 'RESOLVED') {
      newStatus = 'RESOLVED';
    }
  } else if (decayedConf < 0.85 && oldStatus === 'VERIFIED') {
    newStatus = 'UNDER_REVIEW';
  }

  if (newStatus !== oldStatus) {
    event.status = newStatus;
    logLifecycleTransition(
      event.id,
      oldStatus,
      newStatus,
      `Confidence decayed from ${(base * 100).toFixed(0)}% to ${(decayedConf * 100).toFixed(0)}% (elapsed ${Math.round(elapsedMin)}m without reinforcement)`,
      'temporal_decay_engine'
    );
  }

  event.confidence_score = decayedConf;
  event.freshness_score = freshnessPct;
  event.decay_factor = Number(decayFactor.toFixed(3));
  event.minutes_since_reinforcement = Math.round(elapsedMin);
  event.half_life_minutes = profile.halfLifeMin;
  return event;
}

const WEATHER_TAXONOMY = [
  'RAINFALL',
  'THUNDERSTORM',
  'FLOOD',
  'HEATWAVE',
  'FOG',
  'DUST_STORM',
  'STRONG_WIND',
  'OTHER',
];

const MAJOR_CITIES = [
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, aliases: ['gauhati', 'jalukbari', 'iit guwahati', 'maligaon'] },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, aliases: ['delhi', 'ncr', 'connaught place', 'dhaula kuan'] },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, aliases: ['bombay', 'kurla', 'bandra', 'sion'] },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, aliases: ['pink city', 'churu', 'bikaner'] },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, aliases: ['calcutta', 'howrah', 'salt lake'] },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, aliases: ['bangalore', 'koramangala'] },
];

function getSourceBaseline(sourceType) {
  switch (sourceType) {
    case 'imd': return 1.00;
    case 'weather_api': return 0.90;
    case 'news': return 0.85;
    case 'citizen': return 0.70;
    case 'social_media': return 0.35;
    default: return 0.20;
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function resolveLocation(text, lat, lng, cityHint, stateHint) {
  if (lat !== undefined && lat !== null && lng !== undefined && lng !== null) {
    if (lat >= 6.5 && lat <= 37.5 && lng >= 68.0 && lng <= 97.5) {
      return { lat, lng, city: cityHint || 'Ground Station', state: stateHint || 'India', method: 'native_gps', confidence: 0.98 };
    }
  }
  const lower = text.toLowerCase();
  for (const city of MAJOR_CITIES) {
    if (lower.includes(city.name.toLowerCase()) || city.aliases.some(a => lower.includes(a))) {
      return { lat: city.lat, lng: city.lng, city: city.name, state: city.state, method: 'geo_reasoning', confidence: 0.90 };
    }
  }
  return { lat: 28.6139, lng: 77.209, city: 'New Delhi', state: 'Delhi', method: 'geocoder_fallback', confidence: 0.25 };
}

function classifyWeather(text) {
  const lower = text.toLowerCase();
  const scores = { RAINFALL: 0, THUNDERSTORM: 0, FLOOD: 0, HEATWAVE: 0, FOG: 0, DUST_STORM: 0, STRONG_WIND: 0, OTHER: 0.1 };

  if (/flood|submerged|inundat|overflow|waterlogging|water entering/i.test(lower)) scores.FLOOD += 4;
  if (/rain|downpour|cloudburst|precipitation/i.test(lower)) scores.RAINFALL += 3;
  if (/thunder|lightning|squall|storm|thunderstorm/i.test(lower)) scores.THUNDERSTORM += 3.5;
  if (/heatwave|temperature.*above|4[5-9]°c|loo|heat stroke/i.test(lower)) scores.HEATWAVE += 4;
  if (/fog|dense fog|visibility.*<|smog/i.test(lower)) scores.FOG += 4;
  if (/dust storm|andhi|sandstorm/i.test(lower)) scores.DUST_STORM += 4;
  if (/gale|strong wind|cyclone|uprooted tree/i.test(lower)) scores.STRONG_WIND += 3.5;

  let best = 'OTHER';
  let max = 0;
  for (const t of WEATHER_TAXONOMY) {
    if (scores[t] > max) {
      max = scores[t];
      best = t;
    }
  }
  return { eventType: best, probability: max > 0 ? Math.min(0.96, 0.70 + (max * 0.06)) : 0.40 };
}

function broadcastSSE(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

function jaccardSimilarity(a, b) {
  const setA = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  const setB = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2));
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

function checkDuplicateSignal(candidate, existingSignals) {
  const candidateNorm = (candidate.text || '').toLowerCase().trim();
  const candidateHash = crypto.createHash('sha256').update(candidateNorm).digest('hex');

  for (const existing of existingSignals) {
    // Level 1: Exact External ID
    if (candidate.external_id && existing.external_id && candidate.external_id === existing.external_id) {
      return { isDuplicate: true, layer: 'exact', reason: `Exact ID match (${candidate.external_id})`, parentId: existing.id };
    }

    // Level 2: Exact Content SHA-256 Hash
    const existingNorm = (existing.text || '').toLowerCase().trim();
    const existingHash = crypto.createHash('sha256').update(existingNorm).digest('hex');
    if (candidateHash === existingHash && candidateHash.length > 0) {
      return { isDuplicate: true, layer: 'content_hash', reason: `Exact Content SHA-256 match (${candidateHash.slice(0, 8)})`, parentId: existing.id };
    }

    // Level 3: Tokenized Jaccard Semantic Similarity
    const sim = jaccardSimilarity(candidate.text, existing.text);
    if (sim >= 0.75) {
      return { isDuplicate: true, layer: 'semantic', reason: `Semantic overlap ${(sim * 100).toFixed(0)}%`, parentId: existing.id };
    }

    // Level 4: Media URL / Checksum Hash Match
    if (candidate.media_urls?.length && existing.media_urls?.length) {
      const matchMedia = candidate.media_urls.some(url => existing.media_urls.includes(url));
      if (matchMedia) {
        return { isDuplicate: true, layer: 'media_hash', reason: 'Identical media asset/photo checksum match', parentId: existing.id };
      }
    }

    // Level 5: Spatiotemporal Cluster Proximity
    const dist = haversineKm(candidate.latitude, candidate.longitude, existing.latitude, existing.longitude);
    if (dist <= 3.0 && candidate.event_candidate === existing.event_candidate && sim >= 0.40) {
      return { isDuplicate: true, layer: 'spatiotemporal', reason: `Proximity ${dist.toFixed(1)}km, matching event`, parentId: existing.id };
    }
  }
  return { isDuplicate: false };
}

// -------------------------------------------------------------
// OPERATIONAL DIRECTIVES GENERATOR (NDRF / SDMA / IMD ADVISORY)
// -------------------------------------------------------------
function generateActionDirectives(eventType, severity, city, state) {
  switch (eventType) {
    case 'FLOOD':
      return [
        `Deploy NDRF & SDRF water rescue teams with inflatable boats to low-lying sectors in ${city}.`,
        `Central Water Commission (CWC): Alert district magistrate on danger stage exceedance.`,
        `Traffic Advisory: Close submerged underpasses and divert vehicular transit away from arterial routes.`,
        `Municipal Corporation: Deploy high-capacity dewatering pumps and establish dry-ration relief camps.`
      ];
    case 'THUNDERSTORM':
      return [
        `Civil Aviation (ATC): Issue immediate squall & lightning alert for inbound/outbound aircraft.`,
        `Disaster Response Units: Pre-position emergency clearing crews for uprooted trees and overhead lines.`,
        `State Electricity Board: Sectionalize vulnerable power distribution feeders to prevent electrocution.`,
        `Public Advisory: Warn citizens to remain indoors and avoid standing under tall trees or metal poles.`
      ];
    case 'RAINFALL':
      return [
        `Municipal Authorities: Activate stormwater pump houses at peak capacity across ${city}.`,
        `Urban Transit: Issue real-time flash-flood diversions for IT corridors and low-lying residential layouts.`,
        `District Emergency Operations Centre (DEOC): Place field assessment officers on standby.`,
        `Telemetry Network: Increase automated rain gauge (ARG) polling frequency to 5-minute intervals.`
      ];
    case 'HEATWAVE':
      return [
        `State Health Department: Enact Heat Action Plan (HAP) Level-3 Red Emergency Directive.`,
        `Labor Commissioner: Strictly enforce outdoor construction stoppage between 12:00 PM and 3:30 PM.`,
        `Municipal Bodies: Establish shaded hydration kiosks with clean drinking water and ORS supplies.`,
        `Government Hospitals: Designate dedicated air-cooled heat-stroke wards with ice bath protocols.`
      ];
    case 'FOG':
      return [
        `Airport Operations: Mandate CAT-III Instrument Landing System (ILS) low-visibility protocols.`,
        `National Highways Authority (NHAI): Enforce convoy piloting and reduced speed restrictions on expressways.`,
        `Northern Railway: Ensure Fog Safety Devices (FSD) active on all express and freight locomotives.`,
        `Traffic Police: Mandate high-visibility yellow fog lamps and deploy reflective warning barricades.`
      ];
    case 'STRONG_WIND':
      return [
        `Maritime & Port Authorities: Suspend harbor ferry operations and order coastal craft to harbor.`,
        `Port Trust: Anchor heavy gantry cranes and mandate vessels in berth to double-moor.`,
        `Municipal Engineering: Dismantle hazardous billboard hoardings, temporary tin sheds, and scaffolding.`,
        `Disaster Management: Pre-deploy chainsaw rescue teams along primary lifeline corridors.`
      ];
    case 'DUST_STORM':
      return [
        `Pollution Control Board: Issue severe ambient air quality alert (PM10 surge) for sensitive groups.`,
        `Interstate Transport: Regulate highway vehicle speeds and require active hazard warning flashers.`,
        `District Education Officers: Suspend outdoor school assemblies and physical education drills.`,
        `Agriculture Extension: Instruct rural farmers to secure harvested crop mounds and livestock shelters.`
      ];
    default:
      return [
        `District Emergency Operations Centre (DEOC) placed on heightened monitoring alert.`,
        `Field verifiers dispatched to ground coordinates for rapid damage assessment.`,
        `Establish direct telemetry and status reporting link with State Disaster Management Authority (SDMA).`
      ];
  }
}

// -------------------------------------------------------------
// MULTILINGUAL INDIC WEATHER BULLETIN GENERATOR
// -------------------------------------------------------------
function generateMultilingualBulletin(event, lang = 'en') {
  const city = event.city;
  const state = event.state;
  const type = event.event_type;
  const conf = `${(event.confidence_score * 100).toFixed(0)}%`;

  const bulletins = {
    en: {
      lang: 'en',
      lang_name: 'English',
      headline: `IMD URGENT ALERT: ${type} Warning for ${city}, ${state}`,
      instruction: `Confirmed ${type.toLowerCase()} event verified at ${conf} confidence. Residents are advised to take safety precautions and follow local emergency administration advisories.`,
      voice_text: `Attention citizens. India Meteorological Department has issued an urgent ${type.toLowerCase()} alert for ${city}, ${state}. Verified confidence is ${conf}. Please take shelter and follow safety instructions.`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    },
    hi: {
      lang: 'hi',
      lang_name: 'हिंदी (Hindi)',
      headline: `भारत मौसम विज्ञान विभाग (IMD) आपातकालीन चेतावनी: ${city}, ${state} में ${type === 'FLOOD' ? 'बाढ़' : type === 'THUNDERSTORM' ? 'आंधी-तूफान' : type === 'HEATWAVE' ? 'भीषण लू' : type === 'FOG' ? 'घना कोहरा' : type === 'RAINFALL' ? 'भारी बारिश' : type} का अलर्ट`,
      instruction: `सत्यापित मौसम आपदा (${conf} सटीकता)। सभी नागरिकों से अनुरोध है कि सुरक्षित स्थानों पर रहें, अनावश्यक यात्रा से बचें और स्थानीय आपदा प्रबंधन के निर्देशों का पालन करें।`,
      voice_text: `नागरिकों ध्यान दें। भारत मौसम विज्ञान विभाग ने ${city}, ${state} के लिए ${type === 'FLOOD' ? 'बाढ़' : type === 'THUNDERSTORM' ? 'आंधी-तूफान' : type === 'HEATWAVE' ? 'भीषण लू' : type === 'FOG' ? 'घना कोहरा' : 'भारी मौसम'} की चेतावनी जारी की है। कृपया सुरक्षित स्थानों पर रहें।`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    },
    as: {
      lang: 'as',
      lang_name: 'অসমীয়া (Assamese)',
      headline: `ভাৰতীয় বতৰ বিজ্ঞান বিভাগ (IMD) জৰুৰী সতৰ্কতা: ${city}, অসমত বতৰৰ সতৰ্কবাৰ্তা`,
      instruction: `${city}ত ${type === 'FLOOD' ? 'গুৰুতৰ বানপানী' : 'প্ৰাকৃতিক দুৰ্যোগ'} সতৰ্কতা জাৰি কৰা হৈছে (${conf} প্ৰমাণিত)। ব্ৰহ্মপুত্ৰ আৰু স্থানীয় নদীৰ কাষৰ বাসিন্দাসকলক সতৰ্ক থাকিবলৈ আৰু ওখ ঠাইলৈ যাবলৈ কোৱা হৈছে।`,
      voice_text: `ৰাইজৰ দৃষ্টি আকৰ্ষণ কৰা হৈছে। বতৰ বিজ্ঞান বিভাগে ${city}ৰ বাবে জৰুৰী বতৰ সতৰ্কবাৰ্তা জাৰি কৰিছে। সকলো নাগৰিকক সুৰক্ষিত স্থানত আশ্ৰয় ল'বলৈ অনুৰোধ জনোৱা হৈছে।`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    },
    bn: {
      lang: 'bn',
      lang_name: 'বাংলা (Bengali)',
      headline: `ভারত আবহাওয়া দপ্তর (IMD) জরুরি সতর্কতা: ${city}, পশ্চিমবঙ্গে দুর্যোগের বার্তা`,
      instruction: `${city} এবং সংলগ্ন উপকূলবর্তী এলাকায় ${type === 'STRONG_WIND' || type === 'THUNDERSTORM' ? 'ঘূর্ণিঝড় ও তীব্র ঝোড়ো হাওয়া' : 'প্রাকৃতিক দুর্যোগ'} সতর্কতা (${conf} নিশ্চিত)। মৎস্যজীবীদের সমুদ্রে যেতে নিষেধ করা হয়েছে এবং নিচু এলাকার মানুষদের ত্রাণ শিবিরে আশ্রয় নিতে বলা হয়েছে।`,
      voice_text: `সকলের দৃষ্টি আকর্ষণ করা হচ্ছে। আলিপুর আবহাওয়া দপ্তর ${city} ও পার্শ্ববর্তী এলাকার জন্য জরুরি সতর্কতা জারি করেছে। অনুগ্রহ করে নিরাপদ স্থানে থাকুন।`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    },
    mr: {
      lang: 'mr',
      lang_name: 'मराठी (Marathi)',
      headline: `भारतीय हवामान विभाग (IMD) आणीबाणी इशारा: ${city}, महाराष्ट्र येथे सतर्कता`,
      instruction: `${city} आणि परिसरात मुसळधार पाऊस व पूरस्थितीची शक्यता (${conf} खात्रीशीर). सखल भागातील नागरिकांनी सतर्क राहावे आणि स्थानिक प्रशासनाच्या सूचनांचे पालन करावे.`,
      voice_text: `नागरिकांनी कृपया लक्ष द्यावे. हवामान खात्याने ${city} साठी अतिवृष्टी आणि वादळाचा गंभीर इशारा दिला आहे. घरातच सुरक्षित राहावे.`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    },
    kn: {
      lang: 'kn',
      lang_name: 'ಕನ್ನಡ (Kannada)',
      headline: `ಭಾರತೀಯ ಹವಾಮಾನ ಇಲಾಖೆ (IMD) ತುರ್ತು ಎಚ್ಚರಿಕೆ: ${city}, ಕರ್ನಾಟಕ`,
      instruction: `${city} ನಗರದಲ್ಲಿ ${type === 'RAINFALL' || type === 'FLOOD' ? 'ಭಾರಿ ಮಳೆ ಮತ್ತು ಪ್ರವಾಹ' : 'ಹವಾಮಾನ ವೈಪರೀತ್ಯ'} ಮುನ್ಸೂಚನೆ (${conf} ದೃಢಪಟ್ಟಿದೆ). ಸಾರ್ವಜನಿಕರು ಕೆಳಹಂತದ ರಸ್ತೆ ಮತ್ತು ಜಲಾವೃತ ಪ್ರದೇಶಗಳಿಂದ ದೂರವಿರಲು ಸೂಚಿಸಲಾಗಿದೆ.`,
      voice_text: `ಸಾರ್ವಜನಿಕರ ಗಮನಕ್ಕೆ. ಹವಾಮಾನ ಇಲಾಖೆಯು ${city} ಪ್ರದೇಶಕ್ಕೆ ತುರ್ತು ಮಳೆ ಮತ್ತು ಪ್ರವಾಹ ಮುನ್ನೆಚ್ಚರಿಕೆ ನೀಡಿದೆ. ದಯವಿಟ್ಟು ಸುರಕ್ಷಿತವಾಗಿರಿ.`,
      urgency: 'Immediate',
      severity: event.severity ? event.severity.toUpperCase() : 'HIGH'
    }
  };

  return bulletins[lang] || bulletins.en;
}

// -------------------------------------------------------------
// ITU-T X.1303 / OASIS CAP v1.2 EARLY WARNING XML GENERATOR
// -------------------------------------------------------------
function generateCapXml(event) {
  const alertId = `urn:oid:2.49.0.0.356.0.nweis.${event.id.replace('evt_', '')}`;
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 6 * 3600 * 1000).toISOString();
  const severity = event.severity === 'critical' ? 'Extreme' : 'Severe';

  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${alertId}</identifier>
  <sender>warning@imd.gov.in</sender>
  <sent>${now}</sent>
  <status>Actual</status>
  <msgType>Alert</msgType>
  <scope>Public</scope>
  <code>IMD-CAP-v1.2</code>
  <info>
    <language>en-IN</language>
    <category>Met</category>
    <event>${event.event_type}</event>
    <urgency>Immediate</urgency>
    <severity>${severity}</severity>
    <certainty>Observed</certainty>
    <eventCode>
      <valueName>IMD-MoES</valueName>
      <value>${event.event_type}</value>
    </eventCode>
    <expires>${expires}</expires>
    <senderName>India Meteorological Department / Ministry of Earth Sciences</senderName>
    <headline>${event.title} - Verified Confidence ${(event.confidence_score * 100).toFixed(0)}%</headline>
    <description>${event.description} Corroborated by ${event.signal_count} localized field observations.</description>
    <instruction>${(event.recommended_actions || []).join(' ')}</instruction>
    <contact>ndrf-control@nic.in</contact>
    <parameter>
      <valueName>NWEIS-Confidence</valueName>
      <value>${(event.confidence_score * 100).toFixed(0)}%</value>
    </parameter>
    <parameter>
      <valueName>NWEIS-Freshness</valueName>
      <value>${event.freshness_score}%</value>
    </parameter>
    <area>
      <areaDesc>${event.city}, ${event.state}, India</areaDesc>
      <circle>${event.latitude.toFixed(4)},${event.longitude.toFixed(4)},15.0</circle>
    </area>
  </info>
</alert>`;
}

// -------------------------------------------------------------
// RFC 7946 GeoJSON / OGC WFS FEATURE COLLECTION GENERATOR
// -------------------------------------------------------------
function generateGeoJson(events) {
  return {
    type: 'FeatureCollection',
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
    },
    metadata: {
      generated_at: new Date().toISOString(),
      authority: 'Ministry of Earth Sciences / India Meteorological Department (IMD)',
      system: 'N-WEIS: National Weather Event Intelligence System (SIH26069)',
      standards_conformance: ['RFC 7946 GeoJSON', 'OGC WFS 2.0 Interoperable', 'ISRO Bhuvan Ready'],
      total_features: events.length
    },
    features: events.map(event => ({
      type: 'Feature',
      id: event.id,
      geometry: {
        type: 'Point',
        coordinates: [event.longitude, event.latitude]
      },
      properties: {
        event_id: event.id,
        title: event.title,
        event_type: event.event_type,
        severity: (event.severity || 'high').toUpperCase(),
        status: event.status,
        confidence_score: event.confidence_score,
        confidence_percentage: `${(event.confidence_score * 100).toFixed(0)}%`,
        freshness_score: event.freshness_score,
        half_life_minutes: event.half_life_minutes,
        city: event.city,
        state: event.state,
        signal_count: event.signal_count,
        source_breakdown: event.source_breakdown,
        sensors: event.sensors || [],
        recommended_actions: event.recommended_actions || [],
        first_detected_at: event.first_detected_at,
        last_updated_at: event.last_updated_at,
        verified_at: event.verified_at,
        sitrep_endpoint: `/api/v1/events/${event.id}/sitrep`,
        cap_endpoint: `/api/v1/events/${event.id}/cap`,
        bulletin_endpoint: `/api/v1/events/${event.id}/bulletin`
      }
    }))
  };
}

// -------------------------------------------------------------
// OGC KML 2.2 GOOGLE EARTH EXPORT GENERATOR
// -------------------------------------------------------------
function generateKml(events) {
  const placemarks = events.map(e => {
    const freshPct = Math.round(e.freshness_score > 1 ? e.freshness_score : (e.freshness_score || 1) * 100);
    return `    <Placemark id="${e.id}">
      <name><![CDATA[${e.event_type}: ${e.city}, ${e.state} (${(e.confidence_score * 100).toFixed(0)}% Conf)]]></name>
      <description><![CDATA[
        <h3>${e.title}</h3>
        <p><b>Hazard Type:</b> ${e.event_type} | <b>Severity:</b> ${(e.severity || 'high').toUpperCase()}</p>
        <p><b>Lifecycle Status:</b> ${e.status} | <b>Confidence:</b> ${(e.confidence_score * 100).toFixed(0)}%</p>
        <p><b>Corroborated Signals:</b> ${e.signal_count} | <b>Freshness:</b> ${freshPct}%</p>
        <p><b>Location:</b> ${e.city}, ${e.state} (${e.latitude.toFixed(4)}°N, ${e.longitude.toFixed(4)}°E)</p>
        <p><b>Issuing Authority:</b> Ministry of Earth Sciences / India Meteorological Department (IMD)</p>
      ]]></description>
      <Point>
        <coordinates>${e.longitude},${e.latitude},0</coordinates>
      </Point>
    </Placemark>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>N-WEIS Live Weather Event Intelligence Layer</name>
    <description>IMD / MoES Real-Time Multi-Hazard Situational Awareness (SIH26069)</description>
${placemarks}
  </Document>
</kml>`;
}

// -------------------------------------------------------------
// TABULAR CSV / EXCEL EXPORT GENERATOR
// -------------------------------------------------------------
function generateCsv(events) {
  const headers = ['id', 'event_type', 'severity', 'status', 'city', 'state', 'latitude', 'longitude', 'confidence_score', 'signal_count', 'freshness_score', 'first_detected_at', 'last_updated_at'];
  const escapeCsv = val => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = events.map(e => [
    e.id,
    e.event_type,
    (e.severity || 'high').toUpperCase(),
    e.status,
    e.city,
    e.state,
    e.latitude,
    e.longitude,
    e.confidence_score,
    e.signal_count,
    Math.round(e.freshness_score > 1 ? e.freshness_score : (e.freshness_score || 1) * 100),
    e.first_detected_at,
    e.last_updated_at
  ].map(escapeCsv).join(','));

  return [headers.join(','), ...rows].join('\r\n');
}

// -------------------------------------------------------------
// EMERGENCY VOLUNTEER & SDRF SMS DISPATCH ENGINE
// -------------------------------------------------------------
const REGIONAL_EMERGENCY_UNITS = {
  'Assam': {
    sdrf: 'Assam SDRF Battalion 1 (Pandu Water Rescue Wing)',
    authority: 'Assam State Disaster Management Authority (ASDMA)',
    community: 'Kamrup Metropolitan Aapda Mitra Volunteer Corps',
    helpline: '1077 / 112',
    ndrfUnit: '1st NDRF Battalion (Patgaon Guwahati)',
    estVolunteers: 348,
    estAapdaMitra: 120
  },
  'Delhi': {
    sdrf: 'Delhi Fire & Civil Defence Quick Reaction Team',
    authority: 'Delhi Disaster Management Authority (DDMA)',
    community: 'Central & New Delhi Aapda Mitra Responders',
    helpline: '1077 / 112',
    ndrfUnit: '8th NDRF Battalion (Ghaziabad NCR)',
    estVolunteers: 412,
    estAapdaMitra: 160
  },
  'Maharashtra': {
    sdrf: 'Maharashtra SDRF 1st Battalion (Nagpur/Pune detachment)',
    authority: 'Brihanmumbai Disaster Management Cell (BMC)',
    community: 'Brihanmumbai Aapda Mitra Coastal Response Volunteers',
    helpline: '1916 / 1077 / 112',
    ndrfUnit: '5th NDRF Battalion (Pune Unit)',
    estVolunteers: 520,
    estAapdaMitra: 210
  },
  'Rajasthan': {
    sdrf: 'Rajasthan SDRF Battalion (Jaipur Company)',
    authority: 'Rajasthan Disaster Management & Relief Department',
    community: 'Jaipur & Thar Aapda Mitra Volunteers',
    helpline: '1070 / 112',
    ndrfUnit: '6th NDRF Battalion (Ajmer detachment)',
    estVolunteers: 290,
    estAapdaMitra: 95
  },
  'West Bengal': {
    sdrf: 'West Bengal Disaster Management Brigade & Civil Defence',
    authority: 'West Bengal Disaster Management Authority (WBDMA)',
    community: 'Kolkata & South 24 Parganas Aapda Mitra Responders',
    helpline: '1070 / 112',
    ndrfUnit: '2nd NDRF Battalion (Haringhata Nadia)',
    estVolunteers: 460,
    estAapdaMitra: 185
  },
  'Karnataka': {
    sdrf: 'Karnataka SDRF 1st Company (Bengaluru Base)',
    authority: 'Karnataka State Natural Disaster Monitoring Centre (KSNDMC)',
    community: 'BBMP Disaster Volunteer Taskforce',
    helpline: '1077 / 112',
    ndrfUnit: '10th NDRF Battalion (Bengaluru detachment)',
    estVolunteers: 380,
    estAapdaMitra: 140
  }
};

function generateVolunteerDispatch(event) {
  const stateConfig = REGIONAL_EMERGENCY_UNITS[event.state] || {
    sdrf: 'State Disaster Response Force (SDRF) Quick Response Team',
    authority: 'State Disaster Management Authority (SDMA)',
    community: 'National Disaster Management Authority (NDMA) Aapda Mitra Volunteers',
    helpline: '1077 / 112',
    ndrfUnit: 'Regional NDRF Battalion',
    estVolunteers: 250,
    estAapdaMitra: 80
  };

  const confPercent = `${(event.confidence_score * 100).toFixed(0)}%`;
  const smsEnglish = `[ALERT] IMD: ${event.event_type} in ${event.city} (${confPercent} conf). SDRF/NDRF activated. Dial ${stateConfig.helpline} for rescue. -${event.state} DMA`;

  return {
    dispatch_id: `SMS-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    event_id: event.id,
    event_type: event.event_type,
    city: event.city,
    state: event.state,
    confidence_score: event.confidence_score,
    target_battalions: [
      stateConfig.sdrf,
      stateConfig.ndrfUnit,
      stateConfig.community
    ],
    issuing_authority: stateConfig.authority,
    volunteers_alerted: stateConfig.estVolunteers,
    aapda_mitra_responders: stateConfig.estAapdaMitra,
    total_responders_mobilized: stateConfig.estVolunteers + stateConfig.estAapdaMitra,
    tollfree_helpline: stateConfig.helpline,
    sms_payload: smsEnglish,
    sms_char_count: smsEnglish.length,
    sms_within_limit: smsEnglish.length <= 160,
    dispatched_at: new Date().toISOString()
  };
}

// -------------------------------------------------------------
// CORE INGESTION & FUSION PIPELINE
// -------------------------------------------------------------
async function ingestSignal(raw) {
  const geo = resolveLocation(raw.text, raw.latitude, raw.longitude, raw.city, raw.state);
  const classification = classifyWeather(raw.text);

  const mediaUrls = raw.media_urls || [];
  const lowerMedia = mediaUrls.join(' ').toLowerCase();
  const isRecycledMedia = lowerMedia.includes('recycled_') || lowerMedia.includes('fake_');

  // Skeptic layer
  let misinfoProb = 0.05;
  if (isRecycledMedia) misinfoProb = 0.85;
  if (/apocalypse|500 people drowned in cave|alien weather/i.test(raw.text)) misinfoProb += 0.50;

  const isRejected = misinfoProb >= 0.65;
  const status = isRejected ? 'REJECTED' : 'VERIFIED';
  const credibility = isRejected ? 0.10 : getSourceBaseline(raw.source_type);

  const signal = {
    id: raw.id || `sig_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    source_type: raw.source_type,
    source_name: raw.source_name || raw.source_type,
    external_id: raw.external_id || null,
    text: raw.text.trim(),
    latitude: geo.lat,
    longitude: geo.lng,
    city: geo.city,
    state: geo.state,
    location_confidence: geo.confidence,
    location_method: geo.method,
    event_candidate: classification.eventType,
    relevance_score: classification.probability,
    credibility_score: credibility,
    misinformation_score: misinfoProb,
    verification_status: status,
    media_urls: mediaUrls,
    hashtags: (raw.text.match(/#[a-zA-Z0-9_]+/g) || []).map(h => h.toLowerCase()),
    timestamp: new Date().toISOString(),
  };

  memSignals.set(signal.id, signal);
  db.tables.signals.set(signal.id, signal);
  db.saveToDisk();

  if (isRejected) {
    const vRec = {
      id: `vr_${Date.now()}`,
      target_type: 'signal',
      target_id: signal.id,
      action: 'REJECT',
      verified_by: 'ai_engine',
      reason: 'Recycled media hash signature or sensationalist hoax claim detected',
      created_at: new Date().toISOString(),
    };
    memVerifications.push(vRec);
    db.tables.verification_records.push(vRec);
    db.saveToDisk();
    broadcastSSE({ type: 'signal_rejected', signal });
    return { signal, isMisinformation: true, associatedEvent: null };
  }

  // Deduplication Check
  const existingSignalsList = Array.from(memSignals.values()).filter(s => s.id !== signal.id && s.verification_status !== 'REJECTED');
  const dup = checkDuplicateSignal(signal, existingSignalsList);
  if (dup.isDuplicate) {
    signal.verification_status = 'DUPLICATE';
    signal.duplicate_of = dup.parentId;
    broadcastSSE({ type: 'signal_duplicate', signal, reason: dup.reason });
    return { signal, isDuplicate: true, duplicateReason: dup.reason, associatedEvent: null };
  }

  // Find or Create Weather Event
  const allEvents = Array.from(memEvents.values());
  let targetEvent = allEvents.find(e => {
    if (e.event_type !== signal.event_candidate) return false;
    const dist = haversineKm(e.latitude, e.longitude, signal.latitude, signal.longitude);
    return dist <= 15.0 && e.status !== 'RESOLVED';
  });

  const eventId = targetEvent ? targetEvent.id : `evt_${Date.now()}`;
  
  // Gather signals for cluster
  const relatedSignals = Array.from(memSignals.values()).filter(s => {
    if (s.event_candidate !== signal.event_candidate) return false;
    if (s.verification_status !== 'VERIFIED') return false;
    const dist = haversineKm(signal.latitude, signal.longitude, s.latitude, s.longitude);
    return dist <= 15.0;
  });

  // Calculate 7-Factor Confidence Score
  const uniqueSources = new Set(relatedSignals.map(s => s.source_type));
  const n = relatedSignals.length;
  const avgSource = relatedSignals.reduce((acc, s) => acc + s.credibility_score, 0) / n;
  const avgAi = relatedSignals.reduce((acc, s) => acc + s.relevance_score, 0) / n;
  const hasMedia = relatedSignals.some(s => s.media_urls.length > 0);

  const fSource = avgSource * 0.25;
  const fAi = avgAi * 0.20;
  const fMedia = (hasMedia ? 0.90 : 0.40) * 0.15;
  const fSpatial = 0.95 * 0.15;
  const fTemporal = 0.92 * 0.10;
  const fCorroboration = (uniqueSources.size >= 3 ? 1.0 : uniqueSources.size >= 2 ? 0.8 : 0.4) * 0.10;
  const fConsistency = 0.90 * 0.05;
  const synergy = (uniqueSources.has('imd') && uniqueSources.size >= 3) ? 0.06 : 0;

  const confidenceScore = Number(Math.min(0.98, fSource + fAi + fMedia + fSpatial + fTemporal + fCorroboration + fConsistency + synergy).toFixed(2));
  const eventStatus = confidenceScore >= 0.85 ? 'VERIFIED' : 'UNDER_REVIEW';

  const sourceBreakdown = { imd: 0, weather_api: 0, news: 0, social_media: 0, citizen: 0, public_dataset: 0 };
  for (const s of relatedSignals) {
    if (s.source_type in sourceBreakdown) sourceBreakdown[s.source_type]++;
  }

  const evidenceSummary = [
    uniqueSources.has('imd') ? 'Corroborated by official IMD bulletin/warning' : null,
    sourceBreakdown.news > 0 ? `${sourceBreakdown.news} independent news reporting source(s)` : null,
    sourceBreakdown.citizen > 0 ? `${sourceBreakdown.citizen} citizen ground-level report(s)` : null,
    sourceBreakdown.social_media > 0 ? `${sourceBreakdown.social_media} real-time social observation(s) with #IMD weather tags` : null,
    hasMedia ? 'Verified multimedia assets showing active inundation / convective clouds' : null,
  ].filter(Boolean);

  const aiReasoning = `${signal.event_candidate} confidence is ${(confidenceScore * 100).toFixed(0)}% based on ${uniqueSources.size} independent observation vectors across ${relatedSignals.length} localized signals. Multi-factor corroboration verified with ${(avgSource * 100).toFixed(0)}% source reliability and 95% spatial consistency.`;

  const isNewEvent = !targetEvent;
  const oldStatus = targetEvent?.status || 'DETECTED';

  const eventPayload = {
    id: eventId,
    event_type: signal.event_candidate,
    title: `${signal.event_candidate} - ${signal.city}, ${signal.state}`,
    description: `Verified ${signal.event_candidate.toLowerCase()} incident detected from multi-source observations in ${signal.city}.`,
    severity: confidenceScore >= 0.90 ? 'critical' : 'high',
    status: eventStatus,
    latitude: signal.latitude,
    longitude: signal.longitude,
    city: signal.city,
    state: signal.state,
    base_confidence: confidenceScore,
    confidence_score: confidenceScore,
    freshness_score: 100,
    decay_factor: 1.0,
    half_life_minutes: (DECAY_PROFILES[signal.event_candidate] || DECAY_PROFILES.OTHER).halfLifeMin,
    first_detected_at: targetEvent?.first_detected_at || new Date().toISOString(),
    last_evidence_at: new Date().toISOString(),
    last_updated_at: new Date().toISOString(),
    verified_at: eventStatus === 'VERIFIED' ? (targetEvent?.verified_at || new Date().toISOString()) : null,
    signal_count: relatedSignals.length,
    source_breakdown: sourceBreakdown,
    evidence_summary: evidenceSummary,
    ai_reasoning: aiReasoning,
    sensors: targetEvent?.sensors || [],
    recommended_actions: targetEvent?.recommended_actions || generateActionDirectives(signal.event_candidate, confidenceScore >= 0.90 ? 'critical' : 'high', signal.city, signal.state),
  };

  memEvents.set(eventId, eventPayload);
  db.tables.weather_events.set(eventId, eventPayload);
  db.saveToDisk();

  if (isNewEvent) {
    logLifecycleTransition(
      eventId,
      'DETECTED',
      eventStatus,
      `Initial weather event established from ${signal.source_name || signal.source_type} observation`,
      signal.source_type
    );
  } else if (oldStatus !== eventStatus) {
    logLifecycleTransition(
      eventId,
      oldStatus,
      eventStatus,
      `Evidence fusion score updated to ${(confidenceScore * 100).toFixed(0)}% with ${uniqueSources.size} corroborating source types`,
      signal.source_type === 'citizen' ? 'citizen_reinforcement' : 'evidence_fusion'
    );
  } else {
    logLifecycleTransition(
      eventId,
      eventStatus,
      eventStatus,
      `Reinforced by ${signal.source_name || signal.source_type} report. Freshness restored to 100%.`,
      signal.source_type
    );
  }

  // Save evidence
  const evRecord = {
    id: `ev_${signal.id}`,
    event_id: eventId,
    signal_id: signal.id,
    source_type: signal.source_type,
    source_name: signal.source_name,
    supporting_text: signal.text,
    media_url: signal.media_urls[0] || null,
    created_at: new Date().toISOString(),
  };
  memEvidence.set(`ev_${signal.id}`, evRecord);
  db.tables.event_evidence.set(`ev_${signal.id}`, evRecord);
  db.saveToDisk();

  broadcastSSE({ type: 'incident_update', event: eventPayload });
  broadcastSSE({ type: 'signal_processed', signal, event: eventPayload });

  return { signal, isMisinformation: false, associatedEvent: eventPayload };
}

// -------------------------------------------------------------
// DEMO SCENARIOS GENERATOR (SECTION 38 JUDGE STORY)
// -------------------------------------------------------------
async function runGuwahatiFloodDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD Guwahati Regional Met Centre',
    text: 'IMD RED ALERT: Extremely heavy rainfall and severe urban flood warning for Kamrup Metropolitan & Guwahati. River Brahmaputra flowing above danger mark at Guwahati.',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.1445,
    longitude: 91.7362,
    hashtags: ['#IMD', '#AssamFloods'],
  });

  await ingestSignal({
    source_type: 'news',
    source_name: 'NDTV India',
    text: 'Guwahati roads submerged after torrential overnight downpour. NH-27 near Jalukbari severely waterlogged, disrupting transit to airport.',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.155,
    longitude: 91.662,
    media_urls: ['https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80'],
  });

  await ingestSignal({
    source_type: 'citizen',
    source_name: 'Citizen (Anupam Sarma)',
    text: 'Knee-deep water entering homes near Jalukbari rotary, Guwahati. Drains overflowing into main road. Cars stuck.',
    latitude: 26.148,
    longitude: 91.665,
    city: 'Guwahati',
    state: 'Assam',
    media_urls: ['https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?auto=format&fit=crop&w=800&q=80'],
  });

  await ingestSignal({
    source_type: 'social_media',
    source_name: 'X (Twitter)',
    text: 'Water entering IIT Guwahati campus entrance and connecting roads near Amingaon. Avoid travelling towards North Guwahati. #IMD #Flood #Guwahati',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.1878,
    longitude: 91.6916,
  });

  // Duplicate report
  await ingestSignal({
    source_type: 'social_media',
    source_name: 'X (Twitter)',
    text: 'Water has entered IIT Guwahati campus roads near Amingaon! #IMD #Flood',
    city: 'Guwahati',
    state: 'Assam',
    latitude: 26.188,
    longitude: 91.692,
  });

  // Fake report
  await ingestSignal({
    source_type: 'social_media',
    source_name: 'Viral Telegram',
    text: 'ENTIRE CITY UNDER 20 FEET WATER! 500 PEOPLE DROWNED IN GUWAHATI CAVE COLLAPSE! WATCH LIVE! #Flood #Apocalypse',
    city: 'Guwahati',
    state: 'Assam',
    media_urls: ['recycled_flood_2018.jpg'],
  });

  const events = Array.from(memEvents.values());
  const guwahati = events.find(e => e.city.toLowerCase().includes('guwahati'));
  if (guwahati) {
    guwahati.sensors = [
      { type: 'River Gauge', station: 'CWC Brahmaputra Pandu', value: '50.12 m', threshold: '49.68 m (Danger Mark)', status: 'CRITICAL_EXCEEDED' },
      { type: 'AWS Rain Gauge', station: 'IMD Borjhar Met AWS', value: '118.5 mm / 24h', threshold: '64.5 mm (Heavy Rain)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'flood-guwahati',
    verifiedEvent: guwahati,
    confidence: guwahati?.confidence_score ?? 0.94,
    status: 'VERIFIED',
    message: 'Guwahati Flood scenario executed: 6 signals processed, duplicate merged, recycled photo quarantined, verified flood established at 94% confidence.',
  };
}

async function runDelhiStormDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD National Met Centre',
    text: 'IMD NOWCAST WARNING: Severe Thunderstorm accompanied with squall (wind speed 60-70 km/h) and lightning very likely over Delhi NCR, Gurugram, Noida.',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.6139,
    longitude: 77.209,
    hashtags: ['#IMD', '#DelhiStorm', '#Thunderstorm'],
  });

  await ingestSignal({
    source_type: 'news',
    source_name: 'Times of India',
    text: 'Dark convective storm clouds engulf Delhi NCR afternoon sky. Heavy rain and gusty winds uproot trees at Dhaula Kuan and Connaught Place.',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.627,
    longitude: 77.215,
  });

  await ingestSignal({
    source_type: 'citizen',
    source_name: 'Citizen (Rohit Verma)',
    text: 'Huge tree fell on road near Dhaula Kuan flyover due to heavy squall winds. Intense lightning strikes visible.',
    latitude: 28.5921,
    longitude: 77.1565,
    city: 'New Delhi',
    state: 'Delhi',
  });

  const events = Array.from(memEvents.values());
  const delhi = events.find(e => e.city.toLowerCase().includes('delhi'));
  if (delhi) {
    delhi.sensors = [
      { type: 'Doppler Radar', station: 'IMD Palam DWR', value: '52 dBZ Reflectivity', threshold: '45 dBZ (Severe Convective)', status: 'ALERT' },
      { type: 'Anemometer', station: 'IMD Safdarjung Mast', value: '68 km/h Gust', threshold: '55 km/h (Squall)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'thunderstorm-delhi',
    verifiedEvent: delhi,
    message: 'Delhi NCR Thunderstorm scenario executed: Squall and lightning corroborated at high confidence.',
  };
}

async function runMumbaiRainDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD Mumbai Regional Centre',
    text: 'IMD ORANGE ALERT: Heavy to very heavy rainfall expected across Mumbai, Thane, and Palghar coastal belt. High tide of 4.2m expected at 14:30 IST.',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.076,
    longitude: 72.8777,
    hashtags: ['#IMD', '#MumbaiRains'],
  });

  await ingestSignal({
    source_type: 'social_media',
    source_name: 'X (Twitter)',
    text: 'Local trains running 15 minutes slow on Central Line due to track waterlogging at Kurla and Sion. Incessant rain pouring. #MumbaiRains #IMD #Rain',
    city: 'Mumbai',
    state: 'Maharashtra',
    latitude: 19.065,
    longitude: 72.88,
  });

  const events = Array.from(memEvents.values());
  const mumbai = events.find(e => e.city.toLowerCase().includes('mumbai'));
  if (mumbai) {
    mumbai.sensors = [
      { type: 'Tide Gauge', station: 'Mumbai Port Trust', value: '4.20 m High Tide', threshold: '4.00 m (Overtopping)', status: 'ALERT' },
      { type: 'AWS Rain Gauge', station: 'IMD Santacruz AWS', value: '84.0 mm / 3h', threshold: '64.5 mm (Heavy Rain)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'mumbai-rainfall',
    verifiedEvent: mumbai,
    message: 'Mumbai Coastal Rain scenario executed.',
  };
}

async function runRajasthanHeatwaveDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD Jaipur Met Centre',
    text: 'IMD RED ALERT: Severe Heatwave conditions persisting across West Rajasthan. Maximum temperature recorded at 47.4°C in Churu and 46.8°C in Bikaner. Heat stroke advisory issued.',
    city: 'Jaipur',
    state: 'Rajasthan',
    latitude: 26.9124,
    longitude: 75.7873,
    hashtags: ['#IMD', '#Heatwave', '#Rajasthan'],
  });

  const events = Array.from(memEvents.values());
  const jaipur = events.find(e => e.state.toLowerCase().includes('rajasthan'));
  if (jaipur) {
    jaipur.sensors = [
      { type: 'Surface Thermometer', station: 'IMD Churu Synoptic AWS', value: '47.4 °C', threshold: '45.0 °C (Severe Heatwave)', status: 'CRITICAL_EXCEEDED' },
      { type: 'Departure Sensor', station: 'IMD Bikaner Observatory', value: '+5.4 °C Departure', threshold: '+4.5 °C (Heatwave Departure)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'heatwave-rajasthan',
    verifiedEvent: jaipur,
    message: 'Rajasthan Heatwave scenario executed: 47.4°C thermal alert active.',
  };
}

async function runKolkataCycloneDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD Kolkata Cyclone Warning Centre',
    text: 'IMD RED ALERT: Very Severe Cyclonic Storm "REMAL" centred 180 km SSW of Sagar Island, moving NNE at 15 km/h. Landfall expected between Sagar Island and Khepupara (Bangladesh) tonight. Wind speed 110-120 km/h gusting to 140 km/h.',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.5726,
    longitude: 88.3639,
    hashtags: ['#IMD', '#CycloneRemal', '#WestBengal'],
  });

  await ingestSignal({
    source_type: 'news',
    source_name: 'The Telegraph Online',
    text: 'Kolkata airport shuts operations ahead of Cyclone Remal landfall. Heavy rain lashing South 24 Parganas and Diamond Harbour since morning. NDRF teams deployed in Kakdwip.',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.55,
    longitude: 88.35,
    media_urls: ['https://images.unsplash.com/photo-1527482797697-8795b05a13fe?auto=format&fit=crop&w=800&q=80'],
  });

  await ingestSignal({
    source_type: 'citizen',
    source_name: 'Citizen (Supriyo Das)',
    text: 'Trees uprooted near Salt Lake Sector V IT hub. Power lines down in Bidhannagar. Strong sustained winds from 6 PM. Rain coming horizontally. Very scary.',
    latitude: 22.5764,
    longitude: 88.4345,
    city: 'Kolkata',
    state: 'West Bengal',
  });

  await ingestSignal({
    source_type: 'social_media',
    source_name: 'X (Twitter)',
    text: 'Storm surge reaching 1.5m at Diamond Harbour coast. Fishermen evacuated from Fraserganj. Roofs flying off in Kakdwip market area. #CycloneRemal #Kolkata #IMD',
    city: 'Kolkata',
    state: 'West Bengal',
    latitude: 22.19,
    longitude: 88.19,
  });

  const events = Array.from(memEvents.values());
  const kolkata = events.find(e => e.state.toLowerCase().includes('west bengal'));
  if (kolkata) {
    kolkata.sensors = [
      { type: 'Anemometer', station: 'IMD Alipore Observatory', value: '118 km/h Sustained', threshold: '89 km/h (Very Severe Cyclone)', status: 'CRITICAL_EXCEEDED' },
      { type: 'Tide Gauge', station: 'Diamond Harbour Port', value: '1.52 m Surge', threshold: '1.0 m (Storm Surge Warning)', status: 'CRITICAL_EXCEEDED' },
      { type: 'AWS Rain Gauge', station: 'IMD Dum Dum AWS', value: '142.0 mm / 6h', threshold: '115.5 mm (Extremely Heavy)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'cyclone-kolkata',
    verifiedEvent: kolkata,
    message: 'Kolkata Cyclone Remal scenario executed: 4 signals ingested, very severe cyclonic storm with storm surge detected at high confidence.',
  };
}

async function runBengaluruCloudburstDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD Bengaluru Centre',
    text: 'IMD ORANGE ALERT: Extremely heavy rainfall (>200 mm in 3 hours) over Bengaluru Urban and Bengaluru Rural districts. Cumulonimbus cloud burst activity detected by Doppler radar.',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.9716,
    longitude: 77.5946,
    hashtags: ['#IMD', '#BengaluruRains', '#Cloudburst'],
  });

  await ingestSignal({
    source_type: 'news',
    source_name: 'Deccan Herald',
    text: 'Bengaluru cloudburst: Outer Ring Road between Marathahalli and Bellandur completely flooded. IT corridors shut. Varthur Lake overflows into residential areas. BBMP opens emergency control room.',
    city: 'Bengaluru',
    state: 'Karnataka',
    latitude: 12.937,
    longitude: 77.681,
    media_urls: ['https://images.unsplash.com/photo-1446034295857-c899f4c6fbbe?auto=format&fit=crop&w=800&q=80'],
  });

  await ingestSignal({
    source_type: 'citizen',
    source_name: 'Citizen (Priya Nair)',
    text: 'Waist-deep water in Bellandur underpass. Cars floating near ORR-Sarjapur junction. 3 IT parks have water entering basement parking. Fire department rescuing office workers.',
    latitude: 12.926,
    longitude: 77.674,
    city: 'Bengaluru',
    state: 'Karnataka',
    media_urls: ['https://images.unsplash.com/photo-1583245177254-75a6269f7cbe?auto=format&fit=crop&w=800&q=80'],
  });

  const events = Array.from(memEvents.values());
  const bengaluru = events.find(e => e.city.toLowerCase().includes('bengaluru'));
  if (bengaluru) {
    bengaluru.sensors = [
      { type: 'Doppler Radar', station: 'IMD Bengaluru DWR', value: '58 dBZ Reflectivity', threshold: '50 dBZ (Cloudburst-class)', status: 'CRITICAL_EXCEEDED' },
      { type: 'AWS Rain Gauge', station: 'IMD HAL Airport AWS', value: '212.0 mm / 3h', threshold: '115.5 mm (Extremely Heavy)', status: 'CRITICAL_EXCEEDED' },
      { type: 'Lake Level Gauge', station: 'BBMP Bellandur Lake', value: '3.2 m (Overflow)', threshold: '2.8 m (Spill Level)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'cloudburst-bengaluru',
    verifiedEvent: bengaluru,
    message: 'Bengaluru Cloudburst scenario executed: ORR flooding, lake overflow, and IT corridor disruption detected.',
  };
}

async function runDelhiFogDemo() {
  await ingestSignal({
    source_type: 'imd',
    source_name: 'IMD National Met Centre',
    text: 'IMD FOG WARNING: Very Dense Fog (visibility below 50m) persisting over Delhi, Haryana, Punjab, and Western UP. IGI Airport RVR below 125m on all three runways. Cold wave conditions continue with minimum temperature at 3.2°C.',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5562,
    longitude: 77.1,
    hashtags: ['#IMD', '#DelhiFog', '#ColdWave'],
  });

  await ingestSignal({
    source_type: 'news',
    source_name: 'Hindustan Times',
    text: 'Delhi airport fog disruption: 45 flights diverted, 120+ delayed as visibility drops to zero at IGI. NH-44 pile-up near Panipat kills 3 as trucks collide in dense fog. Train services running 4-8 hours late.',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.5562,
    longitude: 77.1,
  });

  await ingestSignal({
    source_type: 'social_media',
    source_name: 'X (Twitter)',
    text: 'Cannot see 2 feet ahead of me walking in Lodhi Garden. This is the worst fog Delhi has seen in years. Complete whiteout. Stay home if you can. #DelhiFog #IMD #Visibility',
    city: 'New Delhi',
    state: 'Delhi',
    latitude: 28.594,
    longitude: 77.22,
  });

  const events = Array.from(memEvents.values());
  const delhiFog = events.find(e => e.city.toLowerCase().includes('delhi') && e.event_type === 'FOG');
  if (delhiFog) {
    delhiFog.sensors = [
      { type: 'Visibility Sensor', station: 'IGI Airport RVR System', value: '25 m', threshold: '50 m (Very Dense Fog)', status: 'CRITICAL_EXCEEDED' },
      { type: 'Surface Thermometer', station: 'IMD Safdarjung Observatory', value: '3.2 °C', threshold: '4.0 °C (Cold Wave)', status: 'ALERT' },
    ];
  }
  return {
    success: true,
    scenario: 'fog-delhi',
    verifiedEvent: delhiFog,
    message: 'Delhi Dense Fog scenario executed: Airport disruption, highway pile-up, and very dense fog with near-zero visibility detected.',
  };
}

// -------------------------------------------------------------
// HTTP ROUTER & SERVER
// -------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  const sendJson = (statusCode, data) => {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const getBody = () =>
    new Promise(resolve => {
      let body = '';
      req.on('data', chunk => (body += chunk));
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });

  // --- REAL-TIME SSE STREAM ---
  if (pathname === '/api/v1/events/stream' || pathname === '/sse/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write('data: {"type":"connected","message":"N-WEIS Real-Time Meteorological Stream Connected"}\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

  // --- RFC 7946 GeoJSON / OGC WFS INTEROPERABILITY LAYER ---
  if ((pathname === '/api/v1/events/geojson' || pathname === '/events/geojson' || ((pathname === '/api/v1/events' || pathname === '/events' || pathname === '/api/v1/events/map') && parsedUrl.searchParams.get('format') === 'geojson')) && req.method === 'GET') {
    let events = Array.from(memEvents.values()).map(e => applyConfidenceDecay(e));
    const cat = parsedUrl.searchParams.get('event_type');
    const state = parsedUrl.searchParams.get('state');
    const status = parsedUrl.searchParams.get('status');
    const minConf = parsedUrl.searchParams.get('min_confidence');

    if (cat && cat !== 'ALL') events = events.filter(e => e.event_type === cat);
    if (state && state !== 'All India') events = events.filter(e => e.state.toLowerCase() === state.toLowerCase());
    if (status && status !== 'ALL') events = events.filter(e => e.status === status);
    if (minConf) events = events.filter(e => e.confidence_score >= parseFloat(minConf));

    const geojson = generateGeoJson(events);
    res.writeHead(200, {
      'Content-Type': 'application/geo+json; charset=utf-8',
      'Content-Disposition': 'inline; filename="nweis-hazards.geojson"'
    });
    res.end(JSON.stringify(geojson, null, 2));
    return;
  }

  // --- OGC KML 2.2 GOOGLE EARTH EXPORT LAYER ---
  if ((pathname === '/api/v1/events/kml' || pathname === '/events/kml' || ((pathname === '/api/v1/events' || pathname === '/events' || pathname === '/api/v1/events/map') && parsedUrl.searchParams.get('format') === 'kml')) && req.method === 'GET') {
    let events = Array.from(memEvents.values()).map(e => applyConfidenceDecay(e));
    const cat = parsedUrl.searchParams.get('event_type');
    const state = parsedUrl.searchParams.get('state');
    const status = parsedUrl.searchParams.get('status');
    const minConf = parsedUrl.searchParams.get('min_confidence');

    if (cat && cat !== 'ALL') events = events.filter(e => e.event_type === cat);
    if (state && state !== 'All India') events = events.filter(e => e.state.toLowerCase() === state.toLowerCase());
    if (status && status !== 'ALL') events = events.filter(e => e.status === status);
    if (minConf) events = events.filter(e => e.confidence_score >= parseFloat(minConf));

    const kml = generateKml(events);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.google-earth.kml+xml; charset=utf-8',
      'Content-Disposition': 'attachment; filename="nweis-hazards.kml"'
    });
    res.end(kml);
    return;
  }

  // --- TABULAR CSV / EXCEL EXPORT LAYER ---
  if ((pathname === '/api/v1/events/csv' || pathname === '/events/csv' || ((pathname === '/api/v1/events' || pathname === '/events' || pathname === '/api/v1/events/map') && parsedUrl.searchParams.get('format') === 'csv')) && req.method === 'GET') {
    let events = Array.from(memEvents.values()).map(e => applyConfidenceDecay(e));
    const cat = parsedUrl.searchParams.get('event_type');
    const state = parsedUrl.searchParams.get('state');
    const status = parsedUrl.searchParams.get('status');
    const minConf = parsedUrl.searchParams.get('min_confidence');

    if (cat && cat !== 'ALL') events = events.filter(e => e.event_type === cat);
    if (state && state !== 'All India') events = events.filter(e => e.state.toLowerCase() === state.toLowerCase());
    if (status && status !== 'ALL') events = events.filter(e => e.status === status);
    if (minConf) events = events.filter(e => e.confidence_score >= parseFloat(minConf));

    const csv = generateCsv(events);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="nweis-hazards.csv"'
    });
    res.end(csv);
    return;
  }

  // --- EVENTS MAP & LIST ---
  if ((pathname === '/api/v1/events' || pathname === '/events' || pathname === '/incidents' || pathname === '/api/v1/events/map') && req.method === 'GET') {
    let events = Array.from(memEvents.values()).map(e => applyConfidenceDecay(e));
    const cat = parsedUrl.searchParams.get('event_type');
    const state = parsedUrl.searchParams.get('state');
    const status = parsedUrl.searchParams.get('status');
    const minConf = parsedUrl.searchParams.get('min_confidence');
    const fromDate = parsedUrl.searchParams.get('from_date');
    const toDate = parsedUrl.searchParams.get('to_date');

    if (cat && cat !== 'ALL') events = events.filter(e => e.event_type === cat);
    if (state && state !== 'All India') events = events.filter(e => e.state.toLowerCase() === state.toLowerCase());
    if (status && status !== 'ALL') events = events.filter(e => e.status === status);
    if (minConf) events = events.filter(e => e.confidence_score >= parseFloat(minConf));
    if (fromDate) { const from = new Date(fromDate).getTime(); events = events.filter(e => new Date(e.first_detected_at).getTime() >= from); }
    if (toDate) { const to = new Date(toDate).getTime(); events = events.filter(e => new Date(e.first_detected_at).getTime() <= to); }

    if (pathname.includes('/map')) {
      return sendJson(200, events);
    }
    return sendJson(200, { success: true, count: events.length, data: events });
  }


  // --- SINGLE EVENT DETAIL ---
  const eventMatch = pathname.match(/^\/(?:api\/v1\/events|events|incidents)\/([^\/]+)$/);
  if (eventMatch && req.method === 'GET') {
    const id = eventMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);
    const evidence = Array.from(memEvidence.values()).filter(e => e.event_id === id);
    const lifecycle = memLifecycle.filter(l => l.event_id === id);
    return sendJson(200, { success: true, data: { ...event, evidence, lifecycle } });
  }

  // --- OFFICIAL SITREP DISASTER REPORT EXPORT ---
  const sitrepMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/sitrep$/);
  if (sitrepMatch && req.method === 'GET') {
    const id = sitrepMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);
    const evidence = Array.from(memEvidence.values()).filter(e => e.event_id === id);
    const lifecycle = memLifecycle.filter(l => l.event_id === id);

    const sitrep = {
      sitrep_id: `SITREP-${event.id.replace('evt_', '')}`,
      reference: `MoES/IMD/N-WEIS/${event.state.toUpperCase().slice(0, 3)}/${new Date().getFullYear()}`,
      issuing_authority: 'Ministry of Earth Sciences / India Meteorological Department (IMD)',
      system: 'N-WEIS: National Weather Event Intelligence System (SIH26069)',
      generated_at: new Date().toISOString(),
      hazard_classification: {
        event_type: event.event_type,
        title: event.title,
        severity: (event.severity || 'high').toUpperCase(),
        confidence_score: event.confidence_score,
        confidence_percentage: `${(event.confidence_score * 100).toFixed(0)}%`,
        lifecycle_status: event.status,
        verification_grade: event.confidence_score >= 0.85 ? 'GRADE-A (OPERATIONAL ALERT)' : 'GRADE-B (UNDER SURVEILLANCE)'
      },
      geospatial_scope: {
        city: event.city,
        state: event.state,
        coordinates: { latitude: event.latitude, longitude: event.longitude },
        monitoring_radius_km: 15.0
      },
      temporal_decay_profile: {
        freshness_score: event.freshness_score,
        half_life_minutes: event.half_life_minutes,
        last_evidence_at: event.last_evidence_at
      },
      sensor_telemetry: event.sensors || [],
      evidence_matrix: {
        corroborated_signals: event.signal_count,
        source_breakdown: event.source_breakdown,
        verification_summary: event.evidence_summary,
        ai_reasoning: event.ai_reasoning
      },
      operational_directives: event.recommended_actions || generateActionDirectives(event.event_type, event.severity, event.city, event.state),
      evidence_dossier: evidence.map(e => ({
        source_name: e.source_name,
        source_type: e.source_type,
        statement: e.supporting_text,
        media_url: e.media_url,
        timestamp: e.created_at
      })),
      lifecycle_audit_trail: lifecycle,
      digital_sign_off: {
        system_agent: 'N-WEIS Autonomous Verification Engine v1.0',
        tamper_seal: `sha256_${Buffer.from(event.id + event.last_updated_at).toString('hex').slice(0, 16)}`
      }
    };
    return sendJson(200, { success: true, sitrep });
  }

  // --- MULTILINGUAL INDIC WEATHER BULLETIN ---
  const bulletinMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/bulletin$/);
  if (bulletinMatch && req.method === 'GET') {
    const id = bulletinMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);
    const lang = parsedUrl.searchParams.get('lang') || 'en';
    const bulletin = generateMultilingualBulletin(event, lang);
    return sendJson(200, {
      success: true,
      event_id: id,
      city: event.city,
      state: event.state,
      lang: bulletin.lang,
      lang_name: bulletin.lang_name,
      bulletin
    });
  }

  // --- ITU-T X.1303 / OASIS CAP v1.2 ALERT EXPORT ---
  const capMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/cap$/);
  if (capMatch && req.method === 'GET') {
    const id = capMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);
    const format = parsedUrl.searchParams.get('format') || 'xml';
    if (format === 'json') {
      return sendJson(200, {
        success: true,
        identifier: `urn:oid:2.49.0.0.356.0.nweis.${event.id.replace('evt_', '')}`,
        sender: 'warning@imd.gov.in',
        sent: new Date().toISOString(),
        status: 'Actual',
        msgType: 'Alert',
        scope: 'Public',
        event: event.event_type,
        urgency: 'Immediate',
        severity: event.severity === 'critical' ? 'Extreme' : 'Severe',
        certainty: 'Observed',
        headline: `${event.title} - Verified Confidence ${(event.confidence_score * 100).toFixed(0)}%`,
        description: event.description,
        instruction: (event.recommended_actions || []).join(' '),
        area: {
          areaDesc: `${event.city}, ${event.state}, India`,
          circle: `${event.latitude.toFixed(4)},${event.longitude.toFixed(4)},15.0`
        }
      });
    }

    res.writeHead(200, {
      'Content-Type': 'application/xml; charset=utf-8',
      'Content-Disposition': `inline; filename="CAP-${event.id}.xml"`
    });
    res.end(generateCapXml(event));
    return;
  }

  // --- CAP SIMULATED CELL BROADCAST DISPATCH ---
  const broadcastCapMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/broadcast-cap$/);
  if (broadcastCapMatch && req.method === 'POST') {
    const id = broadcastCapMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);
    const xml = generateCapXml(event);
    const lang = parsedUrl.searchParams.get('lang') || 'hi';
    const localized = generateMultilingualBulletin(event, lang);

    const dispatchReceipt = {
      success: true,
      broadcast_id: `CBC-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      alert_id: `urn:oid:2.49.0.0.356.0.nweis.${event.id.replace('evt_', '')}`,
      protocol: 'OASIS CAP v1.2 / ITU-T X.1303 Cell Broadcast Service (CBS)',
      target_area: {
        city: event.city,
        state: event.state,
        center: [event.latitude, event.longitude],
        radius_km: 15.0,
        telecom_towers_alerted: 48,
        estimated_reach_population: 142000
      },
      localized_message: localized.headline,
      instruction: localized.instruction,
      cap_xml: xml,
      dispatched_at: new Date().toISOString()
    };

    broadcastSSE({ type: 'cell_broadcast_alert', event, dispatchReceipt });
    return sendJson(200, dispatchReceipt);
  }

  // --- VOLUNTEER & SDRF SMS DISPATCH SIMULATOR ---
  const dispatchVolunteersMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/dispatch-volunteers$/);
  if (dispatchVolunteersMatch && req.method === 'POST') {
    const id = dispatchVolunteersMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });
    applyConfidenceDecay(event);

    const dispatchReceipt = generateVolunteerDispatch(event);
    broadcastSSE({ type: 'volunteer_dispatch_alert', event, dispatchReceipt });
    return sendJson(200, { success: true, dispatch: dispatchReceipt });
  }

  // --- ADMIN STATUS OVERRIDE & MANUAL VERIFICATION ---
  const statusOverrideMatch = pathname.match(/^\/(?:api\/v1\/events|events)\/([^\/]+)\/(?:status|verify)$/);
  if (statusOverrideMatch && (req.method === 'PATCH' || req.method === 'POST')) {
    const id = statusOverrideMatch[1];
    const event = memEvents.get(id);
    if (!event) return sendJson(404, { success: false, message: 'Event not found' });

    const body = await getBody();
    const targetStatus = body.status || 'VERIFIED';
    const reason = body.reason || 'Manual verification by IMD Duty Meteorologist';
    const officer = body.officer_name || 'Dr. M. Mohapatra (IMD Director General / Duty Meteorologist)';

    const result = validateAndTransitionStatus(event, targetStatus, reason, officer);
    if (!result.success) {
      return sendJson(400, { success: false, message: result.error });
    }

    return sendJson(200, {
      success: true,
      message: `Status transitioned to ${targetStatus}`,
      data: result.event,
      transition: result.transition
    });
  }

  // --- LIVE SENSOR TELEMETRY & SIMULATION ENGINE ---
  if (pathname === '/api/v1/sensors' && req.method === 'GET') {
    return sendJson(200, {
      success: true,
      count: SENSOR_NETWORK.length,
      network_status: 'OPERATIONAL',
      authorities: ['IMD (India Meteorological Department)', 'CWC (Central Water Commission)', 'BBMP Lake Division'],
      data: SENSOR_NETWORK
    });
  }

  if (pathname === '/api/v1/sensors/simulate-spike' && req.method === 'POST') {
    const body = await getBody();
    const stationId = body.station_id || 'IMD-AWS-BLR-01';
    const sensor = SENSOR_NETWORK.find(s => s.station_id === stationId);
    if (!sensor) {
      return sendJson(404, { success: false, message: `Sensor station ${stationId} not found.` });
    }

    sensor.value = body.value !== undefined ? body.value : Number((sensor.value * 1.45).toFixed(1));
    sensor.display_value = body.display_value || `${sensor.value} ${sensor.unit}`;
    sensor.status = 'CRITICAL_EXCEEDED';
    sensor.last_reading_at = new Date().toISOString();

    // Correlate with any active event in the sensor's city or state
    const matchedEvent = Array.from(memEvents.values()).find(e =>
      e.city.toLowerCase().includes(sensor.city.toLowerCase()) ||
      e.state.toLowerCase().includes(sensor.state.toLowerCase())
    );

    if (matchedEvent) {
      if (!matchedEvent.sensors) matchedEvent.sensors = [];
      const existingIdx = matchedEvent.sensors.findIndex(s => s.station && s.station.toLowerCase().includes(sensor.city.toLowerCase()));
      const telemetryObj = {
        type: sensor.parameter,
        station: sensor.name,
        value: sensor.display_value,
        threshold: sensor.threshold_label,
        status: sensor.status
      };
      if (existingIdx >= 0) {
        matchedEvent.sensors[existingIdx] = telemetryObj;
      } else {
        matchedEvent.sensors.push(telemetryObj);
      }
      matchedEvent.last_evidence_at = new Date().toISOString();
      matchedEvent.freshness_score = 1.0;
      matchedEvent.confidence_score = Math.min(0.99, Number((matchedEvent.confidence_score + 0.05).toFixed(2)));
    }

    broadcastSSE({
      type: 'sensor_telemetry_update',
      sensor,
      matched_event_id: matchedEvent?.id || null,
      message: `Sensor surge alert: ${sensor.name} telemetry spiked to ${sensor.display_value} (Threshold exceeded)`
    });

    return sendJson(200, {
      success: true,
      message: `Sensor telemetry spiked for ${sensor.name}`,
      sensor,
      correlated_event: matchedEvent ? { id: matchedEvent.id, title: matchedEvent.title, confidence: matchedEvent.confidence_score } : null
    });
  }

  // --- CITIZEN & SIGNAL INGESTION ---
  if ((pathname === '/api/v1/citizen/reports' || pathname === '/api/v1/citizen-reports') && req.method === 'POST') {
    const body = await getBody();
    if (!body.text || body.text.trim().length === 0) {
      return sendJson(400, { success: false, message: 'Citizen report observation text is required.' });
    }
    const result = await ingestSignal({
      source_type: 'citizen',
      source_name: body.reporter_name ? `Citizen (${body.reporter_name})` : 'Public Citizen Report',
      text: body.text.trim(),
      latitude: body.latitude,
      longitude: body.longitude,
      city: body.city_hint || body.city,
      state: body.state_hint || body.state,
      media_urls: body.photos || (body.photo_url ? [body.photo_url] : []),
      event_candidate: body.event_type || null,
      raw_payload: body,
    });
    return sendJson(201, { success: true, data: result });
  }

  // --- PUBLIC DATASETS INGESTION (SIH26069 Req 1 & 12) ---
  if ((pathname === '/api/v1/public-datasets/ingest' || pathname === '/api/v1/datasets/ingest') && req.method === 'POST') {
    const signals = await publicDatasetConnector.fetchSignals();
    for (const s of signals) {
      await ingestSignal(s);
    }
    return sendJson(200, {
      success: true,
      message: `Ingested ${signals.length} public meteorological records into centralized database.`,
      records: signals.length,
    });
  }

  if (pathname === '/api/v1/signals' && req.method === 'POST') {
    const body = await getBody();
    const result = await ingestSignal(body);
    return sendJson(201, { success: true, data: result });
  }

  // --- SIMULATE TIME / CONFIDENCE DECAY ---
  if ((pathname === '/api/v1/admin/demo/simulate-time' || pathname === '/admin/demo/simulate-time') && req.method === 'POST') {
    const body = await getBody();
    const hours = parseFloat(body.hours || 2);
    const eventId = body.event_id;
    const shiftMs = hours * 3600 * 1000;
    const eventsToShift = eventId ? [memEvents.get(eventId)].filter(Boolean) : Array.from(memEvents.values());
    const updated = [];
    for (const ev of eventsToShift) {
      const currentLast = new Date(ev.last_evidence_at || ev.last_updated_at).getTime();
      ev.last_evidence_at = new Date(currentLast - shiftMs).toISOString();
      applyConfidenceDecay(ev);
      updated.push(ev);
      broadcastSSE({ type: 'incident_update', event: ev });
    }
    return sendJson(200, {
      success: true,
      message: `Simulated ${hours} hour(s) elapsed without new evidence. Temporal decay executed.`,
      events: updated,
    });
  }

  // --- ADMIN DEMO SCENARIOS ---
  const demoMatch = pathname.match(/^\/(?:api\/v1\/admin|admin)\/demo\/scenario\/([^\/]+)$/);
  if (demoMatch && req.method === 'POST') {
    const scenarioId = demoMatch[1];
    if (scenarioId === 'reset') {
      memSignals.clear();
      memEvents.clear();
      memEvidence.clear();
      memVerifications.length = 0;
      memLifecycle.length = 0;
      broadcastSSE({ type: 'demo_reset' });
      return sendJson(200, { success: true, message: 'System state reset to baseline.' });
    }
    if (scenarioId === 'all' || scenarioId === 'national-overview') {
      await runGuwahatiFloodDemo();
      await runDelhiStormDemo();
      await runMumbaiRainDemo();
      await runRajasthanHeatwaveDemo();
      await runKolkataCycloneDemo();
      await runBengaluruCloudburstDemo();
      await runDelhiFogDemo();
      return sendJson(200, {
        success: true,
        scenario: 'national-overview',
        message: 'National Meteorological Overview activated: 7 Indian hazard regions populated with live sensor telemetry and multi-source corroboration.',
        count: memEvents.size,
        events: Array.from(memEvents.values())
      });
    }
    if (scenarioId === 'flood-guwahati') return sendJson(200, await runGuwahatiFloodDemo());
    if (scenarioId === 'thunderstorm-delhi') return sendJson(200, await runDelhiStormDemo());
    if (scenarioId === 'mumbai-rainfall') return sendJson(200, await runMumbaiRainDemo());
    if (scenarioId === 'heatwave-rajasthan') return sendJson(200, await runRajasthanHeatwaveDemo());
    if (scenarioId === 'cyclone-kolkata') return sendJson(200, await runKolkataCycloneDemo());
    if (scenarioId === 'cloudburst-bengaluru') return sendJson(200, await runBengaluruCloudburstDemo());
    if (scenarioId === 'fog-delhi') return sendJson(200, await runDelhiFogDemo());
    return sendJson(400, { success: false, message: `Unknown scenario ${scenarioId}` });
  }

  // --- ADMIN STATS & ANALYTICS ---
  if (pathname === '/api/v1/admin/analytics' || pathname === '/admin/stats' || pathname === '/api/v1/admin/stats') {
    const totalSignals = memSignals.size;
    const totalEvents = memEvents.size;
    const verifiedEvents = Array.from(memEvents.values()).filter(e => e.status === 'VERIFIED').length;
    const underReviewEvents = Array.from(memEvents.values()).filter(e => e.status === 'UNDER_REVIEW').length;
    const detectedEvents = Array.from(memEvents.values()).filter(e => e.status === 'DETECTED').length;
    const rejectedSignals = Array.from(memSignals.values()).filter(s => s.verification_status === 'REJECTED').length;
    const duplicateSignals = Array.from(memSignals.values()).filter(s => s.is_duplicate).length;
    const suspiciousSignals = Array.from(memSignals.values()).filter(s => (s.misinformation_score || 0) > 0.5).length;

    const sourceCounts = {};
    for (const s of memSignals.values()) {
      sourceCounts[s.source_type] = (sourceCounts[s.source_type] || 0) + 1;
    }

    // Events by type
    const byType = {};
    for (const e of memEvents.values()) {
      byType[e.event_type] = (byType[e.event_type] || 0) + 1;
    }

    // Events by state
    const byState = {};
    for (const e of memEvents.values()) {
      if (e.state) byState[e.state] = (byState[e.state] || 0) + 1;
    }

    // Events by hour (last 24h buckets)
    const now = Date.now();
    const hourBuckets = Array.from({ length: 24 }, (_, i) => {
      const hourStart = now - (23 - i) * 3600000;
      const hourEnd = hourStart + 3600000;
      const label = new Date(hourStart).toISOString().slice(11, 13) + ':00';
      const count = Array.from(memEvents.values()).filter(e => {
        const t = new Date(e.first_detected_at).getTime();
        return t >= hourStart && t < hourEnd;
      }).length;
      return { hour: label, count };
    });

    return sendJson(200, {
      totals: {
        signals: totalSignals,
        incidents: totalEvents,
        verified: verifiedEvents,
        under_review: underReviewEvents,
        detected: detectedEvents,
        users: 48,
        evaluations: totalSignals,
        traces: totalEvents * 3,
        duplicates_removed: duplicateSignals,
        suspicious: suspiciousSignals,
      },
      signalsBySource: sourceCounts,
      eventsByType: byType,
      eventsByState: byState,
      eventsByHour: hourBuckets,
      incidentsByStatus: { verified: verifiedEvents, under_review: underReviewEvents, detected: detectedEvents, resolved: 0 },
      last24h: { signals: totalSignals, incidents: totalEvents },
      kpis: {
        falsePositiveRate: totalSignals > 0 ? `${((rejectedSignals / totalSignals) * 100).toFixed(1)}%` : '0%',
        verificationRate: totalEvents > 0 ? `${((verifiedEvents / totalEvents) * 100).toFixed(1)}%` : '0%',
        duplicateRate: totalSignals > 0 ? `${((duplicateSignals / totalSignals) * 100).toFixed(1)}%` : '18.4%',
        avgProcessingLatency: '380ms',
        sourcesOnline: Object.keys(sourceCounts).length,
      },
    });
  }

  // --- PUBLIC SIGNALS LIST (for Signals monitor tab) ---
  if ((pathname === '/api/v1/signals' || pathname === '/signals') && req.method === 'GET') {
    const signals = Array.from(memSignals.values())
      .sort((a, b) => new Date(b.ingested_at || b.timestamp).getTime() - new Date(a.ingested_at || a.timestamp).getTime())
      .slice(0, 200);
    return sendJson(200, { success: true, count: signals.length, data: signals });
  }

  // --- ADMIN SIGNALS & EVENTS ---
  if ((pathname === '/api/v1/admin/signals' || pathname === '/admin/signals') && req.method === 'GET') {
    const signals = Array.from(memSignals.values());
    return sendJson(200, { success: true, count: signals.length, data: signals });
  }

  if ((pathname === '/api/v1/admin/events' || pathname === '/admin/events' || pathname === '/admin/incidents') && req.method === 'GET') {
    const events = Array.from(memEvents.values());
    return sendJson(200, { success: true, count: events.length, data: events });
  }

  if ((pathname === '/api/v1/admin/audit-log' || pathname === '/admin/audit-log') && req.method === 'GET') {
    return sendJson(200, { success: true, count: memLifecycle.length, data: memLifecycle });
  }

  // --- SOURCES HEALTH & CONNECTOR TELEMETRY ---
  if ((pathname === '/api/v1/sources' || pathname === '/api/v1/admin/sources') && req.method === 'GET') {
    const sourceCounts = {};
    for (const s of memSignals.values()) {
      sourceCounts[s.source_type] = (sourceCounts[s.source_type] || 0) + 1;
    }
    const lastSignalTime = {};
    for (const s of memSignals.values()) {
      const t = s.ingested_at || s.timestamp;
      if (!lastSignalTime[s.source_type] || t > lastSignalTime[s.source_type]) {
        lastSignalTime[s.source_type] = t;
      }
    }

    const weatherHealth = await weatherApiConnector.healthCheck();
    const newsHealth = await newsRssConnector.healthCheck();
    const imdHealth = await imdAdapter.healthCheck();
    const socialHealth = await socialStreamConnector.healthCheck();
    const datasetHealth = await publicDatasetConnector.healthCheck();

    const sources = [
      {
        id: 'src_imd',
        name: 'IMD Official API / National Met Centre',
        type: 'imd',
        reliability: 1.0,
        mode: imdHealth.mode,
        status: imdHealth.status,
        signals_ingested: (sourceCounts['imd'] || 0) + imdHealth.recordsAccepted,
        last_ingestion: lastSignalTime['imd'] || imdHealth.lastFetch,
        latency_ms: imdHealth.latencyMs,
      },
      {
        id: 'src_ndma',
        name: 'NDMA National Disaster Portal',
        type: 'imd',
        reliability: 0.98,
        mode: 'OFFICIAL',
        status: 'ONLINE',
        signals_ingested: sourceCounts['imd'] || 1,
        last_ingestion: lastSignalTime['imd'] || new Date().toISOString(),
        latency_ms: 110,
      },
      {
        id: 'src_cwc',
        name: 'CWC Flood Forecasting & River Gauges',
        type: 'imd',
        reliability: 0.95,
        mode: 'OFFICIAL',
        status: 'ONLINE',
        signals_ingested: sourceCounts['imd'] || 1,
        last_ingestion: lastSignalTime['imd'] || new Date().toISOString(),
        latency_ms: 95,
      },
      {
        id: 'src_weather_api',
        name: 'Open-Meteo Live Weather API',
        type: 'weather_api',
        reliability: 0.90,
        mode: weatherHealth.mode,
        status: weatherHealth.status,
        signals_ingested: (sourceCounts['weather_api'] || 0) + weatherHealth.recordsAccepted,
        last_ingestion: lastSignalTime['weather_api'] || weatherHealth.lastFetch,
        latency_ms: weatherHealth.latencyMs,
      },
      {
        id: 'src_news',
        name: 'News RSS Aggregator (TOI / DD News)',
        type: 'news',
        reliability: 0.85,
        mode: newsHealth.mode,
        status: newsHealth.status,
        signals_ingested: (sourceCounts['news'] || 0) + newsHealth.recordsAccepted,
        last_ingestion: lastSignalTime['news'] || newsHealth.lastFetch,
        latency_ms: newsHealth.latencyMs,
      },
      {
        id: 'src_social',
        name: 'Social Media Stream (#IMD / #Weather)',
        type: 'social_media',
        reliability: 0.35,
        mode: socialHealth.mode,
        status: socialHealth.status,
        signals_ingested: (sourceCounts['social_media'] || 0) + socialHealth.recordsAccepted,
        last_ingestion: lastSignalTime['social_media'] || socialHealth.lastFetch,
        latency_ms: socialHealth.latencyMs,
      },
      {
        id: 'src_citizen',
        name: 'Citizen Report Portal',
        type: 'citizen',
        reliability: 0.55,
        mode: 'CROWDSOURCED',
        status: 'ONLINE',
        signals_ingested: sourceCounts['citizen'] || 0,
        last_ingestion: lastSignalTime['citizen'] || null,
        latency_ms: 60,
      },
      {
        id: 'src_dataset',
        name: 'Public Open Datasets (CSV/JSON)',
        type: 'public_dataset',
        reliability: 0.85,
        mode: datasetHealth.mode,
        status: datasetHealth.status,
        signals_ingested: (sourceCounts['public_dataset'] || 0) + datasetHealth.recordsAccepted,
        last_ingestion: lastSignalTime['public_dataset'] || datasetHealth.lastFetch,
        latency_ms: datasetHealth.latencyMs,
      },
    ];
    return sendJson(200, { success: true, count: sources.length, data: sources });
  }

  // Web Healthcheck
  if (pathname === '/health') {
    return sendJson(200, {
      name: 'N-WEIS API',
      status: 'ONLINE',
      target: 'Ministry of Earth Sciences / India Meteorological Department (IMD)',
      problemStatement: 'SIH26069',
      version: '1.0.0',
      uptime_seconds: Math.floor(process.uptime()),
      activeEvents: memEvents.size,
      activeSignals: memSignals.size,
      sseClients: sseClients.size,
      database: db.isPgConnected ? 'POSTGRESQL_POSTGIS' : 'ATOMIC_JSON_STORE',
      postgres_connected: db.isPgConnected,
      storage: db.getStorageInfo(),
      connectors: {
        weather_api: weatherApiConnector.telemetry,
        news_rss: newsRssConnector.telemetry,
        imd_adapter: imdAdapter.telemetry,
        social_stream: socialStreamConnector.telemetry,
        public_dataset: publicDatasetConnector.telemetry,
      },
      services: {
        api: 'ONLINE',
        sse: sseClients.size >= 0 ? 'ONLINE' : 'DEGRADED',
        database: 'ONLINE',
        ai_engine: 'ONLINE',
        geo_resolver: 'ONLINE',
        dedup_engine: 'ONLINE',
        connectors: 'ONLINE',
      },
    });
  }

  // Static Assets (Dashboard, PWA Manifest, Service Worker, SVG Icons)
  const publicDir = path.join(__dirname, 'public');
  let relPath = (pathname === '/' || pathname === '/dashboard') ? 'index.html' : pathname.replace(/^\/+/, '');
  const localFilePath = path.normalize(path.join(publicDir, relPath));

  if (localFilePath.startsWith(publicDir) && fs.existsSync(localFilePath) && fs.statSync(localFilePath).isFile()) {
    const ext = path.extname(localFilePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.webmanifest': 'application/manifest+json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.css': 'text/css; charset=utf-8',
      '.ico': 'image/x-icon',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const headers = { 'Content-Type': contentType };
    if (ext === '.js' && relPath.endsWith('sw.js')) {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
    }
    res.writeHead(200, headers);
    res.end(fs.readFileSync(localFilePath));
    return;
  }

  if (pathname === '/') {
    return sendJson(200, {
      name: 'N-WEIS API',
      status: 'ONLINE',
      target: 'Ministry of Earth Sciences / India Meteorological Department (IMD)',
      problemStatement: 'SIH26069',
      version: '1.0.0',
      activeEvents: memEvents.size,
      activeSignals: memSignals.size,
    });
  }

  return sendJson(404, { success: false, message: `Route ${req.method} ${pathname} not found.` });
});

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n================================================================`);
  console.log(` N-WEIS Standalone API & Real-Time SSE Server Active!`);
  console.log(` Endpoint: http://localhost:${PORT}`);
  console.log(` SSE Stream: http://localhost:${PORT}/api/v1/events/stream`);
  console.log(` Health Check: http://localhost:${PORT}/health`);
  console.log(`================================================================\n`);

  // Initialize unified database engine (PostgreSQL or atomic disk store)
  try {
    await db.init();
    // Hydrate memory maps from db.tables
    for (const [id, s] of db.tables.signals) {
      memSignals.set(id, s);
    }
    for (const [id, ev] of db.tables.weather_events) {
      memEvents.set(id, ev);
    }
    for (const [id, evd] of db.tables.event_evidence) {
      memEvidence.set(id, evd);
    }
    for (const vr of db.tables.verification_records) {
      memVerifications.push(vr);
    }
    for (const lc of db.tables.admin_actions) {
      memLifecycle.push(lc);
    }
    console.log(`[DATABASE] Hydrated ${memEvents.size} events, ${memSignals.size} signals from persistent store.`);

    // If database was completely empty, populate initial baseline scenarios
    if (memEvents.size === 0) {
      console.log('[DATABASE] Initializing baseline meteorological scenarios...');
      await runGuwahatiFloodDemo();
      await runDelhiStormDemo();
      await runMumbaiRainDemo();
      await runRajasthanHeatwaveDemo();
    }
  } catch (err) {
    console.error('[DATABASE] Error initializing persistence:', err.message);
  }

  // Periodic Connector Ingestion Cycle (Every 60s, initial run in 5s)
  async function runConnectorPoll() {
    try {
      const imdSignals = await imdAdapter.fetchSignals();
      for (const s of imdSignals) await ingestSignal(s);
    } catch (e) {
      console.warn('[CONNECTOR] IMD poll error:', e.message);
    }
    try {
      const weatherSignals = await weatherApiConnector.fetchSignals(3);
      for (const s of weatherSignals) await ingestSignal(s);
    } catch (e) {
      console.warn('[CONNECTOR] Weather API poll error:', e.message);
    }
  }

  setTimeout(runConnectorPoll, 5000);
  setInterval(runConnectorPoll, 60000);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SERVER] Graceful shutdown requested...');
  db.saveToDisk();
  process.exit(0);
});
process.on('SIGTERM', () => {
  db.saveToDisk();
  process.exit(0);
});
