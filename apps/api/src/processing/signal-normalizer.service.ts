import { Injectable, Logger } from '@nestjs/common';
import { Signal, SignalInsert, SourceType } from '@n-weis/shared';
import { GeolocationService } from './geolocation.service';

export interface RawSignalInput {
  source_id?: string;
  source_type: SourceType;
  source_name?: string;
  external_id?: string;
  text: string;
  timestamp?: string | number | Date;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  state?: string | null;
  media_urls?: string[];
  media_types?: ('image' | 'video')[];
  hashtags?: string[];
  author?: any;
  raw_payload?: any;
}

@Injectable()
export class SignalNormalizerService {
  private readonly logger = new Logger(SignalNormalizerService.name);

  constructor(private readonly geolocationService: GeolocationService) {}

  /**
   * Normalizes any incoming raw signal into the unified N-WEIS Signal format
   */
  normalize(input: RawSignalInput): SignalInsert {
    // 1. Normalize Timestamp to ISO 8601 UTC
    let utcTimestamp = new Date().toISOString();
    if (input.timestamp) {
      try {
        const d = new Date(input.timestamp);
        if (!isNaN(d.getTime())) {
          utcTimestamp = d.toISOString();
        }
      } catch (err) {
        this.logger.warn(`Malformed timestamp ${input.timestamp}, defaulting to current UTC.`);
      }
    }

    // 2. Extract Hashtags if text contains them
    const extractedHashtags = (input.text.match(/#[a-zA-Z0-9_]+/g) || []).map(h => h.toLowerCase());
    const combinedHashtags = Array.from(new Set([...(input.hashtags || []), ...extractedHashtags]));

    // 3. Hierarchical Geolocation & Coordinate Normalization (WGS84)
    const geo = this.geolocationService.resolveLocation(
      input.text,
      input.latitude,
      input.longitude,
      input.city,
      input.state
    );

    // 4. Default media arrays
    const mediaUrls = input.media_urls || [];
    const mediaTypes = input.media_types || mediaUrls.map(url => (url.endsWith('.mp4') || url.includes('video') ? 'video' : 'image'));

    return {
      source_id: input.source_id || `src_${input.source_type}`,
      source_type: input.source_type,
      source_name: input.source_name || this.getDefaultSourceName(input.source_type),
      external_id: input.external_id || null,
      text: input.text.trim(),
      language: this.detectLanguage(input.text),
      timestamp: utcTimestamp,
      ingested_at: new Date().toISOString(),
      
      city: geo.city,
      state: geo.state,
      country: 'India',
      latitude: geo.latitude,
      longitude: geo.longitude,
      location_confidence: geo.confidence,
      location_method: geo.method,
      
      relevance_score: 0.5,
      credibility_score: this.getDefaultSourceCredibility(input.source_type),
      misinformation_score: 0.0,
      verification_status: 'UNVERIFIED',
      
      media_urls: mediaUrls,
      media_types: mediaTypes,
      hashtags: combinedHashtags,
      author: input.author || null,
      raw_payload: input.raw_payload || { original: input.text },
    };
  }

  private getDefaultSourceName(type: SourceType): string {
    switch (type) {
      case 'imd': return 'IMD Official Feed';
      case 'weather_api': return 'Weather Meteorological API';
      case 'news': return 'Indian News RSS Feed';
      case 'citizen': return 'Citizen Weather Reporter';
      case 'social_media': return 'Social Media Stream';
      case 'public_dataset': return 'Government Meteorological Dataset';
      default: return 'Weather Observer';
    }
  }

  private getDefaultSourceCredibility(type: SourceType): number {
    switch (type) {
      case 'imd': return 1.00;
      case 'weather_api': return 0.90;
      case 'news': return 0.85;
      case 'citizen': return 0.65;
      case 'social_media': return 0.35;
      case 'public_dataset': return 0.90;
      default: return 0.50;
    }
  }

  private detectLanguage(text: string): string {
    // Simple script identification (Devanagari vs Latin)
    if (/[\u0900-\u097F]/.test(text)) {
      return 'hi'; // Hindi / Devanagari
    }
    return 'en';
  }
}
