import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { GuidesController } from './guides.controller';
import { GuidesService } from './guides.service';
import { GuideAssistantAgent } from '../reasoning/agents/guide-assistant.agent';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  controllers: [GuidesController],
  providers: [
    GuidesService,
    GuideAssistantAgent,
    {
      provide: OpenAI,
      useFactory: (configService: ConfigService) => new OpenAI({
        apiKey: configService.get<string>('GEMINI_API_KEY'),
        baseURL: configService.get<string>('GEMINI_BASE_URL') || 'https://api.maiarouter.ai/v1',
      }),
      inject: [ConfigService],
    },
  ],
})
export class GuidesModule {}
