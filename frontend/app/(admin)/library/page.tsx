'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { logAdminActivity } from '@/lib/admin-activity';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

interface ContentLibraryItem {
  id: string;
  name: string;
  category: string;
  type: string;
  url?: string;
  content?: string;
  display_order?: number;
}

interface ContentCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
  display_order: number;
}

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EResim%3C/text%3E%3C/svg%3E';

const DEFAULT_CATEGORIES: ContentCategory[] = [
  { id: '1', slug: 'food', label: 'Yiyecekler', icon: '🍕', display_order: 0 },
  { id: '2', slug: 'pasta', label: 'Makarnalar', icon: '🍝', display_order: 1 },
  { id: '3', slug: 'drinks', label: 'İçecekler', icon: '🍹', display_order: 2 },
  { id: '4', slug: 'icons', label: 'İkonlar', icon: '🎨', display_order: 3 },
  { id: '5', slug: 'badges', label: 'Rozetler', icon: '🏷️', display_order: 4 },
  { id: '6', slug: 'backgrounds', label: 'Arka Planlar', icon: '🖼️', display_order: 5 },
  { id: '7', slug: 'text', label: 'Metin Şablonları', icon: '📝', display_order: 6 },
];

const CATEGORY_SLUG_TO_KEY: Record<string, string> = {
  food: 'editor_category_food',
  pasta: 'editor_category_pasta',
  pastas: 'editor_category_pasta',
  drinks: 'editor_category_drinks',
  icon: 'editor_category_icons',
  icons: 'editor_category_icons',
  badges: 'editor_category_badges',
  background: 'editor_category_backgrounds',
  backgrounds: 'editor_category_backgrounds',
  'arka-plan': 'editor_category_backgrounds',
  arka_plan: 'editor_category_backgrounds',
  'arka plan': 'editor_category_backgrounds',
  text: 'editor_category_text_templates',
  text_templates: 'editor_category_text_templates',
  'text-templates': 'editor_category_text_templates',
  'metin-sablonlari': 'editor_category_text_templates',
  metin_sablonlari: 'editor_category_text_templates',
  'metin şablonları': 'editor_category_text_templates',
  video: 'editor_category_video',
  salad: 'editor_category_salad',
  salata: 'editor_category_salad',
};

const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  'metin şablonları': 'editor_category_text_templates',
  'metin sablonlari': 'editor_category_text_templates',
  'text templates': 'editor_category_text_templates',
  'arka plan': 'editor_category_backgrounds',
  'arka planlar': 'editor_category_backgrounds',
  'backgrounds': 'editor_category_backgrounds',
  'background': 'editor_category_backgrounds',
};

/** İkon ve rozet isimlerini çeviri anahtarına eşler (locale’e göre çeviri için). */
const LIBRARY_ICON_BADGE_NAME_TO_KEY: Record<string, string> = {
  Yıldız: 'library_icon_star', Ateş: 'library_icon_fire', Yeni: 'library_icon_new', Acı: 'library_icon_spicy',
  Kalp: 'library_icon_heart', Onay: 'library_icon_check', Işıltı: 'library_icon_sparkle', Taç: 'library_icon_crown',
  Hediye: 'library_icon_gift', Kupa: 'library_icon_trophy', Pizza: 'library_icon_pizza', Burger: 'library_icon_burger',
  Patates: 'library_icon_fries', Taco: 'library_icon_taco', Suşi: 'library_icon_sushi', Makarna: 'library_icon_pasta',
  Salata: 'library_icon_salad', Tavuk: 'library_icon_chicken', Kahve: 'library_icon_coffee', Çay: 'library_icon_tea',
  'Portakal Suyu': 'library_icon_orange_juice', Limonata: 'library_icon_lemonade', Su: 'library_icon_water',
  Milkshake: 'library_icon_milkshake', Pasta: 'library_icon_cake', Dondurma: 'library_icon_icecream',
  Kurabiye: 'library_icon_cookie', Donut: 'library_icon_donut', Vegan: 'library_icon_vegan', Helal: 'library_icon_halal',
  Glutensiz: 'library_icon_gluten_free', Organik: 'library_icon_organic', Baharatlı: 'library_icon_spicy',
  'Şef Önerisi': 'library_icon_chef', Hızlı: 'library_icon_fast', İndirim: 'library_icon_discount',
  '%50 İndirim': 'library_badge_50_off', '%30 İndirim': 'library_badge_30_off', '%20 İndirim': 'library_badge_20_off',
  '%10 İndirim': 'library_badge_10_off', Popüler: 'library_badge_popular', 'En İyi': 'library_badge_best',
  Özel: 'library_badge_special', Sınırlı: 'library_badge_limited', Tükendi: 'library_badge_sold_out',
  '1+1': 'library_badge_1_1', '2+1': 'library_badge_2_1',
  'Ücretsiz Teslimat': 'library_badge_free_delivery', 'Bugünün Fırsatı': 'library_badge_today_offer',
  'Elma Suyu': 'library_icon_apple_juice', 'Buzlu Çay': 'library_icon_iced_tea', 'Buzlu Kahve': 'library_icon_iced_coffee',
};

