'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function TermsPage() {
  const { t, localePath } = useTranslation();

  return (
    <div className="min-h-screen bg-[#06090f] text-white flex flex-col">
      <header className="h-16 flex items-center justify-between px-5 md:px-12 border-b border-white/5">
        <Link href={localePath('/')} className="flex items-center gap-3">
          <img src="/menuslide-logo.png" alt="MenuSlide" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>
        <Link href={localePath('/')} className="text-sm text-white/70 hover:text-white">
          ← {t('register_back_home')}
        </Link>
      </header>

      <main className="flex-1 px-5 md:px-12 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2">{t('terms_title')}</h1>
          <p className="text-white/50 text-sm mb-8">{t('terms_last_updated')}: {t('terms_date')}</p>
          <div className="space-y-6 text-white/80 text-sm leading-relaxed">
            <p>{t('terms_p1')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h1')}</h2>
            <p>{t('terms_p2')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h2')}</h2>
            <p>{t('terms_p3')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h3')}</h2>
            <p>{t('terms_p4')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h4')}</h2>
            <p>{t('terms_p5')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h5')}</h2>
            <p>{t('terms_p6')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h6')}</h2>
            <p>{t('terms_p7')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h7')}</h2>
            <p>{t('terms_p8')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h8')}</h2>
            <p>{t('terms_p9')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h9')}</h2>
            <p>{t('terms_p10')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('terms_h10')}</h2>
            <p>{t('terms_p11')}</p>
          </div>
          <Link
            href={localePath('/')}
            className="inline-block mt-8 text-sm text-emerald-400 hover:text-emerald-300"
          >
            ← {t('register_back_home')}
          </Link>
        </div>
      </main>
    </div>
  );
}
