import { Injectable, Inject, Optional, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansLocalService } from './plans-local.service';

@Injectable()
export class PlansService {
  private localService: PlansLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: PlansLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
    
  }

  /**
   * Get all plans including inactive (super_admin only)
   */
  async findAllForAdmin(userRole: string) {
    if (this.localService) {
      return this.localService.findAllForAdmin(userRole);
    }
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can list all plans');
    }
    const { data, error } = await this.supabase!
      .from('plans')
      .select('*')
      .order('price_monthly', { ascending: true });
    if (error) throw error;
    return data;
  }

  /**
   * Get all active plans (public endpoint)
   */
  async findAll() {
    if (this.localService) {
      return this.localService.findAll();
    }

    // Supabase fallback
    const { data, error } = await this.supabase!
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get plan by ID
   */
  async findOne(id: string) {
    if (this.localService) {
      return this.localService.findOne(id);
    }

    // Supabase fallback
    const { data, error } = await this.supabase!
      .from('plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create plan (super admin only)
   */
  async create(createPlanDto: CreatePlanDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.create(createPlanDto, userId, userRole);
    }

    // Supabase fallback
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can create plans');
    }

    const { data, error } = await this.supabase!
      .from('plans')
      .insert(createPlanDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update plan (super admin only)
   */
  async update(id: string, updatePlanDto: UpdatePlanDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.update(id, updatePlanDto, userId, userRole);
    }

    // Supabase fallback
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update plans');
    }

    const { data, error } = await this.supabase!
      .from('plans')
      .update(updatePlanDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
