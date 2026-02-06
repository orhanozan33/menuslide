'use client';

import { useEffect } from 'react';

export default function EditorFrameError({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    try {
      if (error) console.error('[editor-frame]', error?.message ?? String(error));
    } catch {
      /* ignore */
    }
  }, [error]);

  const isNotGranted = error?.message?.toLowerCase().includes('not granted');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 bg-slate-100 rounded-lg border border-slate-200">
      <h2 className="text-lg font-semibold text-slate-800 mb-2">Editör yüklenemedi</h2>
      <p className="text-slate-600 text-sm mb-4 text-center max-w-md">
        {isNotGranted
          ? 'Tarayıcı izin hatası (örn. panoya erişim). Sayfayı yenileyin; gerekirse adres çubuğundan bu sitenin panoya erişimine izin verin.'
          : error?.message || 'Bir hata oluştu. Sayfayı yenileyip tekrar deneyin.'}
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
