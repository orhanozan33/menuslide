'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';

interface Menu {
  id: string;
  name: string;
  description: string;
  slide_duration: number;
  is_active: boolean;
  created_at: string;
}

/** Replace Turkish "kopya" with "copy" when locale is English */
function localizeCopy(s: string, locale: string): string {
  if (locale !== 'en' || typeof s !== 'string') return s;
  return s.replace(/\bKopya\b/g, 'Copy').replace(/\bkopya\b/g, 'copy');
}

/** Show menu name/description in current locale when they match template-created pattern */
function getMenuDisplayText(
  name: string,
  description: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
  locale: string
): { displayName: string; displayDescription: string } {
  let displayName = name;
  if (typeof name === 'string') {
    if (name.endsWith(' Menüsü')) displayName = name.slice(0, -' Menüsü'.length) + ' ' + t('menus_suffix_menu');
    else if (name.endsWith(' Menu')) displayName = name.slice(0, -' Menu'.length) + ' ' + t('menus_suffix_menu');
  }
  let displayDescription = description || '';
  const descMatch =
    typeof description === 'string' &&
    (description.match(/^Template'ten otomatik oluşturulan menü:\s*(.+)$/) ||
      description.match(/^Menu auto-created from template:\s*(.+)$/) ||
      description.match(/^Menu créé automatiquement à partir du modèle\s*:\s*(.+)$/));
  if (descMatch && descMatch[1]) {
    displayDescription = t('menus_created_from_template_desc', { name: descMatch[1].trim() });
  }
  displayName = localizeCopy(displayName, locale);
  displayDescription = localizeCopy(displayDescription || t('menus_no_desc'), locale);
  return { displayName, displayDescription };
}

// QR Menu Section Component
function QrMenuSection({ businessId, t }: { businessId: string; t: (k: string) => string }) {
  const [qrMenu, setQrMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      loadQrMenu();
    }
  }, [businessId]);

  const loadQrMenu = async () => {
    try {
      const data = await apiClient(`/qr-menus/business/${businessId}`);
      setQrMenu(data);
    } catch (err) {
      console.error('❌ [QR MENU] Error loading QR menu:', err);
      setQrMenu(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrMenu?.qr_code_url) return;
    const link = document.createElement('a');
    link.href = qrMenu.qr_code_url;
    link.download = `qr-menu-${businessId}.png`;
    link.click();
  };

  if (loading) {
    return (
      <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-100">
        <div className="text-sm text-gray-600">{t('qr_loading_code')}</div>
      </div>
    );
  }

  if (!qrMenu?.qr_code_url) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
        <p className="text-sm text-yellow-800">
          {t('qr_code_failed')}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-100">
      <h3 className="text-base sm:text-lg font-bold mb-3 text-gray-900">📱 {t('qr_menu_code')}</h3>
      <p className="text-xs sm:text-sm text-gray-600 mb-3">
        {t('qr_menu_desc')}
      </p>
      <div className="flex flex-col gap-4">
        <div className="flex justify-center md:justify-start">
          <img
            src={qrMenu.qr_code_url}
            alt="QR Code"
            className="w-[134px] h-[134px] md:w-[157px] md:h-[157px] border border-gray-300 rounded p-1 bg-white"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm text-gray-700 mb-1.5 font-medium">{t('qr_menu_url')}</p>
          <input
            type="text"
            value={qrMenu.qr_code_data}
            readOnly
            className="w-full px-3 py-2 text-base border border-gray-300 rounded bg-gray-50 text-sm mb-3 text-black"
          />
          <div className="flex gap-2">
            <button
              onClick={downloadQR}
              className="w-14 h-14 flex items-center justify-center bg-green-600 text-white rounded-md hover:bg-green-700 active:bg-green-700 transition-colors shrink-0"
              title={t('qr_download')}
              aria-label={t('qr_download')}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <a
              href={qrMenu.qr_code_data}
              target="_blank"
              rel="noopener noreferrer"
              className="w-14 h-14 flex items-center justify-center bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-700 transition-colors shrink-0"
              title={t('btn_preview')}
              aria-label={t('btn_preview')}
            >
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

interface UserOption {
  id: string;
  email: string;
  business_id: string | null;
  business_name: string | null;
  role: string;
}

export default function MenusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, localePath, locale } = useTranslation();
  const toast = useToast();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        if (user.role === 'super_admin' || user.role === 'admin') {
          apiClient('/users').then((data: UserOption[]) => setUsers(data || [])).catch(() => {});
        } else if (user.business_id) {
          setBusinessId(user.business_id);
        }
      } catch (_) {}
    }
  }, []);

  useEffect(() => {
    const businessIdFromUrl = searchParams?.get('business_id');
    if (businessIdFromUrl) {
      setBusinessId(businessIdFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    loadMenus();
    const handleFocus = () => loadMenus();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedUserId, userRole]);


  const loadMenus = async () => {
    setLoading(true);
    try {
      const url = (userRole === 'super_admin' || userRole === 'admin') && selectedUserId
        ? `/menus?user_id=${selectedUserId}`
        : '/menus';
      const data = await apiClient(url);

      let menusArray: Menu[] = [];
      let businessIdFromMenus: string | null = null;

      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if (data.menus) menusArray = data.menus;
        if (data.business_id) businessIdFromMenus = data.business_id;
      } else if (Array.isArray(data)) {
        menusArray = data;
        if (data.length > 0 && data[0].business_id) businessIdFromMenus = data[0].business_id;
      }

      // Şablondan otomatik oluşturulan menüler listelenmesin
      const desc = (m: Menu) => (m.description || '').trim();
      menusArray = menusArray.filter(
        (m) =>
          !desc(m).startsWith('Menu auto-created from template:') &&
          !desc(m).startsWith("Template'ten otomatik oluşturulan menü:")
      );

      setMenus(menusArray);
      if (businessIdFromMenus) setBusinessId(businessIdFromMenus);
      else if (!selectedUserId) {
        const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
        if (userStr) {
          try {
            const u = JSON.parse(userStr);
            if (u.business_id) setBusinessId(u.business_id);
          } catch (_) {}
        }
      }
    } catch (error) {
      console.error('Error loading menus:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('menus_confirm_delete'))) return;

    try {
      await apiClient(`/menus/${id}`, { method: 'DELETE' });
      loadMenus();
    } catch (error) {
      console.error('Error deleting menu:', error);
      toast.showError(t('menus_delete_failed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('dashboard_loading')}</div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('menus_title')}</h2>
          <div className="flex flex-wrap items-center gap-3">
            {(userRole === 'super_admin' || userRole === 'admin') && (
              <div className="flex items-center gap-2">
                <label htmlFor="menu-user-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">
                  {t('menus_user_label')}
                </label>
                <select
                  id="menu-user-select"
                  value={selectedUserId}
                  onChange={(e) => {
                    setSelectedUserId(e.target.value);
                    setBusinessId(null);
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm min-w-[180px]"
                >
                  <option value="">{t('menus_select_user')}</option>
                  {users.filter(u => u.role !== 'super_admin').map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.business_name ? `${u.business_name} - ${u.email}` : u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <Link
              href={businessId ? localePath(`/menus/new?business_id=${businessId}`) : localePath('/menus/new')}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              {t('menus_new')}
            </Link>
          </div>
        </div>

        {/* QR Menu Section - seçili kullanıcının / kendi işletmenin */}
        <div className="mb-6">
          {businessId ? (
            <QrMenuSection businessId={businessId} t={t} />
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-medium">
                {t('qr_business_required')}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {menus.map((menu) => {
            const { displayName, displayDescription } = getMenuDisplayText(menu.name, menu.description, t, locale);
            return (
            <div key={menu.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-all">
              {/* Menu Title */}
              <h3 className="text-2xl font-bold mb-3 text-gray-900">{displayName}</h3>
              
              {/* Description */}
              <p className="text-sm text-gray-600 mb-4">{displayDescription}</p>
              
              {/* Slide Duration and Status */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                <span className="text-sm text-gray-700">
                  {t('menus_slide_duration')}: <span className="font-semibold text-gray-900">{menu.slide_duration}{t('menus_seconds_short')}</span>
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${menu.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {menu.is_active ? t('menus_active') : t('menus_inactive')}
                </span>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                <Link
                  href={localePath(`/menus/${menu.id}/edit`)}
                  className="flex-1 text-center px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs font-medium"
                >
                  {t('btn_edit')}
                </Link>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs font-medium"
                >
                  {t('btn_delete')}
                </button>
              </div>
            </div>
          );
          })}
        </div>

        {(userRole === 'super_admin' || userRole === 'admin') && !selectedUserId && (
          <div className="text-center py-12 md:py-16 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-base md:text-lg text-blue-800 font-medium">{t('menus_select_user_hint')}</p>
          </div>
        )}
        {menus.length === 0 && selectedUserId && (
          <div className="text-center py-12 md:py-16 bg-white rounded-lg shadow">
            <p className="text-base md:text-lg text-gray-700 mb-4 font-medium">{t('menus_empty_user')}</p>
          </div>
        )}
        {menus.length === 0 && !(userRole === 'super_admin' || userRole === 'admin') && (
          <div className="text-center py-8 md:py-12 bg-white rounded-lg shadow border border-gray-100">
            <p className="text-sm md:text-base text-gray-700 mb-4 font-medium">{t('menus_empty')}</p>
            <Link
              href={localePath('/menus/new')}
              className="inline-flex px-3 py-1.5 items-center justify-center bg-blue-600 text-white rounded-md active:bg-blue-700 transition-colors font-medium text-sm mx-auto"
            >
              {t('menus_new')}
            </Link>
          </div>
        )}
    </div>
  );
}
