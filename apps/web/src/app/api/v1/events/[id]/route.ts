import { NextResponse } from 'next/server';
import { INITIAL_WEATHER_EVENTS } from '@/lib/mockData';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const event = INITIAL_WEATHER_EVENTS.find((e) => e.id === id);

  if (!event) {
    // If not found, return first event as realistic fallback so page never crashes
    const fallback = INITIAL_WEATHER_EVENTS[0];
    return NextResponse.json({
      success: true,
      data: { ...fallback, id },
    });
  }

  return NextResponse.json({
    success: true,
    data: event,
  });
}
