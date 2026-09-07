import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = (searchParams.get('search') || '').toLowerCase();
  const source = searchParams.get('source');
  const status = searchParams.get('status');

  const rawSignals = [
    {
      id: 'sig-imd-001',
      source: 'imd',
      text: 'Special Severe Weather Bulletin: Widespread torrential rainfall recorded in Kamrup Metropolitan. Brahmaputra level at 49.8m.',
      lat: 26.1445,
      lng: 91.7362,
      event_type: 'FLOOD',
      city_hint: 'Guwahati, Assam',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      raw_payload: { station: 'IMD-NER-01', discharge_cumecs: 48200, alert_code: 'RED' },
    },
    {
      id: 'sig-cit-002',
      source: 'citizen',
      text: 'Waterlogging up to 3 feet in Anil Nagar and Zoo Road. Ground floor shops flooded. Traffic completely halted.',
      lat: 26.1550,
      lng: 91.7450,
      event_type: 'FLOOD',
      city_hint: 'Guwahati, Assam',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      raw_payload: { reporter_id: 'usr-9941', verification_votes: 18, gps_accuracy_m: 4.2 },
    },
    {
      id: 'sig-dwr-003',
      source: 'weather_api',
      text: 'Doppler Radar Scan: Radial gale wind velocities > 115 km/h detected over Okha-Dwarka coastal sector.',
      lat: 22.2587,
      lng: 68.9685,
      event_type: 'STRONG_WIND',
      city_hint: 'Dwarka, Gujarat',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      raw_payload: { radar: 'DWR-Bhuj', band: 'C-band', max_reflectivity_dbz: 54 },
    },
    {
      id: 'sig-tw-004',
      source: 'social_media',
      text: 'Scorching heat today in Delhi! Thermometer outside Safdarjung metro showing 47C. Heatwave loo is terrible #DelhiHeatwave',
      lat: 28.5800,
      lng: 77.2100,
      event_type: 'HEATWAVE',
      city_hint: 'New Delhi',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
      raw_payload: { platform: 'x/twitter', handle: '@DelhiWeatherWatcher', follower_count: 8200 },
    },
    {
      id: 'sig-fake-005',
      source: 'social_media',
      text: 'URGENT: Entire bridge washed away in floods just now! Run for safety! #FloodAlert',
      lat: 22.5726,
      lng: 88.3639,
      event_type: 'FLOOD',
      city_hint: 'Kolkata, West Bengal',
      status: 'REJECTED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
      raw_payload: {
        flag: 'MISINFORMATION_QUARANTINE',
        reason: 'Recycled 2020 Cyclone Amphan video vector matched with distance 2 in perceptual hash index',
      },
    },
    {
      id: 'sig-aws-006',
      source: 'imd',
      text: 'AWS Maldevta, Dehradun recorded intense convective burst: 98mm in last 35 minutes.',
      lat: 30.3165,
      lng: 78.0322,
      event_type: 'RAINFALL',
      city_hint: 'Dehradun, Uttarakhand',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
      raw_payload: { station_id: 'AWS-UK-044', tipping_bucket_rate_mm_hr: 168 },
    },
    {
      id: 'sig-cit-007',
      source: 'citizen',
      text: 'Heavy hail falling on Amritsar GT Road! Vehicles pulling under flyovers for cover. Hailstone diameter ~ 3.5cm.',
      lat: 31.6340,
      lng: 74.8723,
      event_type: 'THUNDERSTORM',
      city_hint: 'Amritsar, Punjab',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 85 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      raw_payload: { reporter_reputation: 94.2, photo_attached: true },
    },
    {
      id: 'sig-news-008',
      source: 'news',
      text: 'Airport Authority issues low visibility advisory for Babatpur: Runway visual range below 50m due to dense radiation fog.',
      lat: 25.3176,
      lng: 82.9739,
      event_type: 'FOG',
      city_hint: 'Varanasi, Uttar Pradesh',
      status: 'VERIFIED',
      media_url: null,
      media_type: null,
      created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
      happened_at: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
      raw_payload: { agency: 'PTI', cat_iii_active: true },
    },
  ];

  let filtered = rawSignals;
  if (search) {
    filtered = filtered.filter((s) => s.text?.toLowerCase().includes(search) || s.city_hint?.toLowerCase().includes(search));
  }
  if (source) {
    filtered = filtered.filter((s) => s.source === source);
  }
  if (status) {
    filtered = filtered.filter((s) => s.status === status);
  }

  return NextResponse.json({
    data: filtered,
    total: filtered.length,
    page: 1,
    limit: 50,
  });
}
