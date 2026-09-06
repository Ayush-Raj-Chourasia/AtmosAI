import { Module, Global } from '@nestjs/common';
import { GeolocationService } from './geolocation.service';
import { SignalNormalizerService } from './signal-normalizer.service';

@Global()
@Module({
  providers: [GeolocationService, SignalNormalizerService],
  exports: [GeolocationService, SignalNormalizerService],
})
export class ProcessingModule {}
