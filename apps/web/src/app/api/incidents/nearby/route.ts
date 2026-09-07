import { NextResponse } from 'next/server';
import { INITIAL_WEATHER_EVENTS } from '@/lib/mockData';

export async function GET() {
  const incidents = INITIAL_WEATHER_EVENTS.map((e) => ({
    id: e.id,
    type: e.event_type.toLowerCase(),
    city: e.city,
    severity: e.severity,
    confidence: Math.round(e.confidence_score * 100),
    lat: e.latitude,
    lng: e.longitude,
    status: e.status === 'VERIFIED' ? 'alert' : 'monitor',
    created_at: e.created_at,
    updated_at: e.updated_at,
  }));

  return NextResponse.json(incidents);
}
