import { NextResponse } from 'next/server';
import { MOCK_ADMIN_HEALTH } from '@/lib/mockData';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    system: 'Weather Nexus Big Data Analytics Platform (Team AtmosAI)',
    timestamp: new Date().toISOString(),
    nodes: MOCK_ADMIN_HEALTH,
  });
}
