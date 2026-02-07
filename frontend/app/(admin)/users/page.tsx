'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { useAdminPagePermissions } from '@/lib/useAdminPagePermissions';

interface User {
  id: string;
  email: string;
  role: string;
  business_id: string | null;
  business_name: string | null;
  business_is_active?: boolean;
  subscription_status: string | null;
  plan_name: string | null;
  plan_max_screens: number | null;
  template_count?: number;
  reference_number?: string | null;
  created_at: string;
}

export default function UsersPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    business_id: '',
    plan_id: '',
    max_screens: '',
    business_type: '',
    business_name: '',
    create_new_business: false,
  });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [planChangeModal, setPlanChangeModal] = useState<{
    open: boolean;
    userId: string;
    businessId: string;
    currentPlanId?: string;
    userEmail: string;
  } | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [planChangePeriodMonths, setPlanChangePeriodMonths] = useState<number>(1);
  const [planChangeSaving, setPlanChangeSaving] = useState(false);
  const [showAdminCreateModal, setShowAdminCreateModal] = useState(false);
  const [adminForm, setAdminForm] = useState({ email: '', password: '' });
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  const [adminError, setAdminError] = useState('');

  const { can, isSuper } = useAdminPagePermissions('users');
  const canCreateUser = isSuper || can('user_create');
  const canCreateAdmin = isSuper || can('admin_create');
  const canViewDetail = isSuper || can('view_detail');
  const canUserEdit = isSuper || can('user_edit');
  const canToggleActive = isSuper || can('toggle_active');
  const canPlanChange = isSuper || can('plan_change');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersData, businessesData, plansData] = await Promise.all([
        apiClient('/users'),
        apiClient('/businesses'),
        apiClient('/plans'),
      ]);
      // Süper admin hariç tüm kullanıcılar (business_user + admin)
      const list = (Array.isArray(usersData) ? usersData : []).filter(
        (u: User) => u.role !== 'super_admin'
      );
      setUsers(list);
      setBusinesses(businessesData);
      setPlans(plansData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      if (error.message?.includes('Only super admins')) {
        router.push(localePath('/dashboard'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    // Validate required fields
    if (!formData.email || !formData.password) {
      setError(t('users_email_required'));
      setCreating(false);
      return;
    }

    // Validate business creation (her zaman yeni işletme oluşturulacak)
    if (!formData.business_type || !formData.business_name) {
      setError(t('users_business_required'));
      setCreating(false);
      return;
    }
    if (!formData.max_screens) {
      setError(t('users_screen_count_required'));
      setCreating(false);
      return;
    }

    try {
      let businessId: string | null = null;

      // Her zaman yeni işletme oluştur
      if (formData.business_name && formData.business_type) {
        const businessSlug = formData.business_name.toLowerCase()
          .replace(/ş/g, 's')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c')
          .replace(/ı/g, 'i')
          .replace(/İ/g, 'i')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        try {
          const newBusiness = await apiClient('/businesses', {
            method: 'POST',
            body: JSON.stringify({
              name: formData.business_name,
              slug: businessSlug,
              is_active: true,
              business_type: formData.business_type, // Backend'e gönderilecek
            }),
          });
          businessId = newBusiness.id;
          // Reload businesses
          const businessesData = await apiClient('/businesses');
          setBusinesses(businessesData);
        } catch (businessErr: any) {
          console.error('Error creating business:', businessErr);
          setError('İşletme oluşturulamadı: ' + (businessErr.message || 'Bilinmeyen hata'));
          setCreating(false);
          return;
        }
      }

      if (!businessId) {
        setError('İşletme oluşturulamadı');
        setCreating(false);
        return;
      }

      // Prepare user data
      const userData: any = {
        email: formData.email,
        password: formData.password,
        role: 'business_user',
        business_id: businessId,
      };

      // Find or create plan based on max_screens
      if (formData.max_screens) {
        const maxScreensValue = formData.max_screens === 'unlimited' ? -1 : parseInt(formData.max_screens);
        let selectedPlan = plans.find((p: any) => p.max_screens === maxScreensValue);
        
        if (!selectedPlan) {
          // Create a new plan with the selected screen count
          const planName = `plan_${maxScreensValue === -1 ? 'unlimited' : maxScreensValue}`;
          const planDisplayName = maxScreensValue === -1 ? 'Sınırsız Ekran' : maxScreensValue === 0 ? '0 Ekran' : `${maxScreensValue} Ekran`;
          
          try {
            const newPlan = await apiClient('/plans', {
              method: 'POST',
              body: JSON.stringify({
                name: planName,
                display_name: planDisplayName,
                max_screens: maxScreensValue,
                price_monthly: 0,
                price_yearly: 0,
                is_active: true,
              }),
            });
            selectedPlan = newPlan;
            // Reload plans
            const plansData = await apiClient('/plans');
            setPlans(plansData);
          } catch (planErr: any) {
            console.error('Error creating plan:', planErr);
            setError('Plan oluşturulamadı: ' + (planErr.message || 'Bilinmeyen hata'));
            setCreating(false);
            return;
          }
        }
        
        if (selectedPlan) {
          userData.plan_id = selectedPlan.id;
        }
      }

      await apiClient('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
      setShowCreateForm(false);
      setFormData({ 
        email: '', 
        password: '', 
        business_id: '', 
        plan_id: '', 
        max_screens: '',
        business_type: '',
        business_name: '',
        create_new_business: false,
      });
      loadData();
      toast.showSuccess(t('users_create_success'));
    } catch (err: any) {
      console.error('Create user error:', err);
      setError(err.message || t('users_create_failed'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    if (!user.business_id) {
      toast.showWarning(t('users_no_business'));
      return;
    }

    try {
      // Get current business status
      const business = await apiClient(`/businesses/${user.business_id}`);
      await apiClient(`/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_active: !business.is_active,
        }),
      });
      loadData();
    } catch (error: any) {
      toast.showError(error.message || t('users_operation_failed'));
    }
  };


  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);
    setAdminError('');
    if (!adminForm.email?.trim() || !adminForm.password || adminForm.password.length < 6) {
      setAdminError('E-posta ve en az 6 karakter şifre gerekli.');
      setCreatingAdmin(false);
      return;
    }
    try {
      await apiClient('/users', {
        method: 'POST',
        body: JSON.stringify({
          email: adminForm.email.trim(),
          password: adminForm.password,
          role: 'admin',
        }),
      });
      setShowAdminCreateModal(false);
      setAdminForm({ email: '', password: '' });
      toast.showSuccess('Admin kullanıcı oluşturuldu. Yetkileri kullanıcı detayından düzenleyebilirsiniz.');
    } catch (err: any) {
      setAdminError(err.message || 'Oluşturulamadı.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const openPlanChangeModal = (user: User) => {
    if (!user.business_id) return;
    const currentPlan = plans.find(p => p.name === user.plan_name);
    setPlanChangeModal({
      open: true,
      userId: user.id,
      businessId: user.business_id,
      currentPlanId: currentPlan?.id,
      userEmail: user.email,
    });
    setSelectedPlanId(currentPlan?.id || null);
    setPlanChangePeriodMonths(1);
  };

  const closePlanChangeModal = () => {
    setPlanChangeModal(null);
    setSelectedPlanId(null);
    setPlanChangePeriodMonths(1);
  };

  const handleConfirmPlanChange = async () => {
    if (!planChangeModal || !selectedPlanId) return;
    let planIdToUse = selectedPlanId;
    if (selectedPlanId === '__zero__') {
      let zeroPlan = plans.find((p: any) => p.max_screens === 0);
      if (!zeroPlan) {
        try {
          zeroPlan = await apiClient('/plans', {
            method: 'POST',
            body: JSON.stringify({
              name: 'plan_0',
              display_name: '0 ekran (Paketi durdur)',
              max_screens: 0,
              price_monthly: 0,
              price_yearly: 0,
              is_active: true,
            }),
          });
          const plansData = await apiClient('/plans');
          setPlans(plansData);
        } catch (planErr: any) {
          toast.showError(planErr.message || '0 ekran planı oluşturulamadı');
          return;
        }
      }
      planIdToUse = zeroPlan.id;
    }
    if (planIdToUse === planChangeModal.currentPlanId) {
      toast.showWarning(t('users_plan_already_assigned'));
      return;
    }

    setPlanChangeSaving(true);
    try {
      await apiClient(`/users/${planChangeModal.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ plan_id: planIdToUse, subscription_period_months: planChangePeriodMonths }),
      });
      loadData();
      closePlanChangeModal();
      toast.showSuccess(t('users_plan_updated'));
    } catch (error: any) {
      toast.showError(error.message || t('users_plan_change_failed'));
    } finally {
      setPlanChangeSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('common_loading')}</div>
      </div>
    );
  }

  const adminUsers = users.filter((u: User) => u.role === 'admin' || u.role === 'super_admin');
  const businessUsers = users.filter((u: User) => u.role === 'business_user');

  const canViewAdminList = isSuper || can('view_admin_list');
  const canViewBusinessList = isSuper || can('view_business_list');

  return (
    <div className="min-w-0 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('users_management')}</h2>
          <div className="flex flex-wrap gap-2">
            {canCreateAdmin && (
              <button
                type="button"
                onClick={() => { setShowAdminCreateModal(true); setAdminError(''); setAdminForm({ email: '', password: '' }); }}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm sm:text-base shadow-md"
              >
                Super Admin (Admin Kullanıcı Oluştur)
              </button>
            )}
            {canCreateUser && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-md hover:shadow-lg"
              >
                {showCreateForm ? 'İptal' : 'Yeni Kullanıcı Oluştur'}
              </button>
            )}
          </div>
        </div>

        {showCreateForm && canCreateUser && (
          <div className="bg-white p-5 sm:p-6 rounded-xl shadow-lg mb-6 border border-gray-100">
            <h3 className="text-xl sm:text-2xl font-bold mb-4 text-gray-900">{t('users_create_new')}</h3>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}
            {plans.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
                <p>⚠️ {t('users_no_plans')}</p>
              </div>
            )}
            <form onSubmit={handleCreateUser}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('users_email_label')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                    placeholder="ornek@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Şifre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                    placeholder={t('users_password_placeholder')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('users_business_name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setFormData({ ...formData, business_name: name, create_new_business: true });
                    }}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                    placeholder={t('users_business_name_placeholder')}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('users_auto_business')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('users_business_type')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.business_type}
                    onChange={(e) => setFormData({ ...formData, business_type: e.target.value, create_new_business: true })}
                    required
                    className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                  >
                    <option value="">{t('users_select')}</option>
                    <option value="restaurant">Restoran</option>
                    <option value="cafe">Kafe</option>
                    <option value="patisserie">Pastane</option>
                    <option value="pizza">Pizza</option>
                    <option value="burger">Burger</option>
                    <option value="bakery">Fırın</option>
                    <option value="bar">Bar</option>
                    <option value="fastfood">Fast Food</option>
                    <option value="icecream">Dondurma</option>
                    <option value="other">Diğer</option>
                  </select>
                </div>
              </div>

              {/* İşletme Bilgileri - Her kullanıcı için otomatik işletme oluşturulacak */}
              <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <h4 className="text-sm font-semibold text-gray-800 mb-4">{t('users_business_info')}</h4>
                <p className="text-xs text-gray-600 mb-4">{t('users_auto_business')}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      {t('users_business_name')} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.business_name}
                      onChange={(e) => setFormData({ ...formData, business_name: e.target.value, create_new_business: true })}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                      placeholder={t('users_business_name_placeholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      {t('users_business_type')} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.business_type}
                      onChange={(e) => setFormData({ ...formData, business_type: e.target.value, create_new_business: true })}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                    >
                      <option value="">İşletme tipi seçin</option>
                      <option value="restaurant">🍽️ Restoran</option>
                      <option value="cafe">☕ Kafe</option>
                      <option value="patisserie">🍰 Pastane</option>
                      <option value="pizza">🍕 Pizza</option>
                      <option value="burger">🍔 Burger</option>
                      <option value="bakery">🥖 Fırın</option>
                      <option value="bar">🍺 Bar</option>
                      <option value="fastfood">🍟 Fast Food</option>
                      <option value="icecream">🍦 Dondurma</option>
                      <option value="other">📋 Diğer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Ekran Sayısı <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.max_screens}
                      onChange={(e) => setFormData({ ...formData, max_screens: e.target.value })}
                      required
                      className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base"
                    >
                      <option value="">Ekran sayısı seçin</option>
                      <option value="0">0 Ekran</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <option key={num} value={num.toString()}>
                          {num} Ekran
                        </option>
                      ))}
                      <option value="unlimited">Sınırsız</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold text-sm sm:text-base shadow-md hover:shadow-lg"
              >
                {creating ? t('users_creating') : t('users_create_new')}
              </button>
            </form>
          </div>
        )}

        {/* Admin kullanıcılar - ayrı bölüm (yetki: view_admin_list) */}
        {adminUsers.length > 0 && canViewAdminList && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Admin kullanıcılar</h3>
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('reports_reference_number')}</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('users_email')}</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('users_role')}</th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">{t('users_actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {adminUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={`transition-colors ${canViewDetail ? 'hover:bg-slate-50/80 cursor-pointer' : ''}`}
                        onClick={() => canViewDetail && router.push(localePath(`/users/${user.id}`))}
                      >
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-700">{user.reference_number ?? '—'}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.email}</td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'super_admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'}`}>
                            {user.role === 'super_admin' ? t('users_role_super_admin') : 'Admin'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                          {user.role !== 'super_admin' && canViewDetail && (
                            <Link href={localePath(`/users/${user.id}`)} className="px-3 py-1.5 text-xs sm:text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors font-medium">
                              {t('btn_edit')}
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {adminUsers.map((user) => (
                  <div key={user.id} className={`p-4 ${canViewDetail ? 'active:bg-slate-50 cursor-pointer' : ''}`} onClick={() => canViewDetail && router.push(localePath(`/users/${user.id}`))}>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate flex-1">{user.email}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${user.role === 'super_admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-800'}`}>
                        {user.role === 'super_admin' ? t('users_role_super_admin') : 'Admin'}
                      </span>
                    </div>
                    {user.reference_number && (
                      <p className="text-xs text-slate-500 mt-1 font-mono">{t('reports_reference_number')}: {user.reference_number}</p>
                    )}
                    {user.role !== 'super_admin' && canViewDetail && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <Link href={localePath(`/users/${user.id}`)} className="inline-block px-2.5 py-1.5 text-xs text-purple-700 bg-purple-50 rounded-lg font-medium">
                          {t('btn_edit')}
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* İşletme kullanıcıları (yetki: view_business_list / view_list) */}
        {canViewBusinessList && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 overflow-x-hidden">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 px-4 pt-4">{t('users_management')} – İşletme kullanıcıları</h3>
          {/* Desktop table - hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_email')}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_role')}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_business_name')}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_package')}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    Template
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_status')}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider">
                    {t('users_actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {businessUsers.map((user) => (
                  <tr 
                    key={user.id} 
                    className={`transition-colors ${canViewDetail ? 'hover:bg-gray-50 cursor-pointer' : ''}`}
                    onClick={() => canViewDetail && router.push(localePath(`/users/${user.id}`))}
                  >
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-slate-200 text-slate-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role === 'super_admin' ? t('users_role_super_admin') : user.role === 'admin' ? 'Admin' : t('users_role_user')}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {user.business_name || '-'}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {user.plan_name ? (
                        <span className="font-medium">
                          {user.plan_name} <span className="text-gray-700">({user.plan_max_screens === -1 ? 'Sınırsız' : user.plan_max_screens} ekran)</span>
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {user.template_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm">
                      {user.business_id ? (
                        user.business_is_active === false ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Pasif
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Aktif
                          </span>
                        )
                      ) : user.subscription_status ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.subscription_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.subscription_status === 'active' ? 'Aktif' : 'Pasif'}
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          -
                        </span>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-wrap gap-2">
                        {user.role !== 'super_admin' && canViewDetail && (
                          <Link
                            href={localePath(`/users/${user.id}`)}
                            className="px-3 py-1.5 text-xs sm:text-sm text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors font-medium"
                          >
                            {t('btn_edit')}
                          </Link>
                        )}
                        {user.role !== 'super_admin' && user.business_id && (canToggleActive || canPlanChange) && (
                          <>
                            {canToggleActive && (
                              <button
                                onClick={() => handleToggleActive(user)}
                                className="px-3 py-1.5 text-xs sm:text-sm text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium"
                              >
                                {user.business_is_active === false ? 'Aktif Et' : 'Pasif Yap'}
                              </button>
                            )}
                            {canPlanChange && user.business_id && (
                              <button
                                onClick={() => openPlanChangeModal(user)}
                                className="px-3 py-1.5 text-xs sm:text-sm text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors font-medium"
                              >
                                Paket Değiştir
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards - visible only on mobile (business users only) */}
          <div className="md:hidden divide-y divide-gray-100">
            {businessUsers.map((user) => (
              <div
                key={user.id}
                className={`p-4 ${canViewDetail ? 'active:bg-gray-50 cursor-pointer' : ''}`}
                onClick={() => canViewDetail && router.push(localePath(`/users/${user.id}`))}
              >
                <div className="flex justify-between items-start gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900 truncate flex-1 min-w-0">{user.email}</span>
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    user.business_is_active === false ? 'bg-red-100 text-red-800' :
                    user.business_is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.business_is_active === false ? 'Pasif' : user.business_is_active ? 'Aktif' : '-'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 mb-2 truncate">{user.business_name || '-'}</div>
                <div className="flex flex-wrap gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {user.role !== 'super_admin' && canViewDetail && (
                    <Link
                      href={localePath(`/users/${user.id}`)}
                      className="px-2.5 py-1.5 text-xs text-purple-700 bg-purple-50 rounded-lg font-medium min-h-[36px] flex items-center"
                    >
                      {t('btn_edit')}
                    </Link>
                  )}
                  {user.role !== 'super_admin' && user.business_id && (canToggleActive || canPlanChange) && (
                    <>
                      {canToggleActive && (
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg font-medium min-h-[36px]"
                        >
                          {user.business_is_active === false ? 'Aktif Et' : 'Pasif Yap'}
                        </button>
                      )}
                      {canPlanChange && (
                        <button
                          onClick={() => openPlanChangeModal(user)}
                          className="px-2.5 py-1.5 text-xs text-green-700 bg-green-50 rounded-lg font-medium min-h-[36px]"
                        >
                          Paket Değiştir
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {canViewBusinessList && businessUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-700 mb-4">{t('users_empty')}</p>
          </div>
        )}

        {/* Paket Değiştir Modal */}
        {planChangeModal?.open && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={(e) => e.target === e.currentTarget && closePlanChangeModal()}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Paket Değiştir</h3>
                <p className="text-sm text-gray-500 mt-1">{planChangeModal.userEmail}</p>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <p className="text-sm font-medium text-gray-700 mb-3">Yeni plan seçin:</p>
                <div className="space-y-2">
                  {/* 0 ekran - Paketi durdur (manuel) */}
                  <button
                    type="button"
                    onClick={() => setSelectedPlanId('__zero__')}
                    className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                      selectedPlanId === '__zero__'
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span className="font-medium">0 ekran (Paketi durdur)</span>
                  </button>
                  {[...plans]
                    .filter((p: any) => p.max_screens !== 0)
                    .sort((a, b) => {
                      const ma = a.max_screens === -1 ? 999 : a.max_screens;
                      const mb = b.max_screens === -1 ? 999 : b.max_screens;
                      return ma - mb;
                    })
                    .map((plan) => {
                    const isSelected = selectedPlanId === plan.id;
                    const isCurrent = plan.id === planChangeModal.currentPlanId;
                    const max = plan.max_screens;
                    const label =
                      max === -1 ? 'Sınırsız ekran'
                      : max === 0 ? '0 ekran'
                      : max === 1 ? '1 ekran'
                      : `1-${max} ekran`;
                    return (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlanId(plan.id)}
                        disabled={isCurrent}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : isCurrent
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-900'
                        }`}
                      >
                        <span className="font-medium">{plan.display_name}</span>
                        <span className="text-sm text-gray-500 ml-2">({label})</span>
                        {isCurrent && <span className="text-xs text-gray-400 ml-2">(mevcut)</span>}
                      </button>
                    );
                  })}
                </div>
                {selectedPlanId && (selectedPlanId === '__zero__' || selectedPlanId !== planChangeModal.currentPlanId) && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Süre (başlangıç = bugün, bitiş otomatik)</label>
                    <select
                      value={planChangePeriodMonths}
                      onChange={(e) => setPlanChangePeriodMonths(Number(e.target.value))}
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value={1}>1 ay</option>
                      <option value={3}>3 ay</option>
                      <option value={6}>6 ay</option>
                      <option value={12}>12 ay (1 yıl)</option>
                      <option value={24}>24 ay (2 yıl)</option>
                      <option value={36}>36 ay (3 yıl)</option>
                    </select>
                    {(() => {
                      const start = new Date();
                      const end = new Date();
                      end.setMonth(end.getMonth() + planChangePeriodMonths);
                      return (
                        <p className="text-xs text-gray-500 mt-1.5">
                          Başlangıç: {start.toLocaleDateString('tr-TR')} — Bitiş: {end.toLocaleDateString('tr-TR')}
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={closePlanChangeModal}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPlanChange}
                  disabled={!selectedPlanId || (selectedPlanId !== '__zero__' && selectedPlanId === planChangeModal.currentPlanId) || planChangeSaving}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {planChangeSaving ? 'Kaydediliyor...' : 'Tamam'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Kullanıcı Oluştur (Super Admin) Modal */}
        {showAdminCreateModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={(e) => e.target === e.currentTarget && setShowAdminCreateModal(false)}
          >
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Super Admin – Admin Kullanıcı Oluştur</h3>
              <p className="text-sm text-gray-500 mb-4">Oluşturulan kullanıcı admin sayfalarına yetkileriyle erişebilir.</p>
              {adminError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm">{adminError}</div>
              )}
              <form onSubmit={handleCreateAdmin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Kullanıcı adı (e-posta) <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      required
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="admin@ornek.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">Şifre <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      required
                      minLength={6}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                      placeholder="En az 6 karakter"
                    />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAdminCreateModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-medium"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={creatingAdmin}
                    className="flex-1 px-4 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-800 font-medium disabled:opacity-50"
                  >
                    {creatingAdmin ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
