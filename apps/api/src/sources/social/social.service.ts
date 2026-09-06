import { Injectable, Logger } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { RawSignalInput } from '../../processing/signal-normalizer.service';

export interface SocialPostInput {
  platform: 'twitter' | 'instagram' | 'telegram' | 'generic';
  postId: string;
  authorUsername: string;
  authorVerified?: boolean;
  text: string;
  mediaUrls?: string[];
  cityHint?: string;
  stateHint?: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class SocialService {
  private readonly logger = new Logger(SocialService.name);

  // Official hashtag rules engine
  private readonly TARGET_HASHTAGS = [
    '#imd',
    '#weather',
    '#rain',
    '#flood',
    '#thunderstorm',
    '#heatwave',
    '#fog',
    '#duststorm',
    '#strongwinds',
    '#monsoon',
  ];

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Ingest social media post if it matches meteorological hashtag rules
   */
  async ingestSocialPost(post: SocialPostInput) {
    const lower = post.text.toLowerCase();
    const hasTargetHashtag = this.TARGET_HASHTAGS.some(tag => lower.includes(tag));

    if (!hasTargetHashtag) {
      this.logger.debug(`Social post skipped: does not match target weather hashtag filter.`);
      return null;
    }

    const raw: RawSignalInput = {
      source_type: 'social_media',
      source_name: `Social Stream (${post.platform.toUpperCase()})`,
      external_id: post.postId,
      text: post.text,
      city: post.cityHint,
      state: post.stateHint,
      latitude: post.latitude,
      longitude: post.longitude,
      media_urls: post.mediaUrls || [],
      author: {
        username: post.authorUsername,
        verified: post.authorVerified || false,
        trust_score: post.authorVerified ? 0.60 : 0.35,
      },
      raw_payload: post,
    };

    return this.ingestionService.ingestSignal(raw);
  }
}
