'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';
import SimpleTvEditor from '@/components/SimpleTvEditor';

export default function EditorPage() {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-slate-900">{t('editor_design_title')}</h1>
      </div>
      <SimpleTvEditor />
    </div>
  );
}
