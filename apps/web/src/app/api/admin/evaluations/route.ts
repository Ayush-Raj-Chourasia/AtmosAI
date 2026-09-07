import { NextResponse } from 'next/server';

export async function GET() {
  const evaluations = [
    {
      id: 'eval-01',
      incident_id: 'evt-assam-flood-01',
      model: 'AtmosAI-MultiModal-Evaluator-v2',
      confidence_score: 0.94,
      consistency_assessment: 'HIGH_CONSISTENCY',
      recommended_action: 'ISSUE_NDMA_RED_ALERT',
      explanation: 'Ground river gauge telemetry, tipping bucket rain sensors, and 18 geotagged citizen photos align with 100% spatial consistency over Guwahati municipal basin.',
      raw_response: { precision: 0.98, recall: 0.96, f1: 0.97 },
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'eval-02',
      incident_id: 'evt-gujarat-cyclone-02',
      model: 'AtmosAI-VortexTracker-v3',
      confidence_score: 0.91,
      consistency_assessment: 'HIGH_CONSISTENCY',
      recommended_action: 'HARBOR_EVACUATION_WARNING',
      explanation: 'Radial wind gates confirmed gale force winds > 115 km/h along Saurashtra coastline with high barometric pressure drop.',
      raw_response: { precision: 0.95, recall: 0.94, f1: 0.945 },
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 'eval-03',
      incident_id: 'evt-delhi-heatwave-03',
      model: 'AtmosAI-Thermal-Synergy',
      confidence_score: 0.96,
      consistency_assessment: 'VERY_HIGH_CONSISTENCY',
      recommended_action: 'MUNICIPAL_WATER_DISPATCH',
      explanation: 'Departure of +5.8C sustained over 4 hours across 5 distinct AWS sensor stations in Delhi-NCR.',
      raw_response: { precision: 0.99, recall: 0.97, f1: 0.98 },
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
  ];

  return NextResponse.json({
    data: evaluations,
    total: evaluations.length,
    page: 1,
    limit: 50,
  });
}
