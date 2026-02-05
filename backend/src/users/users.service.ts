import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { ScreensLocalService } from '../screens/screens-local.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private database: DatabaseService,
    private screensLocalService: ScreensLocalService,
  ) {}

  /**
   * Create a new user (super_admin her zaman; admin sadece user_create / admin_create yetkisi varsa)
   */
  async create(createUserDto: CreateUserDto, adminUserId: string) {
    const adminResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [adminUserId]
    );
    if (adminResult.rows.length === 0) throw new ForbiddenException('Unauthorized');
    const adminRole = adminResult.rows[0].role as string;
    const role = createUserDto.role || 'business_user';
    if (adminRole === 'super_admin') {
      // ok
    } else if (adminRole === 'admin') {
      const perms = await this.getAdminPermissions(adminUserId);
      const usersPerm = perms['users'];
      if (role === 'business_user' && usersPerm?.user_create !== true) {
        throw new ForbiddenException('Only super admins can create users');
      }
      if ((role === 'admin' || role === 'super_admin') && usersPerm?.admin_create !== true) {
        throw new ForbiddenException('Only super admins can create admin users');
      }
    } else {
      throw new ForbiddenException('Only super admins can create users');
    }

    // Check if email already exists
    const existingUser = await this.database.query(
      'SELECT id FROM users WHERE email = $1',
      [createUserDto.email]
    );

    if (existingUser.rows.length > 0) {
      throw new ForbiddenException('Email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(createUserDto.password, 10);

    // role already set above

    // Admin kullanıcı: business_id ve plan zorunlu değil; referans numarası ADM-00001 formatında
    const businessId = (role === 'admin' || role === 'super_admin') ? null : (createUserDto.business_id || null);
    const isAdminRole = role === 'admin' || role === 'super_admin';

    const insertColumns = isAdminRole
      ? 'INSERT INTO users (email, password_hash, role, business_id, reference_number) VALUES ($1, $2, $3, $4, \'ADM-\' || LPAD(nextval(\'admin_reference_seq\')::text, 5, \'0\')) RETURNING id, email, role, business_id, reference_number, created_at'
      : 'INSERT INTO users (email, password_hash, role, business_id) VALUES ($1, $2, $3, $4) RETURNING id, email, role, business_id, created_at';
    const userResult = await this.database.query(insertColumns, [createUserDto.email, passwordHash, role, businessId]);

    const user = userResult.rows[0];

    // Admin için varsayılan sayfa yetkileri
    if (role === 'admin') {
      await this.setDefaultAdminPermissions(user.id);
    }

    // If plan_id is provided and business_id exists, create subscription (sadece business_user)
    if (role !== 'admin' && createUserDto.plan_id && createUserDto.business_id) {
      await this.assignPlan(createUserDto.business_id, createUserDto.plan_id);
    }

    return user;
  }

  /** Yeni admin için varsayılan yetkiler (sidebar ile aynı sıra: tüm sayfalar, super admin hangi sayfa için yetki verirse o görünsün) */
  private async setDefaultAdminPermissions(adminUserId: string) {
    const defaults: { page_key: string; permission: string }[] = [
      { page_key: 'dashboard', permission: 'full' },
      { page_key: 'menus', permission: 'full' },
      { page_key: 'screens', permission: 'full' },
      { page_key: 'templates', permission: 'full' },
      { page_key: 'editor', permission: 'full' },
      { page_key: 'library', permission: 'full' },
      { page_key: 'user-uploads', permission: 'full' },
      { page_key: 'pricing', permission: 'view' },
      { page_key: 'reports', permission: 'full' },
      { page_key: 'registration_requests', permission: 'full' },
      { page_key: 'users', permission: 'view' },
      { page_key: 'stripe', permission: 'view' },
      { page_key: 'settings', permission: 'view' },
    ];
    for (const { page_key, permission } of defaults) {
      await this.database.query(
        `INSERT INTO admin_permissions (user_id, page_key, permission) VALUES ($1, $2, $3)
         ON CONFLICT (user_id, page_key) DO UPDATE SET permission = $3, updated_at = NOW()`,
        [adminUserId, page_key, permission]
      );
    }
  }

  /** Admin kullanıcının sayfa yetkilerini getir: { page_key: { view: true, edit: false, ... } } - frontend ile aynı format */
  async getAdminPermissions(userId: string): Promise<Record<string, Record<string, boolean>>> {
    const result = await this.database.query(
      'SELECT page_key, permission, actions FROM admin_permissions WHERE user_id = $1',
      [userId]
    );
    const map: Record<string, Record<string, boolean>> = {};
    result.rows.forEach((r: { page_key: string; permission: string; actions?: Record<string, boolean> | null }) => {
      const actions = r.actions && typeof r.actions === 'object' ? (r.actions as Record<string, boolean>) : {};
      map[r.page_key] = { view: r.permission !== 'none', ...actions };
    });
    return map;
  }

  /** Admin yetkilerini güncelle (sadece super_admin); permissions: { page_key: { view: true, edit: false, ... } } */
  async setAdminPermissions(
    targetUserId: string,
    permissions: Record<string, Record<string, boolean>>,
    adminUserId: string
  ) {
    const adminResult = await this.database.query('SELECT role FROM users WHERE id = $1', [adminUserId]);
    if (adminResult.rows.length === 0 || adminResult.rows[0].role !== 'super_admin') {
      throw new ForbiddenException('Sadece super admin yetkileri düzenleyebilir');
    }
    const target = await this.database.query('SELECT role FROM users WHERE id = $1', [targetUserId]);
    if (target.rows.length === 0 || target.rows[0].role !== 'admin') {
      throw new ForbiddenException('Sadece admin kullanıcıların yetkileri düzenlenebilir');
    }
    await this.database.query('DELETE FROM admin_permissions WHERE user_id = $1', [targetUserId]);
    for (const [page_key, val] of Object.entries(permissions)) {
      if (!val || typeof val !== 'object') continue;
      if (val.view !== true) continue;
      const permission = 'view';
      const actions = JSON.stringify(val);
      await this.database.query(
        `INSERT INTO admin_permissions (user_id, page_key, permission, actions) VALUES ($1, $2, $3, $4::jsonb)`,
        [targetUserId, page_key, permission, actions]
      );
    }
    return this.getAdminPermissions(targetUserId);
  }

  /**
   * Get all users (super_admin: tümü; admin: view_business_list / view_admin_list yetkisine göre)
   */
  async findAll(adminUserId: string) {
    const adminResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [adminUserId]
    );
    if (adminResult.rows.length === 0) throw new ForbiddenException('Unauthorized');
    const role = adminResult.rows[0].role as string;
    if (role !== 'super_admin' && role !== 'admin') {
      throw new ForbiddenException('Only admins can view users');
    }

    const result = await this.database.query(
      `SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.business_id,
        u.reference_number,
        u.created_at,
        b.name as business_name,
        b.is_active as business_is_active,
        (CASE WHEN b.id IS NOT NULL AND b.is_active = false THEN 'inactive'
              WHEN s.status = 'active' THEN 'active'
              ELSE NULL END) as subscription_status,
        p.name as plan_name,
        p.max_screens as plan_max_screens,
        (SELECT COUNT(*)::int FROM templates t WHERE t.created_by = u.id AND t.is_active = true) as template_count
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      LEFT JOIN subscriptions s ON s.business_id = u.business_id AND s.status = 'active'
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.role IN ('business_user', 'admin', 'super_admin')
      ORDER BY u.role ASC, u.created_at DESC`
    );

    if (role === 'super_admin') return result.rows;
    const perms = await this.getAdminPermissions(adminUserId);
    const usersPerm = perms['users'];
    const canBusiness = usersPerm?.view_business_list === true;
    const canAdmin = usersPerm?.view_admin_list === true;
    if (!canBusiness && !canAdmin) return [];
    return result.rows.filter((r: { role: string }) =>
      (r.role === 'business_user' && canBusiness) || (r.role !== 'business_user' && canAdmin)
    );
  }

  /**
   * Get user by ID (super_admin her zaman; admin sadece users.view_detail yetkisi varsa)
   */
  async findOne(id: string, adminUserId: string) {
    const adminResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [adminUserId]
    );
    if (adminResult.rows.length === 0) {
      throw new ForbiddenException('Unauthorized');
    }
    const adminRole = adminResult.rows[0].role as string;
    if (adminRole === 'super_admin') {
      // ok
    } else if (adminRole === 'admin') {
      const perms = await this.getAdminPermissions(adminUserId);
      const usersPerm = perms['users'];
      if (!usersPerm || usersPerm.view_detail !== true) {
        throw new ForbiddenException('Only super admins can view user details');
      }
    } else {
      throw new ForbiddenException('Only super admins can view user details');
    }

    const result = await this.database.query(
      `SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.business_id,
        u.reference_number,
        u.created_at,
        b.name as business_name,
        b.is_active as business_is_active,
        (CASE WHEN b.id IS NOT NULL AND b.is_active = false THEN 'inactive'
              WHEN s.status = 'active' THEN 'active'
              ELSE NULL END) as subscription_status,
        p.name as plan_name,
        p.max_screens as plan_max_screens
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      LEFT JOIN subscriptions s ON s.business_id = u.business_id AND s.status = 'active'
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = result.rows[0];
    if (user.role === 'admin') {
      user.admin_permissions = await this.getAdminPermissions(id);
    }
    return user;
  }

  /**
   * Update user (super_admin: admin/super_admin hariç; admin: sadece user_edit yetkisi ve hedef business_user ise)
   */
  async update(id: string, updateUserDto: UpdateUserDto, adminUserId: string) {
    const adminResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [adminUserId]
    );
    if (adminResult.rows.length === 0) throw new ForbiddenException('Unauthorized');
    const adminRole = adminResult.rows[0].role as string;

    const userResult = await this.database.query(
      'SELECT id, role, business_id FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) throw new NotFoundException('User not found');
    const targetRole = userResult.rows[0].role as string;

    if (targetRole === 'super_admin') {
      throw new ForbiddenException('Cannot edit super admin users');
    }
    if (adminRole === 'super_admin') {
      // ok
    } else if (adminRole === 'admin') {
      const perms = await this.getAdminPermissions(adminUserId);
      const usersPerm = perms['users'];
      if (usersPerm?.user_edit !== true) {
        throw new ForbiddenException('Only super admins can update users');
      }
      if (targetRole === 'admin') {
        throw new ForbiddenException('Only super admins can update admin users');
      }
    } else {
      throw new ForbiddenException('Only super admins can update users');
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Update email if provided
    if (updateUserDto.email !== undefined) {
      // Check if email already exists (excluding current user)
      const emailCheck = await this.database.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [updateUserDto.email, id]
      );
      if (emailCheck.rows.length > 0) {
        throw new ForbiddenException('Email already exists');
      }
      updates.push(`email = $${paramIndex++}`);
      values.push(updateUserDto.email);
    }

    // Update password if provided
    if (updateUserDto.password !== undefined && updateUserDto.password.length > 0) {
      const passwordHash = await bcrypt.hash(updateUserDto.password, 10);
      updates.push(`password_hash = $${paramIndex++}`);
      values.push(passwordHash);
    }

    // Update business_id if provided
    if (updateUserDto.business_id !== undefined) {
      updates.push(`business_id = $${paramIndex++}`);
      values.push(updateUserDto.business_id || null);
    }

    // Update user table
    if (updates.length > 0) {
      values.push(id);
      await this.database.query(
        `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
    }

    // Get the business_id to use (new one if provided, otherwise existing)
    const businessId = updateUserDto.business_id !== undefined 
      ? (updateUserDto.business_id || userResult.rows[0].business_id)
      : userResult.rows[0].business_id;

    // Update business active status and name if needed
    if (businessId) {
      const businessUpdates: string[] = [];
      const businessValues: any[] = [];
      let businessParamIndex = 1;

      if (updateUserDto.is_active !== undefined) {
        businessUpdates.push(`is_active = $${businessParamIndex++}`);
        businessValues.push(updateUserDto.is_active);
      }

      if (updateUserDto.business_name !== undefined) {
        businessUpdates.push(`name = $${businessParamIndex++}`);
        businessValues.push(updateUserDto.business_name);
      }

      if (businessUpdates.length > 0) {
        businessValues.push(businessId);
        await this.database.query(
          `UPDATE businesses SET ${businessUpdates.join(', ')}, updated_at = NOW() WHERE id = $${businessParamIndex}`,
          businessValues
        );
      }
    }

    if (updateUserDto.plan_id && businessId) {
      await this.assignPlan(businessId, updateUserDto.plan_id);
    }

    // Admin yetkileri güncelle (sadece super_admin ve hedef kullanıcı admin ise)
    if (updateUserDto.admin_permissions != null && targetRole === 'admin' && adminRole === 'super_admin') {
      await this.setAdminPermissions(id, updateUserDto.admin_permissions, adminUserId);
    }

    return this.findOne(id, adminUserId);
  }

  /**
   * Delete user (super_admin: admin/super_admin hariç; admin: sadece user_delete yetkisi ve hedef business_user ise)
   */
  async remove(id: string, adminUserId: string) {
    const adminResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [adminUserId]
    );
    if (adminResult.rows.length === 0) throw new ForbiddenException('Unauthorized');
    const adminRole = adminResult.rows[0].role as string;

    const userResult = await this.database.query(
      'SELECT role FROM users WHERE id = $1',
      [id]
    );
    if (userResult.rows.length === 0) throw new NotFoundException('User not found');
    const targetRole = userResult.rows[0].role as string;

    if (targetRole === 'super_admin') {
      throw new ForbiddenException('Cannot delete super admin users');
    }
    if (adminRole === 'super_admin') {
      // ok
    } else if (adminRole === 'admin') {
      const perms = await this.getAdminPermissions(adminUserId);
      const usersPerm = perms['users'];
      if (usersPerm?.user_delete !== true) {
        throw new ForbiddenException('Only super admins can delete users');
      }
      if (targetRole === 'admin') {
        throw new ForbiddenException('Only super admins can delete admin users');
      }
    } else {
      throw new ForbiddenException('Only super admins can delete users');
    }

    await this.database.query('DELETE FROM users WHERE id = $1', [id]);
    return { message: 'User deleted successfully' };
  }

  /**
   * Assign plan to business
   */
  private async assignPlan(businessId: string, planId: string) {
    // Check if plan exists
    const planResult = await this.database.query(
      'SELECT id, name, max_screens FROM plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      console.error(`❌ [ASSIGN PLAN] Plan not found: ${planId}`);
      throw new NotFoundException('Plan not found');
    }

    const newMaxScreens = planResult.rows[0].max_screens;

    // Check if business has active subscription
    const subResult = await this.database.query(
      'SELECT id FROM subscriptions WHERE business_id = $1 AND status = $2',
      [businessId, 'active']
    );

    if (subResult.rows.length > 0) {
      // Get old plan to check if limit decreased
      const oldSubResult = await this.database.query(
        `SELECT p.max_screens 
         FROM subscriptions s
         INNER JOIN plans p ON s.plan_id = p.id
         WHERE s.id = $1`,
        [subResult.rows[0].id]
      );

      const oldMaxScreens = oldSubResult.rows.length > 0 ? oldSubResult.rows[0].max_screens : null;

      // Update existing subscription
      await this.database.query(
        'UPDATE subscriptions SET plan_id = $1 WHERE id = $2',
        [planId, subResult.rows[0].id]
      );

      // Plan limiti varsa her zaman fazla ekranları kaldır (3 ekran planında 6 ekran kalmamalı)
      if (newMaxScreens !== -1) {
        await this.removeExcessScreens(businessId, newMaxScreens);
      }
    } else {
      await this.database.query(
        `INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end)
         VALUES ($1, $2, 'active', NOW(), NOW() + INTERVAL '1 month')`,
        [businessId, planId]
      );

      if (newMaxScreens !== -1) {
        await this.removeExcessScreens(businessId, newMaxScreens);
      }
    }

    if (newMaxScreens > 0 && newMaxScreens !== -1) {
      await this.screensLocalService.createScreensForBusiness(businessId, newMaxScreens);
    }
  }

  /**
   * Remove excess screens when plan limit is decreased
   */
  private async removeExcessScreens(businessId: string, maxScreens: number) {
    // Get current screen count
    const countResult = await this.database.query(
      'SELECT COUNT(*) as count FROM screens WHERE business_id = $1',
      [businessId]
    );

    const currentCount = parseInt(countResult.rows[0].count, 10);

    if (currentCount <= maxScreens) {
      return;
    }

    const excessCount = currentCount - maxScreens;

    // Get screens to delete (delete the most recently created ones)
    const screensToDelete = await this.database.query(
      `SELECT id FROM screens 
       WHERE business_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [businessId, excessCount]
    );

    if (screensToDelete.rows.length === 0) {
      return;
    }

    const screenIds = screensToDelete.rows.map((row) => row.id);

    // Delete related data first (screen_menu, screen_block_contents via screen_blocks, menu_schedules)
    // Use try-catch to handle cases where tables might not exist
    try {
      await this.database.query(
        'DELETE FROM screen_menu WHERE screen_id = ANY($1::uuid[])',
        [screenIds]
      );
    } catch (error) {
      console.warn('Error deleting from screen_menu (table might not exist):', error);
    }

    // Delete screen_block_contents via screen_blocks (screen_block_contents references screen_blocks, not screens directly)
    try {
      // First get screen_block_ids
      const screenBlocksResult = await this.database.query(
        'SELECT id FROM screen_blocks WHERE screen_id = ANY($1::uuid[])',
        [screenIds]
      );
      
      if (screenBlocksResult.rows.length > 0) {
        const screenBlockIds = screenBlocksResult.rows.map((row) => row.id);
        // Delete screen_block_contents
        await this.database.query(
          'DELETE FROM screen_block_contents WHERE screen_block_id = ANY($1::uuid[])',
          [screenBlockIds]
        );
        // Delete screen_blocks
        await this.database.query(
          'DELETE FROM screen_blocks WHERE screen_id = ANY($1::uuid[])',
          [screenIds]
        );
      }
    } catch (error) {
      console.warn('Error deleting from screen_blocks/screen_block_contents (table might not exist):', error);
    }

    try {
      await this.database.query(
        'DELETE FROM menu_schedules WHERE screen_id = ANY($1::uuid[])',
        [screenIds]
      );
    } catch (error) {
      console.warn('Error deleting from menu_schedules (table might not exist):', error);
    }

    // Finally delete the screens
    await this.database.query(
      'DELETE FROM screens WHERE id = ANY($1::uuid[])',
      [screenIds]
    );
  }
}
