import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansLocalService {
  constructor(
    private database: DatabaseService,
  ) {}

  /**
   * Get all active plans (public endpoint)
   */
  async findAll() {
    const result = await this.database.query(
      'SELECT * FROM plans WHERE is_active = true ORDER BY price_monthly ASC'
    );
    return result.rows;
  }

  /**
   * Get all plans including inactive (super_admin only, for settings)
   */
  async findAllForAdmin(userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can list all plans');
    }
    const result = await this.database.query(
      'SELECT * FROM plans ORDER BY price_monthly ASC'
    );
    return result.rows;
  }

  /**
   * Get plan by ID
   */
  async findOne(id: string) {
    const result = await this.database.query(
      'SELECT * FROM plans WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Plan not found');
    }

    return result.rows[0];
  }

  /**
   * Create plan (super admin only)
   */
  async create(createPlanDto: CreatePlanDto, userId: string, userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can create plans');
    }

    const result = await this.database.query(
      `INSERT INTO plans (name, display_name, max_screens, price_monthly, price_yearly, stripe_price_id_monthly, stripe_price_id_yearly, features, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        createPlanDto.name,
        createPlanDto.display_name,
        createPlanDto.max_screens,
        createPlanDto.price_monthly,
        createPlanDto.price_yearly || null,
        createPlanDto.stripe_price_id_monthly || null,
        createPlanDto.stripe_price_id_yearly || null,
        (createPlanDto as any).features ? JSON.stringify((createPlanDto as any).features) : null,
        createPlanDto.is_active ?? true,
      ]
    );

    return result.rows[0];
  }

  /**
   * Update plan (super admin only)
   */
  async update(id: string, updatePlanDto: UpdatePlanDto, userId: string, userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Only admin or super admin can update plans');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updatePlanDto.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(updatePlanDto.name);
    }
    if (updatePlanDto.display_name !== undefined) {
      updates.push(`display_name = $${paramIndex++}`);
      values.push(updatePlanDto.display_name);
    }
    if (updatePlanDto.max_screens !== undefined) {
      updates.push(`max_screens = $${paramIndex++}`);
      values.push(updatePlanDto.max_screens);
    }
    if (updatePlanDto.price_monthly !== undefined) {
      updates.push(`price_monthly = $${paramIndex++}`);
      values.push(updatePlanDto.price_monthly);
    }
    if (updatePlanDto.price_yearly !== undefined) {
      updates.push(`price_yearly = $${paramIndex++}`);
      values.push(updatePlanDto.price_yearly);
    }
    if (updatePlanDto.stripe_price_id_monthly !== undefined) {
      updates.push(`stripe_price_id_monthly = $${paramIndex++}`);
      values.push(updatePlanDto.stripe_price_id_monthly);
    }
    if (updatePlanDto.stripe_price_id_yearly !== undefined) {
      updates.push(`stripe_price_id_yearly = $${paramIndex++}`);
      values.push(updatePlanDto.stripe_price_id_yearly);
    }
    if ((updatePlanDto as any).features !== undefined) {
      updates.push(`features = $${paramIndex++}`);
      values.push(JSON.stringify((updatePlanDto as any).features));
    }
    if (updatePlanDto.is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(updatePlanDto.is_active);
    }

    if (updates.length === 0) {
      return this.findOne(id);
    }

    values.push(id);
    const result = await this.database.query(
      `UPDATE plans SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('Plan not found');
    }

    return result.rows[0];
  }
}
