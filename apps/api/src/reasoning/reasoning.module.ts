import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { SupabaseModule } from '../supabase/supabase.module';
import { ReasoningService } from './reasoning.service';
import { ReasoningCacheService } from './reasoning-cache.service';
import { ObserverAgent } from './agents/observer.agent';
import { ClassifierAgent } from './agents/classifier.agent';
import { SkepticAgent } from './agents/skeptic.agent';
import { SynthesizerAgent } from './agents/synthesizer.agent';
import { ActionAgent } from './agents/action.agent';
import { SignalEnrichmentAgent } from './agents/signal-enrichment.agent';
import { VideoAnalysisAgent } from './agents/video-analysis.agent';
import { NewsAnalysisAgent } from './agents/news-analysis.agent';
import { IncidentResolutionAgent } from './agents/incident-resolution.agent';
import { GuideAssistantAgent } from './agents/guide-assistant.agent';
import { LocationMatcherAgent } from './agents/location-matcher.agent';
import { UserReportAnalysisAgent } from './agents/user-report-analysis.agent';
import { GoogleMapsTool } from './tools/google-maps.tool';

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [
    ReasoningService,
    ReasoningCacheService,
    ObserverAgent,
    ClassifierAgent,
    SkepticAgent,
    SynthesizerAgent,
    ActionAgent,
    SignalEnrichmentAgent,
    VideoAnalysisAgent,
    NewsAnalysisAgent,
    IncidentResolutionAgent,
    GuideAssistantAgent,
    LocationMatcherAgent,
    UserReportAnalysisAgent,
    GoogleMapsTool,
    {
      provide: OpenAI,
      useFactory: (configService: ConfigService) => new OpenAI({
        apiKey: configService.get<string>('GEMINI_API_KEY'),
        baseURL: configService.get<string>('GEMINI_BASE_URL') || 'https://api.maiarouter.ai/v1',
      }),
      inject: [ConfigService],
    }
  ],
  exports: [
    ReasoningService,
    ReasoningCacheService,
    SignalEnrichmentAgent,
    VideoAnalysisAgent,
    NewsAnalysisAgent,
    IncidentResolutionAgent,
    GuideAssistantAgent,
    LocationMatcherAgent,
    UserReportAnalysisAgent,
  ],
})
export class ReasoningModule {}
