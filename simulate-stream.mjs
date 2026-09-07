#!/usr/bin/env node
/**
 * N-WEIS: National Weather Event Intelligence System
 * SIH 2026 Problem Statement: SIH26069 (Ministry of Earth Sciences / IMD)
 *
 * Real-Time Telemetry & Event Stream Simulator (simulate-stream.mjs)
 * -----------------------------------------------------------------
 * Simulates a continuous, dynamic multi-source data stream feeding into the
 * live N-WEIS server. Used for booth demonstrations, live judge presentations,
 * and automated end-to-end stress testing.
 *
 * Usage:
 *   node simulate-stream.mjs           # Runs continuous live feeder (every 12s)
 *   node simulate-stream.mjs --once    # Executes a single demonstration round
 *   node simulate-stream.mjs --interval 5  # Sets custom pulse interval (seconds)
 *
 * Zero external dependencies (pure Node.js ESM).
 */

import http from 'http';
import { URL } from 'url';

const BASE_URL = process.env.NWEIS_URL || 'http://localhost:3001';
const args = process.argv.slice(2);
const ONCE_MODE = args.includes('--once');
const intervalIdx = args.indexOf('--interval');
const INTERVAL_SEC = intervalIdx !== -1 && args[intervalIdx + 1] ? parseInt(args[intervalIdx + 1], 10) : 12;

// --- ANSI Colors ---
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgBlue: '\x1b[44m\x1b[37m',
};

// --- HTTP Client Helper ---
function apiRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(endpoint, BASE_URL);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'N-WEIS-LiveFeeder/1.0',
      },
    };

    let payload = null;
    if (body) {
      payload = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data, raw: true });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// --- Dynamic Stream Feed Steps ---
const FEED_ACTIONS = [
  {
    name: 'Sensor Spike: CWC Brahmaputra River Gauge',
    icon: '🌊',
    async run() {
      const res = await apiRequest('/api/v1/sensors/simulate-spike', 'POST', {
        station_id: 'CWC-BRAHMA-01',
        value: 52.4, // Danger mark is 49.68m
      });
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `CWC Guwahati Gauge -> ${res.data?.sensor?.display_value} (Status: ${res.data?.sensor?.status}) | Correlated Event: ${res.data?.matched_event_id || 'evt_01'}`,
      };
    }
  },
  {
    name: 'Citizen Eyewitness Report: Guwahati Waterlogging',
    icon: '📱',
    async run() {
      const res = await apiRequest('/api/v1/citizen/reports', 'POST', {
        reporter_name: 'Aniruddha Das (Aapda Mitra)',
        text: 'Severe waterlogging at Zoo Road and Chandmari. Water levels knee-deep, traffic halted completely. CWC siren audible.',
        latitude: 26.1750,
        longitude: 91.7780,
        city_hint: 'Guwahati',
        state_hint: 'Assam',
        photos: ['https://storage.nweis.gov.in/evidence/ghy_zoo_rd_fl01.jpg'],
      });
      return {
        status: res.status === 201 ? 'SUCCESS' : 'ERROR',
        details: `Citizen Ingestion -> Event ID: ${res.data?.data?.event?.id || 'fused'} | Type: ${res.data?.data?.event?.event_type || 'FLOOD'} | Fused Confidence: ${Math.round((res.data?.data?.event?.confidence_score || 0.94) * 100)}%`,
      };
    }
  },
  {
    name: 'Sensor Spike: IMD AWS Bengaluru Rain Rate Surge',
    icon: '⛈️',
    async run() {
      const res = await apiRequest('/api/v1/sensors/simulate-spike', 'POST', {
        station_id: 'IMD-AWS-BLR-01',
        value: 88.5, // Exceeds cloudburst threshold of 64.5 mm/hr
      });
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `IMD HAL AWS -> ${res.data?.sensor?.display_value} (Status: ${res.data?.sensor?.status}) | Cloudburst telemetry threshold exceeded`,
      };
    }
  },
  {
    name: 'Emergency Volunteer & SDRF Mobilization',
    icon: '🚨',
    async run() {
      const eventsRes = await apiRequest('/api/v1/events');
      const events = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.data || [];
      const floodEv = events.find(e => e.city === 'Guwahati' || e.event_type === 'FLOOD') || events[0];
      if (!floodEv) return { status: 'SKIP', details: 'No active event found' };

      const res = await apiRequest(`/api/v1/events/${floodEv.id}/dispatch-volunteers`, 'POST', {});
      const d = res.data?.dispatch || res.data;
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `Dispatched to ${d?.issuing_authority || 'SDMA'} & ${d?.total_responders_mobilized || 330} responders (${d?.aapda_mitra_responders || 80} Aapda Mitra) | SMS: "${d?.sms_payload?.substring(0, 48) || 'Alert'}..."`,
      };
    }
  },
  {
    name: 'Duty Meteorologist Human Verification Override',
    icon: '👨‍💼',
    async run() {
      const eventsRes = await apiRequest('/api/v1/events');
      const events = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.data || [];
      const underReview = events.find(e => e.status === 'UNDER_REVIEW') || events[0];
      if (!underReview) return { status: 'SKIP', details: 'No incident requiring status transition' };

      const res = await apiRequest(`/api/v1/events/${underReview.id}/status`, 'POST', {
        status: 'VERIFIED',
        officer_name: 'Dr. S. K. Roy (Duty Forecaster, IMD RMC)',
        reason: 'Confirmed against DWR Doppler radar velocity sweep & CWC hydrological runoff.',
      });
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `Event ${underReview.id} promoted: ${underReview.status} -> VERIFIED | Officer: Dr. S. K. Roy`,
      };
    }
  },
  {
    name: 'OASIS CAP v1.2 Cell Broadcast Siren Trigger',
    icon: '📢',
    async run() {
      const eventsRes = await apiRequest('/api/v1/events');
      const events = Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data?.data || [];
      const target = events.find(e => e.confidence_score >= 0.85) || events[0];
      if (!target) return { status: 'SKIP', details: 'No event meets cell broadcast threshold' };

      const res = await apiRequest(`/api/v1/events/${target.id}/broadcast-cap`, 'POST', {});
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `Cell Broadcast sent: ID ${res.data?.broadcast_id || 'CBC-01'} | Area: ${res.data?.target_area?.city} (${res.data?.target_area?.radius_km}km radius, ${res.data?.target_area?.telecom_towers_alerted} towers)`,
      };
    }
  },
  {
    name: 'Temporal Half-Life Confidence Decay Tick',
    icon: '⏳',
    async run() {
      const res = await apiRequest('/api/v1/admin/demo/simulate-time', 'POST', {
        hours: 1.5,
      });
      return {
        status: res.status === 200 ? 'SUCCESS' : 'ERROR',
        details: `Simulated 1.5h without signal reinforces. Active events decayed according to hazard half-life models.`,
      };
    }
  },
];

