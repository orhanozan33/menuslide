'use client';

import { I18nProvider } from '@/lib/i18n/useTranslation';
import { ToastProvider } from '@/lib/ToastContext';
import { LocaleProvider } from '@/components/LocaleProvider';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <LocaleProvider>
        <ToastProvider>{children}</ToastProvider>
      </LocaleProvider>
    </I18nProvider>
  );
}
