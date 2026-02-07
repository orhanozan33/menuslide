import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RegistrationRequestsService } from '../registration-requests/registration-requests.service';

@Injectable()
export class ReportsService {
  constructor(
    private database: DatabaseService,
    private registrationRequests: RegistrationRequestsService,
  ) {}

  async getStats(userRole: string, revenueFrom?: string, revenueTo?: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const fromDate = revenueFrom ? new Date(revenueFrom) : null;
    const toDate = revenueTo ? new Date(revenueTo) : null;
    const hasDateRange = fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime());

    const [revenueResult, revenueThisMonthResult, revenueRangeResult] = await Promise.all([
      this.database.query(
        "SELECT COALESCE(SUM(amount)::decimal, 0) as total FROM payments WHERE status = 'succeeded'",
        []
      ),
      this.database.query(
        `SELECT COALESCE(SUM(amount)::decimal, 0) as total FROM payments 
         WHERE status = 'succeeded' AND payment_date >= date_trunc('month', CURRENT_DATE)`,
        []
      ),
      hasDateRange
        ? this.database.query(
            `SELECT COALESCE(SUM(amount)::decimal, 0) as total FROM payments 
             WHERE status = 'succeeded' 
             AND payment_date >= $1::timestamp 
             AND payment_date < ($2::timestamp + INTERVAL '1 day')`,
            [revenueFrom, revenueTo]
          )
        : Promise.resolve({ rows: [{ total: null }] }),
    ]);

    const [
      totalUsersResult,
      totalBusinessesResult,
      totalScreensResult,
      newUsers7dResult,
      newUsers30dResult,
      activeSubscriptionsResult,
      totalSubscriptionsResult,
      usersWithSubResult,
      usersWithoutSubResult,
      businessesWithSubResult,
      businessesWithoutSubResult,
    ] = await Promise.all([
      this.database.query(
        "SELECT COUNT(*)::int as count FROM users WHERE role = 'business_user'",
        []
      ),
      this.database.query(
        `SELECT COUNT(DISTINCT b.id)::int as count FROM businesses b
         INNER JOIN users u ON u.business_id = b.id AND u.role = 'business_user'
         WHERE b.is_active = true`,
        []
      ),
      this.database.query('SELECT COUNT(*)::int as count FROM screens', []),
      this.database.query(
        "SELECT COUNT(*)::int as count FROM users WHERE role = 'business_user' AND created_at >= NOW() - INTERVAL '7 days'",
        []
      ),
      this.database.query(
        "SELECT COUNT(*)::int as count FROM users WHERE role = 'business_user' AND created_at >= NOW() - INTERVAL '30 days'",
        []
      ),
      this.database.query(
        `SELECT COUNT(*)::int as count FROM subscriptions s
         INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
         WHERE s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())`,
        []
      ),
      this.database.query('SELECT COUNT(*)::int as count FROM subscriptions', []),
      this.database.query(
        `SELECT COUNT(DISTINCT u.id)::int as count FROM users u
         INNER JOIN businesses b ON u.business_id = b.id
         INNER JOIN subscriptions s ON s.business_id = b.id AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())
         INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
         WHERE u.role = 'business_user'`,
        []
      ),
      this.database.query(
        `SELECT COUNT(*)::int as count FROM users u
         WHERE u.role = 'business_user'
         AND (u.business_id IS NULL OR NOT EXISTS (
           SELECT 1 FROM subscriptions s
           INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
           WHERE s.business_id = u.business_id AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())
         ))`,
        []
      ),
      this.database.query(
        `SELECT COUNT(DISTINCT b.id)::int as count FROM businesses b
         INNER JOIN users u ON u.business_id = b.id AND u.role = 'business_user'
         INNER JOIN subscriptions s ON s.business_id = b.id AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())
         INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
         WHERE b.is_active = true`,
        []
      ),
      this.database.query(
        `SELECT COUNT(DISTINCT b.id)::int as count FROM businesses b
         INNER JOIN users u ON u.business_id = b.id AND u.role = 'business_user'
         WHERE b.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM subscriptions s
           INNER JOIN plans p ON s.plan_id = p.id AND p.max_screens > 0
           WHERE s.business_id = b.id AND s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW())
         )`,
        []
      ),
    ]);

