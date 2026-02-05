import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateContentLibraryItemDto } from './dto/create-content-library-item.dto';
import { UpdateContentLibraryItemDto } from './dto/update-content-library-item.dto';

@Injectable()
export class ContentLibraryLocalService {
  constructor(private database: DatabaseService) {}

  /**
   * Create a new content library item
   */
  async create(createDto: CreateContentLibraryItemDto, uploadedBy?: string) {
    const name = (createDto.name || '').trim();
    if (!name) {
      throw new BadRequestException('İçerik adı boş olamaz.');
    }
    // Base64 boyut kontrolü: resim 5MB, video 90MB (body limit ile uyumlu)
    const maxSize = createDto.type === 'video' ? 90 * 1024 * 1024 : 5 * 1024 * 1024;
    if (createDto.url && createDto.url.length > maxSize) {
      throw new BadRequestException(
        createDto.type === 'video'
          ? 'Video çok büyük (maksimum ~90MB). Lütfen daha küçük bir video seçin.'
          : 'Resim çok büyük (maksimum 5MB). Lütfen daha küçük bir resim seçin.'
      );
    }

    const result = await this.database.query(
      `INSERT INTO content_library (
        name, category, type, url, content, icon, gradient, color, 
        template, sample, display_order, is_active, uploaded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name,
        createDto.category,
        createDto.type,
        createDto.url || null,
        createDto.content || null,
        createDto.icon || null,
        createDto.gradient || null,
        createDto.color || null,
        createDto.template || null,
        createDto.sample || null,
        createDto.display_order || 0,
        createDto.is_active ?? true,
        uploadedBy || null,
      ]
    );

    return result.rows[0];
  }

  /**
   * Tüm kullanıcı yüklemeleri (uploaded_by NOT NULL) - admin için
   */
  async findUserUploads() {
    const result = await this.database.query(
      `SELECT cl.*, u.email as uploader_email
       FROM content_library cl
       LEFT JOIN users u ON cl.uploaded_by = u.id
       WHERE cl.uploaded_by IS NOT NULL AND cl.is_active = true
       ORDER BY cl.created_at DESC`
    );
    return result.rows;
  }

  /**
   * Giriş yapan kullanıcının kendi yüklemeleri (business_user için)
   */
  async findMyUploads(userId: string) {
    const result = await this.database.query(
      `SELECT cl.*, u.email as uploader_email
       FROM content_library cl
       LEFT JOIN users u ON cl.uploaded_by = u.id
       WHERE cl.uploaded_by = $1 AND cl.is_active = true
       ORDER BY cl.created_at DESC`,
      [userId]
    );
    return result.rows;
  }

  /**
   * Get all content library items
   */
  async findAll(category?: string, type?: string) {
    let query = 'SELECT * FROM content_library WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (category) {
      query += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (type) {
      query += ` AND type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ' ORDER BY category, display_order, name';

    const result = await this.database.query(query, params);
    return result.rows;
  }

  /**
   * Get content library items grouped by category
   */
  async findAllGrouped() {
    const result = await this.database.query(
      `SELECT * FROM content_library 
       WHERE is_active = true 
       ORDER BY category, display_order, name`
    );

    // Group by category
    const grouped: any = {};
    result.rows.forEach((item) => {
      if (!grouped[item.category]) {
        grouped[item.category] = [];
      }
      grouped[item.category].push(item);
    });

    return grouped;
  }

  /**
   * Get a single content library item
   */
  async findOne(id: string) {
    const result = await this.database.query(
      'SELECT * FROM content_library WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Content library item with ID ${id} not found`);
    }

    return result.rows[0];
  }

  /**
   * Update a content library item
   */
  async update(id: string, updateDto: UpdateContentLibraryItemDto) {
    const existing = await this.findOne(id);
    // Base64 boyut kontrolü: resim 5MB, video 90MB
    const type = updateDto.type ?? existing?.type;
    const maxSize = type === 'video' ? 90 * 1024 * 1024 : 5 * 1024 * 1024;
    if (updateDto.url && updateDto.url.length > maxSize) {
      throw new BadRequestException(
        type === 'video'
          ? 'Video çok büyük (maksimum ~90MB). Lütfen daha küçük bir video seçin.'
          : 'Resim çok büyük (maksimum 5MB). Lütfen daha küçük bir resim seçin.'
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateDto.name);
    }
    if (updateDto.category !== undefined) {
      updates.push(`category = $${paramIndex++}`);
      values.push(updateDto.category);
    }
    if (updateDto.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(updateDto.type);
    }
    if (updateDto.url !== undefined) {
      updates.push(`url = $${paramIndex++}`);
      values.push(updateDto.url);
    }
    if (updateDto.content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(updateDto.content);
    }
    if (updateDto.icon !== undefined) {
      updates.push(`icon = $${paramIndex++}`);
      values.push(updateDto.icon);
    }
    if (updateDto.gradient !== undefined) {
      updates.push(`gradient = $${paramIndex++}`);
      values.push(updateDto.gradient);
    }
    if (updateDto.color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(updateDto.color);
    }
    if (updateDto.template !== undefined) {
      updates.push(`template = $${paramIndex++}`);
      values.push(updateDto.template);
    }
    if (updateDto.sample !== undefined) {
      updates.push(`sample = $${paramIndex++}`);
      values.push(updateDto.sample);
    }
    if (updateDto.display_order !== undefined) {
      updates.push(`display_order = $${paramIndex++}`);
      values.push(updateDto.display_order);
    }
    if (updateDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateDto.is_active);
    }

    if (updates.length === 0) {
      return this.findOne(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await this.database.query(
      `UPDATE content_library 
       SET ${updates.join(', ')} 
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Batch update display_order for multiple items
   */
  async reorder(updates: { id: string; display_order: number }[]) {
    for (const { id, display_order } of updates) {
      await this.database.query(
        'UPDATE content_library SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [display_order, id]
      );
    }
    return { success: true };
  }

  /**
   * Remove duplicate items by name: keep one per name (first by id), delete the rest.
   * Returns the number of deleted items and their ids.
   */
  async removeDuplicatesByName(): Promise<{ deleted: number; ids: string[] }> {
    const dupes = await this.database.query(
      `SELECT id FROM (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY id ASC) AS rn
        FROM content_library
      ) sub WHERE rn > 1`
    );
    const ids = (dupes.rows || []).map((r: { id: string }) => r.id);
    if (ids.length === 0) {
      return { deleted: 0, ids: [] };
    }
    for (const id of ids) {
      await this.database.query('DELETE FROM content_library WHERE id = $1', [id]);
    }
    return { deleted: ids.length, ids };
  }

  /**
   * Delete a content library item
   */
  async remove(id: string) {
    const result = await this.database.query(
      'DELETE FROM content_library WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException(`Content library item with ID ${id} not found`);
    }

    return result.rows[0];
  }

  // ========== Categories ==========

  async findAllCategories(activeOnly = false) {
    let query = 'SELECT * FROM content_library_categories';
    if (activeOnly) query += ' WHERE is_active = true';
    query += ' ORDER BY display_order, label';
    const result = await this.database.query(query);
    return result.rows;
  }

  async findOneCategory(id: string) {
    const result = await this.database.query(
      'SELECT * FROM content_library_categories WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Kategori bulunamadı: ${id}`);
    }
    return result.rows[0];
  }

