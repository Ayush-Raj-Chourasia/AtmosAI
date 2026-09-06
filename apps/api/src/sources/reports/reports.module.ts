import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ReportsProcessor } from './reports.processor';
import { SupabaseModule } from '../../supabase/supabase.module';
import { SignalsModule } from '../../signals/signals.module';
import { UploadModule } from '../../upload/upload.module';
import { ReasoningModule } from '../../reasoning/reasoning.module';

@Module({
  imports: [
    SupabaseModule,
    SignalsModule,
    UploadModule,
    ReasoningModule,
    BullModule.registerQueue({ name: 'report-queue' }),
  ],
  providers: [ReportsService, ReportsProcessor],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
