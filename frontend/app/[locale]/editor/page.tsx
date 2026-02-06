'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import AdminLayoutClient from '@/app/(admin)/AdminLayoutClient';

const CanvasDesignEditor = dynamic(() => import('@/components/CanvasDesignEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px] text-slate-500">Yükleniyor...</div>,
});

function EditorContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId') || undefined;
  return <CanvasDesignEditor templateId={templateId} />;
}

function EditorBody() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">{t('editor_design_title')}</h1>
      </div>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px] text-slate-500">Yükleniyor...</div>}>
        <EditorContent />
      </Suspense>
    </div>
  );
}

/**
 * Editor at [locale]/editor (not under (admin)) so server never runs AdminLayoutClient.
 * We wrap with AdminLayoutClient only after mount so user gets sidebar.
 */
export default function EditorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <p className="text-white/80 animate-pulse">Yükleniyor...</p>
      </div>
    );
  }

  return (
    <AdminLayoutClient>
      <EditorBody />
    </AdminLayoutClient>
  );
}
