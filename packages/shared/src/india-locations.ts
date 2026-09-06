/**
 * N-WEIS: National Weather Event Intelligence System
 * India Administrative Geography, Gazetteer & Meteorological Centers
 */

export const INDIA_MAP_CONFIG = {
  center: [20.5937, 78.9629] as [number, number],
  defaultZoom: 5,
  minZoom: 4,
  maxZoom: 18,
  bounds: [
    [6.5, 68.0], // Southwest
    [37.5, 97.5], // Northeast
  ] as [[number, number], [number, number]],
};

export interface IndianRegion {
  name: string;
  type: 'state' | 'ut';
  code: string;
  capital: string;
  lat: number;
  lng: number;
  imdSubdivision: string;
}

export const INDIAN_STATES_AND_UTS: IndianRegion[] = [
  { name: 'Andhra Pradesh', type: 'state', code: 'AP', capital: 'Amaravati', lat: 15.9129, lng: 79.74, imdSubdivision: 'Coastal Andhra Pradesh & Yanam' },
  { name: 'Arunachal Pradesh', type: 'state', code: 'AR', capital: 'Itanagar', lat: 28.218, lng: 94.7278, imdSubdivision: 'Arunachal Pradesh' },
  { name: 'Assam', type: 'state', code: 'AS', capital: 'Dispur', lat: 26.2006, lng: 92.9376, imdSubdivision: 'Assam & Meghalaya' },
  { name: 'Bihar', type: 'state', code: 'BR', capital: 'Patna', lat: 25.0961, lng: 85.3131, imdSubdivision: 'Bihar' },
  { name: 'Chhattisgarh', type: 'state', code: 'CG', capital: 'Raipur', lat: 21.2787, lng: 81.8661, imdSubdivision: 'Chhattisgarh' },
  { name: 'Goa', type: 'state', code: 'GA', capital: 'Panaji', lat: 15.2993, lng: 74.124, imdSubdivision: 'Konkan & Goa' },
  { name: 'Gujarat', type: 'state', code: 'GJ', capital: 'Gandhinagar', lat: 22.2587, lng: 71.1924, imdSubdivision: 'Gujarat Region' },
  { name: 'Haryana', type: 'state', code: 'HR', capital: 'Chandigarh', lat: 29.0588, lng: 76.0856, imdSubdivision: 'Haryana, Chandigarh & Delhi' },
  { name: 'Himachal Pradesh', type: 'state', code: 'HP', capital: 'Shimla', lat: 31.1048, lng: 77.1734, imdSubdivision: 'Himachal Pradesh' },
  { name: 'Jharkhand', type: 'state', code: 'JH', capital: 'Ranchi', lat: 23.6102, lng: 85.2799, imdSubdivision: 'Jharkhand' },
  { name: 'Karnataka', type: 'state', code: 'KA', capital: 'Bengaluru', lat: 15.3173, lng: 75.7139, imdSubdivision: 'South Interior Karnataka' },
  { name: 'Kerala', type: 'state', code: 'KL', capital: 'Thiruvananthapuram', lat: 10.8505, lng: 76.2711, imdSubdivision: 'Kerala & Mahe' },
  { name: 'Madhya Pradesh', type: 'state', code: 'MP', capital: 'Bhopal', lat: 22.9734, lng: 78.6569, imdSubdivision: 'West Madhya Pradesh' },
  { name: 'Maharashtra', type: 'state', code: 'MH', capital: 'Mumbai', lat: 19.7515, lng: 75.7139, imdSubdivision: 'Madhya Maharashtra' },
  { name: 'Manipur', type: 'state', code: 'MN', capital: 'Imphal', lat: 24.6637, lng: 93.9063, imdSubdivision: 'Nagaland, Manipur, Mizoram & Tripura' },
  { name: 'Meghalaya', type: 'state', code: 'ML', capital: 'Shillong', lat: 25.467, lng: 91.3662, imdSubdivision: 'Assam & Meghalaya' },
  { name: 'Mizoram', type: 'state', code: 'MZ', capital: 'Aizawl', lat: 23.1645, lng: 92.9376, imdSubdivision: 'Nagaland, Manipur, Mizoram & Tripura' },
  { name: 'Nagaland', type: 'state', code: 'NL', capital: 'Kohima', lat: 26.1584, lng: 94.5624, imdSubdivision: 'Nagaland, Manipur, Mizoram & Tripura' },
  { name: 'Odisha', type: 'state', code: 'OD', capital: 'Bhubaneswar', lat: 20.9517, lng: 85.0985, imdSubdivision: 'Odisha' },
  { name: 'Punjab', type: 'state', code: 'PB', capital: 'Chandigarh', lat: 31.1471, lng: 75.3412, imdSubdivision: 'Punjab' },
  { name: 'Rajasthan', type: 'state', code: 'RJ', capital: 'Jaipur', lat: 27.0238, lng: 74.2179, imdSubdivision: 'East Rajasthan' },
  { name: 'Sikkim', type: 'state', code: 'SK', capital: 'Gangtok', lat: 27.533, lng: 88.5122, imdSubdivision: 'Sub-Himalayan West Bengal & Sikkim' },
  { name: 'Tamil Nadu', type: 'state', code: 'TN', capital: 'Chennai', lat: 11.1271, lng: 78.6569, imdSubdivision: 'Tamil Nadu, Puducherry & Karaikal' },
  { name: 'Telangana', type: 'state', code: 'TS', capital: 'Hyderabad', lat: 18.1124, lng: 79.0193, imdSubdivision: 'Telangana' },
  { name: 'Tripura', type: 'state', code: 'TR', capital: 'Agartala', lat: 23.9408, lng: 91.9882, imdSubdivision: 'Nagaland, Manipur, Mizoram & Tripura' },
  { name: 'Uttar Pradesh', type: 'state', code: 'UP', capital: 'Lucknow', lat: 26.8467, lng: 80.9462, imdSubdivision: 'East Uttar Pradesh' },
  { name: 'Uttarakhand', type: 'state', code: 'UK', capital: 'Dehradun', lat: 30.0668, lng: 79.0193, imdSubdivision: 'Uttarakhand' },
  { name: 'West Bengal', type: 'state', code: 'WB', capital: 'Kolkata', lat: 22.9868, lng: 87.855, imdSubdivision: 'Gangetic West Bengal' },
  // UTs
  { name: 'Delhi', type: 'ut', code: 'DL', capital: 'New Delhi', lat: 28.7041, lng: 77.1025, imdSubdivision: 'Haryana, Chandigarh & Delhi' },
  { name: 'Jammu and Kashmir', type: 'ut', code: 'JK', capital: 'Srinagar', lat: 33.7782, lng: 76.5762, imdSubdivision: 'Jammu & Kashmir and Ladakh' },
  { name: 'Ladakh', type: 'ut', code: 'LA', capital: 'Leh', lat: 34.1526, lng: 77.5771, imdSubdivision: 'Jammu & Kashmir and Ladakh' },
  { name: 'Chandigarh', type: 'ut', code: 'CH', capital: 'Chandigarh', lat: 30.7333, lng: 76.7794, imdSubdivision: 'Haryana, Chandigarh & Delhi' },
  { name: 'Puducherry', type: 'ut', code: 'PY', capital: 'Puducherry', lat: 11.9416, lng: 79.8083, imdSubdivision: 'Tamil Nadu, Puducherry & Karaikal' },
  { name: 'Andaman and Nicobar Islands', type: 'ut', code: 'AN', capital: 'Port Blair', lat: 11.7401, lng: 92.6586, imdSubdivision: 'Andaman & Nicobar Islands' },
  { name: 'Lakshadweep', type: 'ut', code: 'LD', capital: 'Kavaratti', lat: 10.5667, lng: 72.6417, imdSubdivision: 'Lakshadweep' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', type: 'ut', code: 'DNHDD', capital: 'Daman', lat: 20.4283, lng: 72.8397, imdSubdivision: 'Gujarat Region' },
];

export interface MajorCity {
  name: string;
  state: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export const MAJOR_INDIAN_CITIES: MajorCity[] = [
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, aliases: ['gauhati', 'iit guwahati', 'jalukbari', 'dispur', 'kamrup'] },
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, aliases: ['delhi', 'ncr', 'connaught place', 'dwarka', 'noida', 'gurugram'] },
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, aliases: ['bombay', 'bandra', 'dadar', 'andheri', 'colaba', 'thane'] },
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, aliases: ['calcutta', 'howrah', 'salt lake', 'new town'] },
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, aliases: ['madras', 'tambaram', 'velachery', 'anna nagar'] },
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, aliases: ['bangalore', 'whitefield', 'koramangala', 'indiranagar', 'electronic city'] },
  { name: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, aliases: ['secunderabad', 'hitec city', 'gachibowli', 'cyberabad'] },
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, aliases: ['amdavad', 'sabarmati', 'sg highway'] },
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, aliases: ['pink city', 'vaishali nagar', 'mansarovar'] },
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, aliases: ['patliputra', 'danapur', 'kankarbagh'] },
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, aliases: ['gomti nagar', 'hazratganj', 'alambagh'] },
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, aliases: ['cuttack', 'bhubaneshwar', 'khordha'] },
  { name: 'Srinagar', state: 'Jammu and Kashmir', lat: 34.0837, lng: 74.7973, aliases: ['dal lake', 'lal chowk', 'baramulla'] },
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, aliases: ['mall road', 'kufri', 'solan'] },
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, aliases: ['mussoorie', 'rishikesh', 'haridwar'] },
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, aliases: ['jamshedpur', 'dhanbad', 'bokaro'] },
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, aliases: ['bhilai', 'durg', 'bilaspur'] },
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, aliases: ['trivandrum', 'kochi', 'cochin', 'kozhikode', 'calicut'] },
];

/**
 * Fast gazetteer matcher for text inputs
 */
export function findIndianLocationInText(text: string): { city?: string; state?: string; lat?: number; lng?: number } | null {
  const lower = text.toLowerCase();

  // 1. Check major cities and aliases
  for (const city of MAJOR_INDIAN_CITIES) {
    if (lower.includes(city.name.toLowerCase())) {
      return { city: city.name, state: city.state, lat: city.lat, lng: city.lng };
    }
    for (const alias of city.aliases) {
      if (lower.includes(alias.toLowerCase())) {
        return { city: city.name, state: city.state, lat: city.lat, lng: city.lng };
      }
    }
  }

  // 2. Check states
  for (const state of INDIAN_STATES_AND_UTS) {
    if (lower.includes(state.name.toLowerCase())) {
      return { state: state.name, lat: state.lat, lng: state.lng };
    }
  }

  return null;
}
