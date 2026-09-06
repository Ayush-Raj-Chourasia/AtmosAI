import { Controller, Post, Body, BadRequestException, Get } from '@nestjs/common';
import { SignalsService } from './signals.service';
import { z } from 'zod';

const signalSchema = z.object({
  source: z.enum(['user_report', 'social_media', 'news', 'sensor', 'tiktok_ai']),
  text: z.string().optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  media_url: z.string().url().optional(),
  media_type: z.enum(['image', 'video']).optional(),
  city_hint: z.string().optional(),
  happened_at: z.string().optional(),
  raw_payload: z.record(z.string(), z.any()).optional(),
});

@Controller('signals')
export class SignalsController {
  constructor(private readonly signalsService: SignalsService) {}

  @Post()
  async create(@Body() body: any) {
    const validated = signalSchema.safeParse(body);

    if (!validated.success) {
      throw new BadRequestException({
        error: 'Invalid Input',
        details: validated.error.issues,
      });
    }

    return this.signalsService.createSignal(validated.data);
  }

  @Get('recent')
  async getRecent() {
    return this.signalsService.getRecentSignals();
  }
}
