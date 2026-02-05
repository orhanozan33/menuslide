import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateScreenBlockContentDto } from './dto/create-screen-block-content.dto';
import { UpdateScreenBlockContentDto } from './dto/update-screen-block-content.dto';

@Injectable()
export class ScreenBlockContentsLocalService {
  constructor(private database: DatabaseService) {}

  async findByScreenBlock(screenBlockId: string) {
    const result = await this.database.query(
      `SELECT * FROM screen_block_contents 
       WHERE screen_block_id = $1 
       ORDER BY display_order ASC, created_at ASC`,
      [screenBlockId]
    );
    return result.rows;
  }

  async findOne(id: string) {
    const result = await this.database.query(
      'SELECT * FROM screen_block_contents WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Screen block content not found');
    }

    return result.rows[0];
  }

  async create(createDto: CreateScreenBlockContentDto) {
    try {
      // Base64 boyut kontrolü: resim 5MB, video 90MB
      const maxUrlSize = createDto.content_type === 'video' ? 90 * 1024 * 1024 : 5 * 1024 * 1024;
      if (createDto.image_url && createDto.image_url.length > maxUrlSize) {
        throw new Error(createDto.content_type === 'video'
          ? 'Video çok büyük (maksimum ~90MB). Lütfen daha küçük bir video seçin.'
          : 'Resim çok büyük (maksimum 5MB). Lütfen daha küçük bir resim seçin.');
      }

      const result = await this.database.query(
        `INSERT INTO screen_block_contents (
          screen_block_id, content_type, image_url, icon_name, title, description,
          price, campaign_text, background_color, background_image_url, text_color,
          menu_item_id, menu_id, display_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          createDto.screen_block_id,
          createDto.content_type,
          createDto.image_url || null,
          createDto.icon_name || null,
          createDto.title || null,
          createDto.description || null,
          createDto.price || null,
          createDto.campaign_text || null,
          createDto.background_color || null,
          createDto.background_image_url || null,
          createDto.text_color || null,
          createDto.menu_item_id || null,
          createDto.menu_id || null,
          createDto.display_order || 0,
          createDto.is_active ?? true,
        ]
      );

      return result.rows[0];
    } catch (error: any) {
      console.error('Error creating screen block content:', error);
      console.error('Content data:', {
        screen_block_id: createDto.screen_block_id,
        content_type: createDto.content_type,
        image_url_length: createDto.image_url?.length || 0,
        title: createDto.title,
      });
      throw error;
    }
  }

  async update(id: string, updateDto: UpdateScreenBlockContentDto) {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const fields = [
      'content_type', 'image_url', 'icon_name', 'title', 'description',
      'price', 'campaign_text', 'background_color', 'background_image_url',
      'text_color', 'menu_item_id', 'menu_id', 'display_order', 'is_active'
    ];

    fields.forEach(field => {
      if (updateDto[field] !== undefined) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(updateDto[field]);
      }
    });

    if (updates.length === 0) {
      return this.findOne(id);
    }

    values.push(id);
    await this.database.query(
      `UPDATE screen_block_contents SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
      values
    );

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.database.query('DELETE FROM screen_block_contents WHERE id = $1', [id]);
    return { message: 'Screen block content deleted successfully' };
  }
}
