import { Injectable, Optional, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ScreenBlockContentsLocalService } from './screen-block-contents-local.service';
import { CreateScreenBlockContentDto } from './dto/create-screen-block-content.dto';
import { UpdateScreenBlockContentDto } from './dto/update-screen-block-content.dto';

@Injectable()
export class ScreenBlockContentsService {
  private localService: ScreenBlockContentsLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: ScreenBlockContentsLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  async findByScreenBlock(screenBlockId: string) {
    if (this.localService) {
      return this.localService.findByScreenBlock(screenBlockId);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_block_contents')
      .select('*')
      .eq('screen_block_id', screenBlockId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data;
  }

  async findOne(id: string) {
    if (this.localService) {
      return this.localService.findOne(id);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_block_contents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async create(createDto: CreateScreenBlockContentDto) {
    if (this.localService) {
      return this.localService.create(createDto);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_block_contents')
      .insert(createDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updateDto: UpdateScreenBlockContentDto) {
    if (this.localService) {
      return this.localService.update(id, updateDto);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_block_contents')
      .update(updateDto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async remove(id: string) {
    if (this.localService) {
      return this.localService.remove(id);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { error } = await this.supabase
      .from('screen_block_contents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { message: 'Screen block content deleted successfully' };
  }
}
