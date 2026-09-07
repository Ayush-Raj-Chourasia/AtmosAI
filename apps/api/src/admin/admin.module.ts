import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { DemoScenariosService } from './demo-scenarios.service';

const STARTUP_SCENARIOS = [
  'flood-guwahati',
  'thunderstorm-delhi',
  'mumbai-rainfall',
  'heatwave-rajasthan',
];

@Module({
  controllers: [AdminController],
  providers: [DemoScenariosService],
  exports: [DemoScenariosService],
})
export class AdminModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminModule.name);

  constructor(private readonly demoScenarios: DemoScenariosService) {}

  /**
   * Seed the in-memory store with realistic weather events on boot so the
   * dashboard has data to show immediately, without needing an external
   * data provider or a manual demo trigger. Safe to re-run via the
   * dashboard's "Reset" button, which clears back to this same baseline.
   */
  async onApplicationBootstrap() {
    if (process.env.DISABLE_STARTUP_SEED === 'true') return;

    this.logger.log('Seeding baseline weather events for local/demo mode...');
    for (const scenarioId of STARTUP_SCENARIOS) {
      try {
        await this.demoScenarios.executeScenario(scenarioId);
      } catch (err) {
        this.logger.warn(`Startup seed scenario "${scenarioId}" failed: ${err.message}`);
      }
    }
    this.logger.log('Baseline seed complete.');
  }
}
