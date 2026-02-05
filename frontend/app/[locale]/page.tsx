'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { HomePage } from '@/components/home/HomePage';

const LOCALES = ['en', 'tr', 'fr'] as const;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
}

export default function LocaleHomePage() {
  const params = useParams();
  const { localePath } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [hasToken, setHasToken] = useState<boolean | null>(null);

  const locale = (params && (params as { locale?: string }).locale) || 'en';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;
    const token = getToken();
    setHasToken(!!token);
    if (!token) return;
    const validLocale = LOCALES.includes(locale as (typeof LOCALES)[number]) ? locale : 'en';
    window.location.replace(`/${validLocale}/dashboard`);
  }, [mounted, locale]);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white/80 animate-pulse">...</p>
      </div>
    );
  }

  if (hasToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white/80 animate-pulse">...</p>
      </div>
    );
  }

  return <HomePage localePath={localePath} />;
}
