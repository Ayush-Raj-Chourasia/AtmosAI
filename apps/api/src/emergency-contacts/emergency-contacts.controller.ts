import { Controller, Get, Query } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('emergency-contacts')
export class EmergencyContactsController {
  constructor(private readonly supabase: SupabaseService) {}

  private get db() {
    return this.supabase.getClient() as any;
  }

  @Get()
  async getAll(@Query('category') category?: string, @Query('region') region?: string) {
    let query = this.db
      .from('emergency_contacts')
      .select('*')
      .order('is_national', { ascending: false })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (region) {
      query = query.or(`region.eq.${region},is_national.eq.true`);
    }

    const { data, error } = await query;
    return error ? [] : data;
  }
}
