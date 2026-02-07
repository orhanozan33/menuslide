'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

// Use /api/proxy to avoid CORS (same-origin request)
const API_BASE = '/api/proxy';

async function fetchWithToken(url: string, token: string | null, options?: RequestInit) {
  const path = url.startsWith('/') ? url.slice(1) : url;
  const res = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error('Request failed');
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

interface Plan {
  id: string;
  name: string;
  display_name: string;
  max_screens: number;
  price_monthly: number;
  price_yearly?: number;
  is_active?: boolean;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
  features?: any;
}

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  plans: Plan;
}

function PricingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, localePath, locale } = useTranslation();
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentScreens, setCurrentScreens] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [stripeAvailable, setStripeAvailable] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const success = searchParams?.get('success');
    const canceled = searchParams?.get('canceled');
    if (success === 'true') {
      toast.showSuccess(t('pricing_checkout_success'));
      router.replace(localePath('/pricing'), { scroll: false });
    } else if (canceled === 'true') {
      toast.showInfo(t('pricing_checkout_canceled'));
      router.replace(localePath('/pricing'), { scroll: false });
    }
  }, [searchParams?.toString()]);

  const loadData = async () => {
    try {
      const token = typeof window !== 'undefined' && (localStorage.getItem('auth_token') || sessionStorage.getItem('impersonation_token'));
      setIsLoggedIn(!!token);

      const [plansData, stripeData] = await Promise.all([
        fetchWithToken('/plans', null),
        fetchWithToken('settings/stripe-available', null).catch(() => ({ available: false })),
      ]);
      const raw = Array.isArray(plansData) ? plansData : (plansData as any)?.data ?? (plansData as any)?.plans ?? [];
      const allowedMax = [3, 5, 7, 10, -1];
      const filtered = raw.filter((p: Plan) => p.is_active !== false && allowedMax.includes(Number(p.max_screens)));
      setPlans(filtered.length > 0 ? filtered : raw.filter((p: Plan) => p.is_active !== false));
      setStripeAvailable(!!(stripeData as any)?.available);

      if (token) {
        try {
          const screensData = await fetchWithToken('/screens', token);
          setCurrentScreens(Array.isArray(screensData) ? screensData.length : 0);
        } catch {
          setCurrentScreens(0);
        }
        try {
          const userData = await fetchWithToken('/businesses', token);
          if (userData && Array.isArray(userData) && userData.length > 0) {
            const subData = await fetchWithToken(`/subscriptions/business/${userData[0].id}`, token);
            setSubscription(subData);
          } else {
            setSubscription(null);
          }
        } catch {
          setSubscription(null);
        }
      } else {
        setCurrentScreens(0);
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId: string, interval: 'monthly' | 'yearly') => {
    const token = typeof window !== 'undefined' && (localStorage.getItem('auth_token') || sessionStorage.getItem('impersonation_token'));
    if (!token) {
      router.push(localePath('/register'));
      return;
    }

    setProcessing(planId);
    try {
      const businesses = await fetchWithToken('/businesses', token);
      if (!businesses || businesses.length === 0) {
        toast.showWarning(t('pricing_create_business'));
        setProcessing(null);
        return;
      }

      const businessId = businesses[0].id;
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const basePath = origin + localePath('/pricing');
      const successUrl = `${basePath}?success=true`;
      const cancelUrl = `${basePath}?canceled=true`;

      const checkoutRes = await fetch(`${API_BASE}/subscriptions/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId,
          businessId,
          successUrl,
          cancelUrl,
          interval: interval || 'monthly',
          locale: 'en', // Stripe checkout always in English
        }),
      });
      if (!checkoutRes.ok) {
        const err = await checkoutRes.json().catch(() => ({}));
        let msg = err?.message ?? err?.error ?? t('pricing_checkout_failed');
        if (Array.isArray(msg)) msg = msg[0];
        console.error('[pricing] Checkout error:', err);
        throw new Error(typeof msg === 'string' ? msg : t('pricing_checkout_failed'));
      }
      const data = await checkoutRes.json();
      const url = data?.url;
      if (!url || typeof url !== 'string') {
        throw new Error(t('pricing_checkout_failed'));
      }
      window.location.href = url;
    } catch (error: any) {
      toast.showError(error.message || t('pricing_checkout_failed'));
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#06090f] text-white flex flex-col overflow-x-hidden">
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 md:px-12 border-b border-white/5">
          <Link href={localePath('/')} className="flex items-center gap-2 sm:gap-3">
            <img src="/menuslide-logo.png" alt="MenuSlide" className="h-9 sm:h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href={localePath('/')} className="text-sm text-white/70 hover:text-white">
              ← {t('register_back_home')}
            </Link>
            <LanguageSwitcher variant="bar" dark />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <p className="text-white/60">{t('dashboard_loading')}</p>
        </main>
      </div>
    );
  }

  const currentPlan = subscription?.plans;
  const hasRealPlan = currentPlan && currentPlan.max_screens > 0;
  const isAtLimit = hasRealPlan && currentPlan!.max_screens !== -1 && currentScreens >= currentPlan!.max_screens;

  const getPlanDisplayName = (plan: Plan) => {
    const key = `plan_display_${(plan.name || '').replace(/\s+/g, '_').toLowerCase()}`;
    const translated = t(key);
    if (translated !== key) return translated;
    if (plan.max_screens >= 2 && plan.max_screens <= 20 && !['basic', 'pro', 'enterprise', 'starter-plan', 'business-plan', 'growth-plan', 'scale-plan'].includes(plan.name)) {
      return `${plan.max_screens} ${t('pricing_screens')}`;
    }
    return plan.display_name;
  };

  return (
    <div className="min-h-screen bg-[#06090f] text-white flex flex-col overflow-x-hidden">
      <header className="min-h-[4rem] pt-[env(safe-area-inset-top)] flex items-center justify-between px-4 sm:px-6 md:px-12 border-b border-white/5">
        <Link href={localePath('/')} className="flex items-center gap-2 sm:gap-3 min-w-0" onClick={() => setMobileNavOpen(false)}>
          <img src="/menuslide-logo.png" alt="MenuSlide" className="h-9 sm:h-10 w-auto object-contain" />
        </Link>
        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-2 sm:gap-4">
          <Link href={localePath('/')} className="text-sm text-white/70 hover:text-white whitespace-nowrap">
            ← {t('register_back_home')}
          </Link>
          {!isLoggedIn && (
            <>
              <button
                type="button"
                onClick={() => router.push(localePath('/login'))}
                className="text-sm text-white/70 hover:text-white"
              >
                {t('login_submit')}
              </button>
              <Link
                href={localePath('/register')}
                className="text-sm font-semibold px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white"
              >
                {t('home_register')}
              </Link>
            </>
          )}
          {isLoggedIn && (
            <Link
              href={localePath('/dashboard')}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white"
            >
              {t('sidebar_dashboard')}
            </Link>
          )}
          <LanguageSwitcher variant="bar" dark />
        </nav>
        {/* Mobile: hamburger + CTA */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href={localePath(isLoggedIn ? '/dashboard' : '/register')}
            className="text-sm font-semibold px-3 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white min-h-[44px] flex items-center justify-center"
          >
            {isLoggedIn ? t('sidebar_dashboard') : t('home_register')}
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2.5 rounded-lg text-white/80 hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileNavOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
        {/* Mobile nav dropdown */}
        {mobileNavOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
            <nav className="fixed top-16 left-0 right-0 z-50 md:hidden py-4 px-4 bg-[#0a0f1a] border-b border-white/10 rounded-b-xl shadow-xl max-h-[calc(100vh-4rem)] overflow-y-auto mx-2">
              <div className="flex flex-col gap-1">
                <Link href={localePath('/')} className="px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 min-h-[44px] flex items-center" onClick={() => setMobileNavOpen(false)}>← {t('register_back_home')}</Link>
                {!isLoggedIn && (
                  <button type="button" onClick={() => { router.push(localePath('/login')); setMobileNavOpen(false); }} className="px-4 py-3 rounded-lg text-white/80 hover:bg-white/10 text-left min-h-[44px]">
                    {t('login_submit')}
                  </button>
                )}
                <div className="pt-2 border-t border-white/10">
                  <LanguageSwitcher variant="bar" dark />
                </div>
              </div>
            </nav>
          </>
        )}
      </header>

      <main className="flex-1 px-4 sm:px-6 md:px-12 py-8 sm:py-12">
        <div className="max-w-5xl mx-auto min-w-0">
          <div className="text-center mb-6 md:mb-10">
            <h1 className="text-xl md:text-3xl font-bold text-white mb-2">{t('pricing_title')}</h1>
            <p className="text-sm md:text-base text-white/60">{t('pricing_subtitle')}</p>
            <Link href={localePath('/checkout-preview')} className="inline-block mt-3 text-xs text-white/50 hover:text-emerald-400 transition-colors">
              Checkout sol panel önizlemesi →
            </Link>
          </div>

          {subscription && (
            <div className="mb-6 md:mb-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-4 md:p-6">
              <div>
                <h3 className="text-lg font-semibold text-emerald-400">
                  {t('pricing_current')}: {currentPlan ? getPlanDisplayName(currentPlan) : ''}
                </h3>
                <p className="text-sm text-white/70 mt-1">
                  {currentScreens} / {currentPlan?.max_screens === -1 ? '∞' : currentPlan?.max_screens} {t('pricing_screens_used')}
                </p>
                {hasRealPlan && subscription.current_period_end && (
                  <p className="text-sm text-white/50 mt-1">
                    {t('pricing_renews_on')} {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              {isAtLimit && (
                <div className="mt-4 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30">
                  <p className="text-sm text-amber-200">
                    ⚠️ {t('pricing_limit_reached')}
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 md:mb-8 flex justify-center">
            <div className="inline-flex rounded-xl bg-white/5 p-1 border border-white/10">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`px-3 md:px-5 py-2 md:py-2.5 min-h-[44px] md:min-h-0 rounded-lg text-xs md:text-sm font-medium transition flex items-center justify-center touch-manipulation ${
                  billingInterval === 'monthly' ? 'bg-emerald-500 text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {t('pricing_billing_monthly')}
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`px-3 md:px-5 py-2 md:py-2.5 min-h-[44px] md:min-h-0 rounded-lg text-xs md:text-sm font-medium transition flex items-center justify-center gap-1 md:gap-1.5 touch-manipulation ${
                  billingInterval === 'yearly' ? 'bg-emerald-500 text-white' : 'text-white/70 hover:text-white'
                }`}
              >
                {t('pricing_billing_yearly')}
                <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/30 text-emerald-300">
                  -10%
                </span>
              </button>
            </div>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-12 px-4">
              <p className="text-white/70 mb-4">{t('pricing_plans_empty')}</p>
              <button type="button" onClick={() => loadData()} className="px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 text-sm font-medium">
                {t('btn_retry')}
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 min-w-0 min-h-[320px]" role="list">
            {plans.map((plan) => {
              const isCurrentPlan = currentPlan?.id === plan.id;
              const isPopular = plan.name === '1-7-screens'; // Pro paketi
              const useYearly = billingInterval === 'yearly';
              const canSubscribe = !isCurrentPlan && stripeAvailable;
              const maxScreens =
                plan.max_screens === -1
                  ? t('pricing_unlimited')
                  : `1-${plan.max_screens}`;
              const displayPrice = useYearly ? (plan.price_yearly ?? plan.price_monthly * 12 * 0.85) : plan.price_monthly;

              return (
                <div
                  key={plan.id}
                  role="listitem"
                  className={`rounded-xl md:rounded-2xl overflow-hidden border-2 transition-all min-w-0 bg-white/[0.06] shadow-lg ${
                    isPopular
                      ? 'ring-2 ring-emerald-500/50 border-emerald-500/40 bg-white/[0.08]'
                      : 'border-white/20 hover:border-white/30 hover:bg-white/[0.08]'
                  } ${isCurrentPlan ? 'border-emerald-500/50' : ''}`}
                >
                  {isPopular && (
                    <div className="bg-emerald-500/20 text-emerald-400 text-center py-1.5 md:py-2 text-[10px] md:text-xs font-semibold truncate">
                      {t('pricing_most_popular')}
                    </div>
                  )}
                  {isCurrentPlan && !isPopular && (
                    <div className="bg-emerald-500/20 text-emerald-400 text-center py-1.5 md:py-2 text-[10px] md:text-xs font-semibold truncate">
                      {t('pricing_current_plan')}
                    </div>
                  )}

                  <div className="p-3 md:p-6 min-w-0">
                    <h3 className="text-sm md:text-lg font-bold text-white mb-1 md:mb-2 truncate">{getPlanDisplayName(plan)}</h3>
                    <div className="mb-2 md:mb-4">
                      <div className="flex flex-wrap items-baseline gap-0.5">
                        <span className="text-lg md:text-2xl font-bold text-white">${displayPrice}</span>
                        <span className="text-white/50 text-[10px] md:text-sm whitespace-nowrap">
                          {useYearly ? t('pricing_per_year') : t('pricing_per_month')}
                        </span>
                        <span className="text-white/40 text-[10px] md:text-xs">({t('pricing_plus_tax')})</span>
                      </div>
                      {useYearly && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 mt-1">
                          {t('pricing_yearly_10_off')}
                        </span>
                      )}
                    </div>

                    <ul className="space-y-1.5 md:space-y-3 mb-3 md:mb-6 text-[11px] md:text-sm text-white/70">
                      <li className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">{maxScreens} {t('pricing_screen')}</span>
                      </li>
                      <li className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{t('pricing_unlimited_menu')}</span>
                      </li>
                      <li className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{t('pricing_instant_update')}</span>
                      </li>
                      <li className="flex items-center gap-1.5 md:gap-2 min-w-0">
                        <svg className="w-4 h-4 md:w-5 md:h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>{t('pricing_support')}</span>
                      </li>
                    </ul>

                    <button
                      onClick={() => canSubscribe && handleSubscribe(plan.id, billingInterval)}
                      disabled={!canSubscribe || processing === plan.id}
                      className={`w-full py-2 md:py-3 min-h-[44px] md:min-h-0 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold transition touch-manipulation ${
                        isCurrentPlan
                          ? 'bg-white/10 text-white/50 cursor-not-allowed'
                          : stripeAvailable && !isCurrentPlan
                          ? isPopular
                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                          : 'bg-white/10 text-white/40 cursor-not-allowed border border-white/10'
                      } disabled:opacity-50`}
                    >
                      {processing === plan.id
                        ? t('btn_loading')
                        : isCurrentPlan
                        ? t('pricing_current_plan')
                        : stripeAvailable
                        ? t('pricing_subscribe')
                        : t('pricing_coming_soon')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#06090f] text-white flex items-center justify-center">
        <p className="text-white/60">Loading…</p>
      </div>
    }>
      <PricingContent />
    </Suspense>
  );
}
