'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function AsUserPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const [status, setStatus] = useState<'waiting' | 'done' | 'error'>('waiting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'impersonate' && event.data?.token && event.data?.user) {
        try {
          sessionStorage.setItem('impersonation_token', event.data.token);
          sessionStorage.setItem('impersonation_user', JSON.stringify(event.data.user));
          setStatus('done');
          router.replace(localePath('/dashboard'));
        } catch (err) {
          setErrorMsg(t('asuser_session_failed'));
          setStatus('error');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    if (window.opener) {
      window.opener.postMessage({ type: 'as-user-ready' }, window.location.origin);
    } else {
      setErrorMsg(t('asuser_cannot_open_directly'));
      setStatus('error');
    }

    return () => window.removeEventListener('message', handleMessage);
  }, [router, t, localePath]);

  if (status === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
        <LanguageSwitcher fixed dark className="!top-4 !left-auto !right-4 z-50" />
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">{errorMsg}</p>
          <button
            onClick={() => window.close()}
            className="px-4 py-2 bg-gray-600 rounded-lg hover:bg-gray-700"
          >
            {t('asuser_close_window')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 gap-4">
      <LanguageSwitcher fixed dark className="!top-4 !left-auto !right-4 z-50" />
      <div className="text-center text-white">
        <div className="animate-pulse text-xl mb-2">{t('asuser_opening')}</div>
        <div className="text-sm text-slate-400">{t('asuser_please_wait')}</div>
      </div>
    </div>
  );
}
