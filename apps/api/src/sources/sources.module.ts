import { Module, Global } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { CitizenController } from './citizen/citizen.controller';
import { ImdService } from './imd/imd.service';
import { RssService } from './news/rss.service';
import { WeatherApiService } from './weather/weather-api.service';
import { SocialService } from './social/social.service';

@Global()
@Module({
  controllers: [CitizenController],
  providers: [
    IngestionService,
    ImdService,
    RssService,
    WeatherApiService,
    SocialService,
  ],
  exports: [
    IngestionService,
    ImdService,
    RssService,
    WeatherApiService,
    SocialService,
  ],
})
export class SourcesModule {}
