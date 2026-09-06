import { Injectable, Logger } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { RawSignalInput } from '../../processing/signal-normalizer.service';

export interface NewsArticleInput {
  title: string;
  summary: string;
  source: string;
  url: string;
  publishedAt?: string;
  city?: string;
  state?: string;
  mediaUrl?: string;
}

@Injectable()
export class RssService {
  private readonly logger = new Logger(RssService.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Ingest a news weather dispatch
   */
  async ingestArticle(article: NewsArticleInput) {
    this.logger.log(` Ingesting news report from [${article.source}]: "${article.title}"`);

    const raw: RawSignalInput = {
      source_type: 'news',
      source_name: article.source,
      external_id: article.url,
      text: `${article.title}. ${article.summary}`,
      timestamp: article.publishedAt || new Date().toISOString(),
      city: article.city,
      state: article.state,
      media_urls: article.mediaUrl ? [article.mediaUrl] : [],
      hashtags: ['#NewsReport', '#WeatherUpdate'],
      author: {
        username: article.source,
        verified: true,
        trust_score: 0.85,
      },
      raw_payload: article,
    };

    return this.ingestionService.ingestSignal(raw);
  }
}
