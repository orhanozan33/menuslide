'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { InvoiceModal } from '@/components/InvoiceModal';

interface AccountData {
  user: {
    id: string;
    email: string;
    business_name: string | null;
    reference_number?: string;
  };
  subscription: {
    plan_name: string;
    current_period_start: string | null;
    current_period_end: string | null;
  } | null;
  referred_users: Array<{
    id: string;
    email: string;
    created_at: string;
    reference_number: string | null;
    business_name: string | null;
  }>;
}

interface PaymentItem {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  plan_name?: string;
  invoice_number?: string;
}

interface InvoiceDetail {
  id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
  plan_name: string | null;
  business_name: string | null;
  customer_email: string | null;
  company?: {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    footer_legal: string;
    footer_tax_id: string;
  };
}

function getDefaultDateRange(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'tr' ? 'tr-TR' : locale === 'fr' ? 'fr-FR' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AccountPage() {
  const { t, localePath, locale } = useTranslation();
  const router = useRouter();
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const defaultRange = getDefaultDateRange();
  const [paymentStartDate, setPaymentStartDate] = useState(defaultRange.start);
  const [paymentEndDate, setPaymentEndDate] = useState(defaultRange.end);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [invoiceModal, setInvoiceModal] = useState<InvoiceDetail | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (data?.user?.id) loadPayments();
  }, [data?.user?.id]);

  const loadAccount = async () => {
    try {
      const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      if (!userStr) {
        router.push(localePath('/login'));
        return;
      }
      const authUser = JSON.parse(userStr);
      if (authUser.role !== 'business_user') {
        router.push(localePath('/dashboard'));
        return;
      }
      const res = await apiClient('/auth/account');
      setData(res as AccountData);
    } catch (err) {
      console.error('Error loading account:', err);
      router.push(localePath('/login'));
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    setPaymentsLoading(true);
    try {
      const params = new URLSearchParams();
      if (paymentStartDate) params.set('start_date', paymentStartDate);
      if (paymentEndDate) params.set('end_date', paymentEndDate);
      const res = await apiClient(`/auth/payments?${params.toString()}`);
      setPayments(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Error loading payments:', err);
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  };

  const openInvoice = async (paymentId: string) => {
    setInvoiceLoading(true);
    setInvoiceModal(null);
    try {
      const inv = await apiClient(`/auth/invoices/${paymentId}`) as InvoiceDetail;
      setInvoiceModal(inv);
    } catch (err) {
      console.error('Error loading invoice:', err);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);
    if (passwordForm.new_password.length < 6) {
      setPasswordMessage({ type: 'error', text: t('account_validation_password_min') });
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordMessage({ type: 'error', text: t('account_validation_passwords_match') });
      return;
    }
    setPasswordSubmitting(true);
    try {
      await apiClient('/auth/change-password', {
        method: 'POST',
        body: {
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password,
        },
      });
      setPasswordMessage({ type: 'success', text: t('account_password_updated') });
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
      setPasswordModalOpen(false);
    } catch (err: any) {
      setPasswordMessage({
        type: 'error',
        text: err?.message || t('account_password_error'),
      });
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-600">{t('common_loading')}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-slate-800">{t('account_title')}</h1>

      {/* User info */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">{t('account_user_info')}</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">{t('account_email')}</dt>
            <dd className="font-medium text-slate-800">{data.user.email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('account_business_name')}</dt>
            <dd className="font-medium text-slate-800">{data.user.business_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-slate-500">{t('account_reference')}</dt>
            <dd className="font-medium text-slate-800">{data.user.reference_number || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Password change */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">{t('account_password_change')}</h2>
        <button
          type="button"
          onClick={() => {
            setPasswordModalOpen(true);
            setPasswordMessage(null);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
          }}
          className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700"
        >
          {t('account_password_change')}
        </button>
      </section>

      {/* Password change modal */}
      {passwordModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setPasswordModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="password-modal-title"
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              aria-label={t('common_close')}
            >
              <span className="text-xl leading-none">×</span>
            </button>
            <h3 id="password-modal-title" className="text-lg font-medium text-slate-800 mb-4 pr-8">
              {t('account_password_change')}
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('account_current_password')}</label>
                <input
                  type="password"
                  value={passwordForm.current_password}
                  onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800"
                  autoComplete="current-password"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('account_new_password')}</label>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t('account_confirm_password')}</label>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
                  className="w-full rounded border border-slate-300 px-3 py-2 text-slate-800"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              {passwordMessage && (
                <p className={`text-sm ${passwordMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordMessage.text}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={passwordSubmitting}
                  className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50"
                >
                  {passwordSubmitting ? t('common_loading') : t('account_password_change')}
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-100"
                >
                  {t('btn_cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Package info */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">{t('account_package_info')}</h2>
        {data.subscription ? (
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-slate-500">{t('account_plan')}</dt>
              <dd className="font-medium text-slate-800">{data.subscription.plan_name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('account_start_date')}</dt>
              <dd className="font-medium text-slate-800">{formatDate(data.subscription.current_period_start, locale)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('account_end_date')}</dt>
              <dd className="font-medium text-slate-800">{formatDate(data.subscription.current_period_end, locale)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-slate-600">{t('account_no_subscription')}</p>
        )}
      </section>

      {/* Faturalarım */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-2">{t('account_my_invoices') || 'Faturalarım'}</h2>
        <p className="text-sm text-slate-600 mb-4">{t('account_past_payments')}</p>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('account_date_from')}</label>
            <input
              type="date"
              value={paymentStartDate}
              onChange={e => setPaymentStartDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-slate-800 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('account_date_to')}</label>
            <input
              type="date"
              value={paymentEndDate}
              onChange={e => setPaymentEndDate(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2 text-slate-800 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={loadPayments}
            disabled={paymentsLoading}
            className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700 disabled:opacity-50 text-sm"
          >
            {paymentsLoading ? t('common_loading') : t('account_show_payments')}
          </button>
        </div>
        {payments.length === 0 && !paymentsLoading ? (
          <p className="text-slate-600 text-sm">{t('account_no_payments')}</p>
        ) : paymentsLoading ? (
          <p className="text-slate-600 text-sm">{t('common_loading')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">{t('account_payment_date')}</th>
                  <th className="pb-2 pr-4">{t('account_plan_name')}</th>
                  <th className="pb-2 pr-4">{t('account_amount')}</th>
                  <th className="pb-2 pr-4">{t('account_currency')}</th>
                  <th className="pb-2 pr-4">{t('account_status')}</th>
                  <th className="pb-2">{t('account_invoice')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{formatDate(p.payment_date, locale)}</td>
                    <td className="py-2 pr-4 text-slate-800">{p.plan_name || '—'}</td>
                    <td className="py-2 pr-4 text-slate-800">{p.amount.toFixed(2)}</td>
                    <td className="py-2 pr-4 text-slate-800">{(p.currency || 'cad').toUpperCase()}</td>
                    <td className="py-2 pr-4 text-slate-600 capitalize">{p.status}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => openInvoice(p.id)}
                        className="text-slate-700 underline hover:text-slate-900 text-left"
                      >
                        {t('account_view_invoice')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Fatura detay modal */}
        {(invoiceLoading || invoiceModal) && (
          <InvoiceModal
            data={invoiceModal}
            loading={invoiceLoading}
            onClose={() => setInvoiceModal(null)}
          />
        )}
      </section>

      {/* Referred users */}
      <section className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-medium text-slate-800 mb-4">{t('account_referred_users')}</h2>
        {data.referred_users.length === 0 ? (
          <p className="text-slate-600">{t('account_no_referred_users')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-600">
                  <th className="pb-2 pr-4">{t('account_email')}</th>
                  <th className="pb-2 pr-4">{t('account_business_name')}</th>
                  <th className="pb-2 pr-4">{t('account_reference')}</th>
                  <th className="pb-2">{t('account_registered_at')}</th>
                </tr>
              </thead>
              <tbody>
                {data.referred_users.map(u => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-800">{u.email}</td>
                    <td className="py-2 pr-4 text-slate-800">{u.business_name || '—'}</td>
                    <td className="py-2 pr-4 text-slate-800">{u.reference_number || '—'}</td>
                    <td className="py-2 text-slate-600">{formatDate(u.created_at, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
