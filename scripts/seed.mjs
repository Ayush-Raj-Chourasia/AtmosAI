#!/usr/bin/env node
/**
 * N-WEIS Database Seeding Engine (scripts/seed.mjs)
 * SIH26069 National Weather Big Data Analytics Platform
 * Populates realistic reference events, signals, sources, and sensor stations.
 */

import { db } from '../database/db.mjs';

async function main() {
  console.log('====================================================');
  console.log('🌱 N-WEIS Database Seeder (SIH26069)');
  console.log('====================================================');

  await db.init();

  const now = new Date();
  const tMinus10m = new Date(now.getTime() - 10 * 60000).toISOString();
  const tMinus25m = new Date(now.getTime() - 25 * 60000).toISOString();
  const tMinus45m = new Date(now.getTime() - 45 * 60000).toISOString();
  const tMinus2h = new Date(now.getTime() - 120 * 60000).toISOString();

  // 1. Seed Initial Events
  const eventsToSeed = [
    {
      id: 'evt_guwahati_flood_01',
      event_type: 'FLOOD',
      title: 'CRITICAL INUNDATION - Guwahati Urban Core, Assam',
      description: 'Severe urban inundation across GS Road, Zoo Road, and Anil Nagar. Brahmaputra river water level at Pandu gauge exceeded danger threshold (50.12m MSL).',
      severity: 'critical',
      status: 'VERIFIED',
      latitude: 26.1750,
      longitude: 91.7780,
      city: 'Guwahati',
      state: 'Assam',
      confidence_score: 0.94,
      base_confidence: 0.94,
      first_detected_at: tMinus45m,
      last_updated_at: tMinus10m,
      signal_count: 5,
      source_breakdown: { imd: 2, weather_api: 1, news: 1, social_media: 1, citizen: 1, public_dataset: 0 },
      evidence_summary: 'Corroborated across 5 sources: IMD Borjhar Met AWS (118.5mm), CWC Pandu Gauge (50.12m), News Dispatches, Aapda Mitra Citizen Eyewitness.',
      ai_reasoning: 'FLOOD confidence 94% validated via 7-factor fusion. Multi-source agreement index 0.95. Ground truth sensor danger threshold exceeded by 0.44m.'
    },
    {
      id: 'evt_delhi_squall_02',
      event_type: 'THUNDERSTORM',
      title: 'SEVERE CONVECTIVE SQUALL - Delhi NCR & Gurugram',
      description: 'Severe thunderstorm line accompanied by cloud-to-ground lightning squalls, peak surface gusts reaching 82 km/h, and localized tree fall on Ring Road.',
      severity: 'high',
      status: 'UNDER_REVIEW',
      latitude: 28.6139,
      longitude: 77.2090,
      city: 'New Delhi',
      state: 'Delhi',
      confidence_score: 0.89,
      base_confidence: 0.89,
      first_detected_at: tMinus25m,
      last_updated_at: tMinus10m,
      signal_count: 4,
      source_breakdown: { imd: 1, weather_api: 1, news: 1, social_media: 1, citizen: 0, public_dataset: 0 },
      evidence_summary: 'IMD Palam Doppler Radar 52 dBZ convective core, Safdarjung anemometer 82 km/h gust, Twitter #DelhiRains squall reports.',
      ai_reasoning: 'THUNDERSTORM confidence 89%. Strong convective radar reflectivity coupled with multi-station anemometer readings.'
    },
    {
      id: 'evt_mumbai_rain_03',
      event_type: 'RAINFALL',
      title: 'EXTREME RAINFALL SURGE - Mumbai Metropolitan, Maharashtra',
      description: 'Monsoon surge producing sustained heavy rainfall across Kurla, Dadar, and Hindmata. BMC stormwater pump stations active.',
      severity: 'high',
      status: 'VERIFIED',
      latitude: 19.0760,
      longitude: 72.8777,
      city: 'Mumbai',
      state: 'Maharashtra',
      confidence_score: 0.91,
      base_confidence: 0.91,
      first_detected_at: tMinus2h,
      last_updated_at: tMinus10m,
      signal_count: 6,
      source_breakdown: { imd: 2, weather_api: 1, news: 1, social_media: 2, citizen: 1, public_dataset: 0 },
      evidence_summary: 'IMD Santacruz AWS 78.4mm/3h, Western Railway speed restrictions, Citizen photos of waterlogged subway.',
      ai_reasoning: 'RAINFALL confidence 91%. Spatial corroboration verified across 6 independent sensing points in Mumbai urban basin.'
    },
    {
      id: 'evt_rajasthan_heat_04',
      event_type: 'HEATWAVE',
      title: 'SEVERE HEATWAVE ALERT - Churu & Bikaner, Rajasthan',
      description: 'Extreme thermal conditions recorded with maximum daytime temperature reaching 47.8°C (departure +5.8°C above normal). Loo conditions active.',
      severity: 'critical',
      status: 'VERIFIED',
      latitude: 28.2900,
      longitude: 74.9600,
      city: 'Churu',
      state: 'Rajasthan',
      confidence_score: 0.96,
      base_confidence: 0.96,
      first_detected_at: tMinus2h,
      last_updated_at: tMinus25m,
      signal_count: 3,
      source_breakdown: { imd: 2, weather_api: 1, news: 0, social_media: 0, citizen: 0, public_dataset: 0 },
      evidence_summary: 'Official IMD Red Alert Bulletin, Churu Surface Met Observatory 47.8°C, Open-Meteo regional reanalysis.',
      ai_reasoning: 'HEATWAVE confidence 96%. IMD Red Alert criteria fully met (>47°C recorded at official surface observatory).'
    }
  ];

  for (const ev of eventsToSeed) {
    await db.insertEvent(ev);
    console.log(`[SEED]  Event seeded: [${ev.event_type}] ${ev.title}`);
  }

  // 2. Seed Supporting Signals
  const signalsToSeed = [
    {
      source_type: 'imd',
      source_name: 'IMD National Bulletin',
      text: 'RED ALERT: Extremely heavy rainfall and flash flood risk across Kamrup Metropolitan, Assam. CWC Brahmaputra gauge in high flood stage.',
      city: 'Guwahati',
      state: 'Assam',
      latitude: 26.1750,
      longitude: 91.7780,
      event_candidate: 'FLOOD',
      credibility_score: 1.0,
      relevance_score: 0.98,
      verification_status: 'VERIFIED',
      hashtags: ['#IMD', '#AssamFloods', '#WeatherAlert']
    },
    {
      source_type: 'weather_api',
      source_name: 'IMD Borjhar Met AWS',
      text: 'Automatic Met Station at Borjhar, Guwahati: Very Heavy Rainfall recorded (118.5 mm/24h), danger mark exceeded.',
      city: 'Guwahati',
      state: 'Assam',
      latitude: 26.106,
      longitude: 91.585,
      event_candidate: 'RAINFALL',
      credibility_score: 0.95,
      relevance_score: 0.92,
      verification_status: 'VERIFIED'
    },
    {
      source_type: 'citizen',
      source_name: 'Aapda Mitra Citizen Report',
      text: 'Severe waterlogging at Zoo Road and Chandmari. Water levels knee-deep, traffic halted completely. CWC siren audible.',
      city: 'Guwahati',
      state: 'Assam',
      latitude: 26.178,
      longitude: 91.782,
      event_candidate: 'FLOOD',
      credibility_score: 0.85,
      relevance_score: 0.94,
      verification_status: 'VERIFIED',
      media_urls: ['https://storage.nweis.gov.in/evidence/ghy_zoo_rd_fl01.jpg']
    },
    {
      source_type: 'social_media',
      source_name: 'Social Stream (X/Twitter #IMD)',
      text: 'Terrifying lightning and strong winds blowing off tin roofs near Dhaula Kuan right now! #DelhiRains #IMD #storm',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.592,
      longitude: 77.161,
      event_candidate: 'THUNDERSTORM',
      credibility_score: 0.65,
      relevance_score: 0.88,
      verification_status: 'VERIFIED',
      hashtags: ['#DelhiRains', '#IMD', '#storm']
    },
    {
      source_type: 'social_media',
      source_name: 'Anonymous Viral Repost',
      text: 'BREAKING: Massive tsunami waves hitting Connaught Place Delhi right now! Evacuate immediately! #tsunami #delhi',
      city: 'New Delhi',
      state: 'Delhi',
      latitude: 28.630,
      longitude: 77.217,
      event_candidate: 'FLOOD',
      credibility_score: 0.10,
      misinformation_score: 0.95,
      relevance_score: 0.20,
      verification_status: 'REJECTED',
      hashtags: ['#tsunami', '#delhi']
    }
  ];

  for (const sig of signalsToSeed) {
    await db.insertSignal(sig);
    console.log(`[SEED]  Signal seeded: [${sig.source_type}] "${sig.text.substring(0, 50)}..."`);
  }

  // 3. Seed Verification Audit Records
  await db.insertVerification({
    target_type: 'event',
    target_id: 'evt_guwahati_flood_01',
    action: 'VERIFY',
    verified_by: 'imd_official',
    actor_id: 'duty.officer@imd.gov.in',
    reason: 'Multi-source corroboration complete: CWC gauge danger exceedance + IMD AWS 118.5mm + verified citizen reports.',
    previous_status: 'UNDER_REVIEW',
    new_status: 'VERIFIED',
    confidence_before: 0.88,
    confidence_after: 0.94
  });

  const info = db.getStorageInfo();
  console.log('====================================================');
  console.log(' Seeding Complete! Storage Summary:');
  console.log(JSON.stringify(info, null, 2));
  console.log('====================================================');
}

main().catch(err => {
  console.error('[SEED] Fatal error:', err);
  process.exit(1);
});
