import { NextResponse } from 'next/server';

export async function GET() {
  const stats = {
    totals: {
      signals: 1428,
      incidents: 84,
      users: 312,
      evaluations: 260,
      traces: 980,
    },
    signalsBySource: {
      imd: 580,
      weather_api: 340,
      citizen: 290,
      news: 140,
      social_media: 78,
    },
    incidentsByStatus: {
      verified: 52,
      active: 20,
      under_review: 8,
      resolved: 4,
    },
    last24h: {
      signals: 168,
      incidents: 12,
    },
  };

  return NextResponse.json(stats);
}
