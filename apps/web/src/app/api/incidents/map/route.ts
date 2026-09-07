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
    status: e.status === 'VERIFIED' ? 'alert' : e.status === 'ACTIVE' ? 'alert' : 'monitor',
    created_at: e.created_at,
    updated_at: e.updated_at,
    incident_feedback: [
      { id: 'f1', incident_id: e.id, user_id: 'u1', type: 'confirm', created_at: e.created_at },
      { id: 'f2', incident_id: e.id, user_id: 'u2', type: 'confirm', created_at: e.created_at },
    ],
  }));

  return NextResponse.json(incidents);
}
