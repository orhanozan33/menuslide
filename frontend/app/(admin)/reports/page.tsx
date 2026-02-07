'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { apiClient } from '@/lib/api';
import { ACTIVITY_PAGE_LABELS, ACTIVITY_ACTION_LABELS, formatActivityDetail } from '@/lib/admin-activity-labels';
import { useReportsPermissions } from '@/lib/AdminUserContext';
import { useConfirm } from '@/lib/ConfirmContext';
import { addCanadaHST } from '@/lib/canada-tax';

interface Stats {
  totalUsers: number;
  totalBusinesses: number;
  totalScreens: number;
  screensStopped?: number;
  newUsers7d: number;
  newUsers30d: number;
  activeSubscriptions: number;
  totalSubscriptions: number;
  usersWithSubscription: number;
  usersWithoutSubscription: number;
  businessesWithSubscription: number;
  businessesWithoutSubscription: number;
  revenue: number;
  revenueThisMonth: number;
  revenueInRange?: number | null;
  revenueFrom?: string | null;
  revenueTo?: string | null;
}

interface ReportUser {
  id: string;
  email: string;
  created_at: string;
  business_id: string | null;
  business_name: string | null;
  subscription_status: 'active' | 'stopped' | 'none';
  plan_name: string | null;
  stop_reason?: string | null;
  plan_max_screens: number | null;
}

interface PaymentItem {
  id: string;
  subscription_id?: string;
  amount: number;
  currency: string;
  payment_date?: string;
  attempted_at?: string;
  status?: string;
  failure_reason?: string;
  business_name: string;
  user_email: string | null;
}

interface OverdueItem {
  id: string;
  current_period_end: string | null;
  status: string;
  business_name: string;
  plan_name: string | null;
  user_email: string | null;
}

interface UserDetailReport {
  user: { id: string; email: string; created_at: string; business_name: string | null; business_is_active?: boolean; phone?: string; address?: string; reference_number?: string };
  screens_count: number;
  screens_active?: number;
  screens_inactive?: number;
  subscription: {
    plan_name: string;
    plan_max_screens: number;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    billing_interval?: string | null;
    cancel_at_period_end?: boolean;
    price_monthly?: number | null;
    price_yearly?: number | null;
    stop_reason?: string | null;
    stopped_at?: string | null;
  } | null;
  payments: { id: string; amount: number; currency: string; payment_date: string; status: string; invoice_number?: string }[];
  payment_failures: { id: string; amount: number; currency: string; failure_reason: string | null; attempted_at: string }[];
  referred_users?: { id: string; email: string; business_name: string | null; created_at: string; reference_number?: string | null }[];
}

function getDefaultDateRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: start.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

const localeMap: Record<string, string> = { en: 'en-US', tr: 'tr-TR', fr: 'fr-FR' };



