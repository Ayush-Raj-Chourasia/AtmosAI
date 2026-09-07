import { WeatherEventDetail } from '@/components/dashboard/EventIntelligenceDrawer';

export interface WeatherEventMock extends WeatherEventDetail {
  id: string;
  title: string;
  event_type: 'FLOOD' | 'RAINFALL' | 'HEATWAVE' | 'THUNDERSTORM' | 'FOG' | 'DUST_STORM' | 'STRONG_WIND' | 'OTHER';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'DETECTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'ACTIVE' | 'RESOLVED';
  confidence_score: number;
  latitude: number;
  longitude: number;
  city: string;
  district?: string;
  state: string;
  description: string;
  created_at: string;
  updated_at: string;
  signal_count: number;
  signals?: any[];
  evidence_matrix?: {
    factor: string;
    weight: number;
    score: number;
    contribution: string;
  }[];
  timeline?: {
    timestamp: string;
    source: string;
    action: string;
    confidenceDelta: string;
  }[];
}

export const INITIAL_WEATHER_EVENTS: WeatherEventMock[] = [
  {
    id: 'evt-assam-flood-01',
    title: 'Severe Riverine Inundation & Brahmaputra Overflow',
    event_type: 'FLOOD',
    severity: 'critical',
    status: 'VERIFIED',
    confidence_score: 0.94,
    latitude: 26.1445,
    longitude: 91.7362,
    city: 'Guwahati',
    district: 'Kamrup Metropolitan',
    state: 'Assam',
    description: 'Brahmaputra water level exceeded danger mark by 1.4m. Extensive waterlogging across Bharalu basin, Zoo Road, and Anil Nagar. Corroborated by CWC gauge data and 18 geo-tagged citizen submissions.',
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 24,
    evidence_matrix: [
      { factor: 'IMD & CWC Hydrology Station Match', weight: 0.35, score: 0.98, contribution: '+34.3%' },
      { factor: 'Doppler Radar Precipitation Corroboration', weight: 0.25, score: 0.95, contribution: '+23.7%' },
      { factor: 'Multi-Citizen Geotagged Photo Fusion', weight: 0.20, score: 0.90, contribution: '+18.0%' },
      { factor: 'Spatiotemporal Density Cluster', weight: 0.10, score: 0.92, contribution: '+9.2%' },
      { factor: 'Temporal Freshness Decay Rate', weight: 0.10, score: 0.88, contribution: '+8.8%' },
    ],
    timeline: [
      { timestamp: '42m ago', source: 'Citizen Mobile', action: 'Initial geo-tagged photo of Anil Nagar waterlogging', confidenceDelta: '32%' },
      { timestamp: '34m ago', source: 'Twitter/X #GuwahatiRains', action: '3 local media posts with matching video vectors', confidenceDelta: '+24%' },
      { timestamp: '21m ago', source: 'IMD AWS Station 42410', action: 'Recorded 142mm continuous 3-hour precipitation', confidenceDelta: '+22%' },
      { timestamp: '8m ago', source: 'CWC River Gauge', action: 'Telemetry confirmed river cresting danger threshold', confidenceDelta: '+16% (Total: 94%)' },
    ],
  },
  {
    id: 'evt-gujarat-cyclone-02',
    title: 'Severe Cyclonic Storm & Coastal Gale Gusts',
    event_type: 'STRONG_WIND',
    severity: 'critical',
    status: 'ACTIVE',
    confidence_score: 0.91,
    latitude: 22.2587,
    longitude: 68.9685,
    city: 'Dwarka',
    district: 'Devbhumi Dwarka',
    state: 'Gujarat',
    description: 'Sustained coastal winds of 95 km/h with gusts touching 130 km/h. Sea conditions phenomenally rough. Radar reflectivity shows spiral squall bands making landfall over Saurashtra coastline.',
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 31,
    evidence_matrix: [
      { factor: 'Bhuj Doppler Weather Radar Reflectivity', weight: 0.35, score: 0.96, contribution: '+33.6%' },
      { factor: 'INSAT-3DR Thermal Infrared Brightness', weight: 0.25, score: 0.94, contribution: '+23.5%' },
      { factor: 'Coastal AWS Anemometer Feeds', weight: 0.20, score: 0.92, contribution: '+18.4%' },
      { factor: 'Port Authority Special Warning', weight: 0.10, score: 0.85, contribution: '+8.5%' },
      { factor: 'Temporal Freshness', weight: 0.10, score: 0.70, contribution: '+7.0%' },
    ],
    timeline: [
      { timestamp: '75m ago', source: 'INSAT-3DR', action: 'Eye-wall cloud structure tracked approaching coast', confidenceDelta: '45%' },
      { timestamp: '48m ago', source: 'Dwarka AWS Station', action: 'Wind speeds spiked from 45 km/h to 110 km/h', confidenceDelta: '+28%' },
      { timestamp: '12m ago', source: 'Coast Guard Radar', action: 'High storm surge alerts issued for Okha and Dwarka', confidenceDelta: '+18% (Total: 91%)' },
    ],
  },
  {
    id: 'evt-delhi-heatwave-03',
    title: 'Severe Heatwave Alert (Maximum Temp 46.8°C)',
    event_type: 'HEATWAVE',
    severity: 'high',
    status: 'VERIFIED',
    confidence_score: 0.96,
    latitude: 28.6139,
    longitude: 77.2090,
    city: 'New Delhi',
    district: 'Central Delhi',
    state: 'Delhi',
    description: 'Blistering summer thermal anomaly. Safdarjung and Najafgarh stations recorded departure of +5.8°C above normal. Prolonged dry westerly winds (Loo) active across the National Capital Region.',
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 19,
    evidence_matrix: [
      { factor: 'Safdarjung & Palam AWS Sensor Triangulation', weight: 0.40, score: 0.99, contribution: '+39.6%' },
      { factor: 'MODIS Land Surface Temperature Anomaly', weight: 0.25, score: 0.95, contribution: '+23.7%' },
      { factor: 'Regional Synoptic Analysis (Westerly Loo)', weight: 0.20, score: 0.94, contribution: '+18.8%' },
      { factor: 'Citizen Thermal Sensor Network', weight: 0.15, score: 0.92, contribution: '+13.8%' },
    ],
    timeline: [
      { timestamp: '2h ago', source: 'IMD Synoptic Bulletin', action: 'Red alert issued for Northwest India plains', confidenceDelta: '60%' },
      { timestamp: '1h ago', source: 'AWS Safdarjung', action: 'Temperature crossed 45°C threshold at 13:30 IST', confidenceDelta: '+24%' },
      { timestamp: '15m ago', source: 'Delhi Health Dept', action: 'Heat emergency medical response protocol active', confidenceDelta: '+12% (Total: 96%)' },
    ],
  },
  {
    id: 'evt-uk-cloudburst-04',
    title: 'Cloudburst & Sudden Torrents in Foothills',
    event_type: 'RAINFALL',
    severity: 'critical',
    status: 'ACTIVE',
    confidence_score: 0.88,
    latitude: 30.3165,
    longitude: 78.0322,
    city: 'Dehradun',
    district: 'Dehradun',
    state: 'Uttarakhand',
    description: 'Localized convective cloudburst delivering > 115mm rainfall in 45 minutes over Sahastradhara and Maldevta valley. Debris flow and sudden surge in Song river.',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 14,
    evidence_matrix: [
      { factor: 'Doppler Radar Cloud Top Reflectivity (>52 dBZ)', weight: 0.35, score: 0.92, contribution: '+32.2%' },
      { factor: 'Local Automatic Rain Gauge Surge', weight: 0.30, score: 0.90, contribution: '+27.0%' },
      { factor: 'SDRF / Police Wireless Transmissions', weight: 0.20, score: 0.85, contribution: '+17.0%' },
      { factor: 'Citizen Emergency SOS Reports', weight: 0.15, score: 0.80, contribution: '+12.0%' },
    ],
    timeline: [
      { timestamp: '30m ago', source: 'Radar Kufri/Mukteshwar', action: 'Intense convective cell formed over Shivalik range', confidenceDelta: '40%' },
      { timestamp: '18m ago', source: 'Citizen SOS', action: 'Rapid flash flood water rushing onto Maldevta road', confidenceDelta: '+28%' },
      { timestamp: '6m ago', source: 'Uttarakhand SDRF', action: 'First responder deployment confirmed', confidenceDelta: '+20% (Total: 88%)' },
    ],
  },
  {
    id: 'evt-mumbai-waterlog-05',
    title: 'Urban Waterlogging & High Tide Confluence',
    event_type: 'FLOOD',
    severity: 'high',
    status: 'VERIFIED',
    confidence_score: 0.89,
    latitude: 19.0760,
    longitude: 72.8777,
    city: 'Mumbai',
    district: 'Mumbai Suburban',
    state: 'Maharashtra',
    description: 'Heavy continuous monsoon downpour coinciding with 4.2m Arabian Sea high tide. Water accumulation of 2.5 ft at Hindmata, Gandhi Market, and Milan Subway. Harbor line trains slowed.',
    created_at: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 27,
    evidence_matrix: [
      { factor: 'BMC Automatic Rain Gauges (110 mm/3hr)', weight: 0.35, score: 0.95, contribution: '+33.2%' },
      { factor: 'Mumbai Doppler Weather Radar (Colaba)', weight: 0.25, score: 0.92, contribution: '+23.0%' },
      { factor: 'Mumbai Police Traffic Feeds & Citizen Photos', weight: 0.25, score: 0.88, contribution: '+22.0%' },
      { factor: 'Tide Gauge Sensor Corroboration', weight: 0.15, score: 0.75, contribution: '+11.2%' },
    ],
    timeline: [
      { timestamp: '55m ago', source: 'IMD Colaba Radar', action: 'Heavy offshore cloud band moved inland', confidenceDelta: '35%' },
      { timestamp: '35m ago', source: 'BMC Flood Sensors', action: 'Water levels at Hindmata crossed yellow marker', confidenceDelta: '+30%' },
      { timestamp: '10m ago', source: 'Mumbai Traffic Police', action: 'Diversion at King Circle & subway closures verified', confidenceDelta: '+24% (Total: 89%)' },
    ],
  },
  {
    id: 'evt-kerala-landslide-06',
    title: 'High-Risk Slope Instability & Landslide Advisory',
    event_type: 'OTHER',
    severity: 'high',
    status: 'UNDER_REVIEW',
    confidence_score: 0.84,
    latitude: 11.6854,
    longitude: 76.1320,
    city: 'Wayanad',
    district: 'Wayanad',
    state: 'Kerala',
    description: 'Western Ghats slope saturation index exceeded 94% following 320 mm 48-hour cumulative rainfall. Micro-fissures reported along Meppadi tea estates.',
    created_at: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 11,
    evidence_matrix: [
      { factor: 'Geological Survey Soil Moisture Index', weight: 0.40, score: 0.88, contribution: '+35.2%' },
      { factor: 'Cumulative 48-hour Rain Gauge Telemetry', weight: 0.30, score: 0.85, contribution: '+25.5%' },
      { factor: 'Gram Panchayat Early Warning Reports', weight: 0.20, score: 0.80, contribution: '+16.0%' },
      { factor: 'Satellite SAR Interferometry', weight: 0.10, score: 0.72, contribution: '+7.2%' },
    ],
    timeline: [
      { timestamp: '1.5h ago', source: 'GSI Telemetry', action: 'Soil moisture saturation warning trigger', confidenceDelta: '45%' },
      { timestamp: '40m ago', source: 'Wayanad DDMA', action: 'Precautionary evacuation alert issued for vulnerable slopes', confidenceDelta: '+25%' },
      { timestamp: '12m ago', source: 'Local Village Council', action: 'Runoff stream turbidity change confirmed', confidenceDelta: '+14% (Total: 84%)' },
    ],
  },
  {
    id: 'evt-punjab-hailstorm-07',
    title: 'Severe Convective Hailstorm & Squall Wind',
    event_type: 'THUNDERSTORM',
    severity: 'medium',
    status: 'ACTIVE',
    confidence_score: 0.81,
    latitude: 31.6340,
    longitude: 74.8723,
    city: 'Amritsar',
    district: 'Amritsar',
    state: 'Punjab',
    description: 'Supercell thunderstorm accompanied by 3-4 cm hail and 70 km/h squall winds. Rabi crop lodging reported across Majha agricultural belt.',
    created_at: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 16,
    evidence_matrix: [
      { factor: 'Patiala Doppler Radar Vertical Reflectivity', weight: 0.35, score: 0.86, contribution: '+30.1%' },
      { factor: 'Agricultural Meteorological Stations', weight: 0.30, score: 0.82, contribution: '+24.6%' },
      { factor: 'Citizen Ground Photos of Hailstones', weight: 0.25, score: 0.80, contribution: '+20.0%' },
      { factor: 'Temporal Decay Rate', weight: 0.10, score: 0.65, contribution: '+6.5%' },
    ],
    timeline: [
      { timestamp: '65m ago', source: 'Doppler Radar', action: 'Hail signature detected aloft at 6.2 km altitude', confidenceDelta: '42%' },
      { timestamp: '30m ago', source: 'Citizen WhatsApp Bot', action: 'Photos of ground covered in hail accumulation', confidenceDelta: '+24%' },
      { timestamp: '14m ago', source: 'Amritsar AWS', action: 'Temperature dropped 8°C in 20 minutes', confidenceDelta: '+15% (Total: 81%)' },
    ],
  },
  {
    id: 'evt-up-fog-08',
    title: 'Dense Radiation Fog & Zero Visibility Alert',
    event_type: 'FOG',
    severity: 'medium',
    status: 'VERIFIED',
    confidence_score: 0.93,
    latitude: 25.3176,
    longitude: 82.9739,
    city: 'Varanasi',
    district: 'Varanasi',
    state: 'Uttar Pradesh',
    description: 'Dense winter radiation fog along Indo-Gangetic basin. Babatpur Airport Runway Visual Range (RVR) degraded to 40 meters. Highway speed restricted to 20 km/h.',
    created_at: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    signal_count: 22,
    evidence_matrix: [
      { factor: 'Airport Transmissometer / RVR Systems', weight: 0.40, score: 0.98, contribution: '+39.2%' },
      { factor: 'INSAT-3DR Night Microphysics RGB Imagery', weight: 0.30, score: 0.95, contribution: '+28.5%' },
      { factor: 'Highway Patrol Visibility Log', weight: 0.20, score: 0.90, contribution: '+18.0%' },
      { factor: 'Citizen Observational Reports', weight: 0.10, score: 0.75, contribution: '+7.5%' },
    ],
    timeline: [
      { timestamp: '2.5h ago', source: 'INSAT-3DR', action: 'Widespread fog blanket formed across eastern UP', confidenceDelta: '55%' },
      { timestamp: '1.2h ago', source: 'AAI Babatpur Met', action: 'CAT-III instrument landing protocol activated', confidenceDelta: '+25%' },
      { timestamp: '20m ago', source: 'NHAI Highway Control', action: 'Traffic slowing confirmed on Purvanchal expressway', confidenceDelta: '+13% (Total: 93%)' },
    ],
  },
];

