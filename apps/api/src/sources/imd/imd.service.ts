import { Injectable, Logger } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { RawSignalInput } from '../../processing/signal-normalizer.service';

export interface ImdWarningPayload {
  warningId: string;
  subdivision: string;
  state: string;
  district?: string;
  colorCode: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  eventDescription: string;
  validUntil: string;
  coordinates?: { lat: number; lng: number };
}

@Injectable()
export class ImdService {
  private readonly logger = new Logger(ImdService.name);

  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Ingest an official IMD meteorological warning
   */
  async ingestImdWarning(payload: ImdWarningPayload) {
    this.logger.log(` Ingesting IMD Official Alert [${payload.colorCode}]: ${payload.eventDescription}`);

    const raw: RawSignalInput = {
      source_id: 'src_imd_01',
      source_type: 'imd',
      source_name: 'IMD National Weather Bulletin',
      external_id: payload.warningId,
      text: `IMD ${payload.colorCode} ALERT: ${payload.eventDescription} across ${payload.district ? `${payload.district}, ` : ''}${payload.state}. Valid until ${payload.validUntil}.`,
      state: payload.state,
      city: payload.district || payload.subdivision,
      latitude: payload.coordinates?.lat,
      longitude: payload.coordinates?.lng,
      hashtags: ['#IMD', '#WeatherAlert', `#${payload.state.replace(/\s+/g, '')}`],
      author: {
        username: 'India Meteorological Department',
        verified: true,
        trust_score: 1.0,
      },
      raw_payload: payload,
    };

    return this.ingestionService.ingestSignal(raw);
  }
}
