import { Injectable } from '@nestjs/common';
import { SourceType } from '@n-weis/shared';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CredibilityService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Get dynamic credibility score for a signal's source and author
   */
  async calculateCredibility(
    sourceType: SourceType,
    sourceId?: string,
    author?: { verified?: boolean; trust_score?: number } | null
  ): Promise<number> {
    // 1. Get baseline credibility from source reputation table if available
    let base = this.getDefaultBaseline(sourceType);

    if (sourceId) {
      const reputations = await this.db.getSourceReputations();
      const rep = reputations.find(r => r.source_id === sourceId);
      if (rep) {
        base = rep.reputation_score;
      }
    }

    // 2. Author trust adjustments
    if (author) {
      if (author.verified) {
        base = Math.min(1.0, base + 0.15);
      }
      if (author.trust_score !== undefined) {
        base = Number(((base * 0.7) + (author.trust_score * 0.3)).toFixed(2));
      }
    }

    return Number(Math.max(0.1, Math.min(1.0, base)).toFixed(2));
  }

  private getDefaultBaseline(sourceType: SourceType): number {
    switch (sourceType) {
      case 'imd': return 1.00;
      case 'weather_api': return 0.92;
      case 'news': return 0.85;
      case 'citizen': return 0.65;
      case 'public_dataset': return 0.90;
      case 'social_media': return 0.35;
      default: return 0.25;
    }
  }
}
