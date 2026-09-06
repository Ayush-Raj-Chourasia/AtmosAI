import { Module, Global } from '@nestjs/common';
import { RemoteConfigService } from './remote-config.service';
import { RemoteConfigController } from './remote-config.controller';

@Global()
@Module({
  controllers: [RemoteConfigController],
  providers: [RemoteConfigService],
  exports: [RemoteConfigService],
})
export class RemoteConfigModule {}
