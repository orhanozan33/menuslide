'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { TemplateEditorPage } from './TemplateEditorPage';

export default function EditTemplatePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [showSaveAs, setShowSaveAs] = useState(false);
  const isMineTemplate = searchParams?.get('mine') === '1';

  useEffect(() => {
    const userStr = typeof window !== 'undefined'
      ? (sessionStorage.getItem('impersonation_user') || localStorage.getItem('user'))
      : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';
        setShowSaveAs(!!isAdmin);
      } catch {
        setShowSaveAs(false);
      }
    }
  }, []);

  return (
    <TemplateEditorPage
      templateId={(params?.id ?? '') as string}
      showSaveAs={showSaveAs}
      isMineTemplate={isMineTemplate}
    />
  );
}
