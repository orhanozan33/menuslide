import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Optional,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';

/**
 * Guard to enforce subscription screen limits
 * Prevents screen creation beyond plan limits
 * Must be used AFTER AuthGuard
 */
@Injectable()
export class SubscriptionLimitGuard implements CanActivate {
  private localDatabase: DatabaseService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localDatabase: DatabaseService,
  ) {
    this.supabase = supabase;
    this.localDatabase = localDatabase || null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      // AuthGuard should have handled this, but just in case
      throw new ForbiddenException('Authentication required');
    }

    // Super admins bypass limits
    if (user.role === 'super_admin') {
      return true;
    }

    // Get business ID from request body or params
    const businessId = request.body?.business_id;
    if (!businessId) {
      return true; // Let validation handle missing business_id
    }

    // Verify user owns this business
    if (user.business_id !== businessId) {
      throw new ForbiddenException('Access denied to this business');
    }

    // Check subscription limit
    let limitCheck = false;

    if (this.localDatabase) {
      // Local database: use SQL function
      try {
        const result = await this.localDatabase.query(
          'SELECT check_screen_limit($1) as can_create',
          [businessId]
        );
        limitCheck = result.rows[0]?.can_create || false;
      } catch (error) {
        console.error('Error checking screen limit (local):', error);
        // If function doesn't exist or error, allow (graceful degradation)
        return true;
      }
    } else if (this.supabase) {
      // Supabase: use RPC
      const { data, error } = await this.supabase
        .rpc('check_screen_limit', { p_business_id: businessId });

      if (error) {
        console.error('Error checking screen limit (supabase):', error);
        // If function doesn't exist or error, allow (graceful degradation)
        return true;
      }

      limitCheck = data || false;
    } else {
      // No database service available, allow (graceful degradation)
      console.warn('No database service available for screen limit check');
      return true;
    }

    if (!limitCheck) {
      throw new ForbiddenException(
        'Screen limit reached for your subscription plan. Please upgrade to add more screens.',
      );
    }

    return true;
  }
}
