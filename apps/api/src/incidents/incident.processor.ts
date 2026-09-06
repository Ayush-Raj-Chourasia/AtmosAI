import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { IncidentsService } from './incidents.service';

@Processor('clustering-queue')
export class IncidentProcessor {
  private readonly logger = new Logger(IncidentProcessor.name);

  constructor(private readonly incidentsService: IncidentsService) { }

  @Process('cluster-signals')
  async handleSignalProcessing(job: Job<{ signalId: string; lat: number; lng: number; severity: string; happened_at?: string }>) {
    this.logger.debug(`Processing signal ${job.data.signalId} (Severity: ${job.data.severity})`);

    // Process single signal - now goes directly to incidents
    await this.incidentsService.processSignal(
      job.data.signalId,
      job.data.lat,
      job.data.lng,
      job.data.happened_at,
    );

    this.logger.debug(`Signal processing completed for ${job.data.signalId}`);
  }
}
