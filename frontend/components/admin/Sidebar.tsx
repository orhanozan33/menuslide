'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { isImpersonating, clearImpersonation } from '@/lib/auth-utils';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

interface SidebarProps {
  user: any;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

interface MenuItem {
  titleKey: string;
  href: string;
  icon: string;
  roles: string[];
  external?: boolean;
}

const DEFAULT_WHATSAPP = '14385968566';

export default function Sidebar({ user, mobileOpen = false, onMobileClose }: SidebarProps) {
  const { t, localePath } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState<string>(DEFAULT_WHATSAPP);

  useEffect(() => {
    fetch('/api/contact-info', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { whatsapp?: string }) => {
        const num = (data.whatsapp || '').trim().replace(/\D/g, '');
        if (num) setWhatsappNumber(num);
      })
      .catch(() => {});
  }, []);

  // Close mobile sidebar only when route changes (not on mount)
  const prevPathnameRef = useRef(pathname);
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      onMobileClose?.();
    }
  }, [pathname, onMobileClose]);

  const handleLogout = async () => {
    // Clear auth (impersonation veya normal)
    clearImpersonation();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
    }
    
    router.push(localePath('/'));
  };

  const handleExitImpersonation = () => {
    clearImpersonation();
    window.close();
    if (!window.closed) router.push(localePath('/users'));
  };

  const menuItems: MenuItem[] = [
    { titleKey: 'sidebar_dashboard', href: 'dashboard', icon: '📊', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_menus', href: 'menus', icon: '🍽️', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_screens', href: 'screens', icon: '📺', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_sistem', href: 'sistem', icon: '🔧', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_full_editor_templates', href: 'templates/full-editor', icon: '🖼️', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_editor', href: 'editor', icon: '✏️', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_templates_system', href: 'templates/system', icon: '🎨', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_templates_mine', href: 'templates/mine', icon: '📋', roles: ['business_user', 'tv_user'] },
    { titleKey: 'sidebar_library', href: 'library', icon: '📚', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_uploads', href: 'user-uploads', icon: '📤', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_pricing', href: 'pricing', icon: '💰', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
    { titleKey: 'sidebar_my_account', href: 'account', icon: '⚙️', roles: ['business_user', 'tv_user'] },
    { titleKey: 'sidebar_reports', href: 'reports', icon: '📊', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_registration_requests', href: 'registration-requests', icon: '🔔', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_users', href: 'users', icon: '👥', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_stripe', href: 'settings/stripe', icon: '💳', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_settings', href: 'settings', icon: '⚙️', roles: ['super_admin', 'admin'] },
    { titleKey: 'sidebar_whatsapp', href: `https://wa.me/${whatsappNumber}`, icon: 'whatsapp', roles: ['super_admin', 'admin', 'business_user', 'tv_user'], external: true },
    { titleKey: 'sidebar_how_to_use', href: 'how-to-use', icon: '📖', roles: ['super_admin', 'admin', 'business_user', 'tv_user'] },
  ];

  // Admin sidebar: href -> yetki sayfa anahtarı (settings/stripe -> stripe). Her key tek olmalı.
  const hrefToPermissionKey: Record<string, string> = {
    dashboard: 'dashboard',
    menus: 'menus',
    screens: 'screens',
    sistem: 'sistem',
    'templates/system': 'templates',
    'templates/mine': 'templates',
    'templates/full-editor': 'full_editor',
    editor: 'editor',
    library: 'library',
    'user-uploads': 'user-uploads',
    pricing: 'pricing',
    reports: 'reports',
    'registration-requests': 'registration_requests',
    users: 'users',
    'settings/stripe': 'stripe',
    settings: 'settings',
  };

  // Admin için yetki verilmemiş sayfalar varsayılan görünsün (sistem, full_editor – mevcut adminler görebilsin)
  const adminDefaultVisibleKeys: Set<string> = new Set(['sistem', 'full_editor']);

  const filteredMenuItems = menuItems.filter(item => {
    const role = user?.role || '';
    if (!item.roles.includes(role)) return false;
    // Super admin: tüm menüyü görür
    if (role === 'super_admin') return true;
    // Admin: yetki verilen sayfalar görünsün; yetki yoksa sistem/full_editor varsayılan görünsün
    if (role === 'admin' && user?.admin_permissions) {
      const key = hrefToPermissionKey[item.href];
      if (key == null) return true; // whatsapp, how-to-use gibi eşlemesi yoksa göster
      const perm = user.admin_permissions[key];
      if (perm && typeof perm === 'object' && typeof (perm as Record<string, boolean>).view === 'boolean') return (perm as Record<string, boolean>).view === true;
      if (adminDefaultVisibleKeys.has(key)) return true; // yetki tanımlı değilse Full Editor sayfaları varsayılan göster
      return false;
    }
    return true;
  });

  const isActive = (href: string) => {
    const fullPath = localePath(`/${href}`);
    if (href === 'dashboard') {
      return pathname === fullPath || pathname === `/${href}`;
    }
    return pathname?.startsWith(fullPath) || pathname?.includes(`/${href}`);
  };

  const sidebarContent = (
    <div className={`bg-slate-800 text-white min-h-screen flex flex-col flex-1 ${
      (onMobileClose && !isDesktop) ? 'w-64' : (isCollapsed ? 'w-20' : 'w-64')
    }`}>
      {/* En üst: Kullanıcı e-posta + Çıkış butonu */}
      <div className="p-4 pb-3 border-b border-slate-700 space-y-2">
        <button
          onClick={isImpersonating() ? handleExitImpersonation : handleLogout}
          className={`inline-flex items-center gap-1.5 px-2 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-medium transition-colors ${
            (isCollapsed && !onMobileClose) ? 'w-full justify-center' : ''
          }`}
          title={isCollapsed ? t('sidebar_logout') : ''}
        >
          <span className="text-sm">🚪</span>
          {(!isCollapsed || (onMobileClose && !isDesktop)) && (
            <span>{isImpersonating() ? t('sidebar_close_window') : t('sidebar_logout')}</span>
          )}
        </button>
        {(!isCollapsed || (onMobileClose && !isDesktop)) && (
          <div className="space-y-0.5 pt-1">
            <div className="text-sm text-white truncate" title={user?.email}>
              {user?.email || t('sidebar_user')}
            </div>
            <div className="text-[11px] text-slate-400">
              {t('sidebar_reference')}: {user?.reference_number ?? '-'}
            </div>
            <div className="text-[11px] text-slate-500">
              {user?.role === 'super_admin' ? t('sidebar_super_admin') :
               user?.role === 'admin' ? t('sidebar_admin') :
               user?.role === 'tv_user' ? t('sidebar_tv_user') : t('sidebar_business_user')}
            </div>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        {(!isCollapsed || (onMobileClose && !isDesktop)) && (
          <Link href={localePath('/')} className="flex items-center min-w-0 hover:opacity-90 active:opacity-80">
            <img src="/menuslide-logo.png" alt="MenuSlide" className="h-8 w-auto object-contain max-w-full" />
          </Link>
        )}
        <div className="flex items-center gap-1">
          {/* Mobil: kapat butonu */}
          {onMobileClose && !isDesktop && (
            <button
              onClick={onMobileClose}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              aria-label={t('common_close')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          {/* Masaüstü: açılır kapanır butonu */}
          {(!onMobileClose || isDesktop) && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-slate-700 rounded-lg transition-colors hidden lg:flex"
              title={isCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
              aria-label={isCollapsed ? t('sidebar_expand') : t('sidebar_collapse')}
            >
              {isCollapsed ? '→' : '←'}
            </button>
          )}
        </div>
      </div>

      {/* Dil çubuğu - Menu Slide altında */}
      <div className="px-4 py-3 border-b border-slate-700">
        <LanguageSwitcher
          variant={(isCollapsed && (onMobileClose ? isDesktop : true)) ? 'square' : 'bar'}
          dark
          className={(isCollapsed && (onMobileClose ? isDesktop : true)) ? '' : 'w-full'}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {filteredMenuItems.map((item) => {
          const active = !item.external && isActive(item.href);
          const linkClass = `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
            active
              ? 'bg-blue-600 text-white'
              : 'text-slate-300 hover:bg-slate-700 hover:text-white'
          }`;
          const iconContent = item.icon === 'whatsapp' ? (
            <svg className="w-6 h-6 flex-shrink-0 text-[#25D366]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          ) : (
            <span className="text-xl flex-shrink-0">{item.icon}</span>
          );
          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                title={isCollapsed ? t(item.titleKey) : ''}
              >
                {iconContent}
                {(!isCollapsed || (onMobileClose && !isDesktop)) && (
                  <span className="font-medium">{t(item.titleKey)}</span>
                )}
              </a>
            );
          }
          return (
            <Link
              key={item.href}
              href={localePath(`/${item.href}`)}
              className={linkClass}
              title={isCollapsed ? t(item.titleKey) : ''}
            >
              {iconContent}
              {(!isCollapsed || (onMobileClose && !isDesktop)) && (
                <span className="font-medium">{t(item.titleKey)}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Impersonation banner */}
      {isImpersonating() && (
        <div className="mx-4 mb-4 p-3 bg-amber-600/30 border border-amber-500/50 rounded-lg">
          <div className="text-xs text-amber-200 mb-1">👤 {t('sidebar_impersonating')}</div>
          <button
            onClick={handleExitImpersonation}
            className="w-full px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-white text-sm font-medium"
          >
            {t('sidebar_exit_impersonation')}
          </button>
        </div>
      )}
    </div>
  );

  // Render both: desktop sidebar (lg+) and mobile drawer (<lg) when onMobileClose provided
  const hasMobileMode = typeof onMobileClose === 'function';

  return (
    <>
      {hasMobileMode && (
        <>
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={onMobileClose}
              aria-hidden="true"
            />
          )}
          <div
            className={`fixed top-0 left-0 z-50 h-full flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            {sidebarContent}
          </div>
        </>
      )}
      {/* Desktop sidebar - visible on lg+ */}
      <div className={`${hasMobileMode ? 'hidden lg:flex' : 'flex'} flex-col flex-shrink-0 transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        {sidebarContent}
      </div>
    </>
  );
}