export const MOCK_ADMIN_SIGNALS = [
  {
    id: 'sig-imd-001',
    source_type: 'imd',
    source_id: 'IMD-BULLETIN-NER-889',
    event_type: 'FLOOD',
    severity: 'critical',
    status: 'VERIFIED',
    location: 'Guwahati, Assam',
    confidence_contribution: 0.35,
    timestamp: '12m ago',
    details: 'Hydrological bulletin: Brahmaputra discharge 48,200 cumecs at Pandu port.',
  },
  {
    id: 'sig-citizen-002',
    source_type: 'citizen',
    source_id: 'CIT-APP-9941',
    event_type: 'FLOOD',
    severity: 'high',
    status: 'VERIFIED',
    location: 'Zoo Road, Guwahati, Assam',
    confidence_contribution: 0.22,
    timestamp: '18m ago',
    details: 'Geotagged image uploaded: waist-high inundation outside commercial complex.',
  },
  {
    id: 'sig-radar-003',
    source_type: 'weather_api',
    source_id: 'DWR-BHUJ-REF-14',
    event_type: 'STRONG_WIND',
    severity: 'critical',
    status: 'VERIFIED',
    location: 'Dwarka, Gujarat',
    confidence_contribution: 0.34,
    timestamp: '24m ago',
    details: 'Doppler velocity gate scan: 62 knots inbound gale wind vector.',
  },
  {
    id: 'sig-social-004',
    source_type: 'social_media',
    source_id: 'TW-IMD-DELHI-441',
    event_type: 'HEATWAVE',
    severity: 'high',
    status: 'VERIFIED',
    location: 'Safdarjung, New Delhi',
    confidence_contribution: 0.18,
    timestamp: '31m ago',
    details: 'Verified municipal handle alerting citizens to stay hydrated during 46°C peak.',
  },
  {
    id: 'sig-fake-005',
    source_type: 'social_media',
    source_id: 'TW-RECYCLED-FAKE-12',
    event_type: 'FLOOD',
    severity: 'critical',
    status: 'REJECTED',
    location: 'Kolkata, West Bengal',
    confidence_contribution: 0.00,
    timestamp: '40m ago',
    details: 'QUARANTINED: Recycled 2020 Amphan photo recirculated as current flood. Detected by EXIF & perceptual hash.',
  },
  {
    id: 'sig-aws-006',
    source_type: 'imd',
    source_id: 'AWS-DEHRADUN-091',
    event_type: 'RAINFALL',
    severity: 'critical',
    status: 'VERIFIED',
    location: 'Dehradun, Uttarakhand',
    confidence_contribution: 0.30,
    timestamp: '45m ago',
    details: 'Tipping bucket rain gauge registered 88 mm in past 30-minute sampling window.',
  },
  {
    id: 'sig-citizen-007',
    source_type: 'citizen',
    source_id: 'CIT-APP-9982',
    event_type: 'THUNDERSTORM',
    severity: 'medium',
    status: 'VERIFIED',
    location: 'Amritsar, Punjab',
    confidence_contribution: 0.20,
    timestamp: '52m ago',
    details: 'Citizen report: heavy marble-sized hail falling in Civil Lines.',
  },
  {
    id: 'sig-satellite-008',
    source_type: 'public_dataset',
    source_id: 'INSAT3DR-TIR1-419',
    event_type: 'FOG',
    severity: 'medium',
    status: 'VERIFIED',
    location: 'Varanasi, Uttar Pradesh',
    confidence_contribution: 0.28,
    timestamp: '1h ago',
    details: 'Dual-band thermal difference indicates boundary layer radiation fog cloud top &lt; 300m.',
  },
];

