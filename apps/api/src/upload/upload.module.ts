import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2UploadService } from './r2-upload.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [R2UploadService],
  exports: [R2UploadService],
})
export class UploadModule {}
