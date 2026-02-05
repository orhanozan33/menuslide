'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Sidebar from '@/components/admin/Sidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { AdminUserProvider } from '@/lib/AdminUserContext';

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, localePath, locale } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const LOGIN_PATH = localePath('/login');
    const MAX_WAIT_MS = 12000; // En fazla 12 saniye "Yükleniyor...", sonra login'e yönlendir veya içeriği göster

    const checkAuth = async () => {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');

      if (!token || !userStr) {
        setLoading(false);
        router.push(LOGIN_PATH);
        return;
      }

      let userData: any;
      try {
        userData = JSON.parse(userStr);
      } catch {
        setLoading(false);
        router.push(LOGIN_PATH);
        return;
      }

      if (userData.role === 'admin') {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000);
          const res = await fetch('/api/proxy/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          const me = res.ok ? (await res.json()) : null;
          if (me?.admin_permissions != null) {
            const merged = {
              ...userData,
              ...me,
              reference_number: me.reference_number ?? userData.reference_number ?? undefined,
              admin_permissions: me.admin_permissions,
            };
            setUser(merged);
            const storage = sessionStorage.getItem('impersonation_user') ? sessionStorage : localStorage;
            const key = sessionStorage.getItem('impersonation_user') ? 'impersonation_user' : 'user';
            storage.setItem(key, JSON.stringify(merged));
          } else {
            setUser(userData);
          }
        } catch {
          setUser(userData);
        }
      } else {
        setUser(userData);
      }

      setLoading(false);
    };

    checkAuth();

    const timeoutId = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
          const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
          if (!token || !userStr) router.push(LOGIN_PATH);
          return false;
        }
        return prev;
      });
    }, MAX_WAIT_MS);

    if (supabase) {
      supabase.auth.getSession().then(({ data }: { data: { session: any } }) => {
        const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
        if (!token && !data.session) {
          setLoading(false);
          router.push(LOGIN_PATH);
        }
      }).catch(() => checkAuth());
    }

    return () => clearTimeout(timeoutId);
  }, [router, localePath]);

  // Backend'den güncel profil al (reference_number vb.) - admin referans numarası sidebar'da görünsün
  const fetchAndMergeMe = () => {
    if (!user) return;
    const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
    if (!token) return;
    fetch('/api/proxy/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((me: { reference_number?: string | null; preferred_locale?: string; admin_permissions?: Record<string, Record<string, boolean>> } | null) => {
        if (!me) return;
        const merged = {
          ...user,
          ...me,
          reference_number: me.reference_number ?? user.reference_number ?? undefined,
          admin_permissions: me.admin_permissions ?? user.admin_permissions,
        };
        setUser(merged);
        const storage = sessionStorage.getItem('impersonation_user') ? sessionStorage : localStorage;
        const key = sessionStorage.getItem('impersonation_user') ? 'impersonation_user' : 'user';
        storage.setItem(key, JSON.stringify(merged));
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchAndMergeMe();
  }, [user?.id]);

  // Admin/super_admin için referans yoksa bir kez daha dene (migration sonrası veya ilk yüklemede)
  useEffect(() => {
    if (!user?.id) return;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin || user.reference_number) return;
    const t = setTimeout(fetchAndMergeMe, 800);
    return () => clearTimeout(t);
  }, [user?.id, user?.role, user?.reference_number]);

  // Admin sayfa erişimi: yetkisi olmayan sayfaya girerse dashboard'a yönlendir
  const pathToPermissionKey: Record<string, string> = {
    'dashboard': 'dashboard', 'menus': 'menus', 'screens': 'screens', 'templates': 'templates',
    'editor': 'editor', 'library': 'library', 'user-uploads': 'user-uploads', 'pricing': 'pricing',
    'reports': 'reports', 'registration-requests': 'registration_requests', 'users': 'users',
    'settings/stripe': 'stripe', 'settings': 'settings',
  };
  useEffect(() => {
    if (!user || user.role !== 'admin' || !pathname) return;
    const perms = user.admin_permissions as Record<string, Record<string, boolean>> | undefined;
    if (!perms) return;
    const parts = pathname.split('/').filter(Boolean);
    const localeFirst = parts[0] === 'tr' || parts[0] === 'en' || parts[0] === 'fr';
    const pagePath = (localeFirst ? parts.slice(1) : parts).join('/') || 'dashboard';
    // users/123 -> users, menus/123 -> menus, vb.
    const topSegment = pagePath.split('/')[0];
    const pageKey = pathToPermissionKey[pagePath] ?? pathToPermissionKey[topSegment];
    if (pageKey == null) return;
    const pagePerm = perms[pageKey];
    const hasView = pagePerm && typeof pagePerm === 'object' && pagePerm.view === true;
    if (!hasView) router.replace(localePath('/dashboard'));
  }, [user, pathname, router, localePath]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('dashboard_loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex overflow-x-hidden">
      <Sidebar
        user={user}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col overflow-x-hidden min-w-0">
        {/* Mobile header with hamburger - only on mobile */}
        <div className="lg:hidden flex items-center justify-between gap-3 h-14 px-4 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSidebarOpen(true); }}
              className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label={t('sidebar_expand')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href={localePath('/')} className="font-semibold text-gray-800 truncate hover:text-gray-600 active:opacity-80">{t('sidebar_title')}</Link>
          </div>
          <div className="flex-shrink-0">
            <AdminHeader user={user} localePath={localePath} mobile />
          </div>
        </div>
        {/* Desktop AdminHeader */}
        <div className="hidden lg:block">
          <AdminHeader user={user} localePath={localePath} />
        </div>
        <main className="flex-1 overflow-x-hidden min-w-0">
          <div className="p-4 sm:p-6 min-w-0">
            <AdminUserProvider user={user}>
              {children}
            </AdminUserProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