export const MOCK_ADMIN_TRACES = [
  {
    traceId: 'tr-fus-9021',
    event: 'Guwahati Inundation Fusion',
    timestamp: '14:28:10 IST',
    durationMs: 340,
    status: 'SUCCESS',
    steps: [
      { name: 'Ingestion & GPS Normalizer', time: '14:28:10.012', log: 'Parsed citizen signal lat/lng [26.1445, 91.7362] -> Ward 14 Kamrup' },
      { name: 'Skeptic Hoax Guard', time: '14:28:10.084', log: 'Zero image perceptual hash collision. Image freshness verified.' },
      { name: 'Spatiotemporal Clusterer', time: '14:28:10.145', log: 'Merged into existing cluster evt-assam-flood-01 within 2.4km radius.' },
      { name: '7-Factor Evidence Fusion', time: '14:28:10.290', log: 'Reinforced confidence score: 0.88 -> 0.94 (+0.06 delta).' },
      { name: 'CAP Alert Evaluator', time: '14:28:10.338', log: 'Score > 0.85: Threshold passed. OASIS CAP v1.2 alert dispatched.' },
    ],
  },
  {
    traceId: 'tr-skept-8842',
    event: 'Recycled Media Quarantine Filter',
    timestamp: '14:22:05 IST',
    durationMs: 180,
    status: 'QUARANTINED',
    steps: [
      { name: 'Ingestion Normalizer', time: '14:22:05.010', log: 'Parsed social signal claiming dam breach in Howrah.' },
      { name: 'Perceptual Hash Index Scan', time: '14:22:05.075', log: 'Hash match distance = 3 with Cyclone Amphan May 2020 archive.' },
      { name: 'Agent Skeptic Verdict', time: '14:22:05.120', log: 'Flagged: Misinformation / Recycled Disaster Media.' },
      { name: 'Quarantine Action', time: '14:22:05.178', log: 'Signal isolated. Zero weight propagated to national event feed.' },
    ],
  },
  {
    traceId: 'tr-dwr-7719',
    event: 'Dwarka Coastal Gale Corroboration',
    timestamp: '14:15:30 IST',
    durationMs: 290,
    status: 'SUCCESS',
    steps: [
      { name: 'DWR Telemetry Receiver', time: '14:15:30.015', log: 'Ingested raw HDF5 radar reflectivity slice from Bhuj station.' },
      { name: 'Feature Vector Extractor', time: '14:15:30.110', log: 'Detected spiral band pattern with radial velocity > 38 m/s.' },
      { name: 'Synergy Fusion Engine', time: '14:15:30.220', log: 'Corroborated 6 citizen reports of roof sheet damage in Dwarka.' },
      { name: 'State Machine Transition', time: '14:15:30.285', log: 'Incident transitioned: UNDER_REVIEW -> ACTIVE (Confidence: 0.91).' },
    ],
  },
];

