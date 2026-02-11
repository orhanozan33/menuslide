import { Injectable, Inject, ForbiddenException, Optional } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseService } from '../database/database.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';
import { BusinessesLocalService } from './businesses-local.service';

@Injectable()
export class BusinessesService {
  private localService: BusinessesLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: BusinessesLocalService,
  ) {
    this.supabase = supabase;
    this.localService = localService || null;
  }

  /**
   * Create a new business (super admin only)
   */
  async create(createBusinessDto: CreateBusinessDto, userId: string) {
    if (this.localService) {
      return this.localService.create(createBusinessDto, userId);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // Check if user is super admin
    const { data: user } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (user?.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create businesses');
    }

    const { data, error } = await this.supabase
      .from('businesses')
      .insert(createBusinessDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all businesses (super admin sees all, business users see their own)
   */
  async findAll(userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.findAll(userId, userRole);
    }

    // Supabase fallback
    let query = this.supabase!.from('businesses').select('*');

    if (userRole !== 'super_admin') {
      const { data: user } = await this.supabase!
        .from('users')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (user?.business_id) {
        query = query.eq('id', user.business_id);
      } else {
        return [];
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  /**
   * Get business by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.findOne(id, userId, userRole);
    }

    // Supabase fallback
    if (!this.supabase) {
      throw new ForbiddenException('Database service not available');
    }

    // Check access permission
    if (userRole !== 'super_admin') {
      const { data: user } = await this.supabase
        .from('users')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (user?.business_id !== id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const { data, error } = await this.supabase
      .from('businesses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update business
   */
  async update(id: string, updateBusinessDto: UpdateBusinessDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.update(id, updateBusinessDto, userId, userRole);
    }

    // Supabase fallback
    if (userRole !== 'super_admin') {
      const { data: user } = await this.supabase!
        .from('users')
        .select('business_id')
        .eq('id', userId)
        .single();

      if (user?.business_id !== id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const { data, error } = await this.supabase!
      .from('businesses')
      .update(updateBusinessDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete business (super admin only)
   */
  async remove(id: string, userId: string) {
    if (this.localService) {
      return this.localService.remove(id, userId);
    }

    // Supabase fallback
    const { data: user } = await this.supabase!
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (user?.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can delete businesses');
    }

    // Supabase: Cascade temizlik için RPC kullan (ekranlar, menüler, abonelik vb.)
    const { error } = await this.supabase!.rpc('delete_business_cascade', {
      p_business_id: id,
    });

    if (error) throw error;
    return { message: 'Business deleted successfully' };
  }
}
