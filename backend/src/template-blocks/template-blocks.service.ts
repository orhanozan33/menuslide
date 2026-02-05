import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateTemplateBlockDto } from './dto/create-template-block.dto';

@Injectable()
export class TemplateBlocksService {
  constructor(private readonly db: DatabaseService) {}

  async findOne(id: string) {
    const result = await this.db.query(
      'SELECT * FROM template_blocks WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findByTemplate(templateId: string) {
    const result = await this.db.query(
      'SELECT * FROM template_blocks WHERE template_id = $1 ORDER BY block_index ASC',
      [templateId]
    );
    return result.rows;
  }

  async create(dto: CreateTemplateBlockDto) {
    const keys = Object.keys(dto);
    const values = Object.values(dto);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const columnsStr = keys.join(', ');
    
    const result = await this.db.query(
      `INSERT INTO template_blocks (${columnsStr}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async update(id: string, dto: any) {
    const keys = Object.keys(dto);
    const values = Object.values(dto);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    
    const result = await this.db.query(
      `UPDATE template_blocks SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...values, id]
    );
    return result.rows[0];
  }

  async remove(id: string) {
    await this.db.query('DELETE FROM template_blocks WHERE id = $1', [id]);
    return { success: true };
  }

  async batchUpdate(updates: Array<{ id: string; updates: { position_x?: number; position_y?: number; width?: number; height?: number; block_index?: number } }>) {
    const results = [];
    for (const { id, updates: blockUpdates } of updates) {
      const updated = await this.update(id, blockUpdates);
      results.push(updated);
    }
    return results;
  }
}
