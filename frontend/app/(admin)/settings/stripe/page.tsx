'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface StripeStatus {
  configured: boolean;
  stripeMode?: 'live' | 'test';
  hasPublishableKey: boolean;
  hasWebhookSecret: boolean;
}

export default function StripeSettingsPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      loadStripeStatus();
    } else if (user) {
      router.replace(localePath('/dashboard'));
    }
  }, [user]);

  const loadUser = () => {
    try {
      const raw = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  const loadStripeStatus = async () => {
    try {
      const data = await apiClient('/settings/stripe-status');
      setStripeStatus(data);
    } catch (e) {
      console.error(e);
      setStripeStatus({ configured: false, stripeMode: 'test', hasPublishableKey: false, hasWebhookSecret: false });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">{t('settings_loading')}</div>
      </div>
    );
  }

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return null;
  }

  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const webhookUrl = `${backendUrl.replace(/\/$/, '')}/subscriptions/webhook`;
  const isLive = stripeStatus?.stripeMode === 'live';
  const dashboardBase = isLive ? 'https://dashboard.stripe.com' : 'https://dashboard.stripe.com/test';

  return (
    <div className="p-4 sm:p-6 max-w-3xl min-w-0 overflow-x-hidden">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={localePath('/settings')}
          className="text-gray-500 hover:text-gray-700"
          aria-label={t('common_back')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">💳 {t('stripe_page_title')}</h1>
      </div>

      {/* Durum */}
      <section className="mb-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings_stripe_status')}</h2>
        {stripeStatus ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  stripeStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${stripeStatus.configured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {stripeStatus.configured ? t('settings_stripe_configured') : t('settings_stripe_not_configured')}
              </span>
              {stripeStatus.configured && (
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    isLive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {isLive ? t('stripe_mode_live') : t('stripe_mode_test')}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className={stripeStatus.hasPublishableKey ? 'text-emerald-600' : 'text-gray-500'}>
                {stripeStatus.hasPublishableKey ? '✓' : '○'} {t('stripe_publishable_key')}
              </span>
              <span className={stripeStatus.configured ? 'text-emerald-600' : 'text-gray-500'}>
                {stripeStatus.configured ? '✓' : '○'} {t('stripe_secret_key')}
              </span>
              <span className={stripeStatus.hasWebhookSecret ? 'text-emerald-600' : 'text-gray-500'}>
                {stripeStatus.hasWebhookSecret ? '✓' : '○'} {t('stripe_webhook_secret')}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">{t('settings_loading')}</div>
        )}
      </section>

      {/* Kurulum Adımları */}
      <section className="mb-8 bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('stripe_setup_steps')}</h2>
        <ol className="space-y-4 list-decimal list-inside text-gray-700">
          <li>
            <span className="font-medium">{t('stripe_step_env')}</span>
            <p className="mt-1 text-sm text-gray-600 ml-6">{t('stripe_step_env_desc')}</p>
            <code className="block mt-2 p-3 bg-gray-100 rounded-lg text-xs font-mono overflow-x-auto ml-6">
              STRIPE_SECRET_KEY=sk_test_xxx  (veya sk_live_xxx canlı için)<br />
              STRIPE_PUBLISHABLE_KEY=pk_test_xxx  (veya pk_live_xxx)<br />
              STRIPE_WEBHOOK_SECRET=whsec_xxx
            </code>
          </li>
          <li>
            <span className="font-medium">{t('stripe_step_products')}</span>
            <p className="mt-1 text-sm text-gray-600 ml-6">{t('stripe_step_products_desc')}</p>
            <a
              href={`${dashboardBase}/products`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 ml-6 text-blue-600 hover:underline text-sm"
            >
              {t('stripe_open_dashboard')}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </li>
          <li>
            <span className="font-medium">{t('stripe_step_price_ids')}</span>
            <p className="mt-1 text-sm text-gray-600 ml-6">{t('stripe_step_price_ids_desc')}</p>
            <Link
              href={localePath('/settings')}
              className="inline-flex items-center gap-1 mt-2 ml-6 text-blue-600 hover:underline text-sm"
            >
              {t('stripe_go_to_settings')} →
            </Link>
          </li>
          <li>
            <span className="font-medium">{t('stripe_step_webhook')}</span>
            <p className="mt-1 text-sm text-gray-600 ml-6">{t('stripe_step_webhook_desc')}</p>
            <div className="mt-2 ml-6 flex items-center gap-2">
              <code className="flex-1 p-3 bg-gray-100 rounded-lg text-xs font-mono break-all">{webhookUrl}</code>
              <button
                type="button"
                onClick={() => navigator.clipboard?.writeText(webhookUrl)}
                className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                {t('common_copy')}
              </button>
            </div>
          </li>
        </ol>
      </section>

      {/* Hızlı Linkler */}
      <section className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('stripe_quick_links')}</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href={`${dashboardBase}/apikeys`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            {t('stripe_link_api_keys')}
          </a>
          <a
            href={`${dashboardBase}/products`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            {t('stripe_link_products')}
          </a>
          <a
            href={`${dashboardBase}/webhooks`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            {t('stripe_link_webhooks')}
          </a>
          <Link
            href={localePath('/settings')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            {t('stripe_edit_price_ids')}
          </Link>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          {isLive ? t('stripe_links_live_hint') : t('stripe_links_test_hint')}
        </p>
      </section>
    </div>
  );
}
