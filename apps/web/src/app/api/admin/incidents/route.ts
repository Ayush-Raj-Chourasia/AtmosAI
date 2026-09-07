import { NextResponse } from 'next/server';
import { INITIAL_WEATHER_EVENTS } from '@/lib/mockData';

export async function GET() {
  return NextResponse.json({
    success: true,
    total: INITIAL_WEATHER_EVENTS.length,
    data: INITIAL_WEATHER_EVENTS,
  });
}
