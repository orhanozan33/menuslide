'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { useConfirm } from '@/lib/ConfirmContext';
import { FRAME_OPTIONS } from '@/components/display/DisplayFrame';
import { TICKER_STYLES, TICKER_SYMBOLS } from '@/components/display/TickerTape';

interface Screen {
  id: string;
  name: string;
  location: string;
  public_token: string;
  public_slug?: string;
  is_active: boolean;
  created_at: string;
  frame_type?: string;
  ticker_text?: string;
  ticker_style?: string;
  /** Son 2 dakikada bu ekran linkini açan benzersiz cihaz sayısı (heartbeat) */
  active_viewer_count?: number;
  templateRotations?: Array<{
    id: string;
    template_id: string;
    display_duration: number;
    display_order: number;
    template: {
      id: string;
      name: string;
      description?: string;
      block_count: number;
    };
  }>;
}

interface User {
  id: string;
  email: string;
  role: string;
  business_id?: string;
  business_name?: string;
}

interface Template {
  id: string;
  name: string;
  display_name: string;
  description?: string;
  block_count: number;
}

interface SelectedTemplate {
  template_id: string;
  display_duration: number;
}

export default function ScreensPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const { confirm } = useConfirm();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [autoCreating, setAutoCreating] = useState(false);
  const [hasCheckedAutoCreate, setHasCheckedAutoCreate] = useState(false);
  
  // Template publish modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplates, setSelectedTemplates] = useState<SelectedTemplate[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [publishFrameType, setPublishFrameType] = useState<string>('none');
  const [publishTickerText, setPublishTickerText] = useState<string>('');
  const [publishTickerStyle, setPublishTickerStyle] = useState<string>('default');
  const [fixingNames, setFixingNames] = useState(false);
  const [subscriptionActive, setSubscriptionActive] = useState(true);
  
  // Ref to store checkAndCreateScreens function to avoid circular dependency
  const checkAndCreateScreensRef = useRef<((currentScreens?: Screen[]) => Promise<void>) | null>(null);
  // Ref for loadScreens so selectedUserId effect doesn't depend on loadScreens (avoids re-run loop / freeze)
  const loadScreensRef = useRef<((skipAutoCreate?: boolean, overrideSelectedUserId?: string) => Promise<void>) | null>(null);

  const loadUsers = async () => {
    try {
      const data = await apiClient('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadCurrentUserInfo = async (userId: string) => {
    try {
      // Tüm kullanıcıları al ve kendi kullanıcımızı bul
      const users = await apiClient('/users');
      const currentUser = Array.isArray(users) ? users.find((u: any) => u.id === userId) : null;
      return currentUser || null;
    } catch (err) {
      console.error('Error loading current user info:', err);
      return null;
    }
  };

  const searchParams = useSearchParams();
  const userIdFromUrl = searchParams?.get('user_id') ?? '';

  const loadScreens = useCallback(async (skipAutoCreate = false, overrideSelectedUserId?: string) => {
    try {
      const isAdmin = userRole === 'super_admin' || userRole === 'admin';
      const effectiveSelectedUserId = overrideSelectedUserId !== undefined ? overrideSelectedUserId : (userIdFromUrl || selectedUserId);
      const businessIdFromUrl = searchParams?.get('business_id');

      if (isAdmin && !effectiveSelectedUserId && !businessIdFromUrl) {
        setScreens([]);
        setLoading(false);
        return;
      }

      let userIdParam = '';
      if (businessIdFromUrl) {
        try {
          const users = await apiClient('/users');
          const userWithBusiness = Array.isArray(users)
            ? users.find((u: any) => u.business_id === businessIdFromUrl)
            : null;
          if (userWithBusiness) {
            userIdParam = `?user_id=${encodeURIComponent(userWithBusiness.id)}`;
          }
        } catch (err) {
          console.error('Error finding user by business_id:', err);
        }
      } else if (isAdmin && effectiveSelectedUserId) {
        userIdParam = `?user_id=${encodeURIComponent(effectiveSelectedUserId)}`;
      }

      const data = await apiClient(`/screens${userIdParam}`);
      const screensList = data && typeof data === 'object' && 'screens' in data
        ? (data as { screens: Screen[] }).screens
        : (Array.isArray(data) ? data : []) as Screen[];
      const subActive = data && typeof data === 'object' && 'subscription_active' in data
        ? (data as { subscription_active?: boolean }).subscription_active !== false
        : true;
      setSubscriptionActive(subActive);

      // Her ekran için template rotation'ları yükle
      const screensWithRotations = await Promise.all(
        screensList.map(async (screen: Screen) => {
          try {
            const rotations = await apiClient(`/screens/${screen.id}/template-rotations`);
            return {
              ...screen,
              templateRotations: Array.isArray(rotations) ? rotations : [],
            };
          } catch (error) {
            console.error(`Error loading template rotations for screen ${screen.id}:`, error);
            return {
              ...screen,
              templateRotations: [],
            };
          }
        })
      );
      
      setScreens(screensWithRotations);
      
      // Normal kullanıcılar için otomatik ekran oluşturmayı kontrol et (sadece bir kez)
      // Auto-create kontrolü ayrı bir useEffect'te yapılıyor, burada sadece flag'i set et
      if (!skipAutoCreate && !hasCheckedAutoCreate && currentUser && currentUser.business_id && !selectedUserId && (userRole !== 'super_admin' && userRole !== 'admin')) {
        // Auto-create check will be triggered by useEffect
      }
    } catch (error) {
      console.error('Error loading screens:', error);
    } finally {
      setLoading(false);
    }
  }, [userRole, selectedUserId, userIdFromUrl, hasCheckedAutoCreate, currentUser]);

  // Ref'i güncelle ki selectedUserId değiştiğinde doğru loadScreens çağrılabilsin
  loadScreensRef.current = loadScreens;

  useEffect(() => {
    // Kullanıcı rolünü yükle
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role);
        
        // Kullanıcı bilgilerini API'den yeniden yükle (business_id ve plan bilgileri için)
        loadCurrentUserInfo(user.id).then((userData) => {
          if (userData) {
            setCurrentUser(userData);
            loadScreens();
          } else {
            setCurrentUser(user);
            loadScreens();
          }
        });
        
        // Admin ise kullanıcı listesini yükle
        if (user.role === 'super_admin' || user.role === 'admin') {
          loadUsers();
        }
      } catch (e) {
        console.error('Error parsing user:', e);
        loadScreens();
      }
    } else {
      loadScreens();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const createMissingScreens = useCallback(async (currentScreenCount: number, maxScreens: number, existingScreens?: Screen[]) => {
    setAutoCreating(true);
    const screensToCreate = maxScreens - currentScreenCount;

    // Mevcut ekran isimlerindeki en yüksek TV numarasını bul (TV1,TV2,TV3 -> 3; yoksa 0)
    const maxNum = (existingScreens ?? []).reduce((max, s) => {
      const m = s.name.match(/^TV(\d+)$/i);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    let nextNumber = maxNum + 1;
    
    for (let i = 0; i < screensToCreate; i++) {
      const screenName = `TV${nextNumber + i}`;
      
      try {
        await apiClient('/screens', {
          method: 'POST',
          body: JSON.stringify({
            business_id: currentUser?.business_id,
            name: screenName,
            location: '',
            is_active: true,
          }),
        });
      } catch (err: any) {
        console.error(`Error creating screen ${screenName}:`, err);
        toast.showError(`${t('screens_create_failed')}: ${err.message || ''}`);
      }
    }
    
    // Ekranları yeniden yükle (otomatik oluşturma kontrolünü atla)
    const userIdParam = (userRole === 'super_admin' || userRole === 'admin') && selectedUserId
      ? `?user_id=${selectedUserId}`
      : '';
    
    try {
      const data = await apiClient(`/screens${userIdParam}`);
      const screensWithRotations = await Promise.all(
        (Array.isArray(data) ? data : []).map(async (screen: Screen) => {
          try {
            const rotations = await apiClient(`/screens/${screen.id}/template-rotations`);
            return {
              ...screen,
              templateRotations: Array.isArray(rotations) ? rotations : [],
            };
          } catch (error) {
            return {
              ...screen,
              templateRotations: [],
            };
          }
        })
      );
      setScreens(screensWithRotations);
    } catch (error) {
      console.error('Error reloading screens:', error);
    }
    
    setAutoCreating(false);
  }, [currentUser, userRole, selectedUserId]);

  const checkAndCreateScreens = useCallback(async (currentScreens?: Screen[]) => {
    // Sadece normal kullanıcılar için otomatik ekran oluştur (admin değilse)
    if (!currentUser || !currentUser.business_id || (userRole === 'super_admin' || userRole === 'admin')) {
      return;
    }

    if (autoCreating) {
      return; // Zaten oluşturma işlemi devam ediyorsa bekle
    }

    try {
      // Önce kullanıcının plan bilgisini direkt users endpoint'inden al (daha güvenilir)
      let maxScreens = null;
      try {
        const users = await apiClient('/users');
        const userData = Array.isArray(users) 
          ? users.find((u: any) => u.id === currentUser.id) 
          : null;
        
        if (userData && userData.plan_max_screens) {
          maxScreens = userData.plan_max_screens;
        }
      } catch (err) {
        console.error('Error fetching user data:', err);
      }
      
      // Eğer user data'dan bulamadıysak subscription'dan dene (sadece aktif abonelik için)
      if (!maxScreens) {
        const subscription = await apiClient(`/subscriptions/business/${currentUser.business_id}`).catch((err) => {
          console.error('Error fetching subscription:', err);
          return null;
        });
        
        // Paketi yok veya abonelik iptal/süresi dolmuş ise ekran oluşturma
        if (subscription && subscription.status === 'active') {
          if (subscription.plans && subscription.plans.max_screens) {
            maxScreens = subscription.plans.max_screens;
          } else if (subscription.plan_max_screens) {
            maxScreens = subscription.plan_max_screens;
          } else if (subscription.max_screens) {
            maxScreens = subscription.max_screens;
          }
        }
      }
      
      // maxScreens yok veya 0 ise (paket yok) otomatik ekran oluşturma
      if (!maxScreens || maxScreens === 0) {
        return;
      }

      if (maxScreens === -1) {
        return; // Sınırsız ise otomatik oluşturma
      }

      const currentScreenCount = currentScreens ? currentScreens.length : screens.length;
      
      // Eksik ekranları oluştur (numara mevcut en yüksek TV'den devam eder)
      if (currentScreenCount < maxScreens) {
        const existingList = currentScreens ?? screens;
        await createMissingScreens(currentScreenCount, maxScreens, existingList);
      }
    } catch (error) {
      console.error('❌ Error checking/creating screens:', error);
      setAutoCreating(false);
    }
  }, [currentUser, userRole, autoCreating, screens.length, createMissingScreens]);

  // Store function in ref
  checkAndCreateScreensRef.current = checkAndCreateScreens;

  useEffect(() => {
    if (userIdFromUrl && selectedUserId !== userIdFromUrl) {
      setSelectedUserId(userIdFromUrl);
    }
  }, [userIdFromUrl]);

  useEffect(() => {
    setHasCheckedAutoCreate(false);
    // Seçilen kullanıcıyı açıkça geçir; böylece her zaman doğru user_id ile istek atılır
    loadScreensRef.current?.(false, selectedUserId || userIdFromUrl);
  }, [selectedUserId, userIdFromUrl]);

  useEffect(() => {
    // currentUser güncellendiğinde ve ekranlar yüklendiyse otomatik ekran oluşturmayı kontrol et
    if (currentUser && currentUser.business_id && screens.length >= 0 && !loading && !hasCheckedAutoCreate && !selectedUserId && (userRole !== 'super_admin' && userRole !== 'admin')) {
      setHasCheckedAutoCreate(true);
      setTimeout(() => {
        if (checkAndCreateScreensRef.current) {
          checkAndCreateScreensRef.current(screens);
        }
      }, 1000);
    }
  }, [currentUser?.business_id, screens.length, loading, hasCheckedAutoCreate, selectedUserId, userRole]);

  const handleDelete = async (id: string) => {
    const ok = await confirm({ title: 'Ekranı Sil', message: t('screens_confirm_delete') || '', variant: 'danger', confirmLabel: t('users_yes_delete') || 'Sil' });
    if (!ok) return;

    try {
      await apiClient(`/screens/${id}`, { method: 'DELETE' });
      await loadScreens();
    } catch (error) {
      console.error('Error deleting screen:', error);
      toast.showError(t('screens_delete_failed'));
    }
  };

  const copyPublicUrl = (screen: Screen) => {
    const slug = (screen as any).public_slug || screen.public_token;
    const url = `${window.location.origin}/display/${slug}`;
    navigator.clipboard.writeText(url);
    toast.showSuccess(t('screens_url_copied'));
  };

  const loadTemplates = async () => {
    try {
      // Sadece kullanıcının "Benim Şablonlarım" şablonları
      const userRes = await apiClient('/templates/scope/user').catch(() => []);
      const templatesArray = Array.isArray(userRes) ? userRes : [];
      setTemplates(templatesArray);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handlePublishClick = async (screen: Screen) => {
    setSelectedScreenId(screen.id);
    await loadTemplates();
    const current =
      screen.templateRotations?.map((r) => ({
        template_id: r.template_id,
        display_duration: r.display_duration ?? 5,
      })) ?? [];
    setSelectedTemplates(current);
    setPublishFrameType(screen.frame_type || 'none');
    setPublishTickerText(screen.ticker_text || '');
    setPublishTickerStyle(screen.ticker_style || 'default');
    setShowPublishModal(true);
  };

  const handleStopPublishing = async (screenId: string) => {
    const ok = await confirm({ title: 'Yayını Durdur', message: t('screens_stop_confirm') || '', variant: 'default', confirmLabel: t('btn_ok') || 'Tamam' });
    if (!ok) return;

    try {
      await apiClient(`/screens/${screenId}/stop-publishing`, {
        method: 'POST',
      });
      toast.showSuccess(t('screens_stopped'));
      await loadScreens();
    } catch (error: any) {
      console.error('Error stopping publishing:', error);
      toast.showError(t('screens_stop_failed') + ': ' + (error.message || ''));
    }
  };

  const handleTemplateToggle = (templateId: string) => {
    setSelectedTemplates((prev) => {
      const exists = prev.find((t) => t.template_id === templateId);
      if (exists) {
        return prev.filter((t) => t.template_id !== templateId);
      } else {
        return [...prev, { template_id: templateId, display_duration: 5 }];
      }
    });
  };

  const handleDurationChange = (templateId: string, duration: number) => {
    setSelectedTemplates((prev) =>
      prev.map((t) =>
        t.template_id === templateId ? { ...t, display_duration: duration } : t
      )
    );
  };

  const handlePublish = async () => {
    if (selectedTemplates.length === 0) {
      toast.showWarning(t('screens_select_template'));
      return;
    }

    if (!selectedScreenId) return;

    try {
      setPublishing(true);
      await apiClient(`/screens/${selectedScreenId}/publish-templates`, {
        method: 'POST',
        body: JSON.stringify({
          templates: selectedTemplates,
          frame_type: publishFrameType,
          ticker_text: publishTickerText,
          ticker_style: publishTickerStyle,
        }),
      });
      toast.showSuccess(t('screens_published_success'));
      setShowPublishModal(false);
      setSelectedTemplates([]);
      setSelectedScreenId(null);
      await loadScreens();
    } catch (error: any) {
      console.error('Error publishing templates:', error);
      toast.showError(t('screens_publish_failed') + ': ' + (error.message || ''));
    } finally {
      setPublishing(false);
    }
  };

  if (loading || autoCreating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-xl font-medium text-white mb-2">
            {autoCreating ? t('screens_creating') : t('dashboard_loading')}
          </div>
          {autoCreating && (
            <div className="text-sm text-gray-400">
              {t('screens_auto_create')}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('screens_title')}</h2>
          <div className="flex flex-wrap items-center gap-2">
            {/* Süper admin: tüm kullanıcıların TV isimlerini TV1, TV2, TV3... düzelt */}
            {userRole === 'super_admin' && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({ title: 'TV İsimlerini Düzelt', message: t('screens_fix_confirm_all') || '', variant: 'default' });
                  if (!ok) return;
                  setFixingNames(true);
                  try {
                    const result = await apiClient('/screens/fix-names', { method: 'POST' });
                    const total = Array.isArray(result) ? result.reduce((s: number, r: any) => s + (r.updated || 0), 0) : 0;
                    toast.showInfo(total > 0 ? `${total} ${t('screens_fix_updated')}` : t('screens_no_update'));
                    loadScreensRef.current?.();
                  } catch (e: any) {
                    toast.showError(e.message || t('screens_fix_failed'));
                  } finally {
                    setFixingNames(false);
                  }
                }}
                disabled={fixingNames}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors font-medium text-sm sm:text-base shadow-md"
              >
                {fixingNames ? t('screens_fixing') : t('screens_fix_names')}
              </button>
            )}
            {/* Seçili kullanıcının (örn. Emir) TV isimlerini düzelt */}
            {(userRole === 'super_admin' || userRole === 'admin') && selectedUserId && users.find((u) => u.id === selectedUserId)?.business_id && (
              <button
                type="button"
                onClick={async () => {
                  const businessId = users.find((u) => u.id === selectedUserId)?.business_id;
                  if (!businessId) return;
                  const ok = await confirm({ title: 'TV İsimlerini Düzelt', message: t('screens_fix_confirm_user') || '', variant: 'default' });
                  if (!ok) return;
                  setFixingNames(true);
                  try {
                    const result = await apiClient('/screens/fix-names', {
                      method: 'POST',
                      body: JSON.stringify({ business_id: businessId }),
                    });
                    const updated = (result as any)?.updated ?? 0;
                    toast.showInfo(updated > 0 ? `${updated} ${t('screens_fix_updated')}` : t('screens_no_update'));
                    loadScreensRef.current?.();
                  } catch (e: any) {
                    toast.showError(e.message || t('screens_fix_failed'));
                  } finally {
                    setFixingNames(false);
                  }
                }}
                disabled={fixingNames}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors font-medium text-sm sm:text-base shadow-md"
              >
                {fixingNames ? t('screens_fixing') : t('screens_fix_names_this')}
              </button>
            )}
            {(userRole === 'super_admin' || userRole === 'admin') && (
              <Link
                href={localePath(selectedUserId ? `/screens/new?business_id=${users.find((u) => u.id === selectedUserId)?.business_id || ''}` : '/screens/new')}
                className="px-4 sm:px-6 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base shadow-md hover:shadow-lg"
              >
                {t('screens_new')}
              </Link>
            )}
          </div>
        </div>

        {/* Admin için kullanıcı seçimi */}
        {(userRole === 'super_admin' || userRole === 'admin') && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              👤 {t('screens_user_filter')}
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">{t('screens_select_user')}</option>
              {users
                .filter((user) => user.business_id || user.role === 'super_admin')
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.business_name ? `${user.business_name} - ${user.email}` : user.email}
                  </option>
                ))}
            </select>
            <p className="text-xs text-gray-600 mt-2">
              {selectedUserId 
                ? t('screens_user_filter_showing')
                : t('screens_user_filter_hint')}
            </p>
          </div>
        )}

        {/* Abonelik süresi dolmuş uyarısı - yayın kilitli */}
        {!subscriptionActive && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border-2 border-amber-200">
            <p className="text-amber-800 font-semibold flex items-center gap-2">
              <span className="text-xl">🔒</span>
              {t('screens_subscription_expired')}
            </p>
            <p className="text-sm text-amber-700 mt-1">{t('screens_subscription_expired_desc')}</p>
          </div>
        )}

        {/* Admin: kullanıcı seçilmeden ekran listesi gösterilmez */}
        {(userRole === 'super_admin' || userRole === 'admin') && !selectedUserId ? (
          <div className="py-12 text-center bg-white rounded-xl border border-gray-100 shadow-md">
            <p className="text-gray-600 mb-2">{t('screens_select_hint')}</p>
            <p className="text-sm text-gray-500">{t('screens_select_hint')}</p>
          </div>
        ) : (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {screens.map((screen) => (
            <div key={screen.id} className="bg-white p-5 sm:p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100">
              <h3 className="text-lg sm:text-xl font-bold mb-2 text-gray-900">{screen.name}</h3>
              <p className="text-sm sm:text-base text-gray-700 mb-4">{screen.location || t('screens_location_unknown')}</p>
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs sm:text-sm text-gray-600 mb-2 font-medium">{t('screens_public_url')}</p>
                <div className="flex items-center gap-2 min-w-0">
                  <input
                    type="text"
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/display/${screen.public_slug || screen.public_token}`}
                    readOnly
                    className="flex-1 min-w-0 px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 rounded-lg bg-white text-black font-mono truncate"
                  />
                  <button
                    onClick={() => copyPublicUrl(screen)}
                    className="px-3 sm:px-4 py-1.5 text-xs sm:text-sm bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium whitespace-nowrap"
                  >
                    {t('btn_copy')}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs sm:text-sm mb-4 flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${screen.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {screen.is_active ? t('menus_active') : t('menus_inactive')}
                </span>
                {typeof (screen as any).active_viewer_count === 'number' && (screen as any).active_viewer_count >= 1 && (
                  <span className="text-gray-600">
                    {t('screens_viewers_open', { count: (screen as any).active_viewer_count })}
                  </span>
                )}
              </div>
              {(screen as any).active_viewer_count > 1 && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs sm:text-sm text-amber-800 font-medium">{t('screens_same_link_multiple_devices')}</p>
                </div>
              )}
              
              {/* Yayınlanan Template'ler */}
              {screen.templateRotations && screen.templateRotations.length > 0 && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-900 mb-2">📺 {t('screens_published')}</p>
                  <div className="space-y-1">
                    {screen.templateRotations.map((rotation, index) => (
                      <div key={rotation.id} className="text-xs text-blue-800 flex items-center justify-between">
                        <span className="font-medium">
                          {index + 1}. {rotation.template?.name ?? (rotation.template as any)?.display_name ?? 'Template'}
                        </span>
                        <span className="text-blue-600 font-medium">
                          {rotation.display_duration}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {(!screen.templateRotations || screen.templateRotations.length === 0) && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">{t('screens_no_published')}</p>
                </div>
              )}
              
              {/* Durdur ve Yayınla butonları - abonelik yoksa Yayınla kilitli */}
              <div className="flex space-x-2 mb-2">
                <button
                  onClick={() => handleStopPublishing(screen.id)}
                  disabled={!screen.is_active}
                  className="flex-1 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('screens_stop')}
                </button>
                <button
                  onClick={() => subscriptionActive && handlePublishClick(screen)}
                  disabled={!subscriptionActive}
                  title={!subscriptionActive ? t('screens_subscription_expired') : undefined}
                  className={`flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base font-medium ${
                    subscriptionActive
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {screen.templateRotations && screen.templateRotations.length > 0
                    ? t('screens_edit_publish')
                    : t('screens_publish')}
                </button>
              </div>

              {/* Yönet ve Sil butonları sadece admin/super_admin için görünür */}
              {(userRole === 'super_admin' || userRole === 'admin') && (
                <div className="flex space-x-2">
                  <Link
                    href={localePath(`/screens/${screen.id}`)}
                    className="flex-1 text-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    {t('screens_manage')}
                  </Link>
                  <button
                    onClick={() => handleDelete(screen.id)}
                    className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                  >
                    {t('btn_delete')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {screens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-700 mb-4">{t('screens_empty')}</p>
            {/* Sadece admin/super_admin için ekran oluşturma butonu göster */}
            {(userRole === 'super_admin' || userRole === 'admin') && (
              <Link
                href={localePath(selectedUserId ? `/screens/new?business_id=${users.find((u) => u.id === selectedUserId)?.business_id || ''}` : '/screens/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('screens_create_btn')}
              </Link>
            )}
          </div>
        )}
        </>
        )}

      {/* Template Yayınlama Modalı */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">{t('screens_publish_modal_title')}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('screens_publish_modal_desc')}
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Frame & Ticker */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('screens_frame_type')}</label>
                  <select
                    value={publishFrameType}
                    onChange={(e) => setPublishFrameType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  >
                    {FRAME_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('screens_ticker_text')}</label>
                  <input
                    type="text"
                    value={publishTickerText}
                    onChange={(e) => setPublishTickerText(e.target.value)}
                    placeholder={t('screens_ticker_placeholder')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 mb-2"
                  />
                  <div className="flex flex-wrap gap-1 mb-2">
                    {TICKER_SYMBOLS.map((s) => (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => setPublishTickerText((prev) => (prev || '') + s.symbol)}
                        className="px-2 py-1 text-lg rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
                        title={s.label}
                      >
                        {s.symbol}
                      </button>
                    ))}
                  </div>
                  <label className="block text-xs text-gray-500 mb-1">{t('screens_ticker_style')}</label>
                  <select
                    value={publishTickerStyle}
                    onChange={(e) => setPublishTickerStyle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                  >
                    {TICKER_STYLES.map((opt) => (
                      <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">{t('screens_no_templates')}</p>
                  <Link
                    href={localePath('/templates/new')}
                    className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {t('templates_new')}
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {templates.map((template) => {
                    const isSelected = selectedTemplates.some((t) => t.template_id === template.id);
                    const selectedTemplate = selectedTemplates.find((t) => t.template_id === template.id);

                    return (
                      <div
                        key={template.id}
                        className={`border-2 rounded-lg p-4 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleTemplateToggle(template.id)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                              />
                              <div>
                                <h3 className="font-bold text-gray-900">{template.display_name}</h3>
                                {template.description && (
                                  <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                                )}
                                <p className="text-xs text-gray-500 mt-1">
                                  {template.block_count} {t('screens_blocks')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-4 pl-8">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              {t('screens_display_duration')}
                            </label>
                            <input
                              type="number"
                              min="1"
                              value={selectedTemplate?.display_duration || 5}
                              onChange={(e) =>
                                handleDurationChange(template.id, parseInt(e.target.value) || 5)
                              }
                              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPublishModal(false);
                  setSelectedTemplates([]);
                  setSelectedScreenId(null);
                  setPublishFrameType('none');
                  setPublishTickerText('');
                  setPublishTickerStyle('default');
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handlePublish}
                disabled={selectedTemplates.length === 0 || publishing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishing ? t('btn_loading') : t('screens_publish')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