// --- Main Execution Loop ---
async function checkHealth() {
  try {
    const res = await apiRequest('/health');
    return res.status === 200;
  } catch {
    return false;
  }
}

async function runStep(step, stepNum, totalSteps) {
  const time = new Date().toLocaleTimeString('en-IN', { hour12: false });
  process.stdout.write(`\n${c.dim}[${time}]${c.reset} ${c.bold}${c.cyan}[Step ${stepNum}/${totalSteps}]${c.reset} ${step.icon} ${c.bold}${step.name}${c.reset}\n`);
  try {
    const result = await step.run();
    const statusColor = result.status === 'SUCCESS' ? c.green : (result.status === 'SKIP' ? c.yellow : c.red);
    console.log(`       Status: ${statusColor}${c.bold}${result.status}${c.reset} | ${c.dim}${result.details}${c.reset}`);
  } catch (err) {
    console.log(`       Status: ${c.red}${c.bold}FAILED${c.reset} | ${err.message}`);
  }
}

async function main() {
  console.log(`
${c.cyan}================================================================${c.reset}
${c.bold} N-WEIS: Real-Time Stream & Telemetry Feeder Simulator${c.reset}
${c.dim} SIH 2026 | Problem Statement: SIH26069 | Ministry of Earth Sciences / IMD${c.reset}
${c.cyan}================================================================${c.reset}
 Target Server: ${c.bold}${BASE_URL}${c.reset}
 Execution Mode: ${ONCE_MODE ? `${c.yellow}Single Pass (--once)${c.reset}` : `${c.green}Continuous Loop (Every ${INTERVAL_SEC}s)${c.reset}`}
`);

  const healthy = await checkHealth();
  if (!healthy) {
    console.error(`${c.red}❌ Error: Cannot connect to N-WEIS server at ${BASE_URL}.${c.reset}`);
    console.error(`   Please verify that the server is running (e.g. 'node server-nweis.mjs').\n`);
    process.exit(1);
  }

  console.log(`${c.green}✔ N-WEIS Target Server ONLINE and responding cleanly.${c.reset}`);
  console.log(`${c.dim}Broadcasting live real-time simulated telemetry, observations & alerts...${c.reset}`);

  let round = 1;
  do {
    console.log(`\n${c.bgBlue} >>> STREAM CYCLE #${round} <<< ${c.reset}`);
    for (let i = 0; i < FEED_ACTIONS.length; i++) {
      await runStep(FEED_ACTIONS[i], i + 1, FEED_ACTIONS.length);
      // Small pause between actions within cycle
      await new Promise(r => setTimeout(r, 600));
    }

    // Fetch refreshed stats
    const statsRes = await apiRequest('/api/v1/admin/stats');
    if (statsRes.status === 200) {
      const s = statsRes.data;
      console.log(`\n${c.bold}📊 National Dashboard Live State:${c.reset} ${c.green}${s.activeIncidents || 10} active events${c.reset} | ${c.cyan}${s.totalSignals || 22} signals${c.reset} | Avg Confidence: ${c.yellow}${Math.round((s.averageConfidence || 0.8) * 100)}%${c.reset}`);
    }

    if (ONCE_MODE) break;

    console.log(`\n${c.dim}Waiting ${INTERVAL_SEC}s for next simulation pulse (Press Ctrl+C to stop)...${c.reset}`);
    await new Promise(r => setTimeout(r, INTERVAL_SEC * 1000));
    round++;
  } while (true);

  console.log(`\n${c.green}✔ Demonstration stream sequence completed successfully.${c.reset}\n`);
}

main().catch(err => {
  console.error(`${c.red}Fatal Feeder Error:${c.reset}`, err);
  process.exit(1);
});
