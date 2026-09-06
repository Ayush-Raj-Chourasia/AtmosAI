import { Controller, Get, Post } from '@nestjs/common';
import { RemoteConfigService } from './remote-config.service';

@Controller('admin/config')
export class RemoteConfigController {
  constructor(private readonly remoteConfig: RemoteConfigService) {}

  /**
   * Get current cron statuses from Remote Config
   */
  @Get('cron-status')
  async getCronStatus() {
    const statuses = await this.remoteConfig.getCronStatuses();
    return {
      success: true,
      data: {
        cron: statuses,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Force refresh the Remote Config cache
   */
  @Post('refresh')
  async refreshConfig() {
    const config = await this.remoteConfig.forceRefresh();
    return {
      success: true,
      message: 'Remote Config refreshed successfully',
      data: config,
      timestamp: new Date().toISOString(),
    };
  }
}
