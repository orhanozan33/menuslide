import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(
    @Inject('SUPABASE_CLIENT') private supabase: SupabaseClient,
  ) {}

  /**
   * Get all active languages
   */
  async findAll() {
    const { data, error } = await this.supabase
      .from('languages')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  /**
   * Get default language
   */
  async findDefault() {
    const { data, error } = await this.supabase
      .from('languages')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create language (super admin only)
   */
  async create(createLanguageDto: CreateLanguageDto, userId: string, userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create languages');
    }

    const { data, error } = await this.supabase
      .from('languages')
      .insert(createLanguageDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update language (super admin only)
   */
  async update(id: string, updateLanguageDto: UpdateLanguageDto, userId: string, userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Only super admins can update languages');
    }

    const { data, error } = await this.supabase
      .from('languages')
      .update(updateLanguageDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
