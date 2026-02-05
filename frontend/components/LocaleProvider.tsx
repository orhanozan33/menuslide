'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo } from 'react';
import { LocaleContext } from '@/lib/i18n/useTranslation';
import { translations, type Locale, LOCALE_STORAGE_KEY, DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/translations';

const LOCALES = ['en', 'tr', 'fr'] as const;

function getLocaleFromPathname(pathname: string | null): Locale {
  if (!pathname) return DEFAULT_LOCALE;
  const first = pathname.split('/').filter(Boolean)[0];
  return (LOCALES.includes(first as never) ? first : DEFAULT_LOCALE) as Locale;
}

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  return DEFAULT_LOCALE;
}

function pathHasLocale(pathname: string | null): boolean {
  if (!pathname) return false;
  const first = pathname.split('/').filter(Boolean)[0];
  return LOCALES.includes(first as never);
}

export function LocaleProvider({ children, locale: localeProp }: { children: React.ReactNode; locale?: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = localeProp ?? (pathHasLocale(pathname) ? getLocaleFromPathname(pathname) : getStoredLocale());

  // Giriş yapmış kullanıcının tercih ettiği dil: sayfa yüklenince tercih edilen dile yönlendir
  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return;
    const pathLocale = getLocaleFromPathname(pathname);
    const segment0 = pathname.split('/').filter(Boolean)[0];
    if (!LOCALES.includes(segment0 as never)) return; // path'ta dil yoksa dokunma
    try {
      const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      if (!userStr || !token) return;
      const user = JSON.parse(userStr);
      const preferred = (user?.preferred_locale === 'tr' || user?.preferred_locale === 'fr') ? user.preferred_locale : 'en';
      if (pathLocale === preferred) return;
      const rest = pathname.split('/').filter(Boolean).slice(1).join('/');
      const newPath = rest ? `/${preferred}/${rest}` : `/${preferred}`;
      router.replace(newPath);
    } catch {
      // ignore
    }
  }, [pathname, router]);

  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
        document.documentElement.lang = newLocale;
        document.cookie = `user_locale=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`;
        // Giriş yapmış kullanıcı: tercih edilen dili backend'e kaydet
        try {
          const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
          const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
          if (token && userStr) {
            await fetch('/api/proxy/auth/me', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ preferred_locale: newLocale }),
            });
            const user = JSON.parse(userStr);
            const updated = { ...user, preferred_locale: newLocale };
            localStorage.setItem('user', JSON.stringify(updated));
            if (sessionStorage.getItem('impersonation_user')) sessionStorage.setItem('impersonation_user', JSON.stringify(updated));
          }
        } catch {
          // ignore
        }
      }
      const hasLocaleInPath = pathname ? LOCALES.includes(pathname.split('/').filter(Boolean)[0] as never) : false;
      const rest = pathname ? (hasLocaleInPath ? pathname.split('/').filter(Boolean).slice(1).join('/') : pathname.replace(/^\//, '')) : '';
      const newPath = rest ? `/${newLocale}/${rest}` : `/${newLocale}`;
      router.push(newPath);
    },
    [pathname, router]
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const localeMap = translations[locale];
      let s = localeMap[key] ?? translations[DEFAULT_LOCALE][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      return s;
    },
    [locale]
  );

  const localePath = useCallback(
    (path: string) => {
      const clean = path.startsWith('/') ? path.slice(1) : path;
      return `/${locale}/${clean}`.replace(/\/+/g, '/');
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, localePath }),
    [locale, setLocale, t, localePath]
  );

  return (
    <LocaleContext.Provider value={value}>
      {children}
    </LocaleContext.Provider>
  );
}
