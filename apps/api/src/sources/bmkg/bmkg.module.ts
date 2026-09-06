import { Module } from '@nestjs/common';
import { BmkgService } from './bmkg.service';
import { SupabaseModule } from '../../supabase/supabase.module';
import { IncidentsModule } from '../../incidents/incidents.module';

@Module({
  imports: [SupabaseModule, IncidentsModule],
  providers: [BmkgService],
  exports: [BmkgService]
})
export class BmkgModule {}