    return {
      totalUsers: totalUsersResult.rows[0]?.count ?? 0,
      totalBusinesses: totalBusinessesResult.rows[0]?.count ?? 0,
      totalScreens: totalScreensResult.rows[0]?.count ?? 0,
      newUsers7d: newUsers7dResult.rows[0]?.count ?? 0,
      newUsers30d: newUsers30dResult.rows[0]?.count ?? 0,
      activeSubscriptions: activeSubscriptionsResult.rows[0]?.count ?? 0,
      totalSubscriptions: totalSubscriptionsResult.rows[0]?.count ?? 0,
      usersWithSubscription: usersWithSubResult.rows[0]?.count ?? 0,
      usersWithoutSubscription: usersWithoutSubResult.rows[0]?.count ?? 0,
      businessesWithSubscription: businessesWithSubResult.rows[0]?.count ?? 0,
      businessesWithoutSubscription: businessesWithoutSubResult.rows[0]?.count ?? 0,
      revenue: parseFloat(String(revenueResult.rows[0]?.total ?? 0)),
      revenueThisMonth: parseFloat(String(revenueThisMonthResult.rows[0]?.total ?? 0)),
      revenueInRange: hasDateRange ? parseFloat(String(revenueRangeResult.rows[0]?.total ?? 0)) : null,
      revenueFrom: hasDateRange ? revenueFrom : null,
      revenueTo: hasDateRange ? revenueTo : null,
    };
  }

  async getUsersWithSubscriptionStatus(userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const result = await this.database.query(
      `SELECT 
        u.id, u.email, u.created_at, u.reference_number, u.business_id,
        b.name as business_name,
        (CASE WHEN s.status = 'active' AND (s.current_period_end IS NULL OR s.current_period_end >= NOW()) AND p.max_screens > 0 THEN 'active' ELSE 'none' END) as subscription_status,
        p.display_name as plan_name,
        p.max_screens as plan_max_screens
      FROM users u
      LEFT JOIN businesses b ON u.business_id = b.id
      LEFT JOIN subscriptions s ON s.business_id = u.business_id AND s.status = 'active'
      LEFT JOIN plans p ON s.plan_id = p.id
      WHERE u.role = 'business_user'
      ORDER BY u.created_at DESC`
    );

    return result.rows;
  }

  async getPaymentStatus(userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const [recentPayments, failedPayments, overdueSubscriptions] = await Promise.all([
      this.database.query(
        `SELECT p.id, p.amount, p.currency, p.payment_date, p.status,
                b.name as business_name,
                (SELECT email FROM users WHERE business_id = b.id AND role = 'business_user' LIMIT 1) as user_email
         FROM payments p
         INNER JOIN subscriptions s ON p.subscription_id = s.id
         INNER JOIN businesses b ON s.business_id = b.id
         WHERE p.status = 'succeeded'
         ORDER BY p.payment_date DESC
         LIMIT 100`,
        []
      ),
      this.database.query(
        `SELECT pf.id, pf.subscription_id, pf.amount, pf.currency, pf.failure_reason, pf.attempted_at,
                b.name as business_name,
                (SELECT email FROM users WHERE business_id = b.id AND role = 'business_user' LIMIT 1) as user_email
         FROM payment_failures pf
         INNER JOIN businesses b ON pf.business_id = b.id
         ORDER BY pf.attempted_at DESC
         LIMIT 100`,
        []
      ),
      this.database.query(
        `SELECT s.id, s.current_period_end, s.status,
                b.name as business_name,
                p.display_name as plan_name,
                (SELECT email FROM users WHERE business_id = b.id AND role = 'business_user' LIMIT 1) as user_email
         FROM subscriptions s
         INNER JOIN businesses b ON s.business_id = b.id
         INNER JOIN plans p ON s.plan_id = p.id
         WHERE s.status IN ('past_due', 'unpaid')
            OR (s.status = 'active' AND s.current_period_end < NOW())
         ORDER BY s.current_period_end ASC NULLS LAST
         LIMIT 100`,
        []
      ),
    ]);

    return {
      recentPayments: recentPayments.rows,
      failedPayments: failedPayments.rows,
      overdueSubscriptions: overdueSubscriptions.rows,
    };
  }

  /**
   * Mark subscription as paid (e.g. cash received). Sets status active and extends period.
   */
  async markSubscriptionPaid(
    subscriptionId: string,
    userRole: string,
    periodMonths: number = 1,
  ) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const result = await this.database.query(
      'SELECT id, business_id FROM subscriptions WHERE id = $1',
      [subscriptionId],
    );
    if (result.rows.length === 0) {
      throw new NotFoundException('Subscription not found');
    }
    const businessId = result.rows[0].business_id as string;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + periodMonths);
    await this.database.query(
      `UPDATE subscriptions SET status = 'active', current_period_start = $1, current_period_end = $2, updated_at = NOW()
       WHERE id = $3`,
      [now.toISOString(), periodEnd.toISOString(), subscriptionId],
    );
    // Abonelik tekrar aktif olduğunda ekranları ve önceden yayınlanan şablonları tekrar aç
    if (businessId) {
      await this.database.query(
        'UPDATE screens SET is_active = true WHERE business_id = $1',
        [businessId],
      );
      await this.database.query(
        `UPDATE screen_template_rotations str SET is_active = true
         FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
        [businessId],
      );
    }
    return { message: 'Subscription marked as paid', current_period_end: periodEnd.toISOString() };
  }

  /**
   * Test: Simulate payment failed for a business (super_admin only). Sets subscription past_due, stops screens, inserts a test payment_failure.
   */
  async simulatePaymentFailed(businessId: string, userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
    const subResult = await this.database.query(
      `SELECT id FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [businessId],
    );
    if (subResult.rows.length === 0) {
      throw new NotFoundException('No subscription found for this business');
    }
    const subId = subResult.rows[0].id;
    await this.database.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE id = $1`,
      [subId],
    );
    await this.database.query(
      `INSERT INTO payment_failures (subscription_id, business_id, amount, currency, failure_reason, attempted_at)
       VALUES ($1, $2, 0, 'cad', 'Test: Simulated payment failed', NOW())`,
      [subId, businessId],
    );
    await this.database.query(
      'UPDATE screens SET is_active = false WHERE business_id = $1',
      [businessId],
    );
    await this.database.query(
      `UPDATE screen_template_rotations str SET is_active = false
       FROM screens s WHERE s.business_id = $1 AND str.screen_id = s.id`,
      [businessId],
    );
    return { message: 'Simulated payment failed for business', subscription_id: subId };
  }

  /**
   * Test: Simulate payment received = mark subscription as paid (super_admin only, for testing).
   */
  async simulatePaymentReceived(subscriptionId: string, userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
    return this.markSubscriptionPaid(subscriptionId, userRole, 1);
  }

  /**
   * Test: Insert one "payment received" and one "payment failed" row so reports show sample data (super_admin only).
   */
  async seedPaymentExamples(userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
    const subResult = await this.database.query(
      `SELECT s.id, s.business_id FROM subscriptions s
       INNER JOIN businesses b ON s.business_id = b.id
       ORDER BY s.created_at DESC LIMIT 2`,
      [],
    );
    if (subResult.rows.length === 0) {
      throw new NotFoundException('No subscription found. Create a user with a plan first.');
    }
    const sub1 = subResult.rows[0];
    const sub2 = subResult.rows.length > 1 ? subResult.rows[1] : sub1;

    const paymentIntentId = `test_pi_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await this.database.query(
      `INSERT INTO payments (subscription_id, stripe_payment_intent_id, amount, currency, status, payment_date)
       VALUES ($1, $2, 29.99, 'cad', 'succeeded', NOW())`,
      [sub1.id, paymentIntentId],
    );

    await this.database.query(
      `INSERT INTO payment_failures (subscription_id, business_id, amount, currency, failure_reason, attempted_at)
       VALUES ($1, $2, 29.99, 'cad', 'Test: Ödeme alınamadı (örnek kayıt)', NOW())`,
      [sub2.id, sub2.business_id],
    );

    return {
      message: 'Test verisi eklendi: 1 ödeme alındı + 1 ödeme alınamadı kaydı.',
      payment_added: true,
      payment_failure_added: true,
    };
  }

  /**
   * Test: Orhan senaryosu — 3 aydır abone, 2 ödeme yaptı 1 yapmadı.
   * "Ödeme alındı" kartında 2 satır, "Ödeme alınamadı" kartında 1 satır, "Gecikmiş" kartında 1 satır görünür.
   */
  async seedOrhanScenario(userRole: string) {
    if (userRole !== 'super_admin') {
      throw new ForbiddenException('Super admin only');
    }
    const userResult = await this.database.query(
      `SELECT u.id, u.business_id FROM users u
       WHERE u.role = 'business_user' AND (u.email ILIKE '%orhan%' OR u.business_id IN (SELECT business_id FROM subscriptions LIMIT 1))
       ORDER BY CASE WHEN u.email ILIKE '%orhan%' THEN 0 ELSE 1 END
       LIMIT 1`,
      [],
    );
    if (userResult.rows.length === 0) {
      throw new NotFoundException('Kullanıcı bulunamadı. Önce bir business_user oluşturun.');
    }
    const businessId = userResult.rows[0].business_id;
    if (!businessId) {
      throw new NotFoundException('Kullanıcının işletmesi yok.');
    }
    const subResult = await this.database.query(
      'SELECT id FROM subscriptions WHERE business_id = $1 ORDER BY created_at DESC LIMIT 1',
      [businessId],
    );
    if (subResult.rows.length === 0) {
      throw new NotFoundException('Bu işletme için abonelik yok. Önce paket alın.');
    }
    const subId = subResult.rows[0].id;

    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    await this.database.query(
      `INSERT INTO payments (subscription_id, stripe_payment_intent_id, amount, currency, status, payment_date)
       VALUES ($1, $2, 29.99, 'cad', 'succeeded', $3)`,
      [subId, `test_orhan_1_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, twoMonthsAgo.toISOString()],
    );
    await this.database.query(
      `INSERT INTO payments (subscription_id, stripe_payment_intent_id, amount, currency, status, payment_date)
       VALUES ($1, $2, 29.99, 'cad', 'succeeded', $3)`,
      [subId, `test_orhan_2_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`, oneMonthAgo.toISOString()],
    );

    await this.database.query(
      `INSERT INTO payment_failures (subscription_id, business_id, amount, currency, failure_reason, attempted_at)
       VALUES ($1, $2, 29.99, 'cad', 'Kart reddedildi / Ödeme alınamadı', NOW())`,
      [subId, businessId],
    );

    await this.database.query(
      `UPDATE subscriptions SET status = 'past_due', updated_at = NOW() WHERE id = $1`,
      [subId],
    );

    return {
      message: 'Orhan senaryosu eklendi: 2 ödeme alındı, 1 ödeme alınamadı. Yeşil kartta 2 satır, kırmızı ve sarı kartta 1’er satır göreceksiniz.',
      payments_added: 2,
      payment_failure_added: 1,
      subscription_past_due: true,
    };
  }

  /**
   * Test verilerini sil: stripe_payment_intent_id 'test_%' ile başlayan ödemeler ve
   * stripe_invoice_id olmayan (test) payment_failures kayıtları.
   */
  async deleteTestData(userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const paymentsResult = await this.database.query(
      `DELETE FROM payments WHERE stripe_payment_intent_id LIKE 'test_%' RETURNING id`,
      [],
    );
    const failuresResult = await this.database.query(
      `DELETE FROM payment_failures WHERE stripe_invoice_id IS NULL RETURNING id`,
      [],
    );
    return {
      message: 'Test verileri silindi.',
      payments_deleted: paymentsResult.rows.length,
      payment_failures_deleted: failuresResult.rows.length,
    };
  }

  /**
   * Get detailed user report for admin
   */
  async getUserDetailReport(userId: string, adminUserId: string, adminRole: string) {
    if (adminRole !== 'super_admin' && adminRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    const userResult = await this.database.query(
      `SELECT u.id, u.email, u.created_at, u.business_id, u.reference_number,
              b.name as business_name, b.is_active as business_is_active
       FROM users u
       LEFT JOIN businesses b ON u.business_id = b.id
       WHERE u.id = $1 AND u.role = 'business_user'`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundException('User not found');
    }

    const user = userResult.rows[0];
    const businessId = user.business_id;

    // Get phone & address from registration log (if available)
    let phone: string | null = null;
    let address: string | null = null;
    try {
      const regList = await this.registrationRequests.findAll(adminUserId, adminRole);
      const reg = regList.find((r) => r.email === user.email && r.status === 'registered');
      if (reg) {
        phone = reg.phone ?? null;
        address = reg.address ?? null;
      }
    } catch {
      // ignore if registration data not available
    }

    // Screens count: active (yayında) vs inactive (yayında değil)
    let screensActive = 0;
    let screensInactive = 0;
    if (businessId) {
      const screensResult = await this.database.query(
        `SELECT 
          COUNT(*) FILTER (WHERE is_active = true)::int as active,
          COUNT(*) FILTER (WHERE is_active = false)::int as inactive
         FROM screens WHERE business_id = $1`,
        [businessId]
      );
      screensActive = screensResult.rows[0]?.active ?? 0;
      screensInactive = screensResult.rows[0]?.inactive ?? 0;
    }

    // Subscription info
    let subscription = null;
    if (businessId) {
      const subResult = await this.database.query(
        `SELECT s.id, s.status, s.current_period_start, s.current_period_end,
                p.display_name as plan_name, p.max_screens as plan_max_screens
         FROM subscriptions s
         LEFT JOIN plans p ON s.plan_id = p.id
         WHERE s.business_id = $1
         ORDER BY s.created_at DESC
         LIMIT 1`,
        [businessId]
      );
      if (subResult.rows.length > 0) {
        subscription = subResult.rows[0];
      }
    }

    // Successful payments for this business
    const paymentsResult = businessId
      ? await this.database.query(
          `SELECT p.id, p.amount, p.currency, p.payment_date, p.status
           FROM payments p
           INNER JOIN subscriptions s ON p.subscription_id = s.id
           WHERE s.business_id = $1 AND p.status = 'succeeded'
           ORDER BY p.payment_date DESC
           LIMIT 50`,
          [businessId]
        )
      : { rows: [] };

    // Failed payments for this business
    const failuresResult = businessId
      ? await this.database.query(
          `SELECT pf.id, pf.amount, pf.currency, pf.failure_reason, pf.attempted_at
           FROM payment_failures pf
           WHERE pf.business_id = $1
           ORDER BY pf.attempted_at DESC
           LIMIT 20`,
          [businessId]
        )
      : { rows: [] };

    // Bu kullanıcının referans numarası ile kayıt olan müşteriler (getirdiği müşteriler)
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
        created_at: user.created_at,
        business_name: user.business_name,
        business_is_active: user.business_is_active,
        phone: phone ?? undefined,
        address: address ?? undefined,
        reference_number: user.reference_number ?? undefined,
      },
      screens_count: screensActive + screensInactive,
      screens_active: screensActive,
      screens_inactive: screensInactive,
      subscription: subscription
        ? {
            plan_name: subscription.plan_name,
            plan_max_screens: subscription.plan_max_screens,
            status: subscription.status,
            current_period_start: subscription.current_period_start,
            current_period_end: subscription.current_period_end,
            billing_interval: subscription.billing_interval,
            cancel_at_period_end: subscription.cancel_at_period_end,
            price_monthly: subscription.price_monthly != null ? parseFloat(String(subscription.price_monthly)) : null,
            price_yearly: subscription.price_yearly != null ? parseFloat(String(subscription.price_yearly)) : null,
          }
        : null,
      payments: paymentsResult.rows,
      payment_failures: failuresResult.rows,
      referred_users: referredResult.rows,
    };
  }

  /**
   * Admin hareket günlüğüne kayıt ekle (sadece admin/super_admin kullanıcılar için çağrılır)
   */
  async logActivity(
    userId: string,
    userRole: string,
    body: { action_type: string; page_key: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown> },
  ) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      return { ok: false }; // Sadece admin hareketleri loglanır
    }
    await this.database.query(
      `INSERT INTO admin_activity_log (user_id, action_type, page_key, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        userId,
        body.action_type,
        body.page_key,
        body.resource_type ?? null,
        body.resource_id ?? null,
        body.details ? JSON.stringify(body.details) : null,
      ],
    );
    return { ok: true };
  }

  /**
   * Admin hareket günlüğünü listele (tarih aralığı, kullanıcı filtreli)
   */
  async getActivityLog(
    userRole: string,
    from?: string,
    to?: string,
    filterUserId?: string,
  ) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const toDate = to ? new Date(to) : new Date();
    const toEnd = new Date(toDate);
    toEnd.setDate(toEnd.getDate() + 1);
    const params: unknown[] = [fromDate.toISOString(), toEnd.toISOString()];
    let where = 'WHERE a.created_at >= $1 AND a.created_at < $2';
    if (filterUserId) {
      params.push(filterUserId);
      where += ` AND a.user_id = $${params.length}`;
    }
    const result = await this.database.query(
      `SELECT a.id, a.user_id, u.email as user_email, a.action_type, a.page_key, a.resource_type, a.resource_id, a.details, a.created_at
       FROM admin_activity_log a
       INNER JOIN users u ON u.id = a.user_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT 500`,
      params,
    );
    return result.rows;
  }

  /** Rapor filtreleri için admin kullanıcı listesi (super_admin + admin) */
  async getActivityAdminUsers(userRole: string) {
    if (userRole !== 'super_admin' && userRole !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    const result = await this.database.query(
      `SELECT id, email FROM users WHERE role IN ('super_admin', 'admin') ORDER BY email`,
      [],
    );
    return result.rows;
  }
}
