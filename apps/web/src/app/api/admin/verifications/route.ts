import { NextResponse } from 'next/server';

export async function GET() {
  const verifications = [
    {
      id: 'ver-01',
      incident_id: 'evt-assam-flood-01',
      user_id: 'usr-9041',
      type: 'confirm',
      created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      users: { id: 'usr-9041', name: 'Dr. S. K. Roy', avatar_url: null },
    },
    {
      id: 'ver-02',
      incident_id: 'evt-gujarat-cyclone-02',
      user_id: 'usr-8812',
      type: 'still_happening',
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      users: { id: 'usr-8812', name: 'Dwarka Coastal Patrol', avatar_url: null },
    },
    {
      id: 'ver-03',
      incident_id: 'evt-delhi-heatwave-03',
      user_id: 'usr-7140',
      type: 'confirm',
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      users: { id: 'usr-7140', name: 'Aakash Sharma', avatar_url: null },
    },
    {
      id: 'ver-04',
      incident_id: 'evt-mumbai-waterlog-05',
      user_id: 'usr-6210',
      type: 'confirm',
      created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      users: { id: 'usr-6210', name: 'BMC Traffic Desk', avatar_url: null },
    },
  ];

  return NextResponse.json({
    data: verifications,
    total: verifications.length,
    page: 1,
    limit: 50,
  });
}
