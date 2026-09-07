import { NextResponse } from 'next/server';

export async function GET() {
  const lifecycleEvents = [
    {
      id: 'lc-01',
      incident_id: 'evt-assam-flood-01',
      from_status: 'UNDER_REVIEW',
      to_status: 'alert',
      triggered_by: 'ai',
      changed_by: 'AtmosAI-7Factor-FusionEngine',
      reason: 'Confidence score exceeded 85% threshold (0.94 achieved) following Doppler radar and river gauge cross-check',
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    },
    {
      id: 'lc-02',
      incident_id: 'evt-gujarat-cyclone-02',
      from_status: 'monitor',
      to_status: 'alert',
      triggered_by: 'system',
      changed_by: 'IMD-Special-Storm-Warning',
      reason: 'Coastal gale gusts crossed 110 km/h anemometer reading',
      created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    },
    {
      id: 'lc-03',
      incident_id: 'evt-delhi-heatwave-03',
      from_status: 'monitor',
      to_status: 'alert',
      triggered_by: 'ai',
      changed_by: 'AtmosAI-Thermal-Synergy',
      reason: 'Departure > +4.5C for 4 consecutive hours confirmed by Safdarjung AWS',
      created_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    },
  ];

  return NextResponse.json({
    data: lifecycleEvents,
    total: lifecycleEvents.length,
    page: 1,
    limit: 50,
  });
}
