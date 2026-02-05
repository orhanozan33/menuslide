'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  localePath: (path: string) => string;
}

export function LoginModal({ isOpen, onClose, localePath }: LoginModalProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        let msg = t('login_failed');
        try {
          const data = await response.json();
          msg = /deactivated|pasif|désactivé/i.test(data.message || data.error || '')
            ? t('login_account_deactivated')
            : (data.message || data.error || msg);
        } catch {
          if (response.status === 0 || response.status >= 500) msg = t('login_backend_unreachable');
          else if (response.status === 401) msg = t('login_invalid_credentials');
          else msg = t('login_check_credentials');
        }
        throw new Error(msg);
      }
      const data = await response.json();
      if (!data.user || !data.token) throw new Error(t('login_invalid_response'));
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onClose();
      router.push(localePath('/dashboard'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('login_check_credentials');
      setError(msg.includes('fetch') || msg.includes('NetworkError') ? t('login_backend_unreachable_hint') : msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-slate-800 border border-white/10 shadow-2xl p-5 sm:p-6 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">{t('login_title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('common_close')}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">{t('login_email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none"
              placeholder={t('register_email_placeholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">{t('login_password')}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold transition-colors"
          >
            {loading ? t('login_submitting') : t('login_submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
