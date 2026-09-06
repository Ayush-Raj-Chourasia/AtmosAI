import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RssService } from './rss.service';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SignalsModule } from '../../signals/signals.module';
import { ReasoningModule } from '../../reasoning/reasoning.module';
import { NewsAnalysisAgent } from '../../reasoning/agents/news-analysis.agent';

@Module({
  imports: [
    ConfigModule,
    SupabaseModule,
    SignalsModule,
    ReasoningModule,
  ],
  providers: [RssService],
  exports: [RssService],
})
export class RssModule {}
