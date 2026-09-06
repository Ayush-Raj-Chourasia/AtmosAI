import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DemoScenariosService } from './demo-scenarios.service';

@Module({
  controllers: [AdminController],
  providers: [DemoScenariosService],
  exports: [DemoScenariosService],
})
export class AdminModule {}