export const MOCK_ADMIN_EVALUATIONS = {
  overallMetrics: {
    f1Score: '95.6%',
    precision: '96.4%',
    recall: '94.8%',
    falsePositiveRate: '1.8%',
    avgLatency: '285 ms',
    p95Latency: '410 ms',
  },
  categoryAccuracy: [
    { category: 'Heavy Rainfall', testSamples: 840, precision: '97.2%', recall: '96.1%', f1: '96.6%' },
    { category: 'Flooding & Inundation', testSamples: 620, precision: '95.8%', recall: '95.2%', f1: '95.5%' },
    { category: 'Heatwave', testSamples: 450, precision: '98.5%', recall: '97.4%', f1: '97.9%' },
    { category: 'Thunderstorm & Lightning', testSamples: 710, precision: '94.1%', recall: '93.5%', f1: '93.8%' },
    { category: 'Dense Fog & Low Visibility', testSamples: 530, precision: '96.9%', recall: '95.8%', f1: '96.3%' },
    { category: 'Gale & Strong Wind', testSamples: 390, precision: '95.0%', recall: '94.2%', f1: '94.6%' },
  ],
  ablationStudy: [
    { component: '7-Factor Fusion (Full Pipeline)', f1Score: '95.6%', falsePositiveRate: '1.8%' },
    { component: 'Without Doppler Radar Synergies', f1Score: '89.4%', falsePositiveRate: '4.6%' },
    { component: 'Without Skeptic Hoax Quarantine', f1Score: '86.1%', falsePositiveRate: '11.8%' },
    { component: 'Without Spatiotemporal Clustering', f1Score: '84.3%', falsePositiveRate: '7.2%' },
  ],
};

