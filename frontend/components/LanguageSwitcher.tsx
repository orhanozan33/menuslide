'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n/translations';

const localeLabels: Record<Locale, string> = {
  en: 'EN',
  tr: 'TR',
  fr: 'FR',
};

interface LanguageSwitcherProps {
  className?: string;
  variant?: 'bar' | 'square';
  /** Köşede sabit (display sayfası için) */
  fixed?: boolean;
  /** Koyu arka plan için (login dışı sayfalar) */
  dark?: boolean;
}

/** Küçük kare dil çubuğu - tüm kullanıcı sayfalarında */
export function LanguageSwitcher({ className = '', variant = 'square', fixed = false, dark = false }: LanguageSwitcherProps) {
  const { locale, setLocale } = useTranslation();
  const [open, setOpen] = useState(false);
  const btnClass = dark
    ? 'border-white/30 bg-white/10 text-white hover:bg-white/20'
    : 'border-gray-300 bg-white/95 text-gray-700 hover:bg-gray-50';

  if (variant === 'bar') {
    const barContainerClass = 'flex items-center gap-1';
    const barButtonClass = (loc: Locale) =>
      locale === loc
        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';
    return (
      <div className={`${barContainerClass} ${className}`}>
        {SUPPORTED_LOCALES.map((loc) => (
          <button
            key={loc}
            type="button"
            onClick={() => setLocale(loc)}
            className={`min-w-[2rem] min-h-[35px] px-2 rounded border text-[11px] font-medium transition-colors touch-manipulation ${barButtonClass(loc)}`}
          >
            {localeLabels[loc]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`relative ${fixed ? 'z-[90]' : ''} ${className}`}
      style={fixed ? { position: 'fixed', top: '1rem', right: '1rem', left: 'auto' } : undefined}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`min-w-[35px] min-h-[35px] flex items-center justify-center rounded-md border backdrop-blur text-[11px] font-semibold shadow-sm touch-manipulation ${btnClass}`}
        aria-label="Dil seç"
        title={localeLabels[locale]}
      >
        {localeLabels[locale]}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div className={`absolute right-0 top-full mt-1 z-50 flex flex-col gap-0.5 rounded-lg border shadow-lg py-1 min-w-[5rem] ${dark ? 'border-white/20 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            {SUPPORTED_LOCALES.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => {
                  setLocale(loc);
                  setOpen(false);
                }}
                className={`px-3 py-2 text-left text-sm font-medium transition-colors ${
                  locale === loc
                    ? dark ? 'bg-blue-600/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                    : dark ? 'text-gray-300 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {loc === 'en' ? 'English' : loc === 'tr' ? 'Türkçe' : 'Français'}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
