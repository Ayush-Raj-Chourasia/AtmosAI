import { Injectable, Logger } from '@nestjs/common';
import {
  INDIA_MAP_CONFIG,
  MAJOR_INDIAN_CITIES,
  INDIAN_STATES_AND_UTS,
  findIndianLocationInText,
} from '@n-weis/shared';

export interface GeolocationResolution {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  country: string;
  confidence: number;
  method: 'native_gps' | 'exif_gps' | 'metadata' | 'gazetteer' | 'geo_reasoning' | 'geocoder' | 'manual';
  explanation: string;
}

@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  /**
   * Validates if a coordinate pair falls within India's territorial bounding box
   */
  isWithinIndia(lat: number, lng: number): boolean {
    const [[minLat, minLng], [maxLat, maxLng]] = INDIA_MAP_CONFIG.bounds;
    return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
  }

  /**
   * Hierarchical Multi-Tier Location Resolution
   */
  resolveLocation(
    rawText: string,
    providedLat?: number | null,
    providedLng?: number | null,
    cityHint?: string | null,
    stateHint?: string | null
  ): GeolocationResolution {
    // TIER 1: Native Verified GPS
    if (
      providedLat !== undefined &&
      providedLat !== null &&
      providedLng !== undefined &&
      providedLng !== null &&
      !isNaN(providedLat) &&
      !isNaN(providedLng)
    ) {
      if (this.isWithinIndia(providedLat, providedLng)) {
        // Reverse match closest city if hint not provided
        const closest = this.findClosestCity(providedLat, providedLng);
        return {
          latitude: providedLat,
          longitude: providedLng,
          city: cityHint || closest?.name || 'Local Coordinate',
          state: stateHint || closest?.state || 'India',
          country: 'India',
          confidence: 0.98,
          method: 'native_gps',
          explanation: `High precision GPS coordinate [${providedLat.toFixed(4)}, ${providedLng.toFixed(4)}] verified inside India.`,
        };
      } else {
        this.logger.warn(`Provided coordinate [${providedLat}, ${providedLng}] outside India territory.`);
      }
    }

    // TIER 2: City / State Metadata Hints
    if (cityHint) {
      const match = MAJOR_INDIAN_CITIES.find(c => c.name.toLowerCase() === cityHint.toLowerCase());
      if (match) {
        return {
          latitude: match.lat,
          longitude: match.lng,
          city: match.name,
          state: match.state,
          country: 'India',
          confidence: 0.88,
          method: 'metadata',
          explanation: `Resolved from verified reporting city hint: ${match.name}, ${match.state}.`,
        };
      }
    }

    // TIER 3: Geo-Knowledge Reasoning (Clean-room contextual pattern matching)
    // Examples: "near IIT Guwahati", "Jalukbari flyover", "Connaught Place", "Bandra Kurla Complex"
    const geoReasoning = this.reasonLocationFromText(rawText);
    if (geoReasoning) {
      return geoReasoning;
    }

    // TIER 4: Gazetteer NER Lookup across Indian Cities and States
    const gazetteer = findIndianLocationInText(rawText);
    if (gazetteer && gazetteer.lat && gazetteer.lng) {
      return {
        latitude: gazetteer.lat,
        longitude: gazetteer.lng,
        city: gazetteer.city || null,
        state: gazetteer.state || 'India',
        country: 'India',
        confidence: gazetteer.city ? 0.80 : 0.60,
        method: 'gazetteer',
        explanation: `Extracted geographic entity via India meteorological gazetteer: ${gazetteer.city || gazetteer.state}.`,
      };
    }

    // TIER 5: Fallback to National Meteorological Center (New Delhi)
    return {
      latitude: 28.6139,
      longitude: 77.209,
      city: 'New Delhi',
      state: 'Delhi',
      country: 'India',
      confidence: 0.20,
      method: 'geocoder',
      explanation: 'No precise geographic anchor found; default national observation center applied.',
    };
  }

  /**
   * Independent clean-room implementation of landmark & topological reasoning
   */
  private reasonLocationFromText(text: string): GeolocationResolution | null {
    const lower = text.toLowerCase();

    // Specific landmark patterns
    const landmarks = [
      { pattern: /iit\s+guwahati|jalukbari|brahmaputra\s+bank|dispur/i, city: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, landmark: 'IIT Guwahati / Jalukbari' },
      { pattern: /connaught\s+place|minto\s+bridge|dwarka\s+underpass|dhaula\s+kuan/i, city: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.209, landmark: 'Central Delhi' },
      { pattern: /milan\s+subway|hindmata|mithi\s+river|marine\s+drive/i, city: 'Mumbai', state: 'Maharashtra', lat: 19.076, lng: 72.8777, landmark: 'Mumbai Central / Milan Subway' },
      { pattern: /salt\s+lake|howrah\s+bridge|park\s+street/i, city: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, landmark: 'Kolkata Metropolitan Area' },
      { pattern: /koramangala|silk\s+board|bellandur\s+lake|hebbal\s+flyover/i, city: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, landmark: 'Bengaluru Urban' },
      { pattern: /hitec\s+city|hussain\s+sagar|charminar/i, city: 'Hyderabad', state: 'Telangana', lat: 17.385, lng: 78.4867, landmark: 'Hyderabad Deccan' },
    ];

    for (const lm of landmarks) {
      if (lm.pattern.test(lower)) {
        return {
          latitude: lm.lat,
          longitude: lm.lng,
          city: lm.city,
          state: lm.state,
          country: 'India',
          confidence: 0.90,
          method: 'geo_reasoning',
          explanation: `Contextual landmark identified: ${lm.landmark} in ${lm.city}, ${lm.state}.`,
        };
      }
    }

    return null;
  }

  private findClosestCity(lat: number, lng: number) {
    let closest = MAJOR_INDIAN_CITIES[0];
    let minDistance = Infinity;

    for (const city of MAJOR_INDIAN_CITIES) {
      const d = Math.hypot(city.lat - lat, city.lng - lng);
      if (d < minDistance) {
        minDistance = d;
        closest = city;
      }
    }

    return minDistance < 1.0 ? closest : null;
  }
}
