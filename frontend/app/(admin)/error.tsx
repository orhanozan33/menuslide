'use client';

import { useEffect } from 'react';

export default function AdminError({
  error,
  reset,
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
}) {
  useEffect(() => {
    try {
      if (error) console.error('[admin]', error?.message ?? String(error));
    } catch {
      /* ignore */
    }
  }, [error]);

  const message = error?.message || 'Sayfa yüklenirken bir sorun oluştu.';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-900 text-white">
      <h1 className="text-xl font-bold mb-2">Bir hata oluştu</h1>
      <p className="text-white/70 text-sm mb-6 text-center max-w-md">
        {message}
      </p>
      <button
        type="button"
        onClick={() => reset?.()}
        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium"
      >
        Tekrar dene
      </button>
    </div>
  );
}
