'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function PrivacyPage() {
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
          <h1 className="text-3xl font-bold text-white mb-2">{t('privacy_title')}</h1>
          <p className="text-white/50 text-sm mb-8">{t('privacy_last_updated')}: {t('privacy_date')}</p>
          <div className="space-y-6 text-white/80 text-sm leading-relaxed">
            <p>{t('privacy_p1')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h1')}</h2>
            <p>{t('privacy_p2')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h2')}</h2>
            <p>{t('privacy_p3')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h3')}</h2>
            <p>{t('privacy_p4')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h4')}</h2>
            <p>{t('privacy_p5')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h5')}</h2>
            <p>{t('privacy_p6')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h6')}</h2>
            <p>{t('privacy_p7')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h7')}</h2>
            <p>{t('privacy_p8')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h8')}</h2>
            <p>{t('privacy_p9')}</p>
            <h2 className="text-lg font-semibold text-white mt-8">{t('privacy_h9')}</h2>
            <p>{t('privacy_p10')}</p>
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
