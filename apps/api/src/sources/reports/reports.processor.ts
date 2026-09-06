import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignalsService } from '../../signals/signals.service';
import { UserReportAnalysisAgent, MediaMetadata } from '../../reasoning/agents/user-report-analysis.agent';

export interface ReportSubmissionJob {
    userId: string;
    lat: number;
    lng: number;
    eventType: string;
    description: string;
    mediaUrl?: string;
    mediaType?: 'image' | 'video';
    confidence: 'direct_observation' | 'uncertain' | 'hearsay';
    mediaMetadata?: MediaMetadata | null;
    exifLocation?: { lat: number; lng: number } | null;
}

@Processor('report-queue')
export class ReportsProcessor {
    private readonly logger = new Logger(ReportsProcessor.name);

    constructor(
        private readonly supabase: SupabaseService,
        private readonly signalsService: SignalsService,
        private readonly userReportAnalysisAgent: UserReportAnalysisAgent,
    ) { }

    @Process('process_report')
    async handleReportSubmission(job: Job<ReportSubmissionJob>) {
        const {
            userId,
            lat,
            lng,
            eventType,
            description,
            mediaUrl,
            mediaType,
            confidence,
            mediaMetadata,
            exifLocation
        } = job.data;

        this.logger.log(`Processing report submission for user ${userId}`);

        try {
            // 1. Determine Initial Location (Prefer Trusted EXIF)
            const initialLat = exifLocation?.lat || lat;
            const initialLng = exifLocation?.lng || lng;

            // 2. Run AI Analysis (FIRST)
            this.logger.log(`Running AI Analysis for user report submission...`);
            const { result: analysis } = await this.userReportAnalysisAgent.run({
                description,
                event_type: eventType,
                mediaUrl,
                mediaType,
                userLocation: { lat, lng },
                mediaMetadata: mediaMetadata || undefined,
                confidence,
            });

            this.logger.log(`AI Analysis complete: ${analysis.verified_event_type}, confidence=${analysis.confidence_score}, action=${analysis.recommended_action}`);

            // 3. Check Recommended Action
            if (analysis.recommended_action === 'reject') {
                this.logger.warn(`Report rejected by AI: ${analysis.authenticity.reasoning}. Skipping signal creation.`);
                return; // STOP HERE
            }

            // 4. Create Signal (Since accepted)
            // Determine final location (prefer EXIF if trusted)
            const finalLat = (analysis.use_exif_location && exifLocation) ? exifLocation.lat : initialLat;
            const finalLng = (analysis.use_exif_location && exifLocation) ? exifLocation.lng : initialLng;

            // Prepare analysis result object
            const analysisResult = {
                verified_event_type: analysis.verified_event_type,
                summary: analysis.summary,
                severity_level: analysis.severity_level,
                confidence_score: analysis.confidence_score,
                authenticity_score: analysis.authenticity.score,
                is_authentic: analysis.authenticity.is_likely_authentic,
                location_from_exif: analysis.use_exif_location && !!exifLocation,
                happened_at: analysis.happened_at,
            };

            const signalResult = await this.signalsService.createSignal({
                source: 'user_report',
                text: analysisResult.summary, // Use AI summary
                lat: finalLat,
                lng: finalLng,
                event_type: analysisResult.verified_event_type, // Use verified event type
                media_url: mediaUrl || null,
                media_type: mediaType || null,
                happened_at: analysisResult.happened_at || new Date().toISOString(),
                status: 'processed', // Directly processed as it's already analyzed
                raw_payload: {
                    user_id: userId,
                    confidence: confidence,
                    original_description: description,
                    original_event_type: eventType,
                    user_location: { lat, lng },
                    ai_analysis: {
                        verified_event_type: analysisResult.verified_event_type,
                        summary: analysisResult.summary,
                        severity: analysisResult.severity_level,
                        confidence_score: analysisResult.confidence_score,
                        authenticity_score: analysisResult.authenticity_score,
                        is_authentic: analysisResult.is_authentic,
                        reasoning: analysis.authenticity.reasoning
                    },
                    media_metadata: mediaMetadata ? {
                        has_gps: !!(mediaMetadata.latitude && mediaMetadata.longitude),
                        gps_used: !!exifLocation,
                        device: mediaMetadata.make && mediaMetadata.model ? `${mediaMetadata.make} ${mediaMetadata.model}` : null,
                        original_date: mediaMetadata.dateTimeOriginal || mediaMetadata.createDate || null,
                        duration: mediaMetadata.duration || null,
                        mime_type: mediaMetadata.mimeType || null,
                    } : null,
                },
            });

            if (!signalResult?.id) {
                this.logger.error('Failed to create signal in processor');
                return;
            }

            const signalId = signalResult.id;

            // 5. Create User Report
            const { data: report, error } = await (this.supabase.getClient() as any)
                .from('user_reports')
                .insert({
                    user_id: userId,
                    signal_id: signalId,
                    confidence: confidence,
                })
                .select('id')
                .single();

            if (error) {
                this.logger.error('Failed to create user_report in processor', error);
            } else {
                 this.logger.log(`Signal ${signalId} and Report ${report.id} created successfully.`);
            }

        } catch (error) {
            this.logger.error(`Report processing failed for user ${userId}`, error);
        }
    }
}