  async createCategory(data: { slug: string; label: string; icon?: string; display_order?: number }) {
    const result = await this.database.query(
      `INSERT INTO content_library_categories (slug, label, icon, display_order)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.slug, data.label, data.icon || '📦', data.display_order ?? 999]
    );
    return result.rows[0];
  }

  async updateCategory(id: string, data: { slug?: string; label?: string; icon?: string; display_order?: number }) {
    const updates: string[] = [];
    const values: any[] = [];
    let i = 1;
    if (data.slug !== undefined) { updates.push(`slug = $${i++}`); values.push(data.slug); }
    if (data.label !== undefined) { updates.push(`label = $${i++}`); values.push(data.label); }
    if (data.icon !== undefined) { updates.push(`icon = $${i++}`); values.push(data.icon); }
    if (data.display_order !== undefined) { updates.push(`display_order = $${i++}`); values.push(data.display_order); }
    if (updates.length === 0) return this.findOneCategory(id);
    updates.push('updated_at = NOW()');
    values.push(id);
    const result = await this.database.query(
      `UPDATE content_library_categories SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async deleteCategory(id: string) {
    const result = await this.database.query(
      'DELETE FROM content_library_categories WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new NotFoundException(`Kategori bulunamadı: ${id}`);
    }
    return result.rows[0];
  }

  async reorderCategories(updates: { id: string; display_order: number }[]) {
    for (const { id, display_order } of updates) {
      await this.database.query(
        'UPDATE content_library_categories SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [display_order, id]
      );
    }
    return { success: true };
  }

}
