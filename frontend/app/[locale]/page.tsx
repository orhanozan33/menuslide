'use client';

import dynamic from 'next/dynamic';

// SSR kapalı: Vercel/production'ta "Cannot read properties of null (reading 'useState')" hatasını önler
const LocaleHomePageClient = dynamic(() => import('@/components/home/LocaleHomePageClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <p className="text-white/80 animate-pulse">...</p>
    </div>
  ),
});

export default function LocaleHomePage() {
  return <LocaleHomePageClient />;
}
