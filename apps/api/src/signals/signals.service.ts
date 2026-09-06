import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SignalEnrichmentAgent } from '../reasoning/agents/signal-enrichment.agent';
import { SseService } from '../sse/sse.service';
import { MessageEvent } from '@nestjs/common';

@Injectable()
export class SignalsService {
  private readonly logger = new Logger(SignalsService.name);
  constructor(
    private readonly supabase: SupabaseService,
    @InjectQueue('clustering-queue') private readonly clusteringQueue: Queue,
    private readonly enrichmentAgent: SignalEnrichmentAgent,
    private readonly sseService: SseService,
  ) { }

  private signalBuffer: { payload: any; resolve: (value: any) => void; reject: (reason?: any) => void }[] = [];
  private readonly BATCH_SIZE = 10;
  private readonly FLUSH_INTERVAL = 60_000; // 60 seconds
  private flushTimeout: NodeJS.Timeout | null = null;

  async createSignal(payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
      this.signalBuffer.push({ payload, resolve, reject });

      if (this.signalBuffer.length >= this.BATCH_SIZE) {
        this.flushBuffer();
      } else if (!this.flushTimeout) {
        this.flushTimeout = setTimeout(() => this.flushBuffer(), this.FLUSH_INTERVAL);
      }
    });
  }

  private async flushBuffer() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.signalBuffer.length === 0) return;

    const batch = [...this.signalBuffer];
    this.signalBuffer = [];
    this.logger.log(`Flushing signal buffer: processing ${batch.length} signals...`);

    try {
      // 1. Prepare batch inputs for Agent
      const inputs = batch.map(item => ({
        text: item.payload.text || '',
        source: item.payload.source,
        lat: item.payload.lat,
        lng: item.payload.lng,
        city_hint: item.payload.city_hint,
      }));

      // 2. Call Agent API (Batch)
      const { results } = await this.enrichmentAgent.runBatch(inputs);

      // 3. Process each result
      // We process them in parallel for DB insertion to keep it fast, or could use bulk insert but need IDs back.
      // Parallel single inserts is acceptable for batch size 10.
      await Promise.all(batch.map(async (item, index) => {
        const payload = item.payload;
        // Fallback if result missing (shouldn't happen with correct implementation)
        const severityResult = results[index] || {
          severity: 'low',
          urgency_score: 0.1,
          location: null,
          event_type: payload.event_type || 'noise', // Use payload's type or mark as noise for review
          lat: null,
          lng: null
        };

        const eventType = payload.event_type || severityResult.event_type;

        if (eventType === 'other' || eventType === 'noise') {
          // We persist "noise" signals for the Ticker to show "Ignored" reasoning, 
          // but we DO NOT queue them for clustering.
          try {
            const { data, error } = await (this.supabase.getClient()
              .from('signals') as any)
              .insert({
                source: payload.source,
                text: payload.text || null,
                lat: severityResult.lat || payload.lat,
                lng: severityResult.lng || payload.lng,
                media_url: payload.media_url || null,
                media_type: payload.media_type || null,
                thumbnail_url: payload.thumbnail_url || null,
                city_hint: severityResult.location || payload.city_hint || null,
                event_type: eventType,
                raw_payload: { ...(payload.raw_payload || {}), ai_analysis: severityResult },
                status: 'processed', // Mark as processed so it doesn't get picked up again
                happened_at: payload.happened_at || undefined,
              })
              .select('id')
              .single();

            if (!error) {
              this.sseService.addEvent({
                data: { ...data, event_type: eventType, city_hint: severityResult.location || payload.city_hint },
                type: 'signal_processed'
              } as MessageEvent);

              item.resolve({ success: true, id: data.id, severity: 'low', ignored: true });
              return;
            }
          } catch (e) {
            // If persistence fails for noise, just ignore it
            item.resolve(null);
            return;
          }
        }

        if (!eventType) {
          this.logger.warn(`Signal ${index} missing event_type. Skipped.`);
          item.resolve(null);
          return;
        }

        try {
          // Persist Signal
          const { data, error } = await (this.supabase.getClient()
            .from('signals') as any)
            .insert({
              source: payload.source,
              text: payload.text || null,
              lat: severityResult.lat || payload.lat,
              lng: severityResult.lng || payload.lng,
              media_url: payload.media_url || null,
              media_type: payload.media_type || null,
              thumbnail_url: payload.thumbnail_url || null,
              city_hint: severityResult.location || payload.city_hint || null,
              event_type: eventType,
              raw_payload: { ...(payload.raw_payload || {}), ai_analysis: severityResult },
              status: 'pending',
              happened_at: payload.happened_at || undefined,
            })
            .select('id')
            .single();

          if (error) {
            this.logger.error('Supabase Ingestion Error:', error);
            item.reject(new InternalServerErrorException('Failed to ingest signal'));
            return;
          }

          // Publish to Queue
          this.sseService.addEvent({
            data: { ...data, event_type: eventType, city_hint: severityResult.location || payload.city_hint },
            type: 'signal_processed'
          } as MessageEvent);

          const priority = severityResult.severity === 'high' ? 1 : 10;
          const delay = severityResult.severity === 'high' ? 0 : 300000;

          await this.clusteringQueue.add(
            'cluster-signals',
            {
              signalId: data.id,
              lat: payload.lat,
              lng: payload.lng,
              severity: severityResult.severity,
              happened_at: payload.happened_at,
            },
            {
              priority,
              delay,
              removeOnComplete: true,
            },
          );

          item.resolve({ success: true, id: data.id, severity: severityResult.severity });

        } catch (err) {
          this.logger.error('Error processing individual signal in batch', err);
          item.reject(err);
        }
      }));

    } catch (error) {
      this.logger.error('Batch processing failed completely', error);
      // Reject all
      batch.forEach(item => item.reject(error));
    }
  }

  async getRecentSignals(limit: number = 100) {
    // Get signals from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase.getClient()
      .from('signals')
      .select('id, source, text, event_type, city_hint, created_at, status, media_type, raw_payload, incident_id:incident_signals(incident_id)')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      this.logger.error('Failed to fetch recent signals', error);
      return [];
    }

    return data;
  }
}
