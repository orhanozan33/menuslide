import { Injectable, Inject, UnauthorizedException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RegistrationRequestsService } from '../registration-requests/registration-requests.service';
import { InvoiceLayoutService } from '../invoice-layout/invoice-layout.service';
import * as bcrypt from 'bcrypt';
const jwt = require('jsonwebtoken');

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'business';
  return `${base}-${Date.now().toString(36)}`;
}

@Injectable()
export class AuthLocalService {
  constructor(
    private database: DatabaseService,
    private registrationRequests: RegistrationRequestsService,
    private invoiceLayoutService: InvoiceLayoutService,
  ) {}

  /**
   * Public self-registration: creates business + user, logs for admin
   */
  async register(dto: {
    businessName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
    province?: string;
    city?: string;
    reference_number?: string;
  }) {
    const email = String(dto.email ?? '').trim();
    const businessName = String(dto.businessName ?? '').trim();
    if (!email || !businessName || !dto.password) {
      throw new UnauthorizedException('Email, business name and password are required');
    }
    if (dto.password.length < 6) {
      throw new UnauthorizedException('Password must be at least 6 characters');
    }

    const existingUser = await this.database.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const slug = slugify(businessName);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const client = await this.database.getClient();
    try {
      await client.query('BEGIN');

      const businessResult = await client.query(
        'INSERT INTO businesses (name, slug, is_active) VALUES ($1, $2, true) RETURNING id, name',
        [businessName, slug]
      );
      const business = businessResult.rows[0];

      // Yeni kullanıcıya sıralı referans numarası (00001, 00002, ...)
      const refResult = await client.query(
        "SELECT LPAD((nextval('user_reference_seq'))::text, 5, '0') AS ref"
      );
      const newReferenceNumber = refResult.rows[0]?.ref ?? null;

      // Kayıt formunda girilen referans numarası = bu kullanıcıyı getiren üyenin numarası
      let referredByUserId: string | null = null;
      const refInput = dto.reference_number ? String(dto.reference_number).trim().replace(/\s/g, '') : '';
      if (refInput) {
        // Önce tam eşleşme (00001), yoksa sayıysa 5 haneye tamamla (1 -> 00001)
        let referrerResult = await client.query(
          'SELECT id FROM users WHERE reference_number = $1 LIMIT 1',
          [refInput]
        );
        if (referrerResult.rows.length === 0 && /^\d+$/.test(refInput)) {
          const padded = refInput.padStart(5, '0');
          referrerResult = await client.query(
            'SELECT id FROM users WHERE reference_number = $1 LIMIT 1',
            [padded]
          );
        }
        if (referrerResult.rows.length > 0) {
          referredByUserId = referrerResult.rows[0].id;
        }
      }

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, role, business_id, reference_number, referred_by_user_id)
         VALUES ($1, $2, 'business_user', $3, $4, $5)
         RETURNING id, email, role, business_id, reference_number`,
        [email, passwordHash, business.id, newReferenceNumber, referredByUserId]
      );
      const user = userResult.rows[0];

      await client.query('COMMIT');

      this.registrationRequests.logNewRegistration({
        businessName,
        email,
        phone: dto.phone,
        address: dto.address,
        province: dto.province,
        city: dto.city,
        reference_number: newReferenceNumber,
        userId: user.id,
        businessId: business.id,
      });

      const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'local-secret-key-change-in-production',
        { expiresIn: '7d' }
      );

      const preferredLocale = 'en';
      return {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          business_id: user.business_id,
          preferred_locale: preferredLocale,
          reference_number: user.reference_number ?? undefined,
        },
        token,
      };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  /**
   * Login user with email and password
   */
  async login(email: string, password: string) {
    const result = await this.database.query(
      `SELECT u.id, u.email, u.password_hash, u.role, u.business_id, u.preferred_locale, u.reference_number, b.is_active as business_is_active
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const user = result.rows[0];

    // Pasif işletme: business_user için giriş engelle
    if (user.role === 'business_user' && user.business_id) {
      if (user.business_is_active === false) {
        throw new UnauthorizedException('Account is deactivated. Please contact admin.');
      }
    }

    // Check if password hash is temporary (needs to be set)
    if (user.password_hash === 'temp_hash_will_be_updated') {
      // Set the password on first login
      const hash = await bcrypt.hash(password, 10);
      await this.database.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hash, user.id]
      );
      user.password_hash = hash;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'local-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    const preferredLocale = (user.preferred_locale === 'tr' || user.preferred_locale === 'fr') ? user.preferred_locale : 'en';
    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        business_id: user.business_id,
        preferred_locale: preferredLocale,
        reference_number: user.reference_number ?? undefined,
      },
      token,
    };
  }

  /** Get current user (for preferred_locale etc.) */
  async getMe(userId: string) {
    const result = await this.database.query(
      `SELECT id, email, role, business_id, preferred_locale, reference_number FROM users WHERE id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    const u = result.rows[0];
    const me: any = {
      id: u.id,
      email: u.email,
      role: u.role,
      business_id: u.business_id,
      preferred_locale: (u.preferred_locale === 'tr' || u.preferred_locale === 'fr') ? u.preferred_locale : 'en',
      reference_number: u.reference_number ?? undefined,
    };
    if (u.role === 'admin') {
      const permResult = await this.database.query(
        'SELECT page_key, permission, actions FROM admin_permissions WHERE user_id = $1',
        [userId]
      );
      me.admin_permissions = {};
      permResult.rows.forEach((r: { page_key: string; permission: string; actions?: Record<string, boolean> | null }) => {
        const actions = r.actions && typeof r.actions === 'object' ? (r.actions as Record<string, boolean>) : {};
        me.admin_permissions[r.page_key] = { view: r.permission !== 'none', ...actions };
      });
    }
    return me;
  }

  /** Update current user preferred locale */
  async updatePreferredLocale(userId: string, preferred_locale: string) {
    const locale = preferred_locale === 'tr' || preferred_locale === 'fr' ? preferred_locale : 'en';
    await this.database.query(
      'UPDATE users SET preferred_locale = $1, updated_at = NOW() WHERE id = $2',
      [locale, userId]
    );
    return { preferred_locale: locale };
  }

  /** Current user account: profile + subscription dates + referred users */
  async getMyAccount(userId: string) {
    const userResult = await this.database.query(
      `SELECT u.id, u.email, u.reference_number, u.business_id, b.name as business_name
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.id = $1`,
      [userId]
    );
    if (userResult.rows.length === 0) return null;
    const user = userResult.rows[0];
    const businessId = user.business_id;

    let subscription: { plan_name: string; current_period_start: string | null; current_period_end: string | null } | null = null;
    if (businessId) {
      const subResult = await this.database.query(
        `SELECT p.display_name as plan_name, s.current_period_start, s.current_period_end
         FROM subscriptions s
         LEFT JOIN plans p ON s.plan_id = p.id
         WHERE s.business_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [businessId]
      );
      if (subResult.rows.length > 0) {
        subscription = {
          plan_name: subResult.rows[0].plan_name,
          current_period_start: subResult.rows[0].current_period_start,
          current_period_end: subResult.rows[0].current_period_end,
        };
      }
    }

    const referredResult = await this.database.query(
      `SELECT u.id, u.email, u.created_at, u.reference_number, b.name as business_name
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.referred_by_user_id = $1 AND u.role = 'business_user'
       ORDER BY u.created_at DESC`,
      [userId]
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name ?? null,
        reference_number: user.reference_number ?? undefined,
      },
      subscription,
      referred_users: referredResult.rows,
    };
  }

  /** Change current user password */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    if (!newPassword || newPassword.length < 6) {
      throw new UnauthorizedException('New password must be at least 6 characters');
    }
    const result = await this.database.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) throw new UnauthorizedException('User not found');
    const match = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!match) throw new UnauthorizedException('Current password is incorrect');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.database.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, userId]
    );
    return { message: 'Password updated' };
  }

  /** Past payments for current user's business, optional date range */
  async getMyPayments(
    userId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<Array<{ id: string; amount: number; currency: string; status: string; payment_date: string; plan_name?: string; invoice_number?: string }>> {
    const userResult = await this.database.query(
      'SELECT business_id FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].business_id) {
      return [];
    }
    const businessId = userResult.rows[0].business_id;

    let sql = `
      SELECT p.id, p.amount, p.currency, p.status, p.payment_date, p.invoice_number, pl.display_name as plan_name
      FROM payments p
      JOIN subscriptions s ON p.subscription_id = s.id
      LEFT JOIN plans pl ON s.plan_id = pl.id
      WHERE s.business_id = $1
    `;
    const params: any[] = [businessId];
    if (startDate) {
      params.push(startDate);
      sql += ` AND p.payment_date >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate + 'T23:59:59.999Z');
      sql += ` AND p.payment_date <= $${params.length}`;
    }
    sql += ` ORDER BY p.payment_date DESC`;

    const result = await this.database.query(sql, params);
    return result.rows.map((r: any) => ({
      id: r.id,
      amount: Number(r.amount),
      currency: r.currency || 'usd',
      status: r.status,
      payment_date: r.payment_date,
      plan_name: r.plan_name ?? undefined,
      invoice_number: r.invoice_number ?? undefined,
    }));
  }

  /** Fatura detayı: ödeme + alıcı bilgisi + admin firma bilgisi (MenuSlide). Faturada sadece admindeki fatura alanı firma bilgileri gösterilir. */
  async getInvoiceForUser(userId: string, paymentId: string): Promise<{
    id: string;
    invoice_number: string;
    amount: number;
    currency: string;
    status: string;
    payment_date: string;
    plan_name: string | null;
    business_name: string | null;
    customer_email: string | null;
    company: {
      company_name: string;
      company_address: string;
      company_phone: string;
      company_email: string;
      footer_legal: string;
      footer_tax_id: string;
    };
  } | null> {
    const userResult = await this.database.query(
      'SELECT business_id, email FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0 || !userResult.rows[0].business_id) return null;
    const businessId = userResult.rows[0].business_id;
    const customerEmail = userResult.rows[0].email ?? null;

    const result = await this.database.query(
      `SELECT p.id, p.invoice_number, p.amount, p.currency, p.status, p.payment_date, pl.display_name as plan_name, b.name as business_name
       FROM payments p
       JOIN subscriptions s ON p.subscription_id = s.id AND s.business_id = $1
       LEFT JOIN plans pl ON s.plan_id = pl.id
       LEFT JOIN businesses b ON b.id = s.business_id
       WHERE p.id = $2`,
      [businessId, paymentId]
    );
    if (result.rows.length === 0) return null;
    const r = result.rows[0];
    const layout = this.invoiceLayoutService.findAll();
    return {
      id: r.id,
      invoice_number: r.invoice_number ?? `INV-${r.id.slice(0, 8)}`,
      amount: Number(r.amount),
      currency: r.currency || 'cad',
      status: r.status,
      payment_date: r.payment_date,
      plan_name: r.plan_name ?? null,
      business_name: r.business_name ?? null,
      customer_email: customerEmail,
      company: {
        company_name: layout.company_name ?? 'MenuSlide',
        company_address: layout.company_address ?? '',
        company_phone: layout.company_phone ?? '',
        company_email: layout.company_email ?? '',
        footer_legal: layout.footer_legal ?? '',
        footer_tax_id: layout.footer_tax_id ?? '',
      },
    };
  }

  /** Admin dashboard: bilgi, referans ile kayıtlı kullanıcılar, %30 gelir, ödeme durumları (sadece role=admin) */
  async getAdminDashboard(adminUserId: string) {
    const adminResult = await this.database.query(
      `SELECT id, email, reference_number FROM users WHERE id = $1 AND role = 'admin'`,
      [adminUserId]
    );
    if (adminResult.rows.length === 0) {
      return null;
    }
    const admin = adminResult.rows[0];

    const referredResult = await this.database.query(
      `SELECT u.id, u.email, u.created_at, u.reference_number, u.business_id, b.name as business_name
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.referred_by_user_id = $1 AND u.role = 'business_user'
       ORDER BY u.created_at DESC`,
      [adminUserId]
    );
    const referredUsers = referredResult.rows;
    const businessIds = referredUsers.map((r: any) => r.business_id).filter(Boolean);

    let paymentTotals: Record<string, { total_paid: number; last_payment_date: string | null }> = {};
    let failureCounts: Record<string, { failure_count: number; last_failure: string | null }> = {};

    if (businessIds.length > 0) {
      const payResult = await this.database.query(
        `SELECT s.business_id,
                COALESCE(SUM(CASE WHEN p.status = 'succeeded' THEN p.amount ELSE 0 END), 0)::numeric AS total_paid,
                MAX(CASE WHEN p.status = 'succeeded' THEN p.payment_date END) AS last_payment_date
         FROM subscriptions s
         LEFT JOIN payments p ON p.subscription_id = s.id
         WHERE s.business_id = ANY($1::uuid[])
         GROUP BY s.business_id`,
        [businessIds]
      );
      payResult.rows.forEach((r: any) => {
        paymentTotals[r.business_id] = {
          total_paid: Number(r.total_paid ?? 0),
          last_payment_date: r.last_payment_date ?? null,
        };
      });

      const failResult = await this.database.query(
        `SELECT business_id, COUNT(*)::int AS failure_count, MAX(attempted_at) AS last_failure
         FROM payment_failures WHERE business_id = ANY($1::uuid[])
         GROUP BY business_id`,
        [businessIds]
      );
      failResult.rows.forEach((r: any) => {
        failureCounts[r.business_id] = {
          failure_count: r.failure_count,
          last_failure: r.last_failure ?? null,
        };
      });
    }

    const COMMISSION_RATE = 0.3;
    let totalReferredPayments = 0;
    const referredWithStatus = referredUsers.map((u: any) => {
      const bid = u.business_id;
      const pay = bid ? paymentTotals[bid] : { total_paid: 0, last_payment_date: null };
      const fail = bid ? failureCounts[bid] : { failure_count: 0, last_failure: null };
      const totalPaid = pay?.total_paid ?? 0;
      totalReferredPayments += totalPaid;
      const commission = totalPaid * COMMISSION_RATE;
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        reference_number: u.reference_number ?? undefined,
        business_name: u.business_name ?? null,
        total_paid: totalPaid,
        last_payment_date: pay?.last_payment_date ?? null,
        commission_earned: Math.round(commission * 100) / 100,
        payment_failure_count: fail?.failure_count ?? 0,
        last_payment_failure: fail?.last_failure ?? null,
      };
    });

    const totalCommission = referredWithStatus.reduce((sum: number, r: any) => sum + (r.commission_earned || 0), 0);

    return {
      admin_info: {
        id: admin.id,
        email: admin.email,
        reference_number: admin.reference_number ?? undefined,
      },
      referred_users: referredWithStatus,
      income_summary: {
        referred_user_count: referredUsers.length,
        total_referred_payments: Math.round(totalReferredPayments * 100) / 100,
        total_commission: Math.round(totalCommission * 100) / 100,
        commission_rate_percent: 30,
      },
      payment_statuses: referredWithStatus.map((u: any) => ({
        user_id: u.id,
        email: u.email,
        business_name: u.business_name,
        last_payment_date: u.last_payment_date,
        total_paid: u.total_paid,
        commission_earned: u.commission_earned,
        payment_failure_count: u.payment_failure_count,
        last_payment_failure: u.last_payment_failure,
      })),
    };
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'local-secret-key-change-in-production'
      ) as any;

      const result = await this.database.query(
        `SELECT u.id, u.email, u.role, u.business_id, b.is_active as business_is_active
         FROM users u
         LEFT JOIN businesses b ON u.business_id = b.id
         WHERE u.id = $1`,
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new UnauthorizedException('User not found');
      }

      const user = result.rows[0];
      // Pasif işletme: API erişimini engelle
      if (user.role === 'business_user' && user.business_id && user.business_is_active === false) {
        throw new UnauthorizedException('Account is deactivated');
      }

      return { id: user.id, email: user.email, role: user.role, business_id: user.business_id };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const result = await this.database.query(
      `SELECT u.id, u.email, u.role, u.business_id, b.is_active as business_is_active
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('User not found');
    }

    return result.rows[0];
  }

  /**
   * Admin: Generate token for target user (impersonation)
   * Sadece super_admin ve admin kullanabilir
   */
  async impersonate(adminUser: { id: string; role: string }, targetUserId: string) {
    if (adminUser.role !== 'super_admin' && adminUser.role !== 'admin') {
      throw new UnauthorizedException('Sadece admin veya super_admin kullanıcı adına giriş yapabilir');
    }
    if (adminUser.id === targetUserId) {
      throw new UnauthorizedException('Kendi hesabınız için impersonate kullanılamaz');
    }

    const targetUser = await this.getUserById(targetUserId);

    const token = jwt.sign(
      { userId: targetUser.id, email: targetUser.email, role: targetUser.role },
      process.env.JWT_SECRET || 'local-secret-key-change-in-production',
      { expiresIn: '2h' } // Kısa süreli impersonation token
    );

    return {
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        business_id: targetUser.business_id,
      },
      token,
    };
  }
}
