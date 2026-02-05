'use client';

import React, { useEffect, useState } from 'react';

const PENPOT_CLOUD_URL = 'https://design.penpot.app';

interface PenpotProfile {
  email?: string;
  fullname?: string;
  [key: string]: unknown;
}

export default function PenpotEditor() {
  const [profile, setProfile] = useState<PenpotProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const baseUrl =
    typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_PENPOT_EDITOR_URL ?? '').trim() || PENPOT_CLOUD_URL
      : PENPOT_CLOUD_URL;
  const isSelfHosted = baseUrl !== PENPOT_CLOUD_URL;
  const allowIframe = isSelfHosted;

  useEffect(() => {
    let cancelled = false;
    setProfileLoading(true);
    setProfileError(null);
    fetch('/api/penpot/profile')
      .then((res) => {
        if (cancelled) return null;
        if (!res.ok) {
          if (res.status === 503) return null;
          throw new Error(res.status === 502 ? 'Penpot API bağlantı hatası' : 'Token geçersiz olabilir');
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled && data) setProfile(data as PenpotProfile);
      })
      .catch((err) => {
        if (!cancelled) setProfileError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold text-slate-800">Penpot</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {!profileLoading && profile && (
            <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
              Bağlı: {profile.email ?? profile.fullname ?? 'Penpot'}
            </span>
          )}
          {!profileLoading && profileError && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded" title={profileError}>
              API bağlantı yok
            </span>
          )}
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 rounded-lg"
          >
            Penpot&apos;ta aç →
          </a>
        </div>
      </div>
      <p className="text-sm text-slate-600">
        Penpot ile tasarımlarınızı oluşturun. Ücretsiz ve açık kaynak. Erişim tokenı tanımlıysa hesabınıza bağlanırsınız.
        {allowIframe && ' Aşağıda kendi Penpot sunucunuz gömülü olarak gösteriliyor.'}
      </p>
      {allowIframe ? (
        <div
          className="rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
          style={{ minHeight: '70vh' }}
        >
          <iframe
            src={baseUrl}
            title="Penpot tasarım editörü"
            className="w-full border-0"
            style={{ height: '78vh', minHeight: 560 }}
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-downloads"
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
          <p className="text-sm text-slate-600 mb-4">
            Penpot&apos;u bu sayfada iframe ile göstermek için kendi Penpot sunucunuzu kullanın.
          </p>
          <p className="text-xs text-slate-500 mb-2">
            <code className="bg-slate-200 px-1.5 py-0.5 rounded">NEXT_PUBLIC_PENPOT_EDITOR_URL</code> ile
            self-host Penpot adresinizi tanımlayın; editör burada gömülü açılır.
          </p>
          <a
            href={baseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-lg border border-violet-200"
          >
            design.penpot.app &apos;da aç
          </a>
        </div>
      )}
    </div>
  );
}
