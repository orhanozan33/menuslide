'use client';

import React, { Suspense } from 'react';
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

export default function SystemTemplatesPage() {
  return (
    <Suspense fallback={<TemplatesFallback />}>
      <TemplatesLibraryContent mode="system" />
    </Suspense>
  );
}
