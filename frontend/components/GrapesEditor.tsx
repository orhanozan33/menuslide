'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/lib/i18n/useTranslation';

function GrapesEditorLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center min-h-[70vh] text-slate-600">
      {t('editor_loading')}
    </div>
  );
}

// GrapesJS ve grapesjs sadece istemcide yüklensin; sunucuda hiç çalışmasın (500 önlemi)
const GrapesEditorClient = dynamic(() => import('./GrapesEditorClient'), {
  ssr: false,
  loading: () => <GrapesEditorLoading />,
});

export default function GrapesEditor() {
  return <GrapesEditorClient />;
}