export const MOCK_ADMIN_HEALTH = [
  { name: 'Universal Ingestion Gateway', status: 'HEALTHY', latency: '24ms', uptime: '99.99%', load: '48 req/s' },
  { name: 'IMD AWS & Radar Data Ingress', status: 'HEALTHY', latency: '42ms', uptime: '99.98%', load: '12 feeds/min' },
  { name: 'Agent Skeptic (Misinformation Guard)', status: 'HEALTHY', latency: '85ms', uptime: '99.95%', load: '22 ops/s' },
  { name: 'Spatiotemporal Deduplication Engine', status: 'HEALTHY', latency: '38ms', uptime: '100.00%', load: '65 ops/s' },
  { name: '7-Factor Evidence Fusion Worker', status: 'HEALTHY', latency: '52ms', uptime: '99.99%', load: '34 ops/s' },
  { name: 'Monotonic Confidence Decay Scheduler', status: 'HEALTHY', latency: '15ms', uptime: '100.00%', load: 'Every 60s' },
  { name: 'National GIS Leaflet Tile Gateway', status: 'HEALTHY', latency: '18ms', uptime: '99.99%', load: '180 req/s' },
  { name: 'SSE Real-time Broadcast Bus', status: 'HEALTHY', latency: '8ms', uptime: '99.97%', load: '312 clients' },
];

