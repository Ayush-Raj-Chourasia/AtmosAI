import { NextResponse } from 'next/server';

export async function GET() {
  const defaultZones = [
    { id: 'zone-delhi', label: 'Delhi-NCR Capital Region', lat: 28.6139, lng: 77.2090, radius_m: 35000 },
    { id: 'zone-guwahati', label: 'Guwahati Brahmaputra Sector', lat: 26.1445, lng: 91.7362, radius_m: 25000 },
    { id: 'zone-mumbai', label: 'Mumbai Coastal Corridor', lat: 19.0760, lng: 72.8777, radius_m: 30000 },
    { id: 'zone-dwarka', label: 'Saurashtra Coastal Belt', lat: 22.2587, lng: 68.9685, radius_m: 40000 },
  ];

  return NextResponse.json(defaultZones);
}
