import { Injectable, Optional, Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ScreenBlocksLocalService } from './screen-blocks-local.service';

@Injectable()
export class ScreenBlocksService {
  private localService: ScreenBlocksLocalService | null = null;
  private supabase: SupabaseClient | null = null;

  constructor(
    @Inject('SUPABASE_CLIENT') @Optional() supabase: SupabaseClient | null,
    @Optional() localService: ScreenBlocksLocalService,
  ) {
    this.supabase = supabase || null;
    this.localService = localService || null;
  }

  async initializeScreenBlocks(screenId: string, templateId: string) {
    if (this.localService) {
      return this.localService.initializeScreenBlocks(screenId, templateId);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    // Delete existing
    await this.supabase
      .from('screen_blocks')
      .delete()
      .eq('screen_id', screenId);

    // Get template blocks
    const { data: templateBlocks } = await this.supabase
      .from('template_blocks')
      .select('*')
      .eq('template_id', templateId)
      .order('block_index', { ascending: true });

    if (!templateBlocks || templateBlocks.length === 0) {
      throw new Error('Template blocks not found');
    }

    // Create screen blocks
    const screenBlocks = [];
    for (const templateBlock of templateBlocks) {
      const { data } = await this.supabase
        .from('screen_blocks')
        .insert({
          screen_id: screenId,
          template_block_id: templateBlock.id,
          display_order: templateBlock.block_index,
          is_active: true,
          position_x: templateBlock.position_x,
          position_y: templateBlock.position_y,
          width: templateBlock.width,
          height: templateBlock.height,
        })
        .select()
        .single();

      if (data) screenBlocks.push(data);
    }

    return screenBlocks;
  }

  async findByScreen(screenId: string) {
    if (this.localService) {
      return this.localService.findByScreen(screenId);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_blocks')
      .select(`
        *,
        template_blocks (*)
      `)
      .eq('screen_id', screenId)
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
      .from('screen_blocks')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: any) {
    if (this.localService) {
      return this.localService.update(id, updates);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    const { data, error } = await this.supabase
      .from('screen_blocks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async batchUpdate(updates: Array<{ id: string; updates: any }>) {
    if (this.localService) {
      return this.localService.batchUpdate(updates);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    // Supabase batch update (if supported)
    const results = [];
    for (const { id, updates: blockUpdates } of updates) {
      const { data, error } = await this.supabase
        .from('screen_blocks')
        .update(blockUpdates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      if (data) results.push(data);
    }
    return results;
  }

  async updateLayerOrder(screenId: string, blockOrders: Array<{ id: string; z_index: number }>) {
    if (this.localService) {
      return this.localService.updateLayerOrder(screenId, blockOrders);
    }

    if (!this.supabase) {
      throw new Error('Database service not available');
    }

    // Update all blocks
    for (const { id, z_index } of blockOrders) {
      await this.supabase
        .from('screen_blocks')
        .update({ z_index })
        .eq('id', id)
        .eq('screen_id', screenId);
    }

    return this.findByScreen(screenId);
  }
}
