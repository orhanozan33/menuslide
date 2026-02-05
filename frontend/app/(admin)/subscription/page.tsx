'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  payment_date: string;
}

interface Subscription {
  id: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  plans: {
    id: string;
    display_name: string;
    max_screens: number;
    price_monthly: number;
  };
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { localePath, t } = useTranslation();
  const toast = useToast();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadSubscription = async () => {
    try {
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push(localePath('/login'));
          return;
        }
      }

      const businesses = await apiClient('/businesses');
      if (!businesses || businesses.length === 0) {
        return;
      }

      const businessId = businesses[0].id;
      const subData = await apiClient(`/subscriptions/business/${businessId}`);
      setSubscription(subData);

      if (subData?.id) {
        const paymentsData = await apiClient(`/subscriptions/${subData.id}/payments`);
        setPayments(paymentsData || []);
      }
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!subscription) return;

    if (!confirm('Are you sure you want to cancel your subscription? It will remain active until the end of the billing period.')) {
      return;
    }

    try {
      await apiClient(`/subscriptions/${subscription.id}/cancel`, {
        method: 'POST',
      });
      toast.showSuccess(t('subscription_canceled_success'));
      loadSubscription();
    } catch (error: any) {
      toast.showError(error.message || t('subscription_cancel_failed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen bg-slate-900">
        <nav className="bg-white shadow-md border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href={localePath('/dashboard')} className="text-xl font-bold">
                  Digital Signage Admin
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Active Subscription</h2>
            <p className="text-gray-600 mb-6">Subscribe to a plan to get started.</p>
            <Link
              href={localePath('/pricing')}
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              View Plans
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 min-w-0 overflow-x-hidden">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-xl font-bold">
                Digital Signage Admin
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-6">
          <Link href={localePath('/dashboard')} className="text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        {/* Subscription Details */}
        <div className="bg-white rounded-lg shadow p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6">Subscription Details</h2>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Plan</label>
              <p className="text-lg font-semibold">{subscription.plans.display_name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Status</label>
              <p className="text-lg font-semibold">
                <span className={`px-2 py-1 rounded text-sm ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                  subscription.status === 'past_due' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {subscription.status.toUpperCase()}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Monthly Price</label>
              <p className="text-lg font-semibold">${subscription.plans.price_monthly}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Screens</label>
              <p className="text-lg font-semibold">
                {subscription.plans.max_screens === -1 ? 'Unlimited' : subscription.plans.max_screens}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Current Period Start</label>
              <p className="text-lg">{new Date(subscription.current_period_start).toLocaleDateString()}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Current Period End</label>
              <p className="text-lg">{new Date(subscription.current_period_end).toLocaleDateString()}</p>
            </div>
          </div>

          {subscription.cancel_at_period_end && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                ⚠️ Your subscription will be canceled at the end of the current billing period.
              </p>
            </div>
          )}

          {subscription.status === 'active' && !subscription.cancel_at_period_end && (
            <button
              onClick={handleCancel}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Cancel Subscription
            </button>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold mb-6">Payment History</h2>

          {payments.length === 0 ? (
            <p className="text-gray-700">No payment history available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${payment.amount.toFixed(2)} {payment.currency.toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded ${
                          payment.status === 'succeeded' ? 'bg-green-100 text-green-800' :
                          payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {payment.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
