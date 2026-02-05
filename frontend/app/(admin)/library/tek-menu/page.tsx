'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function TekMenuPage() {
  const { t, localePath } = useTranslation();
  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-4">{t('library_regional_menu')}</h1>
      <p className="text-gray-400 mb-6">
        {t('library_regional_menu_desc')}
      </p>
      <Link
        href={localePath('/library')}
        className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        ← {t('library_back_to_library')}
      </Link>
    </div>
  );
}
