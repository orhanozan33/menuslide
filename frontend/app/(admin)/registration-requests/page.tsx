'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAdminPagePermissions } from '@/lib/useAdminPagePermissions';
import { useToast } from '@/lib/ToastContext';
import { useConfirm } from '@/lib/ConfirmContext';
import { apiClient } from '@/lib/api';

interface RegistrationRequest {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  address?: string;
  province?: string;
  city?: string;
  reference_number?: string;
  status: 'pending' | 'approved' | 'rejected' | 'registered';
  createdAt: string;
}

type StatusFilter = 'all' | 'paid' | 'unpaid';

function isPaid(status: string) {
  return status === 'approved' || status === 'registered';
}

export default function RegistrationRequestsPage() {
  const { t, localePath } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const { confirm } = useConfirm();
  const { can, isSuper, hasView } = useAdminPagePermissions('registration_requests');
  const canViewList = hasView || can('view_list');
  const canApprove = isSuper || can('approve');
  const canReject = isSuper || can('reject');
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestUpdating, setRequestUpdating] = useState<string | null>(null);
  const [requestDeleting, setRequestDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    try {
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?.role !== 'super_admin' && user?.role !== 'admin') {
        router.replace(localePath('/dashboard'));
        return;
      }
    } catch {
      router.replace(localePath('/dashboard'));
      return;
    }
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await apiClient('/registration-requests');
      setRequests(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (id: string, status: string) => {
    setRequestUpdating(id);
    try {
      await apiClient(`/registration-requests/${id}/status`, {
        method: 'PATCH',
        body: { status },
      });
      await loadRequests();
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setRequestUpdating(null);
    }
  };

  const deleteRequest = async (id: string) => {
    const ok = await confirm({ title: t('reg_requests_delete') || 'Sil', message: t('reg_requests_delete') + '?', variant: 'danger' });
    if (!ok) return;
    setRequestDeleting(id);
    try {
      await apiClient(`/registration-requests/${id}`, { method: 'DELETE' });
      await loadRequests();
    } catch (e: any) {
      toast.showError(e?.message || t('settings_save_failed'));
    } finally {
      setRequestDeleting(null);
    }
  };

  const counts = useMemo(() => {
    const paid = requests.filter((r) => isPaid(r.status)).length;
    const unpaid = requests.filter((r) => !isPaid(r.status)).length;
    return { paid, unpaid, total: requests.length };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    let list = requests;
    if (statusFilter === 'paid') list = list.filter((r) => isPaid(r.status));
    if (statusFilter === 'unpaid') list = list.filter((r) => !isPaid(r.status));
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.email?.toLowerCase().includes(q) ||
          r.businessName?.toLowerCase().includes(q) ||
          (r.phone ?? '').toLowerCase().includes(q) ||
          (r.address ?? '').toLowerCase().includes(q) ||
          (r.province ?? '').toLowerCase().includes(q) ||
          (r.city ?? '').toLowerCase().includes(q) ||
          (r.reference_number ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [requests, statusFilter, searchQuery]);

  if (!canViewList) {
    return (
      <div className="min-w-0 overflow-x-hidden">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('settings_registration_requests')}</h2>
        <p className="text-gray-600 py-8">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('settings_registration_requests')}</h2>
      <p className="text-gray-600 mb-4">{t('settings_registration_requests_desc')}</p>

      {/* Özet: Ödenen / Ödenmeyen / Tümü */}
      {!loading && requests.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4 max-w-2xl">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-lg border p-3 text-left transition-colors ${
              statusFilter === 'all'
                ? 'border-slate-400 bg-slate-100 text-slate-900'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-medium text-gray-500 block">{t('reg_requests_filter_all')}</span>
            <span className="text-xl font-bold text-slate-800">{counts.total}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('paid')}
            className={`rounded-lg border p-3 text-left transition-colors ${
              statusFilter === 'paid'
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-medium text-gray-500 block">{t('reg_requests_filter_paid')}</span>
            <span className="text-xl font-bold text-emerald-700">{counts.paid}</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unpaid')}
            className={`rounded-lg border p-3 text-left transition-colors ${
              statusFilter === 'unpaid'
                ? 'border-amber-500 bg-amber-50 text-amber-900'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
          >
            <span className="text-xs font-medium text-gray-500 block">{t('reg_requests_filter_unpaid')}</span>
            <span className="text-xl font-bold text-amber-700">{counts.unpaid}</span>
          </button>
        </div>
      )}

      {/* Arama */}
      {!loading && requests.length > 0 && (
        <div className="mb-4 max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('reg_requests_search')}</label>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('reg_requests_search_placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-slate-400"
          />
        </div>
      )}

      {loading ? (
        <div className="text-gray-500 py-8">{t('settings_loading')}</div>
      ) : requests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          {t('settings_no_new_members')}
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center text-gray-500">
          {t('reg_requests_no_results')}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm overflow-x-auto">
          <table className="w-full text-left min-w-[640px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_business')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_email')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_phone')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_address')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_province')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_city')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_reference_number')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_date')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_status')}</th>
                <th className="px-4 py-3 text-sm font-semibold text-gray-700">{t('settings_request_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.map((req) => {
                const paid = isPaid(req.status);
                return (
                  <tr key={req.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{req.businessName}</td>
                    <td className="px-4 py-3 text-sm">
                      <a href={`mailto:${req.email}`} className="text-blue-600 hover:underline">{req.email}</a>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.phone || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate" title={req.address}>{req.address || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.province || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{req.city || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-[200px] truncate" title={req.reference_number}>{req.reference_number || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        req.status === 'approved' || req.status === 'registered'
                          ? 'bg-green-100 text-green-800'
                          : req.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status === 'approved' || req.status === 'registered'
                          ? t('reg_requests_status_paid')
                          : req.status === 'rejected'
                            ? t('settings_status_rejected')
                            : t('reg_requests_status_unpaid')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap items-center">
                        {paid ? (
                          canApprove && (
                          <button
                            type="button"
                            onClick={() => updateRequestStatus(req.id, 'pending')}
                            disabled={requestUpdating === req.id}
                            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
                          >
                            {t('reg_requests_mark_unpaid')}
                          </button>
                          )
                        ) : (
                          <>
                            {canApprove && (
                            <button
                              type="button"
                              onClick={() => updateRequestStatus(req.id, 'approved')}
                              disabled={requestUpdating === req.id}
                              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {t('reg_requests_mark_paid')}
                            </button>
                            )}
                            {req.status === 'pending' && canReject && (
                              <button
                                type="button"
                                onClick={() => updateRequestStatus(req.id, 'rejected')}
                                disabled={requestUpdating === req.id}
                                className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {t('settings_status_rejected')}
                              </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteRequest(req.id)}
                          disabled={requestDeleting === req.id || requestUpdating === req.id}
                          className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                        >
                          {t('reg_requests_delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
