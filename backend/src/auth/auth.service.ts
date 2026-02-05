import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class AuthService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  /**
   * Validates JWT token from Supabase Auth
   * Returns user data if valid
   */
  async validateUser(token: string) {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        throw new UnauthorizedException('Invalid token');
      }

      // Get user role and business_id from users table
      const { data: userData, error: userError } = await this.supabase
        .from('users')
        .select('id, email, role, business_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        throw new UnauthorizedException('User not found');
      }

      return userData;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Check if user is super admin
   */
  async isSuperAdmin(userId: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    return data?.role === 'super_admin';
  }
}
