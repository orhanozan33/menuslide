'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { logAdminActivity } from '@/lib/admin-activity';

export default function NewScreenPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams?.get('business_id') || '';
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    business_id: '',
    name: '',
    location: '',
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Kullanıcı rolünü kontrol et - sadece admin/super_admin ekran oluşturabilir
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const userRole = user.role;
        if (userRole !== 'super_admin' && userRole !== 'admin') {
          router.push(localePath('/screens'));
          return;
        }
      } catch (e) {
        console.error('Error parsing user:', e);
        router.push(localePath('/screens'));
        return;
      }
    } else {
      router.push(localePath('/login'));
      return;
    }
    
    loadBusinesses();
  }, [router]);

  const loadBusinesses = async () => {
    try {
      const data = await apiClient('/businesses');
      setBusinesses(data);
      // URL'den gelen business_id varsa (admin bir kullanıcı seçip ekran eklediyse) onu seç; yoksa ilk işletmeyi seç
      const initialBusinessId = businessIdFromUrl && data.some((b: any) => b.id === businessIdFromUrl)
        ? businessIdFromUrl
        : (data.length > 0 ? data[0].id : '');
      setFormData((prev) => ({ ...prev, business_id: initialBusinessId }));
    } catch (error) {
      console.error('Error loading businesses:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const screen = await apiClient('/screens', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const screenId = (screen as any)?.id;
      if (screenId) {
        logAdminActivity({ action_type: 'screen_create', page_key: 'screens', resource_type: 'screen', resource_id: screenId, details: { name: formData.name } });
      }
      router.push(localePath('/screens'));
    } catch (err: any) {
      setError(err.message || 'Ekran oluşturulamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-4">
              <Link href={localePath('/dashboard')} className="text-lg sm:text-xl font-bold text-gray-900">
                Dijital Menü Yönetimi
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-900">Yeni Ekran Oluştur</h2>

        <form onSubmit={handleSubmit} className="bg-white p-5 sm:p-6 rounded-xl shadow-lg border border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              İşletme
            </label>
            <select
              value={formData.business_id}
              onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            >
              <option value="">İşletme seçin</option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('screens_name_label')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konum
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">Aktif</span>
            </label>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Screen'}
            </button>
            <Link
              href={localePath('/screens')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