function getItemDisplayName(item: ContentLibraryItem, t: (key: string) => string): string {
  if (item.category !== 'icons' && item.category !== 'badges') return item.name;
  const key = LIBRARY_ICON_BADGE_NAME_TO_KEY[item.name];
  return key ? t(key) : item.name;
}

function getCategoryLabel(cat: ContentCategory, t: (key: string) => string): string {
  const customLabel = (cat.label ?? '').trim();
  if (customLabel) return customLabel;
  const slug = (cat.slug ?? '').toLowerCase();
  const labelNorm = (cat.label ?? '').toLowerCase().trim();
  const key = CATEGORY_SLUG_TO_KEY[slug] ?? CATEGORY_LABEL_TO_KEY[labelNorm];
  return key ? t(key) : cat.label || '';
}

export default function LibraryPage() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const [items, setItems] = useState<ContentLibraryItem[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [user, setUser] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ContentLibraryItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<ContentCategory | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [previewItem, setPreviewItem] = useState<ContentLibraryItem | null>(null);
  const [removingDuplicates, setRemovingDuplicates] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [formData, setFormData] = useState<{
    name: string;
    category: string;
    type: string;
    url: string;
    display_order: number;
  }>({
    name: '',
    category: 'food',
    type: 'image',
    url: '',
    display_order: 0,
  });
  const [categoryForm, setCategoryForm] = useState({ slug: '', label: '', icon: '📦' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      let catsData: any[] = [];
      let itemsData: any = [];
      try {
        catsData = await apiClient('/content-library/categories');
      } catch {
        catsData = [];
      }
      try {
        itemsData = await apiClient('/content-library');
      } catch (itemsErr: any) {
        setError(itemsErr?.message || t('library_items_load_failed'));
      }
      setCategories(Array.isArray(catsData) ? catsData.filter((c: any) => c.slug !== 'regional' && c.slug !== 'tek-menu') : []);
      // Flatten grouped or array
      let flat: ContentLibraryItem[] = [];
      if (typeof itemsData === 'object' && !Array.isArray(itemsData)) {
        Object.values(itemsData).forEach((arr: any) => {
          if (Array.isArray(arr)) flat.push(...arr);
        });
      } else {
        flat = Array.isArray(itemsData) ? itemsData : [];
      }
      setItems(flat);
    } catch (err: any) {
      setError(err?.message || t('library_load_failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (!userStr) {
      router.push(localePath('/login'));
      return;
    }
    try {
      const authUser = JSON.parse(userStr);
      setUser(authUser);
      if (authUser.role !== 'super_admin' && authUser.role !== 'admin') {
        router.push(localePath('/dashboard'));
        return;
      }
    } catch {
      router.push(localePath('/login'));
      return;
    }
    loadData();
  }, [router, loadData, localePath]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPageTitle(localStorage.getItem('library_page_title') || t('library_title'));
    }
  }, [t]);

  // Düzenleme sayfasından yükleme vb. sonrası senkronize et
  useEffect(() => {
    const onUpdate = () => loadData();
    window.addEventListener('content-library-updated', onUpdate);
    return () => window.removeEventListener('content-library-updated', onUpdate);
  }, [loadData]);

  const filteredItems = items
    .filter((i) => selectedCategory === 'all' || i.category === selectedCategory)
    .filter((i) => !searchQuery || i.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

  const handleReorder = async (reordered: ContentLibraryItem[]) => {
    const updates = reordered.map((item, idx) => ({ id: item.id, display_order: idx }));
    try {
      setSaving(true);
      await apiClient('/content-library/reorder', {
        method: 'POST',
        body: { updates },
      });
      setSuccess(t('library_order_updated'));
      setTimeout(() => setSuccess(''), 2000);
      loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || t('library_order_failed'));
    } finally {
      setSaving(false);
    }
  };

  const onDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    setDraggedId(null);
    const id = e.dataTransfer.getData('text/plain');
    if (!id || id === targetId) return;
    const idx = filteredItems.findIndex((i) => i.id === id);
    const targetIdx = filteredItems.findIndex((i) => i.id === targetId);
    if (idx < 0 || targetIdx < 0) return;
    const reordered = [...filteredItems];
    const [removed] = reordered.splice(idx, 1);
    reordered.splice(targetIdx, 0, removed);
    handleReorder(reordered);
  };

  const handleRemoveDuplicates = async () => {
    setConfirmModal({
      message: t('library_remove_duplicates_confirm'),
      onConfirm: () => {
        setConfirmModal(null);
        runRemoveDuplicates();
      },
    });
  };

  const runRemoveDuplicates = async () => {
    try {
      setRemovingDuplicates(true);
      setError('');
      const result = await apiClient('/content-library/remove-duplicates-by-name', { method: 'POST' });
      const deleted = (result as { deleted?: number })?.deleted ?? 0;
      setSuccess(t('library_duplicates_removed', { count: deleted }));
      setTimeout(() => setSuccess(''), 4000);
      loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || t('library_load_failed'));
    } finally {
      setRemovingDuplicates(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmModal({
      message: t('library_confirm_delete_content'),
      onConfirm: () => {
        setConfirmModal(null);
        runDeleteContent(id);
      },
    });
  };

  const runDeleteContent = async (id: string) => {
    try {
      setSaving(true);
      await apiClient(`/content-library/${id}`, { method: 'DELETE' });
      setSuccess(t('library_content_deleted'));
      setTimeout(() => setSuccess(''), 2000);
      loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || t('common_delete_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    setError('');
    const cat = selectedCategory !== 'all' ? selectedCategory : (categories[0]?.slug || 'food');
    setFormData({
      name: '',
      category: cat,
      type: cat === 'video' ? 'video' : 'image',
      url: '',
      display_order: filteredItems.length,
    });
    setShowAddModal(true);
  };

  const handleEdit = (item: ContentLibraryItem) => {
    setEditingItem(item);
    const t = (item.type as string) || 'image';
    setFormData({
      name: item.name,
      category: item.category,
      type: t === 'video' ? 'video' : 'image',
      url: item.url || '',
      display_order: item.display_order ?? 0,
    });
    setShowAddModal(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && !isVideo) return;
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      const src = upJson?.assets?.[0]?.src || upJson?.data?.[0]?.src;
      if (src) {
        setFormData((f) => ({ ...f, url: src }));
        return;
      }
    } catch (_) {
      // Fallback: base64 (ağır olur ama çalışır)
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData((f) => ({ ...f, url: (ev.target?.result as string) || '' }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (formData.name || '').trim();
    if (!trimmedName) {
      setError(t('library_content_name_required'));
      return;
    }
    if (!formData.url?.trim() && (formData.type === 'image' || formData.type === 'video')) {
      setError(formData.type === 'video' ? t('library_content_video_required') : t('library_content_image_required'));
      return;
    }
    try {
      setSaving(true);
      setError('');
      const payload = {
        name: trimmedName,
        category: formData.category,
        type: formData.type,
        url: formData.url?.trim() || undefined,
        display_order: formData.display_order,
      };
      if (editingItem) {
        await apiClient(`/content-library/${editingItem.id}`, { method: 'PATCH', body: payload });
        setSuccess(t('library_content_updated'));
      } else {
        const created = await apiClient('/content-library', { method: 'POST', body: payload });
        const createdId = (created as any)?.id;
        logAdminActivity({ action_type: 'library_upload', page_key: 'library', resource_type: 'content_library', resource_id: createdId, details: { name: trimmedName, category: formData.category } });
        setSuccess(t('library_content_added'));
        setSelectedCategory(formData.category);
      }
      setTimeout(() => setSuccess(''), 2000);
      setShowAddModal(false);
      await loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || err?.data?.message || t('library_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      if (editingCategory) {
        await apiClient(`/content-library/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: { slug: categoryForm.slug, label: categoryForm.label, icon: categoryForm.icon },
        });
        setSuccess(t('library_category_updated'));
      } else {
        const created = await apiClient('/content-library/categories', {
          method: 'POST',
          body: categoryForm,
        });
        setSuccess(t('library_category_added'));
        setSelectedCategory((created as any)?.slug || categoryForm.slug);
        setCategories((prev) => [...prev, created as ContentCategory]);
      }
      setTimeout(() => setSuccess(''), 2000);
      setShowCategoryModal(false);
      await loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || err?.data?.message || t('library_category_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCategory = (id: string, _slug?: string) => {
    setConfirmModal({
      message: t('library_confirm_delete_category'),
      onConfirm: () => {
        setConfirmModal(null);
        runDeleteCategory(id);
      },
    });
  };

  const runDeleteCategory = async (id: string) => {
    try {
      setSaving(true);
      await apiClient(`/content-library/categories/${id}`, { method: 'DELETE' });
      setSuccess(t('library_category_deleted'));
      setTimeout(() => setSuccess(''), 2000);
      loadData();
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
    } catch (err: any) {
      setError(err?.message || t('library_category_delete_failed'));
    } finally {
      setSaving(false);
    }
  };

  const openCategoryModal = (cat?: ContentCategory) => {
    setEditingCategory(cat || null);
    setCategoryForm(cat ? { slug: cat.slug, label: cat.label, icon: cat.icon } : { slug: '', label: '', icon: '📦' });
    setShowCategoryModal(true);
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto min-w-0 overflow-x-hidden">
      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-800 rounded-lg text-sm">{success}</div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {/* Onay modalı – native confirm yerine uygulama içi */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60" onClick={() => setConfirmModal(null)}>
          <div
            className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-600 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-white mb-3">{t('editor_content_library')}</h3>
            <p className="text-slate-300 text-sm mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-600 text-white hover:bg-slate-500 text-sm font-medium"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={() => confirmModal.onConfirm()}
                className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-500 text-sm font-medium"
              >
                {t('btn_yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel - Görsel tasarım (referans görseldeki gibi) */}
      <div className="bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <input
              type="text"
              value={pageTitle}
              onChange={(e) => {
                const v = e.target.value;
                setPageTitle(v);
                if (typeof window !== 'undefined') localStorage.setItem('library_page_title', v);
              }}
              className="bg-white/20 text-white font-bold text-xl placeholder-white/80 border-0 rounded-lg px-3 py-1 focus:ring-2 focus:ring-white/50 w-64"
              placeholder="Sayfa adı"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleRemoveDuplicates}
              disabled={removingDuplicates}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg font-medium disabled:opacity-50"
              title={t('library_remove_duplicates')}
            >
              {removingDuplicates ? t('common_loading') : t('library_remove_duplicates')}
            </button>
            <button
              onClick={() => openCategoryModal()}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg font-medium"
            >
              + {t('common_add_category')}
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-white text-purple-600 hover:bg-white/90 rounded-lg font-medium text-sm"
            >
              + {t('common_add_content')}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-slate-700">
          <input
            type="text"
            placeholder={t('library_search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Category tabs */}
        <div className="px-6 py-3 border-b border-slate-700 flex gap-1 overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-slate-700 text-white border-b-2 border-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('editor_filter_all')}
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center group">
              <button
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap flex items-center gap-2 transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-slate-700 text-white border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{getCategoryLabel(cat, t)}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openCategoryModal(cat); }}
                className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-slate-600 text-slate-400 text-xs"
                title={t('btn_edit')}
              >
                ✎
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.slug); }}
                className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-600/50 text-slate-400 hover:text-red-300 text-xs"
                title={t('common_delete')}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Content grid */}
        <div className="p-6 min-h-[400px] max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-16 text-slate-400">{t('common_loading')}</div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-lg font-medium">{t('common_no_content')}</p>
              <p className="text-sm mt-1">{t('common_add_content_hint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, item.id)}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, item.id)}
                  onDragEnd={() => setDraggedId(null)}
                  className={`group relative flex flex-col bg-slate-700/50 rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                    draggedId === item.id ? 'opacity-50 scale-95' : 'border-transparent hover:border-slate-500'
                  }`}
                >
                  <div
                    className="aspect-square bg-slate-600 cursor-pointer flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); setPreviewItem(item); }}
                  >
                    {item.url && item.type === 'video' ? (
                      <div className="w-full h-full relative bg-slate-700 flex items-center justify-center overflow-hidden">
                        <video
                          src={resolveMediaUrl(item.url)}
                          className="w-full h-full object-cover pointer-events-none"
                          muted
                          playsInline
                          preload="auto"
                          onLoadedData={(e) => {
                            const v = e.target as HTMLVideoElement;
                            if (v.duration > 0) v.currentTime = Math.min(0.5, v.duration * 0.1);
                          }}
                          onError={() => {}}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-4xl">▶</span>
                        </div>
                      </div>
                    ) : item.url && (item.type === 'image' || item.type === 'drink') ? (
                      <img
                        src={resolveMediaUrl(item.url)}
                        alt={item.name}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        onError={(e) => ((e.target as HTMLImageElement).src = PLACEHOLDER_IMG)}
                        draggable={false}
                      />
                    ) : item.content ? (
                      <div className="w-full h-full flex items-center justify-center text-4xl pointer-events-none select-none">{item.content}</div>
                    ) : (item as any).gradient ? (
                      <div
                        className="w-full h-full pointer-events-none"
                        style={{ background: (item as any).gradient }}
                      />
                    ) : (item as any).color ? (
                      <div
                        className="w-full h-full pointer-events-none"
                        style={{ backgroundColor: (item as any).color }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 pointer-events-none select-none">📦</div>
                    )}
                  </div>
                  <div className="p-2 bg-gradient-to-t from-slate-800 to-slate-700/80 flex flex-col gap-1.5">
                    <p className="text-white text-sm font-medium truncate">{getItemDisplayName(item, t)}</p>
                    <div className="flex gap-2 items-center">
                      <span className="text-slate-500 text-xs">⋮⋮</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg"
                      >
                        {t('btn_edit')}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }}
                        className="flex-1 px-2 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
                      >
                        {t('common_delete')}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Önizleme modal */}
      {previewItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewItem(null)}
        >
          <div
            className="bg-slate-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-600 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white truncate">{getItemDisplayName(previewItem, t) || t('editor_content')}</h3>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-6 flex-1 overflow-auto flex items-center justify-center min-h-[300px] bg-slate-900">
              {previewItem.url && previewItem.type === 'video' ? (
                <video
                  src={resolveMediaUrl(previewItem.url)}
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="max-w-full max-h-[70vh] rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : previewItem.url && (previewItem.type === 'image' || previewItem.type === 'drink') ? (
                <img
                  src={resolveMediaUrl(previewItem.url)}
                  alt={previewItem.name}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : previewItem.category === 'badges' || (previewItem as any).type === 'badge' ? (
                <div
                  className="px-8 py-4 rounded-lg text-white font-bold text-2xl"
                  style={{
                    backgroundColor: (previewItem as any).bg || '#FF4444',
                    color: (previewItem as any).color || '#FFFFFF',
                  }}
                >
                  {(previewItem as any).text || previewItem.content || previewItem.name}
                </div>
              ) : previewItem.content ? (
                <div className="text-8xl">{previewItem.content}</div>
              ) : (previewItem as any).gradient ? (
                <div
                  className="w-full max-w-md aspect-video rounded-lg"
                  style={{ background: (previewItem as any).gradient }}
                />
              ) : (previewItem as any).color ? (
                <div
                  className="w-full max-w-md aspect-video rounded-lg"
                  style={{ backgroundColor: (previewItem as any).color }}
                />
              ) : (
                <div className="text-slate-500 text-4xl">📦</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit item modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? t('common_edit_content') : t('common_new_content')}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İsim *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setFormData((f) => ({ ...f, category: cat, type: cat === 'video' ? 'video' : 'image' }));
                  }}
                  className="w-full px-4 py-2 border rounded-lg"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.icon} {c.label}
                    </option>
                  ))}
                  {categories.length === 0 && <option value="food">Yiyecekler</option>}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {formData.type === 'video' ? t('library_video') : t('library_image')}
                </label>
                <input
                  type="file"
                  accept={formData.type === 'video' ? 'video/*' : 'image/png,image/gif,image/jpeg,image/jpg,image/webp'}
                  onChange={handleFileUpload}
                  className="w-full mb-2"
                />
                <input
                  type="text"
                  value={formData.url}
                  onChange={(e) => setFormData((f) => ({ ...f, url: e.target.value }))}
                  placeholder={formData.type === 'video' ? 'Video URL (mp4, webm vb.) veya yükleyin' : 'Veya URL'}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  {t('btn_cancel')}
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {saving ? t('common_saving') : editingItem ? t('common_update') : t('common_add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? t('common_edit_category') : t('common_new_category')}
              </h2>
            </div>
            <form onSubmit={handleCategorySubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Slug (benzersiz)</label>
                <input
                  type="text"
                  required
                  value={categoryForm.slug}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s/g, '-') }))}
                  placeholder="food, pasta, drinks"
                  className="w-full px-4 py-2 border rounded-lg"
                  disabled={!!editingCategory}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Görünen ad</label>
                <input
                  type="text"
                  required
                  value={categoryForm.label}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, label: e.target.value }))}
                  placeholder={t('editor_category_food')}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">İkon (emoji)</label>
                <input
                  type="text"
                  value={categoryForm.icon}
                  onChange={(e) => setCategoryForm((f) => ({ ...f, icon: e.target.value || '📦' }))}
                  placeholder="🍕"
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                  {t('btn_cancel')}
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50">
                  {saving ? t('common_saving') : editingCategory ? t('common_update') : t('common_add')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
