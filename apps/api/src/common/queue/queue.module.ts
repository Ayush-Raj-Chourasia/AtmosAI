import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          username: configService.get('REDIS_USERNAME'),
          password: configService.get('REDIS_PASSWORD'),
          maxRetriesPerRequest: configService.get('REDIS_MAX_RETRIES', 0),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'clustering-queue' },
      { name: 'resolution-queue' },
      { name: 'report-queue' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
