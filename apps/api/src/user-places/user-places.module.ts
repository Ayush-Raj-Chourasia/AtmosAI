import { Module } from '@nestjs/common';
import { UserPlacesController } from './user-places.controller';
import { UserPlacesService } from './user-places.service';

@Module({
  controllers: [UserPlacesController],
  providers: [UserPlacesService]
})
export class UserPlacesModule {}
