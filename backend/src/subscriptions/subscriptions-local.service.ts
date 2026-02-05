import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SubscriptionsLocalService {
  constructor(
    private database: DatabaseService,
  ) {}

  /**
   * Get subscription for a business
   */
  async findByBusiness(businessId: string, userId: string, userRole: string) {
    // Check access
    if (userRole !== 'super_admin') {
      const userResult = await this.database.query(
        'SELECT business_id FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0 || userResult.rows[0].business_id !== businessId) {
        throw new ForbiddenException('Access denied');
      }
    }

    const result = await this.database.query(
      `SELECT 
        s.*,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'display_name', p.display_name,
          'max_screens', p.max_screens,
          'price_monthly', p.price_monthly,
          'price_yearly', p.price_yearly
        ) as plans
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE s.business_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1`,
      [businessId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }
}
