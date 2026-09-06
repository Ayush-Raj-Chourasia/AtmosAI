import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WeatherClassifierService } from './weather-classifier.service';
import { RelevanceScorerService } from './relevance-scorer.service';
import { MultimodalService } from './multimodal.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WeatherClassifierService, RelevanceScorerService, MultimodalService],
  exports: [WeatherClassifierService, RelevanceScorerService, MultimodalService],
})
export class AiModule {}
