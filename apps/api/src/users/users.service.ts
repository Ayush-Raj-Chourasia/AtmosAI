import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

export interface SyncUserDto {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
  auth_provider?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  private get db() {
    return this.supabase.getClient() as any;
  }

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Sync user data from Supabase Auth to the local users table.
   * Creates a new user if they don't exist, or updates their profile if they do.
   */
  async syncUser(userData: SyncUserDto) {
    this.logger.log(`Syncing user ${userData.id} (${userData.email})`);

    const { data: existingUser, error: fetchError } = await this.db
      .from('users')
      .select('id')
      .eq('id', userData.id)
      .maybeSingle();

    if (fetchError) {
      this.logger.error('Error checking existing user:', fetchError);
      throw fetchError;
    }

    if (existingUser) {
      // Update existing user
      const { error: updateError } = await this.db
        .from('users')
        .update({
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
          auth_provider: userData.auth_provider || 'google',
          updated_at: new Date().toISOString(),
        })
        .eq('id', userData.id);

      if (updateError) {
        this.logger.error('Error updating user:', updateError);
        throw updateError;
      }

      this.logger.log(`Updated user ${userData.id}`);
      return { action: 'updated', id: userData.id };
    } else {
      // Create new user
      const { error: insertError } = await this.db
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          name: userData.name,
          avatar_url: userData.avatar_url,
          auth_provider: userData.auth_provider || 'google',
          trust_score: 0.5, // Default trust score for new users
        });

      if (insertError) {
        this.logger.error('Error creating user:', insertError);
        throw insertError;
      }

      this.logger.log(`Created user ${userData.id}`);
      return { action: 'created', id: userData.id };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    const { data, error } = await this.db
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      this.logger.error('Error fetching user:', error);
      return null;
    }

    return data;
  }
}
