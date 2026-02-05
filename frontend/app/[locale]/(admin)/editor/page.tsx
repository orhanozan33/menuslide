'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const CanvasDesignEditor = dynamic(() => import('@/components/CanvasDesignEditor'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center min-h-[400px] text-slate-500">Yükleniyor...</div>,
});

function EditorContent() {
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId') || undefined;
  return <CanvasDesignEditor templateId={templateId} />;
}

/** Editor UI: only render after mount so useSearchParams/dynamic never run on server (avoids 500). */
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

export default function EditorPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        <div className="h-9 bg-slate-200 rounded w-48 animate-pulse" />
        <div className="flex items-center justify-center min-h-[400px] text-slate-500">Yükleniyor...</div>
      </div>
    );
  }

  return <EditorBody />;
}
