import { Module } from '@nestjs/common';
import { TiktokService } from './tiktok.service';
import { SignalsModule } from '../../signals/signals.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { ReasoningModule } from '../../reasoning/reasoning.module';

@Module({
  imports: [SignalsModule, SupabaseModule, ReasoningModule],
  providers: [TiktokService],
  exports: [TiktokService]
})
export class TiktokModule {}
