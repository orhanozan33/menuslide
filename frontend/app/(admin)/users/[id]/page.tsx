'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAdminPagePermissions } from '@/lib/useAdminPagePermissions';
import { useToast } from '@/lib/ToastContext';

interface User {
  id: string;
  email: string;
  role: string;
  business_id: string | null;
  business_name: string | null;
  subscription_status: string | null;
  plan_name: string | null;
  plan_max_screens: number | null;
  reference_number?: string | null;
  admin_permissions?: Record<string, Record<string, boolean>>;
}

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const userId = (params?.id ?? '') as string;

  const [user, setUser] = useState<User | null>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [error, setError] = useState('');
  const [userStats, setUserStats] = useState({
    menus: 0,
    screens: 0,
    templates: 0,
  });

  const [sectionOpen, setSectionOpen] = useState({ templates: true, menus: true, screens: true });
  const [formOpen, setFormOpen] = useState(false);
  const [kullaniciYonetLoading, setKullaniciYonetLoading] = useState(false);
  const [permissions, setPermissions] = useState<{ pages: Record<string, Record<string, boolean>> }>({ pages: {} });
  const [selectedPermissionPage, setSelectedPermissionPage] = useState<string>('users');
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [activityLog, setActivityLog] = useState<{ id: string; action_type: string; page_key: string; resource_type?: string; resource_id?: string; details?: Record<string, unknown>; created_at: string }[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const { can, isSuper } = useAdminPagePermissions('users');
  const canEditUser = isSuper || (user?.role === 'business_user' && can('user_edit'));
  const canDeleteUser = isSuper || (user?.role === 'business_user' && can('user_delete'));

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    business_id: '',
    business_name: '',
    plan_id: '',
    max_screens: '',
    is_active: true,
  });

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadActivity = async () => {
    if (!userId || (user?.role !== 'admin' && user?.role !== 'super_admin')) return;
    setActivityLoading(true);
    try {
      const to = new Date();
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
        user_id: userId,
      });
      const data = await apiClient(`/reports/activity?${params.toString()}`);
      setActivityLog(Array.isArray(data) ? data : []);
    } catch {
      setActivityLog([]);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'super_admin') {
      loadActivity();
    }
  }, [userId, user?.role]);

  const loadData = async () => {
    try {
      const [userData, businessesData, plansData] = await Promise.all([
        apiClient(`/users/${userId}`),
        apiClient('/businesses'),
        apiClient('/plans'),
      ]);

      setUser(userData);
      setBusinesses(businessesData || []);
      setPlans(plansData || []);
      if (userData?.role === 'admin' && userData.admin_permissions) {
        const raw = userData.admin_permissions as Record<string, Record<string, boolean>>;
        setPermissions({ pages: { ...raw } });
      } else if (userData?.role === 'admin') {
        setPermissions({ pages: {} });
      }

      // Get business to check active status
      let businessIsActive = true;
      if (userData.business_id) {
        try {
          const business = await apiClient(`/businesses/${userData.business_id}`);
          businessIsActive = business.is_active ?? true;
        } catch {
          // Business not found or error
        }
      }

      setFormData({
        email: userData.email || '',
        password: '', // Don't pre-fill password
        business_id: userData.business_id || '',
        business_name: userData.business_name || '',
        plan_id: '', // Will be set from subscription
        max_screens: '',
        is_active: businessIsActive,
      });

      // Get current plan from subscription or from userData
      if (userData.business_id) {
        // First try to get from userData (already loaded)
        if (userData.plan_name) {
          const plan = plansData.find((p: any) => p.name === userData.plan_name || p.display_name === userData.plan_name);
          if (plan) {
            setFormData(prev => ({ 
              ...prev, 
              plan_id: plan.id,
              max_screens: plan.max_screens === -1 ? 'unlimited' : plan.max_screens.toString()
            }));
          }
        } else {
          // Fallback: try subscription endpoint
          try {
            const subscription = await apiClient(`/subscriptions/business/${userData.business_id}`);
            if (subscription && subscription.plan_id) {
              const plan = plansData.find((p: any) => p.id === subscription.plan_id);
              if (plan) {
                setFormData(prev => ({ 
                  ...prev, 
                  plan_id: subscription.plan_id,
                  max_screens: plan.max_screens === -1 ? 'unlimited' : plan.max_screens.toString()
                }));
              }
            }
          } catch (err) {
            // No subscription found - that's okay
          }
        }
      }

      // İstatistikler: düzenlenen kullanıcının verileri (user_id ile; admin kendi verisi değil)
      try {
          const uid = typeof userId === 'string' ? encodeURIComponent(userId) : '';
          const [menusData, screensData, templatesData] = await Promise.all([
            apiClient(`/menus?user_id=${uid}`).catch(() => ({ menus: [] })),
            apiClient(`/screens?user_id=${uid}`).catch(() => []),
            apiClient(`/templates?user_id=${uid}`).catch(() => []),
          ]);

          const menus = Array.isArray(menusData) ? menusData : (menusData.menus || []);
          const screens = Array.isArray(screensData) ? screensData : [];
          const templates = Array.isArray(templatesData) ? templatesData : (templatesData?.templates ?? []);

          setUserStats({
            menus: menus.length || 0,
            screens: screens.length || 0,
            templates: templates.length || 0,
          });
        } catch (statsError) {
          console.error('Error loading user stats:', statsError);
        }
    } catch (error: any) {
      console.error('Error loading data:', error);
      setError(error.message || 'Veri yüklenemedi');
      if (error.message?.includes('Only super admins')) {
        router.push('/dashboard');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updateData: any = {};

      // Only update fields that have changed
      if (formData.email !== user?.email) {
        updateData.email = formData.email;
      }

      if (formData.password && formData.password.length >= 6) {
        // Password will be hashed on backend
        updateData.password = formData.password;
      }

      if (formData.business_id !== user?.business_id) {
        updateData.business_id = formData.business_id || null;
      }

      // Update business name if provided and business_id exists
      if (formData.business_name && formData.business_id) {
        updateData.business_name = formData.business_name;
      }

      // Update plan based on max_screens if business_id exists
      if (formData.max_screens !== '' && formData.max_screens !== undefined && formData.business_id) {
        const maxScreensValue = formData.max_screens === 'unlimited' ? -1 : parseInt(formData.max_screens, 10);
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
            setSaving(false);
            return;
          }
        }
        
        if (selectedPlan) {
          updateData.plan_id = selectedPlan.id;
        }
      } else if (formData.max_screens && !formData.business_id) {
        setError('Ekran sayısı seçmek için işletme seçilmelidir');
        setSaving(false);
        return;
      }

      // Update active status
      if (formData.business_id) {
        updateData.is_active = formData.is_active;
      }

      await apiClient(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      toast.showSuccess(t('users_update_success'));
      router.push(localePath('/users'));
    } catch (err: any) {
      console.error('Update user error:', err);
      setError(err.message || 'Kullanıcı güncellenemedi');
    } finally {
      setSaving(false);
    }
  };

  const handleKullaniciYonet = async () => {
    setKullaniciYonetLoading(true);
    try {
      const data = await apiClient('/auth/impersonate', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId }),
      });
      if (!data?.token || !data?.user) {
        toast.showError('Kullanıcı adına giriş yapılamadı');
        return;
      }
      const win = window.open(localePath('/as-user'), '_blank', 'width=1400,height=900');
      if (!win) {
        toast.showError('Pencere açılamadı. Pop-up engelleyicisini kapatıp tekrar deneyin.');
        return;
      }
      (window as any).__pendingImpersonate = { token: data.token, user: data.user };
      const handler = (e: MessageEvent) => {
        if (e.data?.type === 'as-user-ready' && e.origin === window.location.origin && (window as any).__pendingImpersonate) {
          const { token, user } = (window as any).__pendingImpersonate;
          delete (window as any).__pendingImpersonate;
          win.postMessage({ type: 'impersonate', token, user }, window.location.origin);
          window.removeEventListener('message', handler);
        }
      };
      window.addEventListener('message', handler);
      setTimeout(() => {
        if ((window as any).__pendingImpersonate) {
          delete (window as any).__pendingImpersonate;
          window.removeEventListener('message', handler);
        }
      }, 10000);
    } catch (err: any) {
      toast.showError(err.message || 'Kullanıcı adına giriş yapılamadı');
    } finally {
      setKullaniciYonetLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');

    try {
      await apiClient(`/users/${userId}`, {
        method: 'DELETE',
      });

      toast.showSuccess(t('users_delete_success'));
      setShowDeleteModal(false);
      router.push(localePath('/users'));
    } catch (err: any) {
      console.error('Delete user error:', err);
      setError(err.message || 'Kullanıcı silinemedi');
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  const togglePerm = (page: string, action: string) => {
    setPermissions((p) => ({
      ...p,
      pages: {
        ...p.pages,
        [page]: {
          ...(p.pages[page] || {}),
          [action]: !(p.pages[page]?.[action] ?? false),
        },
      },
    }));
  };

  const handleSaveAdminPermissions = async () => {
    if (user?.role !== 'admin') return;
    setSavingPermissions(true);
    setError('');
    try {
      const payload: Record<string, Record<string, boolean>> = {};
      ADMIN_PAGE_OPTIONS.forEach(({ key }) => {
        const defaults = Object.fromEntries((PAGE_ACTIONS[key] || []).map((a) => [a.key, false]));
        payload[key] = { ...defaults, ...permissions.pages[key] };
      });
      await apiClient(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ admin_permissions: payload }),
      });
      if (user) setUser({ ...user, admin_permissions: payload });
      setShowPermissionsModal(false);
      toast.showSuccess('Yetkiler kaydedildi.');
    } catch (err: any) {
      setError(err.message || 'Yetkiler kaydedilemedi.');
    } finally {
      setSavingPermissions(false);
    }
  };

  /** Solda sidebar ile aynı sıra ve isimler (titleKey ile çeviri) */
  const ADMIN_PAGE_OPTIONS: { key: string; titleKey: string }[] = [
    { key: 'dashboard', titleKey: 'sidebar_dashboard' },
    { key: 'menus', titleKey: 'sidebar_menus' },
    { key: 'screens', titleKey: 'sidebar_screens' },
    { key: 'templates', titleKey: 'sidebar_templates' },
    { key: 'editor', titleKey: 'sidebar_editor' },
    { key: 'library', titleKey: 'sidebar_library' },
    { key: 'user-uploads', titleKey: 'sidebar_uploads' },
    { key: 'pricing', titleKey: 'sidebar_pricing' },
    { key: 'reports', titleKey: 'sidebar_reports' },
    { key: 'registration_requests', titleKey: 'sidebar_registration_requests' },
    { key: 'users', titleKey: 'sidebar_users' },
    { key: 'stripe', titleKey: 'sidebar_stripe' },
    { key: 'settings', titleKey: 'sidebar_settings' },
  ];

  /** Sayfa bazlı detaylı yetkiler: super adminin yapabildiği her şey – yapabilir/yapamaz, görüntüleyebilir/görüntüleyemez */
  const PAGE_ACTIONS: Record<string, { key: string; label: string }[]> = {
    dashboard: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_stats', label: 'Özet istatistikleri görüntüleyebilir' },
    ],
    users: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_business_list', label: 'İşletme kullanıcıları tablosunu görüntüleyebilir' },
      { key: 'view_admin_list', label: 'Admin kullanıcılar tablosunu görüntüleyebilir' },
      { key: 'view_detail', label: 'Kullanıcı detayını görüntüleyebilir' },
      { key: 'user_create', label: 'İşletme kullanıcısı oluşturabilir' },
      { key: 'admin_create', label: 'Admin kullanıcı oluşturabilir' },
      { key: 'user_edit', label: 'Kullanıcı düzenleyebilir' },
      { key: 'user_delete', label: 'Kullanıcı silebilir' },
      { key: 'plan_change', label: 'Paket değiştirebilir' },
      { key: 'toggle_active', label: 'Kullanıcıyı aktif/pasif yapabilir' },
    ],
    reports: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_dashboard', label: 'Üyelik / İşletme özeti bölümünü görüntüleyebilir' },
      { key: 'view_revenue', label: 'Gelir özeti bölümünü görüntüleyebilir' },
      { key: 'view_activity', label: 'Admin hareketleri bölümünü görüntüleyebilir' },
      { key: 'view_members', label: 'Tüm üyeler listesini görüntüleyebilir' },
      { key: 'view_payments', label: 'Ödeme durumu bölümünü görüntüleyebilir' },
    ],
    library: [
      { key: 'view', label: 'İçerik kütüphanesini görüntüleyebilir' },
      { key: 'image_add', label: 'Resim ekleyebilir' },
      { key: 'image_edit', label: 'Resim düzenleyebilir' },
      { key: 'image_delete', label: 'Resim silebilir' },
      { key: 'category_create', label: 'Kategori oluşturabilir' },
      { key: 'category_edit', label: 'Kategori düzenleyebilir' },
      { key: 'category_delete', label: 'Kategori silebilir' },
      { key: 'content_upload', label: 'İçerik yükleyebilir' },
      { key: 'duplicate_remove', label: 'Çift kayıt temizleyebilir' },
    ],
    screens: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_list', label: 'Ekran listesini görüntüleyebilir' },
      { key: 'view_detail', label: 'Ekran detayını görüntüleyebilir' },
      { key: 'screen_create', label: 'Ekran oluşturabilir' },
      { key: 'screen_edit', label: 'Ekran düzenleyebilir' },
      { key: 'screen_delete', label: 'Ekran silebilir' },
    ],
    templates: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_list', label: 'Şablon listesini görüntüleyebilir' },
      { key: 'view_detail', label: 'Şablon detayını görüntüleyebilir' },
      { key: 'template_create', label: 'Şablon oluşturabilir' },
      { key: 'template_edit', label: 'Şablon düzenleyebilir' },
      { key: 'template_delete', label: 'Şablon silebilir' },
      { key: 'template_duplicate', label: 'Şablon kopyalayabilir' },
      { key: 'template_use_editor', label: 'Şablonu editörde kullanabilir' },
      { key: 'block_add', label: 'Blok ekleyebilir' },
      { key: 'block_remove', label: 'Blok kaldırabilir' },
      { key: 'block_edit', label: 'Blok düzenleyebilir' },
      { key: 'template_save', label: 'Şablon kaydedebilir' },
    ],
    editor: [
      { key: 'view', label: 'Tasarım editörünü görüntüleyebilir' },
      { key: 'open_template', label: 'Şablon açabilir' },
      { key: 'edit_design', label: 'Tasarım düzenleyebilir' },
      { key: 'save_template', label: 'Şablon kaydedebilir' },
      { key: 'add_block', label: 'Blok ekleyebilir' },
      { key: 'remove_block', label: 'Blok kaldırabilir' },
    ],
    menus: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_list', label: 'Menü listesini görüntüleyebilir' },
      { key: 'view_detail', label: 'Menü detayını görüntüleyebilir' },
      { key: 'menu_create', label: 'Menü oluşturabilir' },
      { key: 'menu_edit', label: 'Menü düzenleyebilir' },
      { key: 'menu_delete', label: 'Menü silebilir' },
      { key: 'menu_item_add', label: 'Menü öğesi ekleyebilir' },
      { key: 'menu_item_edit', label: 'Menü öğesi düzenleyebilir' },
      { key: 'menu_item_delete', label: 'Menü öğesi silebilir' },
    ],
    registration_requests: [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_list', label: 'Kayıt taleplerini görüntüleyebilir' },
      { key: 'approve', label: 'Talep onaylayabilir' },
      { key: 'reject', label: 'Talep reddedebilir' },
    ],
    'user-uploads': [
      { key: 'view', label: 'Sayfayı görüntüleyebilir (sidebar)' },
      { key: 'view_list', label: 'Yükleme listesini görüntüleyebilir' },
      { key: 'approve', label: 'Yükleme onaylayabilir' },
    ],
    pricing: [
      { key: 'view', label: 'Faturalandırma sayfasını görüntüleyebilir' },
      { key: 'view_plans', label: 'Planları görüntüleyebilir' },
    ],
    settings: [
      { key: 'view', label: 'Ayarları görüntüleyebilir' },
      { key: 'edit_pricing', label: 'Fiyatlandırma (planları) düzenleyebilir' },
      { key: 'view_stripe', label: 'Stripe durumunu görüntüleyebilir' },
      { key: 'edit_stripe', label: 'Stripe ayarlarını yapılandırabilir' },
      { key: 'edit_channels', label: 'Ana sayfa kanallarını düzenleyebilir' },
      { key: 'edit_contact', label: 'İletişim bilgilerini (e-posta, telefon, adres) düzenleyebilir' },
      { key: 'edit_whatsapp', label: 'WhatsApp numarasını düzenleyebilir' },
    ],
    stripe: [
      { key: 'view', label: 'Ödeme ayarlarını görüntüleyebilir' },
      { key: 'edit_prices', label: 'Fiyat / plan düzenleyebilir' },
    ],
  };

  /** Sayfa özellikleri: her sayfada hangi özellikler var, her özellikte hangi işlemler seçilebilir (alanları görüntüleme, düzenleme vb.) */
  const PAGE_FEATURES: Record<string, { label: string; actions: { key: string; label: string }[] }[]> = {
    users: [
      { label: 'İşletme kullanıcıları tablosu', actions: [{ key: 'view_business_list', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Admin kullanıcılar tablosu', actions: [{ key: 'view_admin_list', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Kullanıcı detayı', actions: [{ key: 'view_detail', label: 'Alanları görüntüleyebilir' }, { key: 'user_edit', label: 'Düzenleyebilir' }] },
      { label: 'İşletme kullanıcısı oluşturma', actions: [{ key: 'user_create', label: 'Oluşturabilir' }] },
      { label: 'Admin kullanıcı oluşturma', actions: [{ key: 'admin_create', label: 'Oluşturabilir' }] },
      { label: 'Kullanıcı silme', actions: [{ key: 'user_delete', label: 'Silebilir' }] },
      { label: 'Paket değiştirme', actions: [{ key: 'plan_change', label: 'Paket değiştirebilir' }] },
      { label: 'Kullanıcı aktif/pasif', actions: [{ key: 'toggle_active', label: 'Aktif/pasif yapabilir' }] },
    ],
    library: [
      { label: 'Kütüphane listesi', actions: [{ key: 'view', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Resim ekleme/düzenleme', actions: [{ key: 'image_add', label: 'Ekleyebilir' }, { key: 'image_edit', label: 'Düzenleyebilir' }, { key: 'image_delete', label: 'Silebilir' }] },
      { label: 'Kategori işlemleri', actions: [{ key: 'category_create', label: 'Oluşturabilir' }, { key: 'category_edit', label: 'Düzenleyebilir' }, { key: 'category_delete', label: 'Silebilir' }] },
      { label: 'İçerik yükleme', actions: [{ key: 'content_upload', label: 'Yükleyebilir' }] },
      { label: 'Çift kayıt', actions: [{ key: 'duplicate_remove', label: 'Temizleyebilir' }] },
    ],
    screens: [
      { label: 'Ekran listesi', actions: [{ key: 'view_list', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Ekran detayı', actions: [{ key: 'view_detail', label: 'Alanları görüntüleyebilir' }, { key: 'screen_edit', label: 'Düzenleyebilir' }] },
      { label: 'Ekran oluşturma/silme', actions: [{ key: 'screen_create', label: 'Oluşturabilir' }, { key: 'screen_delete', label: 'Silebilir' }] },
    ],
    templates: [
      { label: 'Şablon listesi', actions: [{ key: 'view_list', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Şablon detayı ve editör', actions: [{ key: 'view_detail', label: 'Alanları görüntüleyebilir' }, { key: 'template_edit', label: 'Düzenleyebilir' }, { key: 'template_save', label: 'Kaydedebilir' }, { key: 'template_use_editor', label: 'Editörde kullanabilir' }] },
      { label: 'Şablon oluşturma/kopyalama/silme', actions: [{ key: 'template_create', label: 'Oluşturabilir' }, { key: 'template_duplicate', label: 'Kopyalayabilir' }, { key: 'template_delete', label: 'Silebilir' }] },
      { label: 'Blok işlemleri', actions: [{ key: 'block_add', label: 'Blok ekleyebilir' }, { key: 'block_edit', label: 'Blok düzenleyebilir' }, { key: 'block_remove', label: 'Blok kaldırabilir' }] },
    ],
    menus: [
      { label: 'Menü listesi', actions: [{ key: 'view_list', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Menü detayı', actions: [{ key: 'view_detail', label: 'Alanları görüntüleyebilir' }, { key: 'menu_edit', label: 'Düzenleyebilir' }, { key: 'menu_delete', label: 'Silebilir' }] },
      { label: 'Menü oluşturma', actions: [{ key: 'menu_create', label: 'Oluşturabilir' }] },
      { label: 'Menü öğesi işlemleri', actions: [{ key: 'menu_item_add', label: 'Öğe ekleyebilir' }, { key: 'menu_item_edit', label: 'Öğe düzenleyebilir' }, { key: 'menu_item_delete', label: 'Öğe silebilir' }] },
    ],
    reports: [
      { label: 'Rapor panosu', actions: [{ key: 'view_dashboard', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Gelir raporları', actions: [{ key: 'view_revenue', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Hareket raporu', actions: [{ key: 'view_activity', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Üye listesi', actions: [{ key: 'view_members', label: 'Alanları görüntüleyebilir' }] },
      { label: 'Ödeme durumu', actions: [{ key: 'view_payments', label: 'Alanları görüntüleyebilir' }] },
    ],
    settings: [
      { label: 'Fiyatlandırma (planlar)', actions: [{ key: 'edit_pricing', label: 'Düzenleyebilir' }] },
      { label: 'Stripe', actions: [{ key: 'view_stripe', label: 'Durumu görüntüleyebilir' }, { key: 'edit_stripe', label: 'Yapılandırabilir' }] },
      { label: 'Ana sayfa kanalları', actions: [{ key: 'edit_channels', label: 'Düzenleyebilir' }] },
      { label: 'İletişim bilgileri', actions: [{ key: 'edit_contact', label: 'Düzenleyebilir' }] },
      { label: 'WhatsApp', actions: [{ key: 'edit_whatsapp', label: 'Düzenleyebilir' }] },
    ],
  };

  const ACTIVITY_PAGE_LABELS: Record<string, string> = {
    editor: 'Editör', library: 'İçerik Kütüphanesi', menus: 'Menüler', templates: 'Şablonlar', screens: 'Ekranlar',
    users: 'Kullanıcılar', reports: 'Raporlar', registration_requests: 'Kayıt Talepleri', 'user-uploads': 'Yüklemeler', settings: 'Ayarlar', stripe: 'Ödeme Ayarları',
  };
  const ACTIVITY_ACTION_LABELS: Record<string, string> = {
    template_save: 'Şablon kaydedildi', template_create: 'Şablon oluşturuldu', template_delete: 'Şablon silindi',
    image_add: 'Resim eklendi', image_edit: 'Resim düzenlendi', block_add: 'Blok eklendi', block_remove: 'Blok kaldırıldı',
    menu_create: 'Menü oluşturuldu', menu_update: 'Menü güncellendi', menu_item_add: 'Menü öğesi eklendi', menu_item_edit: 'Menü öğesi düzenlendi', menu_item_delete: 'Menü öğesi silindi',
    screen_create: 'Ekran oluşturuldu', screen_update: 'Ekran güncellendi', library_select: 'Kütüphaneden içerik seçildi', library_upload: 'Kütüphaneye yükleme',
    user_create: 'Kullanıcı oluşturuldu', user_edit: 'Kullanıcı düzenlendi',
  };
  const formatActivityDate = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('users_not_found')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto min-w-0 overflow-x-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('users_edit_title')}</h2>
            <p className="text-sm text-gray-600 mt-1">{user.email}</p>
            {(user.role === 'admin' || user.role === 'super_admin') && user.reference_number && (
              <p className="text-sm text-slate-500 mt-0.5 font-mono">{t('reports_reference_number')}: {user.reference_number}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleKullaniciYonet}
              disabled={kullaniciYonetLoading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              title="Kullanıcının gördüğü sayfayı birebir yeni pencerede aç"
            >
              <span>👤</span>
              {kullaniciYonetLoading ? t('users_manage_opening') : t('users_manage')}
            </button>
            <Link
              href="/users"
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Geri Dön
            </Link>
          </div>
        </div>

        {/* User Stats - sadece işletme kullanıcıları için (admin detayda 0'lar gösterilmez) */}
        {(user.role === 'business_user') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Menüler</h3>
              <p className="text-3xl font-bold text-blue-600">{userStats.menus}</p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Ekranlar (mevcut)</h3>
              <p className="text-3xl font-bold text-green-600">{userStats.screens}</p>
              {user.plan_max_screens != null && user.plan_max_screens !== -1 && (
                <p className="text-xs text-gray-500 mt-1">Plan limiti: {user.plan_max_screens} ekran</p>
              )}
              {formData.business_id && (
                <Link
                  href={localePath(`/screens?user_id=${userId}`)}
                  className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  Ekran ata / yönet →
                </Link>
              )}
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 mb-2">Template'ler</h3>
              <p className="text-3xl font-bold text-purple-600">{userStats.templates}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setFormOpen((o) => !o)}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
          >
            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{t('users_edit_info')}</h3>
            {user.role === 'business_user' && !canEditUser && (
              <span className="text-xs text-gray-500 font-normal">(Sadece görüntüleme)</span>
            )}
            <span className="text-gray-500 transition-transform" style={{ transform: formOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </span>
          </button>
          {formOpen && (
          <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  E-posta <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!canEditUser}
                  className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base disabled:opacity-60 disabled:bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Yeni Şifre <span className="text-gray-500 text-xs font-normal">(Değiştirmek için)</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  disabled={!canEditUser}
                  className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base disabled:opacity-60 disabled:bg-gray-50"
                  placeholder="Boş bırakılırsa değişmez"
                />
                <p className="text-xs text-gray-500 mt-1">En az 6 karakter (boş bırakılabilir)</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  İşletme
                </label>
                <div className="px-3 sm:px-4 py-2.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-900 text-sm sm:text-base">
                  {formData.business_name || businesses.find(b => b.id === formData.business_id)?.name || 'İşletme atanmamış'}
                </div>
              </div>

              {formData.business_id && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    {t('users_firm_name')}
                  </label>
                  <input
                    type="text"
                    value={formData.business_name}
                    onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                    disabled={!canEditUser}
                    className="w-full px-3 sm:px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base disabled:opacity-60 disabled:bg-gray-50"
                    placeholder="Firma ismini girin"
                  />
                </div>
              )}

              {formData.business_id && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Ekran Sayısı (plan limiti)
                  </label>
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={formData.max_screens === 'unlimited' ? '' : (formData.max_screens || '')}
                      onChange={(e) => {
                        const v = e.target.value;
                        setFormData({ ...formData, max_screens: v || '' });
                      }}
                      placeholder="0-99"
                      disabled={!canEditUser}
                      className="w-24 px-3 py-2.5 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white text-sm sm:text-base disabled:opacity-60 disabled:bg-gray-50"
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.max_screens === 'unlimited'}
                        onChange={(e) => setFormData({ ...formData, max_screens: e.target.checked ? 'unlimited' : '' })}
                        disabled={!canEditUser}
                        className="rounded"
                      />
                      <span className="text-sm text-gray-700">Sınırsız</span>
                    </label>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Plan limiti (0-99 veya sınırsız). Ekran atamak için <Link href={localePath(`/screens?user_id=${userId}`)} className="text-blue-600 hover:underline font-medium">Ekranlar</Link> sayfasına gidin.</p>
                </div>
              )}
            </div>

            {formData.business_id && (
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    disabled={!canEditUser}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">İşletme Aktif</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">İşletmenin aktif/pasif durumunu kontrol eder</p>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              {canEditUser && (
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-semibold text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  {saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                </button>
              )}
              <Link
                href={localePath('/users')}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm sm:text-base"
              >
                {t('btn_cancel')}
              </Link>
              {user.role !== 'super_admin' && canDeleteUser && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold text-sm sm:text-base shadow-md hover:shadow-lg"
                >
                  {t('users_delete')}
                </button>
              )}
            </div>
          </form>
          </div>
          )}
        </div>

        {/* Sayfa yetkileri - sadece super_admin, hedef kullanıcı admin ise */}
        {user?.role === 'admin' && isSuper && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowPermissionsModal(true)}
              className="px-5 py-2.5 bg-slate-700 text-white rounded-xl hover:bg-slate-800 font-medium shadow-md transition-colors"
            >
              Sayfa yetkileri
            </button>
          </div>
        )}

        {/* Admin hareketleri - admin/super_admin kullanıcı için son 30 gün */}
        {(user?.role === 'admin' || user?.role === 'super_admin') && (
          <div className="mt-6 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Admin hareketleri</h3>
              <p className="text-sm text-gray-500 mt-1">Bu kullanıcının yaptığı işlemler (son 30 gün).</p>
            </div>
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              {activityLoading ? (
                <div className="p-8 text-center text-gray-500 text-sm">Yükleniyor...</div>
              ) : activityLog.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-sm">Kayıtlı hareket yok.</div>
              ) : (
                <table className="w-full text-sm min-w-[520px]">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Tarih / Saat</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Sayfa</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">İşlem</th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600">Detay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activityLog.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2 text-gray-600 whitespace-nowrap">{formatActivityDate(row.created_at)}</td>
                        <td className="px-4 py-2 text-gray-700">{ACTIVITY_PAGE_LABELS[row.page_key] ?? row.page_key}</td>
                        <td className="px-4 py-2 text-gray-700">{ACTIVITY_ACTION_LABELS[row.action_type] ?? row.action_type}</td>
                        <td className="px-4 py-2 text-gray-500 text-xs max-w-[200px] truncate" title={row.details ? JSON.stringify(row.details) : ''}>
                          {row.details?.name ? String(row.details.name) : row.resource_type ? `${row.resource_type}${row.resource_id ? ` #${String(row.resource_id).slice(0, 8)}` : ''}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {user.role === 'super_admin' && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Not:</strong> Süper admin kullanıcıları düzenlenemez ve silinemez.
            </p>
          </div>
        )}

        {/* User Management Sections - sadece işletme kullanıcıları için (admin'de gösterilmez) */}
        {user.role === 'business_user' && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Templates Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setSectionOpen((s) => ({ ...s, templates: !s.templates }))}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Template'ler</h3>
              <span className="text-gray-500 transition-transform" style={{ transform: sectionOpen.templates ? 'rotate(180deg)' : 'rotate(0)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            {sectionOpen.templates && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4 mt-4">
                  Bu kullanıcının oluşturduğu template'leri görüntüleyin ve yönetin
                </p>
                <Link
                  href={localePath(`/templates?user_id=${userId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Tümünü Gör
                </Link>
              </div>
            )}
          </div>

          {/* Menus Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <button
              type="button"
              onClick={() => setSectionOpen((s) => ({ ...s, menus: !s.menus }))}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Menüler</h3>
              <span className="text-gray-500 transition-transform" style={{ transform: sectionOpen.menus ? 'rotate(180deg)' : 'rotate(0)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            {sectionOpen.menus && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4 mt-4">
                  Bu kullanıcının işletmesine ait menüleri görüntüleyin
                </p>
                {user.business_id ? (
                  <Link
                    href={localePath(`/menus?business_id=${user.business_id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Tümünü Gör
                  </Link>
                ) : (
                  <p className="text-sm text-gray-500">İşletme atanmamış</p>
                )}
              </div>
            )}
          </div>

          {/* Screens Section */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden lg:col-span-2">
            <button
              type="button"
              onClick={() => setSectionOpen((s) => ({ ...s, screens: !s.screens }))}
              className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">Ekranlar</h3>
              <span className="text-gray-500 transition-transform" style={{ transform: sectionOpen.screens ? 'rotate(180deg)' : 'rotate(0)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </span>
            </button>
            {sectionOpen.screens && (
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 border-t border-gray-100">
                <p className="text-sm text-gray-600 mb-4 mt-4">
                  Bu kullanıcının işletmesine ait ekranları görüntüleyin
                </p>
                {user.business_id ? (
                  <Link
                    href={localePath(`/screens?business_id=${user.business_id}`)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    Tümünü Gör
                  </Link>
                ) : (
                  <p className="text-sm text-gray-500">İşletme atanmamış</p>
                )}
              </div>
            )}
          </div>
        </div>
        )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('users_delete_confirm')}</h3>
              <p className="text-gray-700 dark:text-slate-300 mb-2">
                <strong>{user?.email}</strong> adlı kullanıcıyı silmek istediğinizden emin misiniz?
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 flex items-start gap-2 mb-4">
                <span>⚠</span>
                {t('users_delete_warning')}
              </p>
            {error && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-400 text-red-700 dark:text-red-300 rounded-xl text-sm">
                {error}
              </div>
            )}
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setError('');
                }}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {deleting ? t('users_deleting') : t('users_yes_delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alt Admin Yetkileri modalı: sayfa bazlı view / edit / delete vb. */}
      {showPermissionsModal && user?.role === 'admin' && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowPermissionsModal(false)}>
          <div className="bg-white w-full max-w-[720px] max-h-[85vh] overflow-hidden flex flex-col rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Alt Admin Yetkileri</h2>
              <p className="text-sm text-gray-500">Bu kullanıcı sistemde hangi sayfaları görebilir ve hangi işlemleri yapabilir?</p>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ADMIN_PAGE_OPTIONS.map(({ key: pageKey, titleKey }) => {
                const actions = PAGE_ACTIONS[pageKey] || [];
                const pageActions = permissions.pages[pageKey] || {};
                return (
                  <div key={pageKey} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                    <div className="font-semibold text-gray-900 mb-3">{t(titleKey)}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {actions.map(({ key: actionKey, label: actionLabel }) => (
                        <label key={actionKey} className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!pageActions[actionKey]}
                            onChange={() => togglePerm(pageKey, actionKey)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-700 focus:ring-slate-500"
                          />
                          {actionLabel}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            {error && <div className="px-6 pb-2 p-3 mx-6 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>}
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 flex-shrink-0">
              <button type="button" onClick={() => setShowPermissionsModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300">
                İptal
              </button>
              <button type="button" onClick={handleSaveAdminPermissions} disabled={savingPermissions} className="px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
                {savingPermissions ? 'Kaydediliyor...' : 'Yetkileri kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