export const DEMO_SCENARIOS = [
  {
    id: 'scen-assam',
    name: 'Guwahati Urban Flood',
    tag: '94% Verified',
    description: 'Brahmaputra basin overflow, 142mm rainfall, 24 multi-source signals',
    eventType: 'FLOOD',
    color: 'border-cyan-500 text-cyan-400 bg-cyan-500/10',
  },
  {
    id: 'scen-dwarka',
    name: 'Dwarka Coastal Gale',
    tag: '91% Active',
    description: 'Saurashtra squall band, 130 km/h gusts, Doppler radar corroborated',
    eventType: 'STRONG_WIND',
    color: 'border-purple-500 text-purple-400 bg-purple-500/10',
  },
  {
    id: 'scen-delhi',
    name: 'Delhi-NCR Heatwave',
    tag: '96% Verified',
    description: '46.8°C thermal anomaly, dry westerly Loo, Safdarjung AWS confirmed',
    eventType: 'HEATWAVE',
    color: 'border-rose-500 text-rose-400 bg-rose-500/10',
  },
  {
    id: 'scen-dehradun',
    name: 'Dehradun Cloudburst',
    tag: '88% Flash Flood',
    description: 'Localized mountain torrent, 115mm/45min downpour, Song river surge',
    eventType: 'RAINFALL',
    color: 'border-blue-500 text-blue-400 bg-blue-500/10',
  },
];
