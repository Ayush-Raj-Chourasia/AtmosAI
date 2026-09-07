import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    totalReports: 18,
    confirmedEvents: 16,
    hoaxReports: 0,
    reputationTier: 'Verified National Observer',
  });
}
