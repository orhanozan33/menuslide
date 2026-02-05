import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTemplateBlockContentDto } from './dto/create-template-block-content.dto';

@Injectable()
export class TemplateBlockContentsService {
  constructor(private readonly db: DatabaseService) {}

  async findOne(id: string) {
    const result = await this.db.query(
      'SELECT * FROM template_block_contents WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByBlock(blockId: string) {
    try {
      if (!blockId) {
        throw new Error('blockId gerekli');
      }

      const result = await this.db.query(
        'SELECT * FROM template_block_contents WHERE template_block_id = $1 ORDER BY display_order ASC',
        [blockId]
      );
      
      return result.rows || [];
    } catch (error: any) {
      console.error('Error in findByBlock:', error);
      console.error('Block ID:', blockId);
      throw error;
    }
  }

  async create(dto: CreateTemplateBlockContentDto) {
    try {
      // Handle style_config - convert string to JSON if needed
      const processedDto: any = { ...dto };
      if (processedDto.style_config && typeof processedDto.style_config === 'string') {
        try {
          processedDto.style_config = JSON.parse(processedDto.style_config);
        } catch (e) {
          // If parsing fails, keep as string (PostgreSQL will handle it)
          console.warn('style_config parse failed, keeping as string:', e);
        }
      }

      const keys = Object.keys(processedDto);
      const values = Object.values(processedDto);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columnsStr = keys.join(', ');
      
      const result = await this.db.query(
        `INSERT INTO template_block_contents (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
        values
      );
      return result.rows[0];
    } catch (error: any) {
      console.error('Error creating template block content:', error);
      console.error('DTO:', dto);
      throw error;
    }
  }

  async update(id: string, dto: any) {
    const keys = Object.keys(dto);
    const values = Object.values(dto);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const result = await this.db.query(
      `UPDATE template_block_contents SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async remove(id: string) {
    await this.db.query('DELETE FROM template_block_contents WHERE id = $1', [id]);
    return { success: true };
  }
}
