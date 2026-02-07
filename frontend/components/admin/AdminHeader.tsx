'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { apiClient } from '@/lib/api';

interface AdminHeaderProps {
  user: { role?: string } | null;
  localePath: (path: string) => string;
  mobile?: boolean;
}

export default function AdminHeader({ user, localePath, mobile }: AdminHeaderProps) {
  const { t } = useTranslation();
  const [pendingCount, setPendingCount] = useState(0);
  const [paymentAlertCount, setPaymentAlertCount] = useState(0);

  useEffect(() => {
    if (user?.role !== 'super_admin' && user?.role !== 'admin') return;
    const load = async () => {
      try {
        const data = await apiClient('/registration-requests').catch(() => []);
        const list = Array.isArray(data) ? data : [];
        setPendingCount(list.filter((r: { status: string }) => r.status === 'pending').length);
      } catch {
        setPendingCount(0);
      }
    };
    load();
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'super_admin' && user?.role !== 'admin') return;
    const load = async () => {
      try {
        const data = await apiClient('/reports/payment-status').catch(() => ({
          failedPayments: [],
          overdueSubscriptions: [],
        }));
        const failed = (data as any)?.failedPayments?.length ?? 0;
        const overdue = (data as any)?.overdueSubscriptions?.length ?? 0;
        setPaymentAlertCount(failed + overdue);
      } catch {
        setPaymentAlertCount(0);
      }
    };
    load();
  }, [user?.role]);

  if (user?.role !== 'super_admin' && user?.role !== 'admin') return null;

  const totalAlerts = pendingCount + paymentAlertCount;
  const href = paymentAlertCount > 0 && pendingCount === 0
    ? localePath('/reports')
    : localePath('/registration-requests');
  const title = totalAlerts > 0
    ? (pendingCount > 0 && paymentAlertCount > 0
      ? t('header_notifications_both')
      : paymentAlertCount > 0
        ? t('header_notifications_payment')
        : t('sidebar_registration_requests'))
    : t('sidebar_registration_requests');

  const content = (
    <Link
      href={href}
      className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center touch-manipulation"
      title={title}
    >
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {totalAlerts > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full">
          {totalAlerts > 99 ? '99+' : totalAlerts}
        </span>
      )}
    </Link>
  );

  if (mobile) return content;
  return (
    <header className="h-14 px-4 flex items-center justify-end border-b border-gray-200 bg-white">
      {content}
    </header>
  );
}
