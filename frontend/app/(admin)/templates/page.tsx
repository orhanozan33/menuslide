'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

function TemplatesFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="text-xl font-medium text-white mb-2">{t('common_loading')}</div>
      </div>
    </div>
  );
}

export default function TemplatesLibraryPage() {
  const router = useRouter();
  const { localePath } = useTranslation();
  useEffect(() => {
    router.replace(localePath('/templates/system'));
  }, [router, localePath]);
  return <TemplatesFallback />;
}
