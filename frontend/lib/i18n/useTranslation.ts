'use client';

import React, { createContext, useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { translations, type Locale, LOCALE_STORAGE_KEY, DEFAULT_LOCALE, SUPPORTED_LOCALES } from './translations';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  localePath?: (path: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
export const LocaleContext = createContext<I18nContextValue | null>(null);

function getStoredLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) return stored as Locale;
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(getStoredLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  useEffect(() => {
    if (mounted && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale, mounted]);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const localeMap = translations[mounted ? locale : DEFAULT_LOCALE];
      let s = localeMap[key] ?? translations[DEFAULT_LOCALE][key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      return s;
    },
    [locale, mounted]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useTranslation() {
  const localeCtx = useContext(LocaleContext);
  const ctx = useContext(I18nContext);
  const resolved = localeCtx ?? ctx;
  if (!resolved) {
    return {
      locale: DEFAULT_LOCALE as Locale,
      setLocale: () => {},
      t: (key: string, vars?: Record<string, string | number>) => {
        let s = translations[DEFAULT_LOCALE][key] ?? key;
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        return s;
      },
      localePath: (path: string) => path,
    };
  }
  return {
    ...resolved,
    localePath: resolved.localePath ?? ((path: string) => path),
  };
}
