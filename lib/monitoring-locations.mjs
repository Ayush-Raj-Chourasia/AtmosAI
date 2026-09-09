/**
 * WeatherNexus / AtmosAI Indian Meteorological Monitoring Network
 * SIH26069 — Ministry of Earth Sciences / India Meteorological Department (IMD)
 *
 * Configurable geographic monitoring locations with real coordinates.
 * These locations define the observation network for live meteorological ingestion.
 */

export const MONITORING_LOCATIONS = Object.freeze([
  {
    city: 'Guwahati',
    state: 'Assam',
    lat: 26.1445,
    lon: 91.7362,
    elevation_m: 55,
    region: 'Northeast',
    radar_station: 'DWR-Guwahati',
    is_coastal: false,
    alert_zone: 'Zone-V',
  },
  {
    city: 'New Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lon: 77.2090,
    elevation_m: 216,
    region: 'North',
    radar_station: 'DWR-Delhi-MausamBhavan',
    is_coastal: false,
    alert_zone: 'Zone-IV',
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.0760,
    lon: 72.8777,
    elevation_m: 14,
    region: 'West',
    radar_station: 'DWR-Mumbai-Colaba',
    is_coastal: true,
    alert_zone: 'Zone-III',
  },
  {
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5726,
    lon: 88.3639,
    elevation_m: 9,
    region: 'East',
    radar_station: 'DWR-Kolkata-Alipore',
    is_coastal: true,
    alert_zone: 'Zone-IV',
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lon: 80.2707,
    elevation_m: 6,
    region: 'South',
    radar_station: 'DWR-Chennai-Port',
    is_coastal: true,
    alert_zone: 'Zone-III',
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lon: 77.5946,
    elevation_m: 920,
    region: 'South',
    radar_station: 'AWS-Bengaluru-HAL',
    is_coastal: false,
    alert_zone: 'Zone-II',
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.3850,
    lon: 78.4867,
    elevation_m: 505,
    region: 'South',
    radar_station: 'DWR-Hyderabad-Begumpet',
    is_coastal: false,
    alert_zone: 'Zone-II',
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0225,
    lon: 72.5714,
    elevation_m: 53,
    region: 'West',
    radar_station: 'AWS-Ahmedabad-Airport',
    is_coastal: false,
    alert_zone: 'Zone-III',
  },
  {
    city: 'Bhubaneswar',
    state: 'Odisha',
    lat: 20.2961,
    lon: 85.8245,
    elevation_m: 45,
    region: 'East',
    radar_station: 'DWR-Bhubaneswar-Airport',
    is_coastal: true,
    alert_zone: 'Zone-III',
  },
  {
    city: 'Patna',
    state: 'Bihar',
    lat: 25.5941,
    lon: 85.1376,
    elevation_m: 53,
    region: 'East',
    radar_station: 'DWR-Patna-Airport',
    is_coastal: false,
    alert_zone: 'Zone-IV',
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9124,
    lon: 75.7873,
    elevation_m: 431,
    region: 'Northwest',
    radar_station: 'DWR-Jaipur-Airport',
    is_coastal: false,
    alert_zone: 'Zone-II',
  },
  {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lon: 80.9462,
    elevation_m: 123,
    region: 'North',
    radar_station: 'DWR-Lucknow-Amausi',
    is_coastal: false,
    alert_zone: 'Zone-III',
  },
]);

/**
 * Retrieves monitoring location metadata by city name (case-insensitive)
 */
export function getMonitoringLocation(cityName) {
  if (!cityName) return null;
  const norm = cityName.trim().toLowerCase();
  return (
    MONITORING_LOCATIONS.find(
      (loc) => loc.city.toLowerCase() === norm || norm.includes(loc.city.toLowerCase()) || loc.city.toLowerCase().includes(norm)
    ) || null
  );
}

/**
 * Returns all configured monitoring locations
 */
export function getAllMonitoringLocations() {
  return [...MONITORING_LOCATIONS];
}

/**
 * Checks whether a given lat/lon coordinate is within proximity (default 25km) of a monitoring station
 */
export function findNearestMonitoringLocation(lat, lon, maxKm = 25.0) {
  let nearest = null;
  let minDist = Infinity;

  for (const loc of MONITORING_LOCATIONS) {
    const d = calculateHaversineKm(lat, lon, loc.lat, loc.lon);
    if (d < minDist) {
      minDist = d;
      nearest = loc;
    }
  }

  return minDist <= maxKm ? { location: nearest, distance_km: parseFloat(minDist.toFixed(2)) } : null;
}

function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
