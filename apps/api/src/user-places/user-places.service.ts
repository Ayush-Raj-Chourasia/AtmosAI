import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UserPlacesService {
  constructor(private readonly supabase: SupabaseService) {}

  async createPlace(payload: any) {
    const { data, error } = await (this.supabase.getClient()
      .from('user_places') as any)
      .insert({
        user_id: payload.user_id,
        label: payload.label,
        lat: payload.lat,
        lng: payload.lng,
        radius_m: payload.radius_m,
        is_active: true,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Create Place Error:', error);
      throw new InternalServerErrorException('Failed to create place');
    }

    return { success: true, id: data.id };
  }

  async getPlaces(userId: string) {
    const { data, error } = await this.supabase.getClient()
      .from('user_places')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      console.error('List Places Error:', error);
      throw new InternalServerErrorException('Failed to list places');
    }

    return data;
  }

  async deletePlace(id: string) {
    const { error } = await this.supabase.getClient()
      .from('user_places')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete Place Error:', error);
      throw new InternalServerErrorException('Failed to delete place');
    }

    return { success: true };
  }

  async updateNotifyEnabled(id: string, notifyEnabled: boolean) {
    const { error } = await (this.supabase.getClient() as any)
      .from('user_places')
      .update({ notify_enabled: notifyEnabled })
      .eq('id', id);

    if (error) {
      console.error('Update Notify Enabled Error:', error);
      throw new InternalServerErrorException('Failed to update notification preference');
    }

    return { success: true, notify_enabled: notifyEnabled };
  }

  async getUserStats(userId: string) {
    const client = this.supabase.getClient();

    // Count user reports
    const { count: reportsCount, error: reportsError } = await client
      .from('user_reports')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (reportsError) {
      console.error('User Reports Count Error:', reportsError);
    }

    // Count confirmations (type = 'confirm')
    const { count: confirmCount, error: confirmError } = await client
      .from('incident_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'confirm');

    if (confirmError) {
      console.error('Confirm Count Error:', confirmError);
    }

    // Count hoax reports (type = 'reject')
    const { count: hoaxCount, error: hoaxError } = await client
      .from('incident_feedback')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('type', 'reject');

    if (hoaxError) {
      console.error('Hoax Count Error:', hoaxError);
    }

    return {
      totalReports: reportsCount || 0,
      confirmedEvents: confirmCount || 0,
      hoaxReports: hoaxCount || 0,
    };
  }
}

