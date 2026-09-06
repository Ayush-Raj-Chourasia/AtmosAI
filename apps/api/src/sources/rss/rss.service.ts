import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import Parser from 'rss-parser';
import * as crypto from 'crypto';
import { NewsAnalysisAgent } from '../../reasoning/agents/news-analysis.agent';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignalsService } from '../../signals/signals.service';
import * as rssSources from '../../common/config/rss_sources.json';
import { RemoteConfigService } from '../../config/remote-config.service';
import { scrapeArticleContent } from './article-scraper';

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  content?: string;
  contentSnippet?: string;
  creator?: string;
  categories?: string[];
}

@Injectable()
export class RssService implements OnModuleInit {
  private readonly logger = new Logger(RssService.name);
  private readonly parser: Parser;

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly signalsService: SignalsService,
    private readonly newsAgent: NewsAnalysisAgent,
    private readonly remoteConfig: RemoteConfigService,
  ) {
    this.parser = new Parser({
      timeout: 30000,
      headers: {
        'User-Agent': 'DisasterPulse/1.0 (+https://disasterpulse.id)',
      },
    });
  }

  onModuleInit() {
    this.logger.log('RSS Watcher Service Initialized');
    // Optionally run on startup for testing:
    // this.handleCron();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCron() {
    // Check Remote Config before running cron
    if (!(await this.remoteConfig.isCronEnabled('rss'))) {
      this.logger.debug('RSS cron is disabled via Remote Config');
      return;
    }

    this.logger.log('Starting RSS Disaster Scan...');
    
    // Process feeds in parallel
    const results = await Promise.all(
      rssSources.sources.map(source => 
        this.processRssFeed(source).catch(error => {
          this.logger.error(`Failed to process RSS feed: ${source.name}`, error);
          return 0; // Return 0 signals on error
        })
      )
    );

    const totalSignals = results.reduce((sum, count) => sum + count, 0);
    
    this.logger.log(`RSS Scan Complete. Total new signals created: ${totalSignals}`);
  }

  private async processRssFeed(source: { name: string; url: string; category: string }): Promise<number> {
    this.logger.debug(`Fetching RSS feed: ${source.name}`);
    let signalsCreated = 0;
    
    try {
      const feed = await this.parser.parseURL(source.url);
      this.logger.debug(`Fetched ${feed.items.length} items from ${source.name}`);

      for (const item of feed.items) {
        const created = await this.processRssItem(item as RssItem, source.name);
        if (created) signalsCreated++;
      }
      
      this.logger.log(`Source ${source.name}: ${signalsCreated} signals created from ${feed.items.length} items.`);
    } catch (error) {
      this.logger.error(`Failed to parse RSS feed ${source.name}:`, error);
    }
    
    return signalsCreated;
  }

  private async processRssItem(item: RssItem, sourceName: string): Promise<boolean> {
    // 1. Generate hash for deduplication
    const urlHash = crypto.createHash('md5').update(item.link).digest('hex');

    // 2. Check if we've already processed this URL
    // We use news_posts table for robust deduplication (stores even rejeected items)
    const { data: existing } = await (this.supabase.getClient() as any)
      .from('news_posts')
      .select('id')
      .eq('url_hash', urlHash)
      .maybeSingle();

    if (existing) {
      // this.logger.debug(`Article already processed (news_posts): ${item.title?.substring(0, 50)}...`);
      return false;
    }

    // 3. Check if title contains disaster keywords
    const hasKeyword = rssSources.keywords.some((keyword) =>
      item.title?.toLowerCase().includes(keyword) ||
      item.contentSnippet?.toLowerCase().includes(keyword)
    );

    if (!hasKeyword) {
      // this.logger.debug(`Article skipped (no keywords): ${item.title?.substring(0, 50)}...`);
      return false;
    }

    // Insert into news_posts to mark as seen (only if it has keywords)
    await (this.supabase.getClient() as any)
      .from('news_posts')
      .insert({
        url_hash: urlHash,
        url: item.link,
        title: item.title,
        source: sourceName,
        published_at: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString()
      });

    // 4. Scrape full article content from the news link
    let fullContent = item.content || '';
    try {
      this.logger.debug(`Scraping article content: ${item.link}`);
      const scraped = await scrapeArticleContent(item.link);
      if (scraped.content && scraped.content.length > (fullContent?.length || 0)) {
        fullContent = scraped.content;
        this.logger.debug(`Scraped ${fullContent.length} chars from ${item.link}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to scrape article, using RSS content: ${item.link}`);
    }

    // 5. Analyze with AI
    const { result: analysis } = await this.newsAgent.run({
      title: item.title || '',
      description: item.contentSnippet || '',
      content: fullContent || item.contentSnippet,
      pubDate: item.pubDate || new Date().toISOString(),
      source: sourceName,
      link: item.link,
    });

    this.logger.debug(`Analysis for "${item.title?.substring(0, 40)}...": real=${analysis.is_real_event}, conf=${analysis.confidence_score}`);

    if (!analysis.is_disaster_related || !analysis.is_current_event || !analysis.is_real_event) {
      // Create 'noise' signal for transparency
      await this.signalsService.createSignal({
        source: 'news',
        text: analysis.summary || item.title,
        event_type: 'noise',
        lat: null, lng: null, city_hint: null,
        media_url: item.link, media_type: null, happened_at: item.pubDate,
        raw_payload: {
          url_hash: urlHash, source_name: sourceName, original_title: item.title, link: item.link,
          full_content: fullContent,
          ai_analysis: { ...analysis, reason: `REJECTED: ${analysis.reason}` }
        }
      });
      return false;
    }

    if (analysis.confidence_score < 0.6) {
      await this.signalsService.createSignal({
        source: 'news',
        text: analysis.summary || item.title,
        event_type: 'noise',
        lat: null, lng: null, city_hint: null,
        media_url: item.link, media_type: null, happened_at: item.pubDate,
        raw_payload: {
          url_hash: urlHash, source_name: sourceName, original_title: item.title, link: item.link,
          full_content: fullContent,
          ai_analysis: { ...analysis, reason: `REJECTED: Low confidence (${analysis.confidence_score}) - ${analysis.reason}` }
        }
      });
      return false;
    }

    // 6. Validate event_type - reject if AI couldn't classify
    if (!analysis.event_type || analysis.event_type === 'other') {
      this.logger.debug(`Rejecting news: Missing or invalid event_type - ${item.title}`);
      await this.signalsService.createSignal({
        source: 'news',
        text: analysis.summary || item.title,
        event_type: 'noise',
        lat: null, lng: null, city_hint: null,
        media_url: item.link, media_type: null, happened_at: item.pubDate,
        raw_payload: {
          url_hash: urlHash, source_name: sourceName, original_title: item.title, link: item.link,
          full_content: fullContent,
          ai_analysis: { ...analysis, reason: `REJECTED: Could not determine event type` }
        }
      });
      return false;
    }

    // 7. Create Signal
    const signalPayload = {
      source: 'news',
      text: analysis.summary || item.title,
      event_type: analysis.event_type,
      lat: null,
      lng: null,
      city_hint: analysis.location_inference || null,
      media_url: item.link,
      media_type: null,
      happened_at: analysis.happened_at || item.pubDate,
      raw_payload: {
        url_hash: urlHash,
        source_name: sourceName,
        original_title: item.title,
        link: item.link,
        full_content: fullContent,
        analysis: analysis,
      },
    };

    this.logger.log(`Creating signal from news: ${item.title?.substring(0, 50)}...`);
    const signal = await this.signalsService.createSignal(signalPayload);

    // 8. Update news_posts with signal_id if created
    if (signal && signal.id) {
       await (this.supabase.getClient() as any)
        .from('news_posts')
        .update({ signal_id: signal.id })
        .eq('url_hash', urlHash);
       return true;
    }
    
    return false;
  }
}