export default function ReportsPage() {
  const { t, localePath, locale } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<ReportUser[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<{
    recentPayments: PaymentItem[];
    failedPayments: PaymentItem[];
    overdueSubscriptions: OverdueItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const defaultRange = getDefaultDateRange();
  const [revenueFrom, setRevenueFrom] = useState(defaultRange.from);
  const [revenueTo, setRevenueTo] = useState(defaultRange.to);
  const [useDateRange, setUseDateRange] = useState(false);
  const [userDetailModal, setUserDetailModal] = useState<{ open: boolean; userId: string; data: UserDetailReport | null; loading: boolean; error: string | null }>({
    open: false,
    userId: '',
    data: null,
    loading: false,
    error: null,
  });
  const [markPaidLoading, setMarkPaidLoading] = useState<string | null>(null);
  const [adminInvoiceModal, setAdminInvoiceModal] = useState<{ userId: string; data: Record<string, unknown> | null; loading: boolean }>({ userId: '', data: null, loading: false });

  const [activityLog, setActivityLog] = useState<{ id: string; user_id: string; user_email: string; action_type: string; page_key: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown>; created_at: string; ip_address?: string | null; user_agent?: string | null }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityUsers, setActivityUsers] = useState<{ id: string; email: string }[]>([]);
  const getActivityDefaultFrom = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  };
  const getActivityDefaultTo = () => new Date().toISOString().split('T')[0];
  const [activityFrom, setActivityFrom] = useState(() => getActivityDefaultFrom());
  const [activityTo, setActivityTo] = useState(() => getActivityDefaultTo());
  const [activityUserId, setActivityUserId] = useState<string>('');

  const {
    canViewDashboard,
    canViewRevenue,
    canViewPayments,
    canViewActivity,
    canViewMembers,
    isSuper,
  } = useReportsPermissions();
  const { confirm } = useConfirm();
  const [clearLogsLoading, setClearLogsLoading] = useState(false);

  const loadActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('from', activityFrom);
      params.set('to', activityTo);
      if (activityUserId) params.set('user_id', activityUserId);
      const data = await apiClient(`/reports/activity?${params.toString()}`);
      setActivityLog(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Activity load error:', e);
      setActivityLog([]);
    } finally {
      setActivityLoading(false);
    }
  }, [activityFrom, activityTo, activityUserId]);

  const loadActivityUsers = useCallback(async () => {
    try {
      const data = await apiClient('/reports/activity-users');
      setActivityUsers(Array.isArray(data) ? data : []);
    } catch {
      setActivityUsers([]);
    }
  }, []);

  const handleClearAllLogs = useCallback(async () => {
    const ok = await confirm({ title: 'Tüm logları sil', message: 'Tüm admin hareket logları kalıcı olarak silinecek. Supabase/veritabanında fazla veri birikmesini önlemek için kullanılır. Emin misiniz?', variant: 'danger' });
    if (!ok) return;
    setClearLogsLoading(true);
    try {
      await apiClient('/reports/activity', { method: 'DELETE' });
      toast.showSuccess('Tüm loglar silindi.');
      setActivityLog([]);
    } catch (err: any) {
      toast.showError(err?.message || 'Loglar silinemedi.');
    } finally {
      setClearLogsLoading(false);
    }
  }, [confirm, toast]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (useDateRange && revenueFrom && revenueTo) {
        params.set('revenueFrom', revenueFrom);
        params.set('revenueTo', revenueTo);
      }
      const query = params.toString();
      const [statsData, usersData, paymentStatusData] = await Promise.all([
        apiClient(`/reports/stats${query ? `?${query}` : ''}`).catch(() => null),
        apiClient('/reports/users').catch(() => null),
        apiClient('/reports/payment-status').catch(() => ({ recentPayments: [], failedPayments: [], overdueSubscriptions: [] })),
      ]);
      setStats(statsData ?? null);
      let membersList = Array.isArray(usersData) ? usersData : [];
      if (membersList.length === 0) {
        try {
          const allUsers = await apiClient('/users');
          const list = Array.isArray(allUsers) ? allUsers : [];
          const filtered = list.filter((u: { role?: string }) => u.role !== 'super_admin' && u.role !== 'admin');
          membersList = filtered.map((u: Record<string, unknown>) => ({ ...u, has_active_subscription: false }));
        } catch (_) {}
      }
      setUsers(membersList);
      setPaymentStatus(paymentStatusData);
    } catch (e: any) {
      console.error('Reports load error:', e);
      setError(e?.message || t('common_error'));
      setStats(null);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [revenueFrom, revenueTo, useDateRange, t]);

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        router.replace(localePath('/dashboard'));
        return;
      }
    } catch {
      router.replace(localePath('/dashboard'));
      return;
    }
    loadData();
    loadActivityUsers();
  }, [loadData, router, localePath]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const dateLocale = localeMap[locale] || 'en-US';

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(dateLocale, {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(dateLocale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateShort = (dateStr: string | null | undefined) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(dateLocale);
  };

  const openUserDetail = async (userId: string) => {
    setUserDetailModal({ open: true, userId, data: null, loading: true, error: null });
    try {
      const data = await apiClient(`/reports/user/${userId}`);
      if (!data) {
        setUserDetailModal((prev) => ({ ...prev, data: null, loading: false, error: t('reports_user_not_found') }));
        return;
      }
      setUserDetailModal((prev) => ({ ...prev, data: data as UserDetailReport, loading: false, error: null }));
    } catch (e: any) {
      console.error('User detail load error:', e);
      const errMsg = e?.message || t('common_error');
      setUserDetailModal((prev) => ({ ...prev, data: null, loading: false, error: errMsg }));
    }
  };

  const closeUserDetail = () => {
    setUserDetailModal({ open: false, userId: '', data: null, loading: false, error: null });
  };

  const handleMarkPaid = async (subscriptionId: string, label?: string) => {
    if (!subscriptionId) return;
    setMarkPaidLoading(subscriptionId);
    try {
      await apiClient(`/reports/subscription/${subscriptionId}/mark-paid`, {
        method: 'POST',
        body: { period_months: 1 },
      });
      const msg = label ? `${label}: ${t('reports_mark_paid_success')}` : t('reports_mark_paid_success');
      toast.showSuccess(msg);
      await loadData();
      if (userDetailModal.open && userDetailModal.userId) openUserDetail(userDetailModal.userId);
    } catch (e: any) {
      console.error('Mark paid error:', e);
      setError(e?.message || t('reports_mark_paid_failed'));
      toast.showError(e?.message || t('reports_mark_paid_failed'));
    } finally {
      setMarkPaidLoading(null);
    }
  };

  const openAdminInvoice = async (userId: string, paymentId: string) => {
    setAdminInvoiceModal({ userId, data: null, loading: true });
    try {
      const inv = await apiClient(`/reports/user/${userId}/invoice/${paymentId}`);
      setAdminInvoiceModal({ userId, data: inv as Record<string, unknown>, loading: false });
    } catch (e) {
      console.error('Invoice load error:', e);
      toast.showError(t('common_error'));
      setAdminInvoiceModal((prev) => ({ ...prev, data: null, loading: false }));
    }
  };


  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">{t('reports_title')}</h2>
          <p className="text-slate-600 mt-1">{t('reports_subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? t('btn_loading') : t('reports_refresh')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && !stats ? (
        <div className="text-gray-500 py-12">{t('settings_loading')}</div>
      ) : (
        <>
      {/* 1. Üyelik + 2. İşletme özeti — yetki: view_dashboard */}
      {canViewDashboard && (
      <section className="mb-8">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('reports_section_membership')}</h3>
          <div className="grid grid-cols-5 gap-2">
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_total_members')}</div>
              <div className="text-lg font-bold text-slate-800">{stats?.totalUsers ?? 0}</div>
              <p className="text-[10px] text-gray-400 mt-0.5">{t('reports_total_members_hint')}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3">
              <div className="text-xs font-medium text-emerald-700">{t('reports_users_with_sub')}</div>
              <div className="text-lg font-bold text-emerald-700">{stats?.usersWithSubscription ?? 0}</div>
              <p className="text-[10px] text-emerald-600 mt-0.5">{t('reports_users_with_sub_hint')}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
              <div className="text-xs font-medium text-amber-700">{t('reports_users_without_sub')}</div>
              <div className="text-lg font-bold text-amber-700">{stats?.usersWithoutSubscription ?? 0}</div>
              <p className="text-[10px] text-amber-600 mt-0.5">{t('reports_users_without_sub_hint')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_new_members_7d')}</div>
              <div className="text-lg font-bold text-blue-600">{stats?.newUsers7d ?? 0}</div>
              <p className="text-[10px] text-gray-400 mt-0.5">{t('reports_new_members_7d_hint')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_total_screens')}</div>
              <div className="text-lg font-bold text-blue-600">{stats?.totalScreens ?? 0}</div>
              <p className="text-[10px] text-gray-400 mt-0.5">{t('reports_total_screens_hint')}</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-3">
              <div className="text-xs font-medium text-slate-600">{t('reports_screens_stopped')}</div>
              <div className="text-lg font-bold text-slate-700">{stats?.screensStopped ?? 0}</div>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('reports_screens_stopped_hint')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_total_businesses')}</div>
              <div className="text-lg font-bold text-slate-800">{stats?.totalBusinesses ?? 0}</div>
            </div>
            <div className="bg-emerald-50 rounded-lg border border-emerald-200 p-3">
              <div className="text-xs font-medium text-emerald-700">{t('reports_businesses_with_sub')}</div>
              <div className="text-lg font-bold text-emerald-700">{stats?.businessesWithSubscription ?? 0}</div>
              <p className="text-[10px] text-emerald-600 mt-0.5">{t('reports_businesses_with_sub_hint')}</p>
            </div>
            <div className="bg-amber-50 rounded-lg border border-amber-200 p-3">
              <div className="text-xs font-medium text-amber-700">{t('reports_businesses_without_sub')}</div>
              <div className="text-lg font-bold text-amber-700">{stats?.businessesWithoutSubscription ?? 0}</div>
              <p className="text-[10px] text-amber-600 mt-0.5">{t('reports_businesses_without_sub_hint')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_active_subscriptions')}</div>
              <div className="text-lg font-bold text-slate-800">{stats?.activeSubscriptions ?? 0}</div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 3. Gelir Özeti — yetki: view_revenue */}
      {canViewRevenue && (
      <section className="mb-8">
        <div className="max-w-2xl">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('reports_section_revenue')}</h3>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">{t('reports_revenue_total')}</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(stats?.revenue ?? 0)}</div>
              <p className="text-[10px] text-gray-400 mt-0.5">{t('reports_revenue_total_hint')}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-100 p-3">
              <div className="text-xs font-medium text-gray-500">
                {useDateRange ? t('reports_revenue_in_range') : t('reports_revenue_this_month')}
              </div>
              <div className="text-lg font-bold text-green-600">
                {formatCurrency(useDateRange ? (stats?.revenueInRange ?? 0) : (stats?.revenueThisMonth ?? 0))}
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">{t('reports_revenue_date_range')}</h4>
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useDateRange}
                  onChange={(e) => setUseDateRange(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-xs font-medium text-gray-700">{t('reports_use_date_range')}</span>
              </label>
              {useDateRange && (
                <>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('reports_from')}</label>
                    <input
                      type="date"
                      value={revenueFrom}
                      onChange={(e) => setRevenueFrom(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">{t('reports_to')}</label>
                    <input
                      type="date"
                      value={revenueTo}
                      onChange={(e) => setRevenueTo(e.target.value)}
                      className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 4. Ödeme Durumu — yetki: view_payments */}
      {canViewPayments && (
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('reports_payment_status')}</h3>
        <p className="text-sm text-gray-500 mb-4">{t('reports_payment_status_desc')}</p>

        {((paymentStatus?.failedPayments?.length ?? 0) > 0 || (paymentStatus?.overdueSubscriptions?.length ?? 0) > 0) && (
          <div className="mb-4 p-4 rounded-xl bg-red-50 border-2 border-red-200">
            <p className="text-red-800 font-semibold flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              {t('reports_payment_alert')}
            </p>
            <p className="text-sm text-red-700 mt-1">{t('reports_payment_alert_desc')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alınan ödemeler - kullanıcı listesi */}
          <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
              <h4 className="font-semibold text-emerald-800">{t('reports_payments_received')}</h4>
              <p className="text-xs text-emerald-700 mt-0.5">{t('reports_user_column')} / {t('settings_request_business')} / {t('account_amount')}</p>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              {(paymentStatus?.recentPayments?.length ?? 0) === 0 ? (
                <div className="p-4 text-sm text-gray-500">{t('reports_no_payments')}</div>
              ) : (
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_user_column')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('settings_request_business')}</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">{t('account_amount')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('account_payment_date')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(paymentStatus?.recentPayments ?? []).map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[140px]" title={p.user_email ?? ''}>{p.user_email || '-'}</td>
                        <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]" title={p.business_name}>{p.business_name}</td>
                        <td className="px-3 py-2 text-right text-emerald-600 font-semibold whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateShort(p.payment_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Alınamayan ödemeler - kullanıcı listesi */}
          <div className="bg-white rounded-xl border border-red-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-red-50 border-b border-red-100">
              <h4 className="font-semibold text-red-800">{t('reports_payments_failed')}</h4>
              <p className="text-xs text-red-700 mt-0.5">{t('reports_user_column')} / {t('settings_request_business')} / {t('account_amount')}</p>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              {(paymentStatus?.failedPayments?.length ?? 0) === 0 ? (
                <div className="p-4 text-sm text-gray-500">{t('reports_no_failed')}</div>
              ) : (
                <table className="w-full text-sm min-w-[400px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_user_column')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('settings_request_business')}</th>
                      <th className="px-3 py-2 text-right font-semibold text-gray-600 whitespace-nowrap">{t('account_amount')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_failure_reason')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('account_payment_date')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_mark_paid')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(paymentStatus?.failedPayments ?? []).map((p) => (
                      <tr key={p.id} className="hover:bg-red-50/30">
                        <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[120px]" title={p.user_email ?? ''}>{p.user_email || '-'}</td>
                        <td className="px-3 py-2 text-gray-700 truncate max-w-[100px]" title={p.business_name}>{p.business_name}</td>
                        <td className="px-3 py-2 text-right text-red-600 font-semibold whitespace-nowrap">{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2 text-xs text-red-700 truncate max-w-[120px]" title={p.failure_reason ?? ''}>{p.failure_reason || '-'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateShort(p.attempted_at)}</td>
                        <td className="px-3 py-2">
                          {p.subscription_id && (
                            <button
                              type="button"
                              onClick={() => handleMarkPaid(p.subscription_id!, `${p.business_name} (${p.user_email || ''})`)}
                              disabled={!!markPaidLoading}
                              className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                            >
                              {markPaidLoading === p.subscription_id ? t('common_loading') : t('reports_mark_paid')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Gecikmiş / Alınamayan abonelikler - kullanıcı listesi */}
          <div className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
              <h4 className="font-semibold text-amber-800">{t('reports_overdue')}</h4>
              <p className="text-xs text-amber-700 mt-0.5">{t('reports_user_column')} / {t('settings_request_business')} / {t('reports_plan')}</p>
            </div>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
              {(paymentStatus?.overdueSubscriptions?.length ?? 0) === 0 ? (
                <div className="p-4 text-sm text-gray-500">{t('reports_no_overdue')}</div>
              ) : (
                <table className="w-full text-sm min-w-[360px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_user_column')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('settings_request_business')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_plan')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_renewal_date')}</th>
                      <th className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{t('reports_mark_paid')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(paymentStatus?.overdueSubscriptions ?? []).map((s) => (
                      <tr key={s.id} className="hover:bg-amber-50/30">
                        <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[140px]" title={s.user_email ?? ''}>{s.user_email || '-'}</td>
                        <td className="px-3 py-2 text-gray-700 truncate max-w-[120px]" title={s.business_name}>{s.business_name}</td>
                        <td className="px-3 py-2 text-amber-700">{s.plan_name || '-'}</td>
                        <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateShort(s.current_period_end)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => handleMarkPaid(s.id, `${s.business_name} (${s.user_email || ''})`)}
                            disabled={!!markPaidLoading}
                            className="px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {markPaidLoading === s.id ? t('common_loading') : t('reports_mark_paid')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. Admin Hareketleri — yetki: view_activity */}
      {canViewActivity && (
      <section className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin hareketleri</h3>
        <p className="text-sm text-gray-500 mb-4">Hangi admin kullanıcı hangi sayfada ne işlem yaptı (tarih aralığı seçerek raporlayın).</p>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Başlangıç</label>
              <input
                type="date"
                value={activityFrom}
                onChange={(e) => setActivityFrom(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bitiş</label>
              <input
                type="date"
                value={activityTo}
                onChange={(e) => setActivityTo(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Kullanıcı</label>
              <select
                value={activityUserId}
                onChange={(e) => setActivityUserId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[180px]"
              >
                <option value="">Tüm admin kullanıcılar</option>
                {activityUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.email}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={loadActivity}
              disabled={activityLoading}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 font-medium text-sm disabled:opacity-50"
            >
              {activityLoading ? 'Yükleniyor...' : 'Hareketleri getir'}
            </button>
            </div>
            {isSuper && (
              <button
                type="button"
                onClick={handleClearAllLogs}
                disabled={clearLogsLoading}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50"
                title="Tüm admin loglarını sil (Supabase temizliği)"
              >
                {clearLogsLoading ? 'Siliniyor...' : 'Tüm logları sil'}
              </button>
            )}
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            {activityLog.length === 0 && !activityLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Tarih aralığı seçip &quot;Hareketleri getir&quot; ile yükleyin.</div>
            ) : activityLoading ? (
              <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
            ) : (
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Tarih / Saat</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Kullanıcı</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Sayfa</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">İşlem</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Detay</th>
                    <th className="px-4 py-2 text-left font-semibold text-gray-600">Giriş bilgisi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activityLog.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatDateShort(row.created_at)}</td>
                      <td className="px-4 py-2 text-gray-900 font-medium">{row.user_email}</td>
                      <td className="px-4 py-2 text-gray-700">{ACTIVITY_PAGE_LABELS[row.page_key] ?? row.page_key}</td>
                      <td className="px-4 py-2 text-gray-700">{ACTIVITY_ACTION_LABELS[row.action_type] ?? row.action_type}</td>
                      <td className="px-4 py-2 text-gray-600 text-xs max-w-[220px]" title={row.details ? JSON.stringify(row.details) : ''}>
                        {formatActivityDetail(row)}
                      </td>
                      <td className="px-4 py-2 text-gray-500 text-xs max-w-[180px]" title={row.user_agent || ''}>
                        {row.ip_address ? <span className="font-mono">{row.ip_address}</span> : '-'}
                        {row.user_agent && <div className="truncate mt-0.5 text-gray-400">{String(row.user_agent).slice(0, 50)}…</div>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 6. Tüm Üyeler — yetki: view_members */}
      {canViewMembers && (
      <section>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-lg font-semibold text-gray-900">{t('reports_all_members')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">{t('reports_all_members_desc')}</p>
          </div>
          {users.length === 0 ? (
            <div className="p-12 text-center text-gray-500">{t('reports_no_users')}</div>
          ) : (
            <>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto max-w-full">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_email')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_business')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('reports_subscription_status')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('reports_plan')}</th>
                    <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50 cursor-pointer"
                      onClick={() => openUserDetail(u.id)}
                    >
                      <td className="px-4 py-3 text-sm">
                        <span className="text-blue-600 hover:underline font-medium">{u.email}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{u.business_name || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          u.subscription_status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : u.subscription_status === 'stopped'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {u.subscription_status === 'active' ? t('reports_has_subscription') : u.subscription_status === 'stopped' ? (t('reports_subscription_stopped') || 'Durduruldu') : t('reports_no_subscription')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {u.subscription_status === 'active' && u.plan_name
                          ? u.plan_max_screens != null && u.plan_max_screens >= 0
                            ? `${u.plan_name} (${u.plan_max_screens} ${t('pricing_screen')})`
                            : u.plan_name
                          : u.subscription_status === 'stopped'
                          ? `${t('reports_subscription_stopped') || 'Durduruldu'}${u.stop_reason ? ` • ${u.stop_reason === 'payment_not_received' ? (t('reports_stop_reason_payment') || 'Ödeme alınamadı') : u.stop_reason === 'membership_termination' ? (t('reports_stop_reason_membership') || 'Üyelik sonlandırma') : u.stop_reason}` : ''}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {formatDateShort(u.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile: User cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-4 active:bg-gray-50 cursor-pointer"
                  onClick={() => openUserDetail(u.id)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-blue-600 block truncate">{u.email}</span>
                      <span className="text-sm text-gray-600">{u.business_name || '-'}</span>
                    </div>
                    <span className={`shrink-0 inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      u.subscription_status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : u.subscription_status === 'stopped'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {u.subscription_status === 'active' ? t('reports_has_subscription') : u.subscription_status === 'stopped' ? (t('reports_subscription_stopped') || 'Durduruldu') : t('reports_no_subscription')}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-500">
                    <span>{u.subscription_status === 'active' && u.plan_name ? (u.plan_max_screens != null && u.plan_max_screens >= 0 ? `${u.plan_name} (${u.plan_max_screens} ${t('pricing_screen')})` : u.plan_name) : u.subscription_status === 'stopped' ? (t('reports_subscription_stopped') || 'Durduruldu') : '-'}</span>
                    <span>{formatDateShort(u.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </section>
      )}
        </>
      )}

      {/* Kullanıcı Detay Modal - Modern tasarım */}
      {userDetailModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={closeUserDetail}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header - açık arka plan, siyah yazı */}
            <div className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 px-6 py-5 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-slate-900">{t('reports_user_detail_title')}</h3>
                <p className="text-slate-600 text-sm mt-0.5">{t('reports_user_detail_desc')}</p>
              </div>
              <button
                type="button"
                onClick={closeUserDetail}
                className="p-2 -m-2 rounded-xl hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-colors"
                aria-label={t('common_close')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {userDetailModal.loading ? (
                <div className="py-16 text-center text-gray-500">{t('settings_loading')}</div>
              ) : userDetailModal.error ? (
                <div className="py-12 text-center">
                  <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                  <p className="text-red-600 font-medium">{userDetailModal.error}</p>
                </div>
              ) : userDetailModal.data ? (
                <>
                  {/* Kullanıcı Bilgisi Kartı - kompakt */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs">👤</span>
                      {t('reports_user_info')}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                      <div>
                        <span className="text-[10px] text-slate-500">{t('settings_request_email')}</span>
                        <p className="font-medium text-slate-900 truncate" title={userDetailModal.data.user.email}>{userDetailModal.data.user.email}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">{t('settings_request_phone')}</span>
                        <p className="font-medium text-slate-900">{userDetailModal.data.user.phone || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">{t('settings_request_business')}</span>
                        <p className="font-medium text-slate-900 truncate" title={userDetailModal.data.user.business_name || ''}>{userDetailModal.data.user.business_name || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">{t('reports_reference_number')}</span>
                        <p className="font-medium text-slate-900">{userDetailModal.data.user.reference_number || '-'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500">{t('reports_registration_date')}</span>
                        <p className="text-slate-700">{formatDateShort(userDetailModal.data.user.created_at)}</p>
                      </div>
                      <div className="col-span-2 sm:col-span-4">
                        <span className="text-[10px] text-slate-500">{t('settings_request_address')}</span>
                        <p className="font-medium text-slate-900 text-sm truncate" title={userDetailModal.data.user.address || ''}>{userDetailModal.data.user.address || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Referans ile kayıt olanlar (getirdiği müşteriler) - kullanıcı bilgisinin hemen altında */}
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-sm">👥</span>
                        {t('reports_referred_users')}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{t('reports_referred_users_desc')}</p>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {(!userDetailModal.data.referred_users || userDetailModal.data.referred_users.length === 0) ? (
                        <div className="p-5 text-sm text-slate-500 text-center">{t('reports_no_referred_users')}</div>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 sticky top-0">
                            <tr>
                              <th className="px-4 py-2 font-semibold text-slate-600">{t('settings_request_email')}</th>
                              <th className="px-4 py-2 font-semibold text-slate-600">{t('settings_request_business')}</th>
                              <th className="px-4 py-2 font-semibold text-slate-600">{t('reports_reference_number')}</th>
                              <th className="px-4 py-2 font-semibold text-slate-600">{t('reports_registration_date')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userDetailModal.data.referred_users.map((ref: { id: string; email: string; business_name: string | null; created_at: string; reference_number?: string | null }) => (
                              <tr key={ref.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                <td className="px-4 py-2 text-slate-900 truncate max-w-[180px]" title={ref.email}>{ref.email}</td>
                                <td className="px-4 py-2 text-slate-700 truncate max-w-[140px]" title={ref.business_name || ''}>{ref.business_name || '-'}</td>
                                <td className="px-4 py-2 text-slate-700 font-mono">{ref.reference_number ?? '-'}</td>
                                <td className="px-4 py-2 text-slate-600">{formatDateShort(ref.created_at)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* TV Ekran & Abonelik Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* TV Yayını - Yayında / Yayında değil */}
                    <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                      <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">📺</span>
                        {t('reports_tv_screens_count')}
                      </h4>
                      <div className="flex gap-6">
                        <div>
                          <span className="block text-xs text-slate-600 mb-0.5">{t('reports_screens_on_air')}</span>
                          <span className="text-2xl font-bold text-emerald-700">{userDetailModal.data.screens_active ?? 0}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-600 mb-0.5">{t('reports_screens_off_air')}</span>
                          <span className="text-2xl font-bold text-slate-800">{userDetailModal.data.screens_inactive ?? 0}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-slate-600 mb-0.5">{t('reports_screens_total')}</span>
                          <span className="text-2xl font-bold text-slate-900">{userDetailModal.data.screens_count}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">{t('reports_tv_screens_hint')}</p>
                    </div>
                    {/* Abonelik Durumu */}
                    {(() => {
                      const sub = userDetailModal.data.subscription;
                      const isStopped = sub?.status === 'canceled' && sub?.stop_reason;
                      const bgClass = isStopped ? 'bg-red-50 border-red-100' : sub ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100';
                      const iconClass = isStopped ? 'bg-red-100 text-red-600' : sub ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600';
                      const stopReasonLabel = sub?.stop_reason === 'payment_not_received' ? (t('reports_stop_reason_payment') || 'Ödeme alınamadı') : sub?.stop_reason === 'membership_termination' ? (t('reports_stop_reason_membership') || 'Üyelik sonlandırma') : sub?.stop_reason || '';
                      return (
                        <div className={`rounded-xl p-5 border ${bgClass}`}>
                          <h4 className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${iconClass}`}>📦</span>
                            {t('reports_subscription_status_label')}
                          </h4>
                          {sub ? (
                            isStopped ? (
                              <div className="space-y-2 text-sm">
                                <div><span className="text-slate-600">{t('reports_status')}:</span> <span className="font-medium text-red-700">{t('reports_subscription_stopped') || 'Durduruldu'}</span></div>
                                <div><span className="text-slate-600">{t('reports_stop_reason_label') || 'Durdurma nedeni'}:</span> <span className="font-medium text-slate-900">{stopReasonLabel}</span></div>
                                {sub.stopped_at && <div><span className="text-slate-600">{t('reports_stopped_at') || 'Durdurulma tarihi'}:</span> <span className="text-slate-900">{formatDateShort(sub.stopped_at)}</span></div>}
                                <div><span className="text-slate-600">{t('reports_previous_package') || 'Önceki paket'}:</span> <span className="text-slate-900">{sub.plan_name} ({sub.plan_max_screens === -1 ? t('settings_unlimited') : sub.plan_max_screens} {t('pricing_screen')})</span></div>
                              </div>
                            ) : (
                              <div className="space-y-2 text-sm">
                                <div><span className="text-slate-600">{t('reports_current_package')}:</span> <span className="font-medium text-slate-900">{sub.plan_name} ({sub.plan_max_screens === -1 ? t('settings_unlimited') : sub.plan_max_screens} {t('pricing_screen')})</span></div>
                                <div><span className="text-slate-600">{t('reports_billing_interval')}:</span> <span className="font-medium text-slate-900">{sub.billing_interval === 'yearly' ? t('reports_yearly') : sub.billing_interval === 'monthly' ? t('reports_monthly') : '-'}</span></div>
                                <div><span className="text-slate-600">{t('reports_plan_price')}:</span> <span className="text-slate-900">{sub.billing_interval === 'yearly' && sub.price_yearly != null ? `${formatCurrency(sub.price_yearly)} ${t('reports_per_year')}` : sub.price_monthly != null ? `${formatCurrency(sub.price_monthly)} ${t('reports_per_month')}` : '-'}</span></div>
                                <div><span className="text-slate-600">{t('reports_period_start')}:</span> <span className="text-slate-900">{formatDateShort(sub.current_period_start)}</span></div>
                                <div><span className="text-slate-600">{t('reports_renewal_date')}:</span> <span className="text-slate-900">{formatDateShort(sub.current_period_end)}</span></div>
                                <div><span className="text-slate-600">{t('reports_status')}:</span> <span className="font-medium text-slate-900">{sub.status}</span></div>
                                {sub.cancel_at_period_end && <div className="pt-1"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">{t('reports_cancel_at_period_end')}</span></div>}
                              </div>
                            )
                          ) : (
                            <p className="text-amber-800 font-medium">{t('reports_no_subscription_info')}</p>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Ödeme Geçmişi - 2 sütun */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Ödenen Tarihler */}
                    <div className="rounded-xl border border-emerald-100 overflow-hidden bg-white">
                      <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
                        <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <span>✓</span> {t('reports_paid_dates')}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">{t('reports_paid_dates_hint')}</p>
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {(userDetailModal.data.payments ?? []).length === 0 ? (
                          <div className="p-5 text-sm text-slate-500 text-center">{t('reports_no_payments_history')}</div>
                        ) : (
                          (userDetailModal.data.payments ?? []).map((p) => {
                            const { total } = addCanadaHST(p.amount);
                            const currency = (p.currency || 'cad').toUpperCase();
                            return (
                            <div key={p.id} className="px-4 py-3 flex justify-between items-center text-sm border-b border-slate-50 last:border-0 gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="text-slate-600">{formatDateShort(p.payment_date)}</span>
                                <span className="font-semibold text-slate-900 ml-2">{formatCurrency(total)}</span>
                                {p.invoice_number && <span className="text-xs text-slate-400 ml-2 font-mono">{p.invoice_number}</span>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => openAdminInvoice(userDetailModal.userId, p.id)}
                                  className="px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  {t('account_view_invoice')}
                                </button>
                              </div>
                            </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    {/* Başarısız Ödemeler */}
                    <div className="rounded-xl border border-red-100 overflow-hidden bg-white">
                      <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                        <h4 className="text-sm font-semibold text-red-800 flex items-center gap-2">
                          <span>✕</span> {t('reports_failed_payments')}
                        </h4>
                        <p className="text-xs text-red-600 mt-0.5">{t('reports_failed_payments_hint')}</p>
                      </div>
                      <div className="max-h-44 overflow-y-auto">
                        {(userDetailModal.data.payment_failures ?? []).length === 0 ? (
                          <div className="p-5 text-sm text-slate-500 text-center">{t('reports_no_failures')}</div>
                        ) : (
                          (userDetailModal.data.payment_failures ?? []).map((f) => (
                            <div key={f.id} className="px-4 py-3 text-sm border-b border-slate-50 last:border-0">
                              <div className="flex justify-between">
                                <span className="text-slate-600">{formatDateShort(f.attempted_at)}</span>
                                <span className="font-semibold text-red-600">{formatCurrency(f.amount)}</span>
                              </div>
                              {f.failure_reason && <div className="text-xs text-slate-700 mt-1 truncate" title={f.failure_reason}>{f.failure_reason}</div>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-12 text-center text-gray-500">{t('common_error')}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Admin fatura görüntüleme modalı */}
      {(adminInvoiceModal.loading || adminInvoiceModal.data) && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => !adminInvoiceModal.loading && setAdminInvoiceModal({ userId: '', data: null, loading: false })}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {adminInvoiceModal.loading ? (
              <div className="py-8 text-center text-slate-600">{t('settings_loading')}</div>
            ) : adminInvoiceModal.data ? (
              <>
                {/* Fatura başlık */}
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h3 className="text-xl font-bold text-slate-900">{t('invoice_title')}</h3>
                  <div className="flex justify-between items-start mt-2 text-sm">
                    <span className="text-slate-500">{t('invoice_number')}:</span>
                    <span className="font-mono font-semibold text-slate-800">{String(adminInvoiceModal.data.invoice_number ?? '-')}</span>
                  </div>
                  <div className="flex justify-between items-start mt-0.5 text-sm">
                    <span className="text-slate-500">{t('invoice_date')}:</span>
                    <span className="text-slate-800">{formatDateShort(adminInvoiceModal.data.payment_date as string | null | undefined)}</span>
                  </div>
                </div>
                {/* Gönderen / Alıcı grid */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  {adminInvoiceModal.data.company ? (
                    <div className="p-3 bg-slate-50 rounded-lg">
                      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('invoice_from')}</div>
                      <div className="font-medium text-slate-800">{(adminInvoiceModal.data.company as Record<string, string>).company_name}</div>
                      {(adminInvoiceModal.data.company as Record<string, string>).company_address ? <div className="text-slate-600 text-xs mt-0.5">{(adminInvoiceModal.data.company as Record<string, string>).company_address}</div> : null}
                    </div>
                  ) : null}
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('invoice_bill_to')}</div>
                    <div className="font-medium text-slate-800">{String(adminInvoiceModal.data.business_name ?? '—')}</div>
                    {adminInvoiceModal.data.customer_email ? <div className="text-slate-600 text-xs mt-0.5">{String(adminInvoiceModal.data.customer_email)}</div> : null}
                  </div>
                </div>
                {/* Tablo: Plan, Ara toplam, Vergi, Toplam */}
                <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-700">{t('invoice_plan')}</th>
                        <th className="px-4 py-2 text-right font-semibold text-slate-700">{t('invoice_amount')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-t border-slate-100">
                        <td className="px-4 py-2 text-slate-800">{String(adminInvoiceModal.data.plan_name ?? '—')}</td>
                        <td className="px-4 py-2 text-right text-slate-800">{Number(adminInvoiceModal.data.amount ?? 0).toFixed(2)} {(String(adminInvoiceModal.data.currency || 'cad')).toUpperCase()}</td>
                      </tr>
                      {(() => {
                        const { subtotal, tax, total } = addCanadaHST(Number(adminInvoiceModal.data?.amount ?? 0));
                        const cur = (String(adminInvoiceModal.data?.currency || 'cad')).toUpperCase();
                        return (
                          <>
                            <tr className="border-t border-slate-100 bg-slate-50">
                              <td className="px-4 py-2 text-slate-600">{t('invoice_subtotal')}</td>
                              <td className="px-4 py-2 text-right text-slate-700">{subtotal.toFixed(2)} {cur}</td>
                            </tr>
                            <tr className="border-t border-slate-100 bg-slate-50">
                              <td className="px-4 py-2 text-slate-600">{t('invoice_tax')}</td>
                              <td className="px-4 py-2 text-right text-slate-700">{tax.toFixed(2)} {cur}</td>
                            </tr>
                            <tr className="border-t-2 border-slate-200 bg-slate-100">
                              <td className="px-4 py-2 font-semibold text-slate-800">{t('invoice_total')}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-900">{total.toFixed(2)} {cur}</td>
                            </tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>
                <div className="text-xs text-slate-500 mb-4">{t('invoice_status')}: <span className="capitalize font-medium text-slate-700">{String(adminInvoiceModal.data.status ?? '—')}</span></div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const d = adminInvoiceModal.data!;
                      const { subtotal, tax, total } = addCanadaHST(Number(d.amount ?? 0));
                      const cur = (String(d.currency || 'cad')).toUpperCase();
                      const curSym = cur === 'CAD' || cur === 'CA$' ? 'CA$' : cur + ' ';
                      const company = d.company as Record<string, string> | undefined;
                      const dateStr = formatDateShort(d.payment_date as string);
                      const logoUrl = typeof window !== 'undefined' ? window.location.origin + '/menuslide-logo.png' : '';
                      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${t('invoice_title')}</title><style>
body{font-family:system-ui,sans-serif;max-width:700px;margin:0 auto;padding:32px;color:#111;background:#fff}
.top-line{height:2px;background:#374151;margin-bottom:24px}
.invoice-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px}
.invoice-title{font-size:28px;font-weight:700;margin:0}
.invoice-logo{height:48px;object-fit:contain}
.details-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px}
.details-block .label{font-weight:700;margin-bottom:4px}
.details-block .value{color:#374151}
.company-block{margin-bottom:20px}
.company-block strong{font-size:1rem}
.bill-to{text-align:right}
.amount-due{font-size:1.25rem;font-weight:700;margin:20px 0}
.table-wrap{border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 8px;border-bottom:1px solid #e5e7eb}
th{text-align:left;font-weight:600}
th:nth-child(2),th:nth-child(3),th:nth-child(4),td:nth-child(2),td:nth-child(3),td:nth-child(4){text-align:right}
.summary{text-align:right;margin-top:16px;padding-top:16px}
.summary-row{display:flex;justify-content:flex-end;gap:40px;padding:4px 0}
.summary-row.total{font-weight:700;font-size:1.1rem;margin-top:8px}
.footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:0.875rem;color:#6b7280}
@media print{body{margin:0;padding:16px}}
</style></head><body>
<div class="top-line"></div>
<div class="invoice-header">
  <h1 class="invoice-title">${t('invoice_title')}</h1>
  ${logoUrl ? `<img src="${logoUrl}" alt="MenuSlide" class="invoice-logo" />` : ''}
</div>
<div class="details-grid">
  <div>
    <div class="details-block"><span class="label">${t('invoice_number')}</span><div class="value">${String(d.invoice_number ?? '-')}</div></div>
    <div class="details-block"><span class="label">${t('invoice_date_issue')}</span><div class="value">${dateStr}</div></div>
    <div class="details-block"><span class="label">${t('invoice_date_due')}</span><div class="value">${dateStr}</div></div>
  </div>
</div>
<div class="details-grid">
  <div class="company-block">${company ? `<strong>${company.company_name || 'Menu Slide'}</strong>${company.company_address ? `<br>${company.company_address}` : ''}${company.company_phone ? `<br>${company.company_phone}` : ''}` : '<strong>Menu Slide</strong><br>398 7e Avenue, 6<br>Lachine Quebec H8S 2Z4, Canada<br>+1 438-596-8566'}</div>
  <div class="bill-to"><strong>${t('invoice_bill_to')}</strong><br>${String(d.business_name ?? '—')}${d.customer_address ? `<br>${d.customer_address}` : ''}${d.customer_email ? `<br>${d.customer_email}` : ''}</div>
</div>
<div class="amount-due">${curSym}${total.toFixed(2)} ${t('invoice_amount_due').toLowerCase()} ${dateStr}</div>
<div class="table-wrap">
  <table><thead><tr><th>${t('invoice_description')}</th><th>${t('invoice_qty')}</th><th>${t('invoice_unit_price')}</th><th>${t('invoice_amount')}</th></tr></thead><tbody>
  <tr><td>${String(d.plan_name ?? '—')}</td><td>1</td><td>${(Number(d.amount ?? 0)).toFixed(2)} ${cur}</td><td>${(Number(d.amount ?? 0)).toFixed(2)} ${cur}</td></tr>
  </tbody></table>
  <div class="summary">
    <div class="summary-row">${t('invoice_subtotal')}: ${curSym}${subtotal.toFixed(2)}</div>
    <div class="summary-row">${t('invoice_tax')}: ${curSym}${tax.toFixed(2)}</div>
    <div class="summary-row">${t('invoice_total')}: ${curSym}${total.toFixed(2)}</div>
    <div class="summary-row total">${t('invoice_amount_due')}: ${curSym}${total.toFixed(2)}</div>
  </div>
</div>
<div class="footer">${String(d.invoice_number ?? '-')} · ${curSym}${total.toFixed(2)} ${t('invoice_amount_due').toLowerCase()} ${dateStr}</div>
</body></html>`;
                      const w = window.open('', '_blank');
                      if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print(); w.close(); }, 250); }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    {t('invoice_download') || 'Yazdır / PDF indir'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminInvoiceModal({ userId: '', data: null, loading: false })}
                    className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg hover:bg-slate-300 text-sm"
                  >
                    {t('common_close')}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
