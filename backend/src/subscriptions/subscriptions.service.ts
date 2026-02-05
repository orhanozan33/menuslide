import { Injectable, Inject, Optional, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SubscriptionsLocalService } from './subscriptions-local.service';

@Injectable()
export class SubscriptionsService {
  private localService: SubscriptionsLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: SubscriptionsLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  /**
   * Get subscription for a business
   */
  async findByBusiness(businessId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.findByBusiness(businessId, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // Check access
    if (userRole !== 'super_admin') {
      const { data: user } = await this.supabase
        .from('users')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (user?.business_id !== businessId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const { data, error } = await this.supabase
      .from('subscriptions')
      .select(`
        *,
        plans (
          id,
          name,
          display_name,
          max_screens,
          price_monthly,
          price_yearly
        )
      `)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return data;
  }

  /**
   * Get payment history for a subscription
   */
  async getPaymentHistory(subscriptionId: string, userId: string, userRole: string) {
    if (this.localService) {
      // For now, return empty array for local service
      // Can be implemented later if needed
      return [];
    }

    // Supabase fallback
    if (!this.supabase) {
      return [];
    }

    // Verify subscription access
    const { data: subscription } = await this.supabase
      .from('subscriptions')
      .select('business_id')
      .eq('id', subscriptionId)
      .single();

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (userRole !== 'super_admin') {
      const { data: user } = await this.supabase
        .from('users')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (user?.business_id !== subscription.business_id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const { data, error } = await this.supabase
      .from('payments')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data;
  }
}
