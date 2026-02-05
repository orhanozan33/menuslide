import { Injectable, Optional, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { TemplatesLocalService } from './templates-local.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateSystemTemplatesDto } from './dto/create-system-templates.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { SaveTemplateFromScreenDto } from './dto/save-template-from-screen.dto';
import { ApplyTemplateDto } from './dto/apply-template.dto';
import { DuplicateTemplateDto } from './dto/duplicate-template.dto';
import { SaveAsTemplateDto } from './dto/save-as-template.dto';
import { SaveCanvasAsTemplateDto } from './dto/save-canvas-as-template.dto';

@Injectable()
export class TemplatesService {
  private localService: TemplatesLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: TemplatesLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  async findAll(userId?: string, userRole?: string) {
    if (this.localService) {
      return this.localService.findAll(userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .order('block_count', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    if (this.localService) {
      return this.localService.findOne(id, userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('templates')
      .select(`
        *,
        template_blocks (*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(createTemplateDto: CreateTemplateDto, userId: string, userRole?: string) {
    if (this.localService) {
      return this.localService.create(createTemplateDto, userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('templates')
      .insert(createTemplateDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updateTemplateDto: UpdateTemplateDto, userId?: string, userRole?: string) {
    if (this.localService) {
      return this.localService.update(id, updateTemplateDto, userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('templates')
      .update(updateTemplateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string, userId?: string, userRole?: string) {
    if (this.localService) {
      return this.localService.remove(id, userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    // Check if system template
    const { data: template } = await this.supabase
      .from('templates')
      .select('is_system')
      .eq('id', id)
      .single();

    if (template?.is_system) {
      throw new Error('Cannot delete system templates');
    }

    const { error } = await this.supabase
      .from('templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Template deleted successfully' };
  }

  async findByScope(scope: 'system' | 'user', businessId?: string, userId?: string, userRole?: string) {
    if (this.localService) {
      return this.localService.findByScope(scope, businessId, userId, userRole);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    let query = this.supabase
      .from('templates')
      .select('*')
      .eq('scope', scope)
      .eq('is_active', true);

    if (scope === 'user' && businessId) {
      query = query.eq('business_id', businessId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async saveFromScreen(dto: SaveTemplateFromScreenDto, userId: string, userRole?: string) {
    if (this.localService) {
      return this.localService.saveFromScreen(dto, userId, userRole);
    }

    // Supabase implementation would go here
    throw new Error('Supabase implementation not yet available');
  }

  async applyToScreen(dto: ApplyTemplateDto) {
    if (this.localService) {
      return this.localService.applyToScreen(dto);
    }

    // Supabase implementation would go here
    throw new Error('Supabase implementation not yet available');
  }

  async duplicate(templateId: string, dto: DuplicateTemplateDto, userId: string) {
    if (this.localService) {
      return this.localService.duplicate(templateId, dto, userId);
    }

    // Supabase implementation would go here
    throw new Error('Supabase implementation not yet available');
  }

  async saveAs(templateId: string, dto: SaveAsTemplateDto, adminUserId: string, userRole?: string) {
    if (this.localService) {
      return this.localService.saveAs(templateId, dto, adminUserId, userRole);
    }
    throw new Error('Database service not available');
  }

  async saveCanvasAsTemplate(dto: SaveCanvasAsTemplateDto, userId: string, userRole?: string) {
    if (this.localService) {
      return this.localService.saveCanvasAsTemplate(dto, userId, userRole);
    }
    throw new Error('Database service not available');
  }

  async getTemplateBlocks(templateId: string) {
    if (this.localService) {
      return this.localService.getTemplateBlocks(templateId);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('template_blocks')
      .select('*')
      .eq('template_id', templateId)
      .order('block_index', { ascending: true });

    if (error) throw error;
    return data;
  }

  async createSystemTemplates(dto: CreateSystemTemplatesDto, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.createSystemTemplates(dto, userId, userRole);
    }
    throw new Error('Database service not available');
  }

  async createMenuFromProducts(templateId: string, userId: string, userRole: string) {
    if (this.localService) {
      return this.localService.createMenuFromProducts(templateId, userId, userRole);
    }

    console.error(`🔴 [SERVICE] LocalService mevcut değil!`);
    throw new Error('Database service not available');
  }
}
