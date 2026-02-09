'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { HOME_CHANNELS } from '@/lib/home-channels';

interface Plan {
  id: string;
  name: string;
  display_name: string;
  max_screens: number;
  price_monthly: number;
  price_yearly?: number | null;
  is_active?: boolean;
  stripe_price_id_monthly?: string | null;
  stripe_price_id_yearly?: string | null;
}

interface HomeChannel {
  slug: string;
  title: string;
  description?: string;
  link?: string;
  thumbnail?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [user, setUser] = useState<{ role?: string; admin_permissions?: Record<string, Record<string, boolean>> } | null>(null);
  const [editing, setEditing] = useState<Record<string, Partial<Plan>>>({});
  const [channels, setChannels] = useState<HomeChannel[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelsSaving, setChannelsSaving] = useState(false);
  const [contactInfo, setContactInfo] = useState<{ email: string; phone: string; address: string; whatsapp: string }>({
    email: 'info@example.com',
    phone: '+90 212 123 45 67',
    address: 'Istanbul, Turkey',
    whatsapp: '+14385968566',
  });
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactEdit, setContactEdit] = useState({ email: '', phone: '', address: '', whatsapp: '' });
  const [whatsappEdit, setWhatsappEdit] = useState('');
  const [whatsappSaving, setWhatsappSaving] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ configured: boolean; hasPublishableKey: boolean; hasWebhookSecret: boolean } | null>(null);
  const [planModalId, setPlanModalId] = useState<string | null>(null);
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showInvoiceLayoutModal, setShowInvoiceLayoutModal] = useState(false);
  const [invoiceLayout, setInvoiceLayout] = useState<Record<string, string>>({});
  const [invoiceLayoutLoading, setInvoiceLayoutLoading] = useState(false);
  const [invoiceLayoutSaving, setInvoiceLayoutSaving] = useState(false);
  const [tvAppConfig, setTvAppConfig] = useState<{ apiBaseUrl: string; downloadUrl: string; watchdogIntervalMinutes: number }>({ apiBaseUrl: '', downloadUrl: '/downloads/Menuslide.apk', watchdogIntervalMinutes: 5 });
  const [tvAppConfigLoading, setTvAppConfigLoading] = useState(false);
  const [tvAppConfigSaving, setTvAppConfigSaving] = useState(false);
  const [showTvAppModal, setShowTvAppModal] = useState(false);
  const [apkUploading, setApkUploading] = useState(false);
  const apkInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      loadPlans();
      loadChannels();
      loadContactInfo();
      loadStripeStatus();
      if (user?.role === 'super_admin' || user?.role === 'admin') loadTvAppConfig();
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

  const loadPlans = async () => {
    try {
      const data = await apiClient('/plans/admin');
      setPlans(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditing((prev) => ({
      ...prev,
      [plan.id]: {
        display_name: plan.display_name,
        max_screens: plan.max_screens,
        price_monthly: plan.price_monthly,
        price_yearly: plan.price_yearly ?? undefined,
        stripe_price_id_monthly: plan.stripe_price_id_monthly ?? '',
        stripe_price_id_yearly: plan.stripe_price_id_yearly ?? '',
      },
    }));
    setPlanModalId(plan.id);
  };

  const closePlanModal = (planId: string) => {
    cancelEdit(planId);
    setPlanModalId(null);
  };

  const cancelEdit = (planId: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[planId];
      return next;
    });
  };

  const updateEdit = (planId: string, field: keyof Plan, value: string | number) => {
    setEditing((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], [field]: value },
    }));
  };

  const savePlan = async (planId: string) => {
    const payload = editing[planId];
    if (!payload) return;
    setSavingId(planId);
    try {
      await apiClient(`/plans/${planId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          display_name: payload.display_name,
          max_screens: payload.max_screens != null ? Number(payload.max_screens) : undefined,
          price_monthly: payload.price_monthly != null ? Number(payload.price_monthly) : undefined,
          price_yearly: payload.price_yearly != null ? Number(payload.price_yearly) : undefined,
          stripe_price_id_monthly: payload.stripe_price_id_monthly !== undefined ? (payload.stripe_price_id_monthly || null) : undefined,
          stripe_price_id_yearly: payload.stripe_price_id_yearly !== undefined ? (payload.stripe_price_id_yearly || null) : undefined,
        }),
      });
      await loadPlans();
      cancelEdit(planId);
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setSavingId(null);
    }
  };

  const loadChannels = async () => {
    setChannelsLoading(true);
    try {
      const res = await fetch('/api/home-channels', { cache: 'no-store' });
      const data = await res.json().catch(() => []);
      const list = Array.isArray(data) ? data : [];
      setChannels(list.length > 0 ? list : HOME_CHANNELS);
    } catch (e) {
      console.error(e);
      setChannels(HOME_CHANNELS);
    } finally {
      setChannelsLoading(false);
    }
  };

  const updateChannel = (index: number, field: keyof HomeChannel, value: string) => {
    setChannels((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const loadContactInfo = async () => {
    setContactLoading(true);
    try {
      const res = await fetch('/api/contact-info', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setContactInfo({
        email: data.email || 'info@example.com',
        phone: data.phone || '+90 212 123 45 67',
        address: data.address || '',
        whatsapp: data.whatsapp || '+14385968566',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setContactLoading(false);
    }
  };

  const openContactModal = () => {
    setContactEdit({
      email: contactInfo.email,
      phone: contactInfo.phone,
      address: contactInfo.address,
      whatsapp: contactInfo.whatsapp,
    });
    setShowContactModal(true);
  };

  const openWhatsAppModal = () => {
    setWhatsappEdit(contactInfo.whatsapp);
    setShowWhatsAppModal(true);
  };

  const saveWhatsApp = async () => {
    setWhatsappSaving(true);
    try {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/contact-info', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          email: contactInfo.email,
          phone: contactInfo.phone,
          address: contactInfo.address,
          whatsapp: whatsappEdit.trim() || contactInfo.whatsapp,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || t('settings_save_failed'));
      }
      await loadContactInfo();
      setShowWhatsAppModal(false);
      toast.showSuccess(t('settings_contact_saved'));
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setWhatsappSaving(false);
    }
  };

  const saveContactInfo = async () => {
    setContactSaving(true);
    try {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/contact-info', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
        email: contactEdit.email,
        phone: contactEdit.phone,
        address: contactEdit.address,
        whatsapp: contactEdit.whatsapp,
      }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || t('settings_save_failed'));
      }
      await loadContactInfo();
      setShowContactModal(false);
      toast.showSuccess(t('settings_contact_saved'));
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setContactSaving(false);
    }
  };

  useEffect(() => {
    if (!showContactModal) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !contactSaving) setShowContactModal(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showContactModal, contactSaving]);

  useEffect(() => {
    if (!showInvoiceLayoutModal) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !invoiceLayoutSaving) setShowInvoiceLayoutModal(false);
    };
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [showInvoiceLayoutModal, invoiceLayoutSaving]);

  const loadStripeStatus = async () => {
    try {
      const data = await apiClient('/settings/stripe-status');
      setStripeStatus(data || { configured: false, hasPublishableKey: false, hasWebhookSecret: false });
    } catch {
      setStripeStatus({ configured: false, hasPublishableKey: false, hasWebhookSecret: false });
    }
  };

  const loadTvAppConfig = async () => {
    setTvAppConfigLoading(true);
    try {
      const res = await fetch('/api/tv-app-config', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      setTvAppConfig({
        apiBaseUrl: data.apiBaseUrl ?? '',
        downloadUrl: data.downloadUrl ?? '/downloads/Menuslide.apk',
        watchdogIntervalMinutes: typeof data.watchdogIntervalMinutes === 'number' ? data.watchdogIntervalMinutes : 5,
      });
    } catch {
      setTvAppConfig({ apiBaseUrl: '', downloadUrl: '/downloads/Menuslide.apk', watchdogIntervalMinutes: 5 });
    } finally {
      setTvAppConfigLoading(false);
    }
  };

  const saveTvAppConfig = async () => {
    setTvAppConfigSaving(true);
    try {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/tv-app-config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(tvAppConfig),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || t('settings_save_failed'));
      }
      toast.showSuccess(t('settings_tv_app_saved'));
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setTvAppConfigSaving(false);
    }
  };

  const saveChannels = async () => {
    setChannelsSaving(true);
    try {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/home-channels', {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ channels }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || t('settings_save_failed'));
      }
      await loadChannels();
      toast.showSuccess(t('settings_channels_saved'));
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setChannelsSaving(false);
    }
  };

  if (loading && !user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">{t('settings_loading')}</div>
      </div>
    );
  }

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return null;
  }

  const settingsPage = user?.admin_permissions?.settings && typeof user.admin_permissions.settings === 'object' ? user.admin_permissions.settings : null;
  const isSuper = user?.role === 'super_admin';
  const canEditPricing = isSuper || settingsPage?.edit_pricing === true || settingsPage?.edit_general === true;
  const canViewStripe = isSuper || settingsPage?.view_stripe === true || settingsPage?.edit_stripe === true;
  const canEditStripe = isSuper || settingsPage?.edit_stripe === true;
  const canEditChannels = isSuper || settingsPage?.edit_channels === true || settingsPage?.edit_general === true;
  const canEditContact = isSuper || settingsPage?.edit_contact === true || settingsPage?.edit_general === true;
  const canEditWhatsapp = isSuper || settingsPage?.edit_whatsapp === true || settingsPage?.edit_general === true;

  return (
    <div className="p-4 sm:p-6 max-w-4xl min-w-0 overflow-x-hidden">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('settings_title')}</h1>

      {canEditPricing && (
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings_pricing')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('settings_pricing_desc')}</p>
        {loading ? (
          <div className="text-gray-500 py-8">{t('settings_plans_loading')}</div>
        ) : plans.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-gray-600">{t('common_no_plans')}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => startEdit(plan)}
                className="text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all"
              >
                <div className="font-semibold text-gray-900 mb-2">{plan.display_name}</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Aylık: {plan.price_monthly} $ · Yıllık: {plan.price_yearly ?? '-'} $</div>
                  <div>Max ekran: {plan.max_screens === -1 ? t('settings_unlimited') : plan.max_screens}</div>
                </div>
                <div className="mt-3 text-xs text-blue-600 font-medium">{t('btn_edit')} →</div>
              </button>
            ))}
          </div>
        )}
      </section>
      )}

      {canViewStripe && (
      <>
      {/* Stripe Ödeme Entegrasyonu */}
      <section className="mb-8 md:mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">💳 {t('settings_stripe')}</h2>
        <button
          type="button"
          onClick={canEditStripe ? () => setShowStripeModal(true) : undefined}
          className={`w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 transition-all ${canEditStripe ? 'hover:border-blue-400 hover:shadow-md cursor-pointer' : 'cursor-default'}`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-gray-700">{t('settings_stripe_status')}:</span>
            {stripeStatus ? (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  stripeStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {stripeStatus.configured ? t('settings_stripe_configured') : t('settings_stripe_not_configured')}
              </span>
            ) : (
              <span className="text-gray-400 text-sm">{t('settings_loading')}</span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-2">{t('settings_stripe_desc')}</p>
          <div className="mt-3 text-xs text-blue-600 font-medium">{canEditStripe ? `${t('btn_edit')} / ${t('stripe_page_link')} →` : t('settings_stripe_desc')}</div>
        </button>
      </section>
      </>
      )}

      {canEditChannels && (
      <>
      {/* Ana Sayfa Yayınları */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings_home_channels')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('settings_home_channels_desc')}</p>
        {channelsLoading ? (
          <div className="text-gray-500 py-8">{t('settings_loading')}</div>
        ) : (
          <button
            type="button"
            onClick={() => setShowChannelsModal(true)}
            className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="font-medium text-gray-900 mb-1">{t('settings_home_channels')}</div>
            <div className="text-sm text-gray-600">
              {channels.length === 0 ? t('settings_no_channels') : `${channels.length} ${t('settings_channel_title')}`}
            </div>
            <div className="mt-3 text-xs text-blue-600 font-medium">{t('btn_edit')} →</div>
          </button>
        )}
      </section>
      </>
      )}

      {canEditContact && (
      <>
      {/* İletişim Bilgileri */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings_contact_info')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('settings_contact_info_desc')}</p>
        {contactLoading ? (
          <div className="text-gray-500 py-4">{t('settings_loading')}</div>
        ) : (
          <button
            type="button"
            onClick={openContactModal}
            className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>E-posta:</strong> {contactInfo.email}</div>
              <div><strong>Telefon:</strong> {contactInfo.phone}</div>
              <div><strong>Adres:</strong> {contactInfo.address || '—'}</div>
            </div>
            <div className="mt-3 text-xs text-blue-600 font-medium">{t('settings_edit_contact')} →</div>
          </button>
        )}
      </section>
      </>
      )}

      {canEditWhatsapp && (
      <>
      {/* WhatsApp iletişim */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">WhatsApp</h2>
        <button
          type="button"
          onClick={openWhatsAppModal}
          className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </div>
          <div>
            <div className="font-medium text-gray-900">{contactInfo.whatsapp || '+1 438 596 8566'}</div>
            <div className="text-sm text-gray-600">Destek veya sorularınız için WhatsApp · Numarayı güncellemek için tıklayın</div>
            <div className="mt-1 text-xs text-blue-600 font-medium">WhatsApp numarası güncelle →</div>
          </div>
        </button>
      </section>
      </>
      )}

      {isSuper && (
      <>
      {/* Fatura düzeni — sadece super_admin */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Fatura Düzeni</h2>
        <p className="text-sm text-gray-600 mb-4">Fatura ve ödeme onay sayfasındaki metinleri düzenleyin (fatura başlığı, etiketler, firma bilgisi, buton metinleri).</p>
        <button
          type="button"
          onClick={async () => {
            setShowInvoiceLayoutModal(true);
            setInvoiceLayoutLoading(true);
            try {
              const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
              const res = await fetch('/api/invoice-layout', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              const data = await res.json().catch(() => ({}));
              setInvoiceLayout(typeof data === 'object' && data !== null ? { ...data } as Record<string, string> : {});
            } catch {
              setInvoiceLayout({});
            } finally {
              setInvoiceLayoutLoading(false);
            }
          }}
          className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all"
        >
          <div className="font-medium text-gray-900 mb-1">Fatura Düzeni</div>
          <div className="text-sm text-gray-600">Faturada ve ödeme sayfasında görünen yazıları düzenlemek için tıklayın</div>
          <div className="mt-3 text-xs text-blue-600 font-medium">{t('btn_edit')} →</div>
        </button>
      </section>

      {/* Android TV Uygulaması Ayarları — admin ve super_admin */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('settings_tv_app_title')}</h2>
        <p className="text-sm text-gray-600 mb-4">{t('settings_tv_app_desc')}</p>
        {tvAppConfigLoading ? (
          <div className="text-gray-500 py-4">{t('settings_loading')}</div>
        ) : (
          <button
            type="button"
            onClick={() => setShowTvAppModal(true)}
            className="w-full text-left bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-400 hover:shadow-md transition-all"
          >
            <div className="text-sm text-gray-700 space-y-1">
              <div><strong>API taban URL:</strong> {tvAppConfig.apiBaseUrl || '—'}</div>
              <div><strong>İndirme linki:</strong> {tvAppConfig.downloadUrl}</div>
              <div><strong>Watchdog:</strong> {tvAppConfig.watchdogIntervalMinutes} {t('settings_tv_app_minutes')}</div>
            </div>
            <div className="mt-3 text-xs text-blue-600 font-medium">{t('btn_edit')} →</div>
          </button>
        )}
      </section>
      </>
      )}

      {/* İletişim düzenleme modali */}
      {showContactModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !contactSaving && setShowContactModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings_edit_contact')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('home_contact_email')}</label>
                <input
                  type="email"
                  value={contactEdit.email}
                  onChange={(e) => setContactEdit((p) => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t('settings_contact_email_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('home_contact_phone')}</label>
                <input
                  type="text"
                  value={contactEdit.phone}
                  onChange={(e) => setContactEdit((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="+90 212 123 45 67"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('home_contact_address')}</label>
                <input
                  type="text"
                  value={contactEdit.address}
                  onChange={(e) => setContactEdit((p) => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder={t('settings_contact_address_placeholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
                <input
                  type="text"
                  value={contactEdit.whatsapp}
                  onChange={(e) => setContactEdit((p) => ({ ...p, whatsapp: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="+1 438 596 8566"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={saveContactInfo}
                disabled={contactSaving}
                className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {contactSaving ? t('common_saving') : t('btn_save')}
              </button>
              <button
                type="button"
                onClick={() => !contactSaving && setShowContactModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TV uygulaması ayarları modali */}
      {showTvAppModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !tvAppConfigSaving && setShowTvAppModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings_tv_app_title')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings_tv_app_api_base')}</label>
                <input
                  type="url"
                  value={tvAppConfig.apiBaseUrl}
                  onChange={(e) => setTvAppConfig((p) => ({ ...p, apiBaseUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  placeholder="https://api.menuslide.com veya https://siteniz.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings_tv_app_download_url')}</label>
                <input
                  type="text"
                  value={tvAppConfig.downloadUrl}
                  onChange={(e) => setTvAppConfig((p) => ({ ...p, downloadUrl: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                  placeholder="/downloads/Menuslide.apk"
                />
                <p className="text-xs text-gray-500 mt-1">{t('settings_tv_app_upload_blob_hint')}</p>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    ref={apkInputRef}
                    type="file"
                    accept=".apk"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const authToken = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
                      if (!authToken) {
                        toast.showError(t('settings_tv_app_upload_error') + ' (Oturum gerekli)');
                        return;
                      }
                      if (!supabase) {
                        toast.showError(t('settings_tv_app_upload_error') + ' (Supabase yapılandırılmamış)');
                        return;
                      }
                      setApkUploading(true);
                      try {
                        const tokenRes = await fetch('/api/admin/upload-apk-token', {
                          headers: { Authorization: `Bearer ${authToken}` },
                        });
                        if (!tokenRes.ok) {
                          const data = await tokenRes.json().catch(() => ({}));
                          throw new Error(data.message || tokenRes.statusText);
                        }
                        const { path, token } = await tokenRes.json();
                        const { error: uploadErr } = await supabase.storage.from('menuslide').uploadToSignedUrl(path, token, file, {
                          contentType: 'application/vnd.android.package-archive',
                          upsert: true,
                        });
                        if (uploadErr) throw new Error(uploadErr.message);
                        const doneRes = await fetch('/api/admin/upload-apk-done', {
                          method: 'POST',
                          headers: { Authorization: `Bearer ${authToken}` },
                        });
                        if (!doneRes.ok) throw new Error('URL güncellenemedi');
                        const { url } = await doneRes.json();
                        setTvAppConfig((p) => ({ ...p, downloadUrl: url || '' }));
                        toast.showSuccess(t('settings_tv_app_upload_success'));
                      } catch (err) {
                        toast.showError(t('settings_tv_app_upload_error') + (err instanceof Error ? `: ${err.message}` : ''));
                      } finally {
                        setApkUploading(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => apkInputRef.current?.click()}
                    disabled={apkUploading}
                    className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50"
                  >
                    {apkUploading ? t('common_saving') : t('settings_tv_app_upload_blob')}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('settings_tv_app_watchdog')}</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={tvAppConfig.watchdogIntervalMinutes}
                  onChange={(e) => setTvAppConfig((p) => ({ ...p, watchdogIntervalMinutes: parseInt(e.target.value, 10) || 5 }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={async () => { await saveTvAppConfig(); setShowTvAppModal(false); }}
                disabled={tvAppConfigSaving}
                className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {tvAppConfigSaving ? t('common_saving') : t('btn_save')}
              </button>
              <button
                type="button"
                onClick={() => !tvAppConfigSaving && setShowTvAppModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan düzenleme modali */}
      {planModalId && (() => {
        const plan = plans.find((p) => p.id === planModalId);
        if (!plan) return null;
        const row = { ...plan, ...editing[plan.id] };
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => !savingId && closePlanModal(plan.id)}
            role="dialog"
            aria-modal="true"
          >
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings_pricing')} – {plan.display_name}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan adı</label>
                  <input
                    type="text"
                    value={row.display_name ?? ''}
                    onChange={(e) => updateEdit(plan.id, 'display_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Aylık ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_monthly ?? ''}
                      onChange={(e) => updateEdit(plan.id, 'price_monthly', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Yıllık ($)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.price_yearly ?? ''}
                      onChange={(e) => updateEdit(plan.id, 'price_yearly', e.target.value ? parseFloat(e.target.value) : 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max ekran</label>
                  <input
                    type="number"
                    min={-1}
                    value={row.max_screens ?? ''}
                    onChange={(e) => updateEdit(plan.id, 'max_screens', e.target.value ? parseInt(e.target.value, 10) : 0)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    title={t('settings_unlimited_hint')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID (Aylık)</label>
                  <input
                    type="text"
                    value={row.stripe_price_id_monthly ?? ''}
                    onChange={(e) => updateEdit(plan.id, 'stripe_price_id_monthly', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="price_xxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stripe Price ID (Yıllık)</label>
                  <input
                    type="text"
                    value={row.stripe_price_id_yearly ?? ''}
                    onChange={(e) => updateEdit(plan.id, 'stripe_price_id_yearly', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono"
                    placeholder="price_xxx"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => savePlan(plan.id).then(() => setPlanModalId(null))}
                  disabled={savingId === plan.id}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingId === plan.id ? t('common_saving') : t('btn_save')}
                </button>
                <button type="button" onClick={() => closePlanModal(plan.id)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  {t('btn_cancel')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Stripe modali */}
      {showStripeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowStripeModal(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">💳 {t('settings_stripe')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('settings_stripe_desc')}</p>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-sm font-medium text-gray-700">{t('settings_stripe_status')}:</span>
              {stripeStatus ? (
                <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${stripeStatus.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {stripeStatus.configured ? t('settings_stripe_configured') : t('settings_stripe_not_configured')}
                </span>
              ) : (
                <span className="text-gray-400 text-sm">{t('settings_loading')}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mb-4">{t('settings_stripe_config_hint')}</p>
            <div className="flex gap-2">
              <Link href={localePath('/settings/stripe')} className="flex-1 px-4 py-2 text-sm text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {t('stripe_page_link')} →
              </Link>
              <button type="button" onClick={() => setShowStripeModal(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                {t('common_close')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ana sayfa yayınları modali */}
      {showChannelsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !channelsSaving && setShowChannelsModal(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">{t('settings_home_channels')}</h3>
              <button type="button" onClick={() => !channelsSaving && setShowChannelsModal(false)} className="text-gray-500 hover:text-gray-700 p-1">✕</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                {channels.map((ch, idx) => (
                  <div key={ch.slug + idx} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('settings_channel_slug')}</label>
                      <input
                        type="text"
                        value={ch.slug}
                        onChange={(e) => updateChannel(idx, 'slug', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder={t('settings_channel_slug_placeholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('settings_channel_title')}</label>
                      <input
                        type="text"
                        value={ch.title ?? ''}
                        onChange={(e) => updateChannel(idx, 'title', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="Teras"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('settings_channel_description')}</label>
                      <input
                        type="text"
                        value={ch.description ?? ''}
                        onChange={(e) => updateChannel(idx, 'description', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder={t('settings_channel_desc_placeholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">{t('settings_channel_link')}</label>
                      <input
                        type="text"
                        value={ch.link ?? ''}
                        onChange={(e) => updateChannel(idx, 'link', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="/display/teras veya tam URL"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 flex gap-2">
              <button
                type="button"
                onClick={async () => { await saveChannels(); setShowChannelsModal(false); }}
                disabled={channelsSaving}
                className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {channelsSaving ? t('common_saving') : t('btn_save')}
              </button>
              <button type="button" onClick={() => !channelsSaving && setShowChannelsModal(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp numara güncelleme modali */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !whatsappSaving && setShowWhatsAppModal(false)} role="dialog" aria-modal="true">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp numarası</h3>
            <p className="text-sm text-gray-600 mb-4">Destek için kullanılacak WhatsApp numarasını girin (ülke kodu ile, örn. +90 5xx xxx xx xx).</p>
            <input
              type="text"
              value={whatsappEdit}
              onChange={(e) => setWhatsappEdit(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="+1 438 596 8566"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveWhatsApp}
                disabled={whatsappSaving}
                className="flex-1 px-4 py-2 text-sm bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-lg font-medium disabled:opacity-50"
              >
                {whatsappSaving ? t('common_saving') : t('btn_save')}
              </button>
              <button type="button" onClick={() => !whatsappSaving && setShowWhatsAppModal(false)} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                {t('btn_cancel')}
              </button>
            </div>
            {(whatsappEdit || contactInfo.whatsapp) && (
              <a
                href={`https://wa.me/${(whatsappEdit || contactInfo.whatsapp).replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-2 border border-[#25D366] text-[#25D366] rounded-lg text-sm font-medium hover:bg-[#25D366]/10"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Mesaj at
              </a>
            )}
          </div>
        </div>
      )}

      {/* Fatura düzeni modali */}
      {showInvoiceLayoutModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !invoiceLayoutSaving && setShowInvoiceLayoutModal(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('settings_invoice_modal_title')}</h3>
            <p className="text-sm text-gray-500 mb-4">{t('settings_invoice_modal_desc')}</p>
            {invoiceLayoutLoading ? (
              <p className="text-gray-500 py-4">{t('settings_loading')}</p>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'company_name', label: t('settings_company_name') },
                    { key: 'company_address', label: t('settings_company_address') },
                    { key: 'company_phone', label: t('settings_company_phone') },
                    { key: 'company_email', label: t('settings_company_email') },
                  ].map(({ key, label }) => (
                    <div key={key} className={key === 'company_address' ? 'sm:col-span-2' : ''}>
                      <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                      <input
                        type="text"
                        value={invoiceLayout[key] ?? ''}
                        onChange={(e) => setInvoiceLayout((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ))}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Footer</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{t('settings_footer_legal')}</label>
                      <input
                        type="text"
                        value={invoiceLayout.footer_legal ?? ''}
                        onChange={(e) => setInvoiceLayout((p) => ({ ...p, footer_legal: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="MenuSlide Inc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-0.5">{t('settings_footer_tax_id')}</label>
                      <input
                        type="text"
                        value={invoiceLayout.footer_tax_id ?? ''}
                        onChange={(e) => setInvoiceLayout((p) => ({ ...p, footer_tax_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        placeholder="GST/HST No. 123456789 RT0001"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={async () => {
                    setInvoiceLayoutSaving(true);
                    try {
                      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
                      const payload = {
                        company_name: invoiceLayout.company_name ?? '',
                        company_address: invoiceLayout.company_address ?? '',
                        company_phone: invoiceLayout.company_phone ?? '',
                        company_email: invoiceLayout.company_email ?? '',
                        footer_legal: invoiceLayout.footer_legal ?? '',
                        footer_tax_id: invoiceLayout.footer_tax_id ?? '',
                      };
                      const res = await fetch('/api/invoice-layout', {
                        method: 'PUT',
                        headers: {
                          'Content-Type': 'application/json',
                          ...(token ? { Authorization: `Bearer ${token}` } : {}),
                        },
                        body: JSON.stringify(payload),
                      });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err?.message || t('settings_save_failed'));
                    }
                    toast.showSuccess(t('settings_invoice_layout_saved'));
                    setShowInvoiceLayoutModal(false);
                  } catch (e: any) {
                    toast.showError(e?.message || t('settings_save_failed'));
                  } finally {
                    setInvoiceLayoutSaving(false);
                  }
                }}
                disabled={invoiceLayoutLoading || invoiceLayoutSaving}
                className="flex-1 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {invoiceLayoutSaving ? t('common_saving') : t('btn_save')}
              </button>
              <button
                type="button"
                onClick={() => !invoiceLayoutSaving && setShowInvoiceLayoutModal(false)}
                className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
