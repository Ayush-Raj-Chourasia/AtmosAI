import { Module } from '@nestjs/common';
import { SignalsController } from './signals.controller';
import { SignalsService } from './signals.service';

import { QueueModule } from '../common/queue/queue.module';
import { ReasoningModule } from '../reasoning/reasoning.module';

@Module({
  imports: [QueueModule, ReasoningModule],
  controllers: [SignalsController],
  providers: [SignalsService],
  exports: [SignalsService]
})
export class SignalsModule {}
