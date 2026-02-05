'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAdminPagePermissions } from '@/lib/useAdminPagePermissions';
import { ConfirmModal } from '@/components/ConfirmModal';

interface UploadItem {
  id: string;
  name: string;
  category: string;
  type: string;
  url?: string;
  content?: string;
  display_order?: number;
  uploader_email?: string;
}

/** Resim/video için görüntülenecek URL (relative path ise düzgün çalışsın) */
function getMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('data:') || url.startsWith('http://') || url.startsWith('https://')) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;
}

const PLACEHOLDER_SVG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23e5e7eb" width="200" height="200"/%3E%3Ctext fill="%239ca3af" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EResim%3C/text%3E%3C/svg%3E';

export default function UserUploadsPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const { can, isSuper, hasView } = useAdminPagePermissions('user-uploads');
  const [user, setUser] = useState<any>(null);
  const isBusinessUser = user?.role === 'business_user';
  const canViewList = isBusinessUser || hasView || can('view_list');
  const canApprove = !isBusinessUser && (isSuper || can('approve'));
  const [items, setItems] = useState<UploadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<UploadItem | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', category: 'food' });
  const [categories, setCategories] = useState<{ slug: string; label: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [previewItem, setPreviewItem] = useState<UploadItem | null>(null);

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (!userStr) {
      router.push(localePath('/login'));
      return;
    }
    try {
      const authUser = JSON.parse(userStr);
      setUser(authUser);
      if (authUser.role !== 'super_admin' && authUser.role !== 'admin' && authUser.role !== 'business_user') {
        router.push(localePath('/dashboard'));
        return;
      }
    } catch {
      router.push(localePath('/login'));
      return;
    }
    loadUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUploads = async () => {
    try {
      setLoading(true);
      setError('');
      const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      const authUser = userStr ? JSON.parse(userStr) : null;
      const isMyUploads = authUser?.role === 'business_user';

      let list: UploadItem[] = [];
      try {
        const data = isMyUploads
          ? await apiClient('/content-library/my-uploads')
          : await apiClient('/content-library/user-uploads');
        list = Array.isArray(data) ? data : [];
      } catch (uploadsErr: any) {
        console.error('User uploads API error:', uploadsErr);
        setError(uploadsErr?.data?.message || uploadsErr?.message || 'Yüklemeler yüklenemedi.');
      }

      let catsData: any[] = [];
      if (!isMyUploads) {
        try {
          catsData = await apiClient('/content-library/categories');
        } catch {
          catsData = [];
        }
      }
      setItems(list);
      const cats = Array.isArray(catsData) ? catsData : [];
      setCategories(cats.map((c: any) => ({ slug: c.slug || c.id, label: c.label || c.name || c.slug })));
    } catch (err: any) {
      console.error('Error loading user uploads:', err);
      setError(err?.data?.message || err?.message || 'Yüklemeler yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeCategory = async (itemId: string, newCategory: string) => {
    try {
      setSaving(true);
      setError('');
      await apiClient(`/content-library/${itemId}`, {
        method: 'PATCH',
        body: { category: newCategory },
      });
      setSuccess('Kategori güncellendi. Ürün artık kütüphanede seçilen kategoride.');
      setTimeout(() => setSuccess(''), 3000);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, category: newCategory } : i))
      );
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Kategori güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: UploadItem) => {
    setEditingItem(item);
    setFormData({ name: item.name, category: item.category });
    setShowEditModal(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      setSaving(true);
      setError('');
      await apiClient(`/content-library/${editingItem.id}`, {
        method: 'PATCH',
        body: { name: formData.name.trim(), category: formData.category },
      });
      setSuccess('Yükleme güncellendi.');
      setTimeout(() => setSuccess(''), 3000);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
      setItems((prev) =>
        prev.map((i) =>
          i.id === editingItem.id
            ? { ...i, name: formData.name.trim(), category: formData.category }
            : i
        )
      );
      setShowEditModal(false);
      setEditingItem(null);
    } catch (err: any) {
      setError(err?.data?.message || err?.message || 'Güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirm({ id });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;
    const id = deleteConfirm.id;
    setDeleteConfirm(null);
    try {
      setSaving(true);
      setError('');
      await apiClient(`/content-library/${id}`, { method: 'DELETE' });
      setSuccess('Yükleme silindi.');
      setTimeout(() => setSuccess(''), 3000);
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
      await loadUploads();
    } catch (err: any) {
      setError(err?.data?.message || err?.message || t('common_delete_failed'));
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.uploader_email || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryOptions = categories.length > 0
    ? categories
    : [{ slug: 'food', label: 'Yiyecekler' }, { slug: 'pasta', label: 'Makarnalar' }, { slug: 'drinks', label: 'İçecekler' }];

  // Layout zaten auth kontrolü yapıyor; user henüz set olmamışsa kısa süre yükleme göster
  if (!user) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-gray-500">{t('common_loading')}</div>
      </div>
    );
  }

  if (!canViewList) {
    return (
      <div className="min-w-0 overflow-x-hidden">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('users_uploads_title')}</h2>
        <p className="text-gray-600 py-8">Bu sayfayı görüntüleme yetkiniz yok.</p>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        {isBusinessUser ? 'Yüklemelerim' : t('users_uploads_title')}
      </h2>
      <p className="text-gray-600 mb-6">
        {isBusinessUser
          ? 'Şablon veya ekran düzenlerken Özel Kütüphane üzerinden yüklediğiniz resim ve videolar. Sadece sizin yüklemeleriniz listelenir.'
          : 'Tüm kullanıcıların template/ekran düzenlemede Özel Kütüphane üzerinden yüklediği resimler. Kategori değiştirince ürün İçerik Kütüphanesinde seçilen kategoride görünür.'}
      </p>

      {success && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {(!isBusinessUser || filteredItems.length > 3) && (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mb-6">
          <input
            type="text"
            placeholder={isBusinessUser ? 'İsim ile ara...' : 'İsim veya e-posta ile ara...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common_loading')}</div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-12 text-center">
          <div className="text-5xl mb-4">📤</div>
          <p className="text-gray-600 font-medium">{t('common_no_uploads')}</p>
          <p className="text-gray-400 text-sm mt-2">
            {isBusinessUser
              ? 'Şablon veya ekran düzenlerken Özel Kütüphane üzerinden resim/video yüklediğinizde burada görünür.'
              : 'Template düzenleyicide Özel Kütüphane üzerinden yüklenen resimler burada listelenir.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredItems.map((item) => {
            const mediaUrl = getMediaUrl(item.url);
            const isVideo = (item.type || '').toLowerCase() === 'video';
            return (
            <div
              key={item.id}
              className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <button
                type="button"
                onClick={() => setPreviewItem(item)}
                className="w-full aspect-video bg-gray-100 relative block overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset cursor-pointer group"
              >
                {mediaUrl && isVideo ? (
                  <video
                    src={mediaUrl}
                    preload="metadata"
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    onError={(e) => {
                      const t = e.target as HTMLVideoElement;
                      t.style.display = 'none';
                      const fallback = t.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                {mediaUrl && !isVideo ? (
                  <img
                    src={mediaUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = PLACEHOLDER_SVG;
                    }}
                  />
                ) : null}
                {(!mediaUrl || isVideo) && (
                  <div
                    className="absolute inset-0 flex items-center justify-center text-gray-400 text-4xl bg-gray-100"
                    style={mediaUrl && isVideo ? { display: 'none' } : undefined}
                  >
                    {isVideo ? '🎬' : '🖼️'}
                  </div>
                )}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-medium">
                  {isVideo ? 'Video' : 'Resim'}
                </span>
              </button>
              <div className="p-3">
                <h3 className="font-medium text-gray-900 truncate text-sm mb-1" title={item.name}>
                  {item.name}
                </h3>
                {!isBusinessUser && item.uploader_email && (
                  <p className="text-xs text-gray-500 truncate mb-2" title={item.uploader_email}>
                    👤 {item.uploader_email}
                  </p>
                )}
                {!isBusinessUser && (
                  <>
                    <div className="mb-2">
                      <label className="block text-xs font-medium text-gray-600 mb-1">Kategori</label>
                      <select
                        value={item.category}
                        onChange={(e) => handleChangeCategory(item.id, e.target.value)}
                        disabled={saving || !canApprove}
                        className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {categoryOptions.map((c) => (
                          <option key={c.slug} value={c.slug}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Seçilen kategoride kütüphanede görünür
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        disabled={saving || !canApprove}
                        className="flex-1 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {t('btn_edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(item.id)}
                        disabled={saving || !canApprove}
                        className="flex-1 py-1.5 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        {t('btn_delete')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          );
          })}
        </div>
      )}

      {/* Önizleme modalı: tıklanınca büyük resim / video */}
      {previewItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewItem(null)}
          role="dialog"
          aria-modal="true"
          aria-label="Önizleme"
        >
          <div
            className="relative max-w-[95vw] max-h-[95vh] w-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewItem(null)}
              className="absolute -top-10 right-0 p-2 rounded-lg bg-white/90 text-gray-700 hover:bg-white shadow-lg z-10"
              aria-label={t('common_close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            {(previewItem.type || '').toLowerCase() === 'video' ? (
              <video
                src={getMediaUrl(previewItem.url)}
                controls
                autoPlay
                playsInline
                className="max-w-full max-h-[85vh] w-auto rounded-xl shadow-2xl bg-black"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                src={getMediaUrl(previewItem.url) || PLACEHOLDER_SVG}
                alt={previewItem.name}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            )}
            <div className="absolute -bottom-8 left-0 right-0 text-center text-white/90 text-sm">
              {previewItem.name}
              {previewItem.uploader_email && ` · ${previewItem.uploader_email}`}
            </div>
          </div>
        </div>
      )}

      {!loading && filteredItems.length > 0 && (
        <p className="mt-4 text-sm text-gray-500">
          Toplam {filteredItems.length} yükleme
        </p>
      )}

      {/* {t('btn_edit')} modal */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-900">Yükleme {t('btn_edit')}</h2>
              <button
                type="button"
                onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSubmitEdit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categoryOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingItem(null); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t('btn_cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? t('common_saving') : t('btn_save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteConfirm}
        title={t('common_confirm')}
        message={t('user_uploads_delete_confirm')}
        confirmLabel={t('btn_yes')}
        cancelLabel={t('btn_cancel')}
        variant="danger"
        loading={saving}
      />
    </div>
  );
}
