'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { TemplatesLibraryContent } from '@/app/(admin)/templates/TemplatesLibraryContent';

function TemplatesFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="text-xl font-medium text-white mb-2">Loading...</div>
      </div>
    </div>
  );
}

export default function MineTemplatesPage() {
  const router = useRouter();
  const { localePath } = useTranslation();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_user') || localStorage.getItem('user')) : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user?.role === 'super_admin' || user?.role === 'admin') {
          router.replace(localePath('/templates/system'));
          return;
        }
      } catch {
        /* ignore */
      }
    }
    setShouldRender(true);
  }, [router, localePath]);

  if (!shouldRender) return <TemplatesFallback />;

  return (
    <Suspense fallback={<TemplatesFallback />}>
      <TemplatesLibraryContent mode="mine" />
    </Suspense>
  );
}
