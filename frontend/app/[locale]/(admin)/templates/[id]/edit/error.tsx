'use client';

import { useEffect } from 'react';

export default function TemplateEditError({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    try {
      if (error) console.error('[template-edit]', error?.message ?? String(error));
    } catch {
      /* ignore */
    }
  }, [error]);

  const message = error?.message || 'Şablon düzenlenirken bir hata oluştu. Sayfayı yenileyin.';

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 bg-slate-100 rounded-lg border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Şablon editörü yüklenemedi</h2>
      <p className="text-slate-600 text-sm mb-4 text-center max-w-md">
        {message}
      </p>
      <button
        type="button"
        onClick={() => reset?.()}
        className="px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
      >
        Tekrar dene
      </button>
    </div>
  );
}
