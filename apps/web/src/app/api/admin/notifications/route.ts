import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tab = searchParams.get('tab') || 'outbox';

  if (tab === 'audit') {
    const auditData = [
      { day: new Date().toISOString().split('T')[0], incident_id: 'evt-assam-flood-01', notified_user_count: 1420 },
      { day: new Date().toISOString().split('T')[0], incident_id: 'evt-gujarat-cyclone-02', notified_user_count: 850 },
      { day: new Date().toISOString().split('T')[0], incident_id: 'evt-delhi-heatwave-03', notified_user_count: 3200 },
    ];
    return NextResponse.json({ data: auditData, total: auditData.length, page: 1, limit: 50 });
  }

  if (tab === 'states') {
    const statesData = [
      {
        user_id: 'usr-9041',
        incident_id: 'evt-assam-flood-01',
        user_place_id: 'zone-guwahati',
        last_notified_status: 'alert',
        last_notified_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      },
      {
        user_id: 'usr-8812',
        incident_id: 'evt-gujarat-cyclone-02',
        user_place_id: 'zone-dwarka',
        last_notified_status: 'alert',
        last_notified_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    ];
    return NextResponse.json({ data: statesData, total: statesData.length, page: 1, limit: 50 });
  }

  // Outbox
  const outboxData = [
    {
      id: 'out-01',
      user_id: 'usr-all-subscribers',
      incident_id: 'evt-assam-flood-01',
      user_place_id: 'zone-guwahati',
      notification_type: 'CAP_V12_EMERGENCY_BROADCAST',
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 180 * 60 * 1000).toISOString(),
    },
    {
      id: 'out-02',
      user_id: 'usr-coastal-vessels',
      incident_id: 'evt-gujarat-cyclone-02',
      user_place_id: 'zone-dwarka',
      notification_type: 'GALE_WIND_WARNING_SMS',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 240 * 60 * 1000).toISOString(),
    },
    {
      id: 'out-03',
      user_id: 'usr-delhi-residents',
      incident_id: 'evt-delhi-heatwave-03',
      user_place_id: 'zone-delhi',
      notification_type: 'MUNICIPAL_HEAT_ACTION_PLAN',
      created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 300 * 60 * 1000).toISOString(),
    },
  ];

  return NextResponse.json({
    data: outboxData,
    total: outboxData.length,
    page: 1,
    limit: 50,
  });
}
