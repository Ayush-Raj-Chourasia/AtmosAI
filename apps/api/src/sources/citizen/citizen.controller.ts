import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { IngestionService } from '../ingestion.service';
import { CitizenWeatherReportDto } from '@n-weis/shared';
import { RawSignalInput } from '../../processing/signal-normalizer.service';

@Controller('api/v1')
export class CitizenController {
  constructor(private readonly ingestionService: IngestionService) {}

  /**
   * Citizen weather observation submission endpoint
   * POST /api/v1/citizen/reports
   */
  @Post('citizen/reports')
  @HttpCode(HttpStatus.CREATED)
  async submitCitizenReport(@Body() dto: CitizenWeatherReportDto) {
    const result = await this.ingestionService.ingestCitizenReport(dto);
    return {
      success: true,
      message: result.isMisinformation
        ? 'Report received and quarantined by AI fraud inspection.'
        : 'Citizen weather observation processed and corroborated.',
      data: result,
    };
  }

  /**
   * Universal signal ingestion endpoint
   * POST /api/v1/signals
   */
  @Post('signals')
  @HttpCode(HttpStatus.CREATED)
  async submitSignal(@Body() raw: RawSignalInput) {
    const result = await this.ingestionService.ingestSignal(raw);
    return {
      success: true,
      data: result,
    };
  }
}
