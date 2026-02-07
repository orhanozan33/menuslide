'use client';

import { useEffect } from 'react';
import { I18nProvider } from '@/lib/i18n/useTranslation';
import { ToastProvider } from '@/lib/ToastContext';
import { ConfirmProvider } from '@/lib/ConfirmContext';
import { LocaleProvider } from '@/components/LocaleProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = 'supabase_setup_called';
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      fetch('/api/setup-supabase').catch(() => {});
    }
  }, []);

  return (
    <I18nProvider>
      <LocaleProvider>
        <ToastProvider>
          <ConfirmProvider>{children}</ConfirmProvider>
        </ToastProvider>
      </LocaleProvider>
    </I18nProvider>
  );
}
