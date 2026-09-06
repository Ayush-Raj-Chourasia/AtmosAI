import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignalsService } from '../../signals/signals.service';
import { UserReportAnalysisAgent, MediaMetadata } from '../../reasoning/agents/user-report-analysis.agent';
import { extractMediaMetadata, isLocationMismatch } from '../../lib/exif-extractor';

export interface CreateReportDto {
  user_id: string;
  lat: number;
  lng: number;
  event_type: string;
  description: string;
  confidence?: 'direct_observation' | 'uncertain' | 'hearsay';
  media_url?: string;
  media_type?: 'image' | 'video';
  media_buffer?: Buffer; // For Metadata extraction
}

export interface ReportAnalysisResult {
  verified_event_type: string;
  summary: string;
  severity_level: 'low' | 'medium' | 'high';
  confidence_score: number;
  authenticity_score: number;
  is_authentic: boolean;
  location_from_exif: boolean;
  exif_location?: { lat: number; lng: number };
  happened_at?: string;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly signalsService: SignalsService,
    private readonly userReportAnalysisAgent: UserReportAnalysisAgent,
    @InjectQueue('report-queue') private readonly reportQueue: Queue,
  ) {}

  async createReport(dto: CreateReportDto) {
    this.logger.log(`Creating report from user ${dto.user_id}: ${dto.event_type} at (${dto.lat}, ${dto.lng})`);

    // 1. Extract Metadata data if media is provided (Still synchronous as it's fast and needed for immediate validation/decisions if we wanted, but let's keep it here or move to processor? 
    // Moving media buffer to job is bad (Redis size limit). 
    // Metadata extraction is fast enough to do here, OR we do it here and pass metadata to job.
    let mediaMetadata: MediaMetadata | null = null;
    let exifLocation: { lat: number; lng: number } | null = null;

    if (dto.media_buffer && (dto.media_type === 'image' || dto.media_type === 'video')) {
      this.logger.debug(`Extracting metadata from uploaded ${dto.media_type}...`);
      mediaMetadata = await extractMediaMetadata(dto.media_buffer);

      if (mediaMetadata?.latitude && mediaMetadata?.longitude) {
      // Check if metadata location is reasonable (within 50km of user's GPS)
        const isMismatch = isLocationMismatch(
          mediaMetadata.latitude,
          mediaMetadata.longitude,
          dto.lat,
          dto.lng,
          50 // 50km threshold
        );

        if (!isMismatch) {
          exifLocation = { lat: mediaMetadata.latitude, lng: mediaMetadata.longitude };
        }
      }
    }

    // 2. Dispatch Job to Queue (Ingest & Analyze)
    await this.reportQueue.add('process_report', {
      userId: dto.user_id,
      lat: dto.lat,
      lng: dto.lng,
      eventType: dto.event_type,
      description: dto.description,
      mediaUrl: dto.media_url,
      mediaType: dto.media_type,
      confidence: dto.confidence || 'uncertain',
      mediaMetadata,
      exifLocation
    });

    this.logger.log(`Report submission queued for user ${dto.user_id}`);

    return {
      success: true,
      message: 'Report submitted for processing',
      status: 'queued'
    };
  }

  async getReportsByUser(userId: string) {
    const { data, error } = await (this.supabase.getClient() as any)
      .from('user_reports')
      .select(`
        id,
        confidence,
        created_at,
        signals (
          id,
          text,
          event_type,
          city_hint,
          status,
          created_at,
          media_url,
          media_type,
          raw_payload
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger.error('Failed to fetch user reports', error);
      throw error;
    }

    return data;
  }
}
