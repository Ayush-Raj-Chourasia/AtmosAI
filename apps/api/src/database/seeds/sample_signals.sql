-- Sample Signals Data

-- 1. Social Media (TikTok) - Flood in Jakarta
INSERT INTO signals (
  source, 
  raw_payload,
  text, 
  lat, 
  lng, 
  city_hint, 
  event_type, 
  status, 
  media_url, 
  media_type, 
  created_at, 
  happened_at
) VALUES (
  'social_media',
  '{"source_id": "tiktok_sample_001", "platform": "tiktok"}',
  'Severe flooding in South Jakarta today! Water has entered house knee-deep. #flooding #jakarta',
  -6.2615,
  106.8106,
  'Jakarta Selatan',
  'flood',
  'pending',
  'https://placehold.co/600x400/0077be/ffffff?text=Jakarta+Flood+Video',
  'video',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

-- 2. News (RSS) - Earthquake in Yogyakarta
INSERT INTO signals (
  source,
  raw_payload,
  text,
  lat,
  lng,
  city_hint,
  event_type,
  status,
  media_url,
  media_type,
  created_at,
  happened_at
) VALUES (
  'news',
  '{"source_id": "rss_sample_001", "feed": "BMKG"}',
  'Breaking: M 5.2 Earthquake shakes Yogyakarta, felt up to Bantul. BMKG advises residents to stay calm.',
  -7.7956,
  110.3695,
  'Yogyakarta',
  'earthquake',
  'pending',
  'https://placehold.co/600x400/aa0000/ffffff?text=Yogyakarta+Earthquake+News',
  'image',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
);

-- 3. User Report - Fire in Surabaya
INSERT INTO signals (
  source,
  raw_payload,
  text,
  lat,
  lng,
  city_hint,
  event_type,
  status,
  media_url,
  media_type,
  created_at,
  happened_at
) VALUES (
  'user_report',
  '{"source_id": "user_report_sample_001"}',
  'Fire at shophouse near Tunjungan Plaza. Fire growing, firefighters not here yet!',
  -7.2629,
  112.7414,
  'Surabaya',
  'fire',
  'pending',
  'https://placehold.co/600x400/ff4500/ffffff?text=Surabaya+Fire+Photo',
  'image',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
);

-- 4. Social Media (TikTok) - Landslide in Bogor (Additional Context)
INSERT INTO signals (
  source,
  raw_payload,
  text,
  lat,
  lng,
  city_hint,
  event_type,
  status,
  media_url,
  media_type,
  created_at,
  happened_at
) VALUES (
  'social_media',
  '{"source_id": "tiktok_sample_002", "platform": "tiktok"}',
  'Landslide at Puncak Bogor route, be careful! Road completely blocked.',
  -6.65,
  106.90,
  'Bogor',
  'landslide',
  'pending',
  'https://placehold.co/600x400/8b4513/ffffff?text=Puncak+Landslide',
  'video',
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes'
);
