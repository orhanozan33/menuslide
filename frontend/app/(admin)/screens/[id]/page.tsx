'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { FRAME_OPTIONS } from '@/components/display/DisplayFrame';
import { TICKER_STYLES, TICKER_SYMBOLS } from '@/components/display/TickerTape';
import { getDefaultStreamUrl } from '@/lib/stream-url';

// QR Menu Section Component
function QrMenuSection({ screenId, businessId }: { screenId: string; businessId: string }) {
  const { t } = useTranslation();
  const [qrMenu, setQrMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQrMenu();
  }, [screenId, businessId]);

  const loadQrMenu = async () => {
    try {
      // Get QR menu for business only (no screenId)
      const data = await apiClient(`/qr-menus/business/${businessId}`);
      setQrMenu(data);
    } catch (err) {
      console.error('Error loading QR menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrMenu?.qr_code_url) return;
    const link = document.createElement('a');
    link.href = qrMenu.qr_code_url;
    link.download = `qr-menu-${screenId}.png`;
    link.click();
  };

  if (loading) {
    return <div className="text-sm text-gray-600">{t('common_loading')}</div>;
  }

  return (
    <div className="space-y-3">
      {qrMenu?.qr_code_url && (
        <div className="flex items-center gap-4">
          <img
            src={qrMenu.qr_code_url}
            alt="QR Code"
            className="w-32 h-32 border-2 border-gray-300 rounded-lg p-2 bg-white"
          />
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-2">QR Menü URL:</p>
            <input
              type="text"
              value={qrMenu.qr_code_data}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded bg-white text-sm mb-2 text-black"
            />
            <div className="flex gap-2">
              <button
                onClick={downloadQR}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-semibold"
              >
                📥 QR İndir
              </button>
              <a
                href={qrMenu.qr_code_data}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-semibold"
              >
                👁️ Önizle
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScreenDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const screenId = (params?.id ?? '') as string;

  const [screen, setScreen] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [allMenus, setAllMenus] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [savingDisplay, setSavingDisplay] = useState(false);
  const [editFrameType, setEditFrameType] = useState<string>('none');
  const [editTickerText, setEditTickerText] = useState<string>('');
  const [editTickerStyle, setEditTickerStyle] = useState<string>('default');
  const [editStreamUrl, setEditStreamUrl] = useState<string>('');
  const [regeneratingSlides, setRegeneratingSlides] = useState(false);

  useEffect(() => {
    loadScreen();
    loadScreenMenus();
    loadAllMenus();
  }, [screenId]);

  const loadScreen = async () => {
    try {
      const data = await apiClient(`/screens/${screenId}`);
      setScreen(data);
      setEditFrameType(data?.frame_type || 'none');
      setEditTickerText(data?.ticker_text || '');
      setEditTickerStyle(data?.ticker_style || 'default');
      const existingStreamUrl = data?.stream_url ? String(data.stream_url).trim() : '';
      setEditStreamUrl(existingStreamUrl || '');
      const slug = data?.public_slug || data?.public_token;
      if (!existingStreamUrl && slug) {
        const defaultStreamUrl = getDefaultStreamUrl(slug);
        try {
          await apiClient(`/screens/${screenId}`, {
            method: 'PATCH',
            body: JSON.stringify({ stream_url: defaultStreamUrl }),
          });
          setEditStreamUrl(defaultStreamUrl);
          setScreen((prev: any) => (prev ? { ...prev, stream_url: defaultStreamUrl } : prev));
        } catch (e) {
          console.error('Auto-set stream_url failed:', e);
        }
      }
    } catch (error) {
      console.error('Error loading screen:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveDisplaySettings = async () => {
    setSavingDisplay(true);
    try {
      await apiClient(`/screens/${screenId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          frame_type: editFrameType,
          ticker_text: editTickerText,
          ticker_style: editTickerStyle,
          stream_url: editStreamUrl,
        }),
      });
      setScreen((prev: any) => prev ? { ...prev, frame_type: editFrameType, ticker_text: editTickerText, ticker_style: editTickerStyle, stream_url: editStreamUrl } : prev);
      toast.showSuccess(t('screens_display_saved'));
    } catch (error: any) {
      console.error('Error saving display settings:', error);
      toast.showError(t('screens_display_save_failed') + ': ' + (error?.message || ''));
    } finally {
      setSavingDisplay(false);
    }
  };

  const loadScreenMenus = async () => {
    try {
      const data = await apiClient(`/screens/${screenId}/menus`);
      const list = Array.isArray(data) ? data : (data?.menus && Array.isArray(data.menus) ? data.menus : []);
      setMenus(list);
    } catch (error) {
      console.error('Error loading screen menus:', error);
      setMenus([]);
    }
  };

  const loadAllMenus = async () => {
    try {
      const data = await apiClient('/menus');
      const list = Array.isArray(data?.menus) ? data.menus : (Array.isArray(data) ? data : []);
      setAllMenus(list.filter((m: any) => m.is_active !== false));
    } catch (error) {
      console.error('Error loading menus:', error);
      setAllMenus([]);
    }
  };

  const handleAssignMenu = async (menuId: string) => {
    setAssigning(true);
    try {
      await apiClient(`/screens/${screenId}/assign-menu`, {
        method: 'POST',
        body: JSON.stringify({
          menu_id: menuId,
          display_order: (Array.isArray(menus) ? menus : []).length,
        }),
      });
      loadScreenMenus();
      toast.showSuccess(t('screens_menu_assigned'));
    } catch (error) {
      toast.showError(t('screens_menu_assign_failed'));
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveMenu = async (menuId: string) => {
    if (!confirm('Remove this menu from the screen?')) return;

    try {
      await apiClient(`/screens/${screenId}/menus/${menuId}`, {
        method: 'DELETE',
      });
      loadScreenMenus();
      toast.showSuccess(t('screens_menu_removed'));
    } catch (error) {
      toast.showError(t('screens_menu_remove_failed'));
    }
  };

  const copyPublicUrl = () => {
    if (screen?.public_slug || screen?.public_token) {
      const slug = screen.public_slug || screen.public_token;
      const url = `${window.location.origin}/display/${slug}`;
      navigator.clipboard.writeText(url);
      toast.showSuccess(t('screens_url_copied'));
    }
  };

  const copyBroadcastCode = () => {
    if (screen?.broadcast_code) {
      navigator.clipboard.writeText(String(screen.broadcast_code));
      toast.showSuccess(t('screens_broadcast_code_copied'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">Screen not found</div>
      </div>
    );
  }

  const menusList = Array.isArray(menus) ? menus : [];
  const assignedMenuIds = menusList.map((m: any) => m.menus?.id || m.menu_id);
  const availableMenus = Array.isArray(allMenus) ? allMenus.filter((m) => !assignedMenuIds.includes(m.id)) : [];

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <Link href={localePath('/screens')} className="text-blue-600 hover:underline">
            ← Back to Screens
          </Link>
          <div className="flex gap-2">
            <Link
              href={localePath(`/screens/${screenId}/template`)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              Template Yapılandır
            </Link>
            <Link
              href={localePath(`/screens/${screenId}/template-editor`)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
            >
              🎨 Drag & Drop Editor
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-2">{screen.name}</h2>
          <p className="text-gray-600 mb-4">{screen.location || 'No location specified'}</p>
          <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">🖼️ TV Görüntü Ayarları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Çerçeve</label>
                <select
                  value={editFrameType}
                  onChange={(e) => setEditFrameType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  {FRAME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alt Yazı Satırı</label>
                <input
                  type="text"
                  value={editTickerText}
                  onChange={(e) => setEditTickerText(e.target.value)}
                  placeholder="Örn: İletişim: +90 555 000 000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 mb-2"
                />
                <div className="flex flex-wrap gap-1 mb-2">
                  {TICKER_SYMBOLS.map((s) => (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setEditTickerText((prev) => (prev || '') + s.symbol)}
                      className="px-2 py-1 text-lg rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
                      title={s.label}
                    >
                      {s.symbol}
                    </button>
                  ))}
                </div>
                <label className="block text-xs text-gray-500 mb-1">{t('screens_ticker_style')}</label>
                <select
                  value={editTickerStyle}
                  onChange={(e) => setEditTickerStyle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                >
                  {TICKER_STYLES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{t(opt.labelKey)}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream URL (Android/Roku TV)</label>
                <input
                  type="url"
                  value={editStreamUrl}
                  onChange={(e) => setEditStreamUrl(e.target.value)}
                  placeholder="https://cdn.menuslide.com/stream.m3u8"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900 text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">HLS (.m3u8) veya MP4 URL. Boşsa bu ekran için otomatik tanımlanır ve kaydedilir.</p>
              </div>
            </div>
            <button
              onClick={saveDisplaySettings}
              disabled={savingDisplay}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
            >
              {savingDisplay ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">{t('screens_public_url')}</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/display/${screen.public_slug || screen.public_token}`}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-black"
              />
              <button
                onClick={copyPublicUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                {t('btn_copy')}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-0.5">{t('screens_visual_url')}</p>
            <p className="text-xs text-gray-500 mb-2">{t('screens_visual_url_desc')}</p>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/display/${screen.public_slug || screen.public_token}?mode=visual`}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-black"
              />
              <button
                onClick={() => {
                  const slug = screen?.public_slug || screen?.public_token;
                  if (slug) {
                    const url = `${window.location.origin}/display/${slug}?mode=visual`;
                    navigator.clipboard.writeText(url);
                    toast.showSuccess(t('screens_url_copied'));
                  }
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                {t('btn_copy')}
              </button>
            </div>
          </div>

          <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Roku / TV slide görselleri</h3>
            <p className="text-sm text-gray-600 mb-2">
              Ürün fiyatı veya şablon değiştiyse slide'ları yenileyin. Roku güncel görselleri gösterir.
            </p>
            <button
              type="button"
              onClick={async () => {
                setRegeneratingSlides(true);
                try {
                  const res = await apiClient(`/screens/${screenId}/generate-slides`, { method: 'POST' }) as { message?: string; generated?: number };
                  toast?.showSuccess?.(res?.message || `Slide'lar yenilendi`);
                  loadScreen();
                } catch (e) {
                  toast?.showError?.((e as Error)?.message || 'Slide yenileme başarısız');
                } finally {
                  setRegeneratingSlides(false);
                }
              }}
              disabled={regeneratingSlides}
              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 font-medium"
            >
              {regeneratingSlides ? 'Yenileniyor...' : "Slide'ları yenile"}
            </button>
          </div>

          <div className="mb-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('screens_broadcast_code_title')}</h3>
            <p className="text-sm text-gray-600 mb-2">{t('screens_broadcast_code_desc')}</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold text-gray-900 tracking-widest bg-white px-4 py-2 rounded border border-emerald-200">
                {screen.broadcast_code ?? '—'}
              </span>
              {screen.broadcast_code && (
                <button
                  type="button"
                  onClick={copyBroadcastCode}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                >
                  {t('screens_broadcast_code_copy')}
                </button>
              )}
            </div>
          </div>

          {/* QR Menu Section */}
          <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📱 QR Menü</h3>
            <p className="text-sm text-gray-600 mb-3">
              Müşteriler QR kodu okutarak mobil menüye erişebilir. TV menü ile senkronize çalışır.
            </p>
            <QrMenuSection screenId={screenId} businessId={screen.business_id} />
          </div>
          <span className={`inline-block px-2 py-1 rounded text-sm ${screen.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {screen.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Assigned Menus</h3>
            {menusList.length > 0 ? (
              <div className="space-y-3">
                {menusList.map((screenMenu: any) => {
                  const menu = screenMenu.menus || screenMenu;
                  return (
                    <div key={menu.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <p className="font-semibold">{menu.name}</p>
                        <p className="text-sm text-gray-700">Order: {screenMenu.display_order}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveMenu(menu.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-700">No menus assigned yet</p>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold mb-4">Available Menus</h3>
            {availableMenus.length > 0 ? (
              <div className="space-y-3">
                {availableMenus.map((menu) => (
                  <div key={menu.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-semibold">{menu.name}</p>
                      <p className="text-sm text-gray-700">{menu.description || 'No description'}</p>
                    </div>
                    <button
                      onClick={() => handleAssignMenu(menu.id)}
                      disabled={assigning}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm disabled:opacity-50"
                    >
                      Assign
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-700">All menus are assigned or no menus available</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
