'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { LoginModal } from '@/components/home/LoginModal';
import { PROVINCES, CITIES_BY_PROVINCE } from '@/lib/provinces-cities-data';

export default function RegisterPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [form, setForm] = useState({
    businessName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
    province: '',
    city: '',
    referenceNumber: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/proxy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: form.businessName,
          email: form.email,
          password: form.password,
          phone: form.phone || undefined,
          address: form.address || undefined,
          province: form.province || undefined,
          city: form.city || undefined,
          reference_number: form.referenceNumber || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.message || data?.error || t('common_request_failed');
        throw new Error(Array.isArray(msg) ? msg[0] : msg);
      }
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push(localePath('/dashboard'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('common_error_occurred'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06090f] text-white flex flex-col">
      <header className="h-16 flex items-center justify-between px-4 sm:px-6 md:px-12 border-b border-white/5">
        <Link href={localePath('/')} className="flex items-center gap-3">
          <img src="/menuslide-logo.png" alt="MenuSlide" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <button type="button" onClick={() => setShowLoginModal(true)} className="text-sm text-white/70 hover:text-white">
            {t('login_submit')}
          </button>
          <LanguageSwitcher variant="bar" dark />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{t('register_title')}</h1>
          <p className="text-white/50 mb-8">{t('register_desc')}</p>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('register_business')}</label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder={t('register_business_placeholder')}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('login_email')}</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('login_password')}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder={t('register_password_placeholder')}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('home_contact_phone')}</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder={t('register_phone_placeholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">{t('register_province')}</label>
                  <select
                    value={form.province}
                    onChange={(e) => setForm((f) => ({ ...f, province: e.target.value, city: '' }))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition cursor-pointer"
                  >
                    <option value="">{t('register_select_province')}</option>
                    {PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">{t('register_city')}</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    disabled={!form.province}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition cursor-pointer disabled:opacity-50"
                  >
                    <option value="">{t('register_select_city')}</option>
                    {(form.province ? ((CITIES_BY_PROVINCE as Record<string, string[]>)[form.province] || []) : []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('register_address')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder={t('register_address_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">{t('register_reference_number')}</label>
                <input
                  type="text"
                  value={form.referenceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, referenceNumber: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 outline-none transition"
                  placeholder={t('register_reference_number_placeholder')}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold transition-colors"
              >
                {loading ? t('register_submitting') : t('register_submit')}
              </button>
            </form>

          <p className="mt-6 text-center text-white/40 text-sm">
            {t('register_have_account')}{' '}
            <button type="button" onClick={() => setShowLoginModal(true)} className="text-emerald-400 hover:text-emerald-300">
              {t('login_submit')}
            </button>
          </p>
        </div>
      </main>

      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} localePath={localePath} />
    </div>
  );
}
