'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAdminPagePermissions } from '@/lib/useAdminPagePermissions';

type AdminDashboardData = {
  admin_info: { id: string; email: string; reference_number?: string };
  referred_users: Array<{
    id: string;
    email: string;
    created_at: string;
    reference_number?: string;
    business_name: string | null;
    total_paid: number;
    last_payment_date: string | null;
    commission_earned: number;
    payment_failure_count: number;
    last_payment_failure: string | null;
  }>;
  income_summary: {
    referred_user_count: number;
    total_referred_payments: number;
    total_commission: number;
    commission_rate_percent: number;
  };
  payment_statuses: Array<{
    user_id: string;
    email: string;
    business_name: string | null;
    last_payment_date: string | null;
    total_paid: number;
    commission_earned: number;
    payment_failure_count: number;
    last_payment_failure: string | null;
  }>;
};

export default function DashboardPage() {
  const { t, localePath } = useTranslation();
  const router = useRouter();
  const { isSuper } = useAdminPagePermissions('dashboard');
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ menus: 0, screens: 0, menuItems: 0 });
  const [loading, setLoading] = useState(true);
  const [adminDashboard, setAdminDashboard] = useState<AdminDashboardData | null>(null);
  const [multiDeviceAlerts, setMultiDeviceAlerts] = useState<Array<{ screen_id: string; screen_name: string; business_name: string; active_viewer_count: number }>>([]);

  useEffect(() => {
    loadData();
  }, [localePath]);

  const loadData = async () => {
    try {
      const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      if (!userStr) {
        router.push(localePath('/login'));
        return;
      }

      const authUser = JSON.parse(userStr);
      setUser(authUser);

      if (authUser.role === 'admin') {
        try {
          const data = await apiClient('/auth/admin-dashboard') as AdminDashboardData;
          setAdminDashboard(data);
        } catch {
          setAdminDashboard(null);
        }
        setLoading(false);
        return;
      }

      try {
        const screensList = (raw: unknown) =>
          Array.isArray(raw) ? raw : (raw && typeof raw === 'object' && 'screens' in raw ? (raw as { screens: unknown[] }).screens : []);

        if (authUser.role === 'super_admin') {
          const [allScreensRaw, menuStats, alerts] = await Promise.all([
            apiClient('/screens'),
            apiClient('/menus/stats/summary'),
            apiClient('/screens/alerts/multi-device').catch(() => []),
          ]);
          const allScreens = screensList(allScreensRaw);
          setStats({
            menus: menuStats.menus || 0,
            screens: allScreens.length || 0,
            menuItems: menuStats.menuItems || 0,
          });
          setMultiDeviceAlerts(Array.isArray(alerts) ? alerts : []);
        } else {
          const [menusResponse, screensRaw, menuStats] = await Promise.all([
            apiClient('/menus'),
            apiClient('/screens'),
            apiClient('/menus/stats/summary').catch(() => ({ menus: 0, menuItems: 0 })),
          ]);
          const menus = Array.isArray(menusResponse) ? menusResponse : (menusResponse?.menus || []);
          const screens = screensList(screensRaw);
          setStats({
            menus: menus.length || 0,
            screens: screens.length || 0,
            menuItems: menuStats.menuItems || 0,
          });
        }
      } catch (apiError) {
        setStats({ menus: 0, screens: 0, menuItems: 0 });
      }
    } catch {
      router.push(localePath('/login'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('dashboard_loading')}</div>
      </div>
    );
  }

  // Admin paneline özel içerik (normal admin; super_admin bu paneli görmez)
  if (user?.role === 'admin') {
    if (!adminDashboard) {
      return (
        <div className="min-w-0 overflow-x-hidden">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">{t('dashboard_title')}</h2>
          <p className="text-gray-500">Admin panel verisi yüklenemedi veya yetkiniz yok.</p>
        </div>
      );
    }
    const { admin_info, referred_users, income_summary, payment_statuses } = adminDashboard;
    return (
      <div className="min-w-0 overflow-x-hidden">
        <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">{t('dashboard_title')}</h2>

        {/* 1. Admin bilgileri */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Admin Bilgileri</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-gray-500">E-posta:</span> <span className="font-medium">{admin_info.email}</span></p>
            <p><span className="text-gray-500">Referans no:</span> <span className="font-mono font-medium">{admin_info.reference_number || '—'}</span></p>
          </div>
        </section>

        {/* 2. Referans ile kayıt olmuş kullanıcılar */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Referansınızla Kayıt Olan Kullanıcılar</h3>
          {referred_users.length === 0 ? (
            <p className="text-gray-500">Henüz referans numaranızla kayıt olan kullanıcı yok.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-2">E-posta</th>
                    <th className="py-2 pr-2">İşletme</th>
                    <th className="py-2 pr-2">Kayıt tarihi</th>
                    <th className="py-2 pr-2">Toplam ödeme</th>
                    <th className="py-2 pr-2">Sizin komisyon (%30)</th>
                  </tr>
                </thead>
                <tbody>
                  {referred_users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100">
                      <td className="py-2 pr-2">{u.email}</td>
                      <td className="py-2 pr-2">{u.business_name || '—'}</td>
                      <td className="py-2 pr-2">{formatDate(u.created_at)}</td>
                      <td className="py-2 pr-2">{u.total_paid.toFixed(2)}</td>
                      <td className="py-2 pr-2 font-medium text-green-600">{u.commission_earned.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 3. Admin gelir tablosu (%30 komisyon) */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Gelir Özeti</h3>
          <p className="text-gray-600 text-sm mb-3">Getirdiğiniz kullanıcıların ödemeleri üzerinden %30 komisyon alınmaktadır.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Referanslı kullanıcı sayısı</p>
              <p className="text-2xl font-bold text-gray-900">{income_summary.referred_user_count}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Toplam ödeme (getirdiğiniz)</p>
              <p className="text-2xl font-bold text-blue-600">{income_summary.total_referred_payments.toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Komisyon oranı</p>
              <p className="text-2xl font-bold text-gray-700">%{income_summary.commission_rate_percent}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-600">Toplam komisyon (sizin gelir)</p>
              <p className="text-2xl font-bold text-green-700">{income_summary.total_commission.toFixed(2)}</p>
            </div>
          </div>
        </section>

        {/* 4. Ödeme durumları ve ödeme alınamama bildirimleri */}
        <section className="bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6 mb-4">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Ödeme Durumları</h3>
          <p className="text-gray-600 text-sm mb-3">Referansınızla kayıt olan kullanıcıların son ödeme bilgisi ve ödeme alınamama durumları.</p>
          {payment_statuses.length === 0 ? (
            <p className="text-gray-500">Henüz referanslı kullanıcı veya ödeme kaydı yok.</p>
          ) : (
            <div className="space-y-3">
              {payment_statuses.map((s) => (
                <div key={s.user_id} className="border border-gray-200 rounded-lg p-3 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <p className="font-medium">{s.email}</p>
                    <p className="text-sm text-gray-500">{s.business_name || '—'}</p>
                  </div>
                  <div className="text-sm">
                    <p>Son ödeme: {formatDate(s.last_payment_date)} — Toplam: {s.total_paid.toFixed(2)} — Komisyon: {s.commission_earned.toFixed(2)}</p>
                    {s.payment_failure_count > 0 && (
                      <p className="text-amber-700 mt-1">
                        Ödeme alınamadı: {s.payment_failure_count} kez. Son: {formatDate(s.last_payment_failure)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  // Super admin ve business_user: mevcut kontrol paneli (Menüler, Ekranlar, kartlar) (menüler, ekranlar, kartlar)
  return (
    <div className="min-w-0 overflow-x-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-gray-900">{t('dashboard_title')}</h2>

      {/* Super admin: Aynı link birden fazla cihazda açık uyarısı */}
      {user?.role === 'super_admin' && multiDeviceAlerts.length > 0 && (
        <section className="mb-4 p-4 rounded-xl border-2 border-amber-200 bg-amber-50 shadow-md">
          <h3 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
            <span aria-hidden>⚠️</span>
            {t('dashboard_multi_device_alert_title')}
          </h3>
          <p className="text-sm text-amber-800 mb-3">{t('dashboard_multi_device_alert_desc')}</p>
          <ul className="space-y-2 mb-3">
            {multiDeviceAlerts.map((a) => (
              <li key={a.screen_id} className="flex flex-wrap items-center gap-2 text-sm bg-white/60 rounded-lg px-3 py-2">
                <span className="font-medium text-gray-900">{a.screen_name}</span>
                <span className="text-gray-600">({a.business_name})</span>
                <span className="text-amber-700 font-semibold">{t('screens_viewers_open', { count: a.active_viewer_count })}</span>
              </li>
            ))}
          </ul>
          <Link
            href={localePath('/screens')}
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800 hover:text-amber-900 underline"
          >
            {t('dashboard_multi_device_alert_go_to_screens')} →
          </Link>
        </section>
      )}

      <div className="grid grid-cols-3 gap-2 md:gap-4 mb-4">
        <div className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100">
          <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-1 truncate">{t('dashboard_menus')}</h3>
          <p className="text-2xl md:text-4xl font-bold text-blue-600">{stats.menus}</p>
        </div>
        <div className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100">
          <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-1 truncate">{t('dashboard_screens')}</h3>
          <p className="text-2xl md:text-4xl font-bold text-green-600">{stats.screens}</p>
        </div>
        <div className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100">
          <h3 className="text-xs md:text-sm font-semibold text-gray-800 mb-1 truncate">{t('dashboard_menu_items')}</h3>
          <p className="text-2xl md:text-4xl font-bold text-purple-600">{stats.menuItems}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4">
        <Link href={localePath('/menus')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100 hover:shadow-lg md:hover:bg-gray-50 transition-all">
          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{t('dashboard_manage_menus')}</h3>
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_manage_menus_desc')}</p>
        </Link>
        <Link href={localePath('/screens')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100 hover:shadow-lg md:hover:bg-gray-50 transition-all">
          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{t('dashboard_manage_screens')}</h3>
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_manage_screens_desc')}</p>
        </Link>
        <Link href={localePath('/templates')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100 hover:shadow-lg md:hover:bg-gray-50 transition-all">
          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">🎨 {t('dashboard_template_lib')}</h3>
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_template_lib_desc')}</p>
        </Link>
        {(user?.role === 'super_admin' || user?.role === 'admin') && (
          <>
            <Link href={localePath('/library')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100 hover:shadow-lg md:hover:bg-gray-50 transition-all">
              <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">📚 {t('dashboard_content_lib')}</h3>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_content_lib_desc')}</p>
            </Link>
            <Link href={localePath('/user-uploads')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border border-gray-100 hover:shadow-lg md:hover:bg-gray-50 transition-all">
              <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">📤 {t('dashboard_user_uploads')}</h3>
              <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_user_uploads_desc')}</p>
            </Link>
          </>
        )}
        <Link href={localePath('/pricing')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border-2 border-blue-200 hover:shadow-lg md:hover:bg-blue-50 transition-all">
          <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{t('dashboard_pricing')}</h3>
          <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_pricing_desc')}</p>
        </Link>
        {user?.role === 'super_admin' && (
          <Link href={localePath('/users')} className="bg-white p-3 md:p-5 rounded-lg shadow-md border-2 border-purple-200 hover:shadow-lg md:hover:bg-purple-50 transition-all">
            <h3 className="text-sm md:text-base font-bold text-gray-900 mb-0.5 md:mb-1 truncate">{t('dashboard_users')}</h3>
            <p className="text-xs md:text-sm text-gray-600 line-clamp-2">{t('dashboard_users_desc')}</p>
          </Link>
        )}
      </div>
    </div>
  );
}
