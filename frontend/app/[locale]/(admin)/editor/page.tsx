'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

const CanvasDesignEditor = dynamic(() => import('@/components/CanvasDesignEditor'), { ssr: false });

export default function EditorPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const templateId = searchParams?.get('templateId') || undefined;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">{t('editor_design_title')}</h1>
      </div>
      <CanvasDesignEditor templateId={templateId} />
    </div>
  );
}
