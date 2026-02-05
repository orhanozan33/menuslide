'use client';

import dynamic from 'next/dynamic';

const GrapesEditor = dynamic(() => import('@/components/GrapesEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[80vh] text-slate-600">
      Editör yükleniyor…
    </div>
  ),
});

export default function EditorFramePage() {
  return (
    <div className="min-h-screen bg-white">
      <GrapesEditor />
    </div>
  );
}
