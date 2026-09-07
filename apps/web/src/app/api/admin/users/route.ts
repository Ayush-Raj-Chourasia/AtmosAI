import { NextResponse } from 'next/server';

export async function GET() {
  const users = [
    {
      id: 'usr-01',
      name: 'Dr. S. K. Roy',
      email: 'sk.roy@imd.gov.in',
      trust_score: 99,
      auth_provider: 'gov_portal',
      created_at: new Date(Date.now() - 365 * 24 * 3600 * 1000).toISOString(),
      user_places: [{ id: 'p1', label: 'Guwahati Regional Met Center' }],
    },
    {
      id: 'usr-02',
      name: 'P. Nair',
      email: 'p.nair@kerala.sdma.gov.in',
      trust_score: 98,
      auth_provider: 'google',
      created_at: new Date(Date.now() - 240 * 24 * 3600 * 1000).toISOString(),
      user_places: [{ id: 'p2', label: 'Wayanad Control Room' }],
    },
    {
      id: 'usr-03',
      name: 'Aakash Sharma',
      email: 'aakash.delhi.met@gmail.com',
      trust_score: 94,
      auth_provider: 'google',
      created_at: new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString(),
      user_places: [{ id: 'p3', label: 'Safdarjung Observation Ward' }],
    },
    {
      id: 'usr-04',
      name: 'Meenakshi Sundaram',
      email: 'meenakshi.s@chennai.edu.in',
      trust_score: 91,
      auth_provider: 'google',
      created_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
      user_places: [{ id: 'p4', label: 'Coromandel Coastal Sector' }],
    },
  ];

  return NextResponse.json({
    data: users,
    total: users.length,
    page: 1,
    limit: 50,
  });
}
