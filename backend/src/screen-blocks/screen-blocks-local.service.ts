import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ScreenBlocksLocalService {
  constructor(private database: DatabaseService) {}

  /**
   * Initialize screen blocks when a template is assigned to a screen
   */
  async initializeScreenBlocks(screenId: string, templateId: string) {
    // First, delete existing screen blocks for this screen
    await this.database.query(
      'DELETE FROM screen_blocks WHERE screen_id = $1',
      [screenId]
    );

    // Get template blocks
    const templateBlocksResult = await this.database.query(
      'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
      [templateId]
    );

    if (templateBlocksResult.rows.length === 0) {
      throw new NotFoundException('Template blocks not found');
    }

    // Create screen blocks for each template block
    const screenBlocks = [];
    for (const templateBlock of templateBlocksResult.rows) {
      const result = await this.database.query(
        `INSERT INTO screen_blocks (
          screen_id, 
          template_block_id, 
          display_order, 
          is_active,
          position_x,
          position_y,
          width,
          height
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          screenId, 
          templateBlock.id, 
          templateBlock.block_index, 
          true,
          templateBlock.position_x,
          templateBlock.position_y,
          templateBlock.width,
          templateBlock.height
        ]
      );
      screenBlocks.push(result.rows[0]);
    }

    return screenBlocks;
  }

  async findByScreen(screenId: string) {
    const result = await this.database.query(
      `SELECT 
        sb.*,
        tb.block_index,
        COALESCE(sb.position_x, tb.position_x, 0)::DECIMAL as position_x,
        COALESCE(sb.position_y, tb.position_y, 0)::DECIMAL as position_y,
        COALESCE(sb.width, tb.width, 25)::DECIMAL as width,
        COALESCE(sb.height, tb.height, 25)::DECIMAL as height
      FROM screen_blocks sb
      INNER JOIN template_blocks tb ON sb.template_block_id = tb.id
      WHERE sb.screen_id = $1
      ORDER BY COALESCE(sb.z_index, 0) ASC, tb.block_index ASC`,
      [screenId]
    );
    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.database.query(
      'SELECT * FROM screen_blocks WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Screen block not found');
    }

    return result.rows[0];
  }

  async update(id: string, updates: any) {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Position and size fields
    if (updates.position_x !== undefined) {
      updateFields.push(`position_x = $${paramIndex++}`);
      values.push(updates.position_x);
    }
    if (updates.position_y !== undefined) {
      updateFields.push(`position_y = $${paramIndex++}`);
      values.push(updates.position_y);
    }
    if (updates.width !== undefined) {
      updateFields.push(`width = $${paramIndex++}`);
      values.push(updates.width);
    }
    if (updates.height !== undefined) {
      updateFields.push(`height = $${paramIndex++}`);
      values.push(updates.height);
    }

    // Layer and animation fields
    if (updates.z_index !== undefined) {
      updateFields.push(`z_index = $${paramIndex++}`);
      values.push(updates.z_index);
    }
    if (updates.animation_type !== undefined) {
      updateFields.push(`animation_type = $${paramIndex++}`);
      values.push(updates.animation_type);
    }
    if (updates.animation_duration !== undefined) {
      updateFields.push(`animation_duration = $${paramIndex++}`);
      values.push(updates.animation_duration);
    }
    if (updates.animation_delay !== undefined) {
      updateFields.push(`animation_delay = $${paramIndex++}`);
      values.push(updates.animation_delay);
    }

    // Other fields
    if (updates.is_locked !== undefined) {
      updateFields.push(`is_locked = $${paramIndex++}`);
      values.push(updates.is_locked);
    }
    if (updates.is_active !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      values.push(updates.is_active);
    }
    if (updates.display_order !== undefined) {
      updateFields.push(`display_order = $${paramIndex++}`);
      values.push(updates.display_order);
    }

    if (updateFields.length === 0) {
      return this.findOne(id);
    }

    values.push(id);
    await this.database.query(
      `UPDATE screen_blocks SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id);
  }

  /**
   * Batch update multiple blocks (for drag & drop operations)
   */
  async batchUpdate(updates: Array<{ id: string; updates: any }>) {
    const results = [];
    for (const { id, updates: blockUpdates } of updates) {
      const updated = await this.update(id, blockUpdates);
      results.push(updated);
    }
    return results;
  }

  /**
   * Update z_index for layer ordering
   */
  async updateLayerOrder(screenId: string, blockOrders: Array<{ id: string; z_index: number }>) {
    // Update all blocks
    for (const { id, z_index } of blockOrders) {
      await this.database.query(
        'UPDATE screen_blocks SET z_index = $1, updated_at = NOW() WHERE id = $2 AND screen_id = $3',
        [z_index, id, screenId]
      );
    }
    
    // Return updated blocks
    return this.findByScreen(screenId);
  }
}
