'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { HomePage } from '@/components/home/HomePage';

const LOCALE_STORAGE_KEY = 'user_locale';
const LOCALES = ['en', 'tr', 'fr'] as const;
const DEFAULT_LOCALE = 'en';

export default function RootPage() {
  const { localePath } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
    if (!token) return;

    const pathname = window.location.pathname;
    const firstSeg = pathname?.split('/').filter(Boolean)[0];
    const localeFromUrl = firstSeg && LOCALES.includes(firstSeg as never) ? firstSeg : null;
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    const locale = (localeFromUrl as string) || (stored && LOCALES.includes(stored as never) ? stored : DEFAULT_LOCALE);
    window.location.replace(`/${locale}/dashboard`);
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white/80 animate-pulse">...</p>
      </div>
    );
  }

  const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
  if (token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white/80 animate-pulse">...</p>
      </div>
    );
  }

  return <HomePage localePath={localePath} />;
}
