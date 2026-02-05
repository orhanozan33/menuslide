import { Injectable, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesLocalService {
  constructor(
    private database: DatabaseService,
  ) {}

  /**
   * Create a new business (super admin only)
   */
  async create(createBusinessDto: CreateBusinessDto, userId: string) {
    // Check if user is super admin
    const userResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can create businesses');
    }

    const result = await this.database.query(
      'INSERT INTO businesses (name, slug, is_active) VALUES ($1, $2, $3) RETURNING *',
      [createBusinessDto.name, createBusinessDto.slug, createBusinessDto.is_active ?? true]
    );

    return result.rows[0];
  }

  /**
   * Get all businesses (super admin sees all, business users see their own)
   */
  async findAll(userId: string, userRole: string) {
    if (userRole === 'super_admin') {
      const result = await this.database.query('SELECT * FROM businesses ORDER BY created_at DESC');
      return result.rows;
    }

    // Business users only see their own business
    const userResult = await this.database.query(
      'SELECT business_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || !userResult.rows[0].business_id) {
      return [];
    }

    const result = await this.database.query(
      'SELECT * FROM businesses WHERE id = $1',
      [userResult.rows[0].business_id]
    );

    return result.rows;
  }

  /**
   * Get business by ID
   */
  async findOne(id: string, userId: string, userRole: string) {
    // Check access permission
    if (userRole !== 'super_admin') {
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || userResult.rows[0].business_id !== id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const result = await this.database.query(
      'SELECT * FROM businesses WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new ForbiddenException('Business not found');
    }

    return result.rows[0];
  }

  /**
   * Update business
   */
  async update(id: string, updateBusinessDto: UpdateBusinessDto, userId: string, userRole: string) {
    // Check access permission
    if (userRole !== 'super_admin') {
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || userResult.rows[0].business_id !== id) {
        throw new ForbiddenException('Access denied');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateBusinessDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updateBusinessDto.name);
    }
    if (updateBusinessDto.slug !== undefined) {
      updates.push(`slug = $${paramIndex++}`);
      values.push(updateBusinessDto.slug);
    }
    if (updateBusinessDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updateBusinessDto.is_active);
    }
    if (updateBusinessDto.qr_background_image_url !== undefined) {
      updates.push(`qr_background_image_url = $${paramIndex++}`);
      values.push(updateBusinessDto.qr_background_image_url);
    }
    if (updateBusinessDto.qr_background_color !== undefined) {
      updates.push(`qr_background_color = $${paramIndex++}`);
      values.push(updateBusinessDto.qr_background_color);
    }

    if (updates.length === 0) {
      return this.findOne(id, userId, userRole);
    }

    values.push(id);
    const result = await this.database.query(
      `UPDATE businesses SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return result.rows[0];
  }

  /**
   * Delete business (super admin only)
   */
  async remove(id: string, userId: string) {
    const userResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can delete businesses');
    }

    await this.database.query('DELETE FROM businesses WHERE id = $1', [id]);
    return { message: 'Business deleted successfully' };
  }
}
