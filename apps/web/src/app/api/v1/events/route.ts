import { NextResponse } from 'next/server';
import { INITIAL_WEATHER_EVENTS } from '@/lib/mockData';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventType = searchParams.get('event_type');
  const state = searchParams.get('state');
  const status = searchParams.get('status');
  const minConfidence = parseFloat(searchParams.get('min_confidence') || '0');

  let filtered = [...INITIAL_WEATHER_EVENTS];

  if (eventType && eventType !== 'ALL') {
    filtered = filtered.filter((e) => e.event_type === eventType);
  }

  if (state && state !== 'All India') {
    filtered = filtered.filter((e) => e.state.toLowerCase() === state.toLowerCase());
  }

  if (status && status !== 'ALL') {
    filtered = filtered.filter((e) => e.status.toLowerCase() === status.toLowerCase());
  }

  if (minConfidence > 0) {
    filtered = filtered.filter((e) => e.confidence_score >= minConfidence);
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    data: filtered,
  });
}
