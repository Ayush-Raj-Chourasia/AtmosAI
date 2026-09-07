import { NextResponse } from 'next/server';

export async function GET() {
  const traces = [
    {
      id: 'tr-01',
      session_id: 'sess-8492-assam-flood',
      incident_id: 'evt-assam-flood-01',
      step: 'hoax_quarantine_classifier',
      input_context: { text: 'Water reached second floor in Zoo road Guwahati', image_hashes: ['d41d8cd98f00b204e9800998ecf8427e'] },
      output_result: { verdict: 'PASSED', perceptual_similarity_distance: 9, confidence: 0.98 },
      model_used: 'AtmosAI-Vision-Skeptic-v2',
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    },
    {
      id: 'tr-02',
      session_id: 'sess-8492-assam-flood',
      incident_id: 'evt-assam-flood-01',
      step: 'spatial_radar_corroborator',
      input_context: { lat: 26.1445, lng: 91.7362, radius_km: 8.5 },
      output_result: { station_id: 'IMD-AWS-Guwahati', precipitation_last_3h_mm: 142, reflectivity_dbz: 49 },
      model_used: 'AtmosAI-RadarNet-Spatial-v1',
      created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    },
    {
      id: 'tr-03',
      session_id: 'sess-8492-assam-flood',
      incident_id: 'evt-assam-flood-01',
      step: 'evidence_fusion_weighter',
      input_context: { signals_count: 24, prior_confidence: 0.88, time_decay_factor: 0.96 },
      output_result: { posterior_confidence: 0.94, alert_grade: 'CRITICAL', dispatch_oasis_cap: true },
      model_used: 'AtmosAI-7Factor-FusionEngine',
      created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
    {
      id: 'tr-04',
      session_id: 'sess-7712-dwarka-gale',
      incident_id: 'evt-gujarat-cyclone-02',
      step: 'wind_field_triangulation',
      input_context: { coastal_anemometer_gust_kmh: 130, bhuj_radar_vortex: true },
      output_result: { storm_category: 'CYCLONIC_GALE', track_confidence: 0.91 },
      model_used: 'AtmosAI-CycloneTrack-v3',
      created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  ];

  return NextResponse.json({
    data: traces,
    total: traces.length,
    page: 1,
    limit: 100,
  });
}
