import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';

@Module({
  controllers: [EventsController],
  exports: [],
})
export class EventsModule {}
