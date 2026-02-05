'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import MenuBuilder, { MenuBuilderItem, PageConfig } from '@/components/MenuBuilder';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function EditMenuBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const menuId = (params?.id ?? '') as string;
  const { t, localePath } = useTranslation();

  const [businessId, setBusinessId] = useState<string>('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [slideDuration, setSlideDuration] = useState(5);
  const [pages, setPages] = useState<PageConfig[]>([{ name: 'Page 1', order: 0 }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [items, setItems] = useState<MenuBuilderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [qrBackgroundImageUrl, setQrBackgroundImageUrl] = useState('');
  const [qrBackgroundColor, setQrBackgroundColor] = useState('');
  const [savingQrBackground, setSavingQrBackground] = useState(false);

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (!userStr) {
      router.push(localePath('/login'));
      return;
    }
    loadData();
  }, [menuId, router]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [menu, menuItems] = await Promise.all([
        apiClient(`/menus/${menuId}`),
        apiClient(`/menu-items?menu_id=${menuId}`),
      ]);
      const m = menu as any;
      setBusinessId(m.business_id || '');
      setMenuName(m.name || '');
      setDescription(m.description || '');
      setSlideDuration(m.slide_duration ?? 5);

      let pagesConfig: PageConfig[] = [{ name: `${t('menus_page_default')} 1`, order: 0 }];
      if (m.pages_config && Array.isArray(m.pages_config) && m.pages_config.length > 0) {
        pagesConfig = m.pages_config
          .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
          .map((p: any, i: number) => ({ name: p.name || `${t('menus_page_default')} ${i + 1}`, order: i }));
      }
      setPages(pagesConfig);

      const itemsList = (menuItems as any[]) || [];
      const builderItems: MenuBuilderItem[] = itemsList
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map((it, idx) => ({
          tempId: it.id || `item-${idx}`,
          id: it.id,
          name: it.name || '',
          description: it.description,
          price: it.price != null ? String(it.price) : '',
          image_url: it.image_url,
          pageIndex: it.page_index ?? 0,
        }));
      setItems(builderItems);
    } catch (err: any) {
      setError(err?.message || err?.data?.message || t('menus_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const loadBusinesses = async () => {
    try {
      const data = await apiClient('/businesses');
      setBusinesses(data || []);
    } catch {}
  };

  useEffect(() => {
    loadBusinesses();
  }, []);

  useEffect(() => {
    if (!businessId) return;
    apiClient(`/businesses/${businessId}`)
      .then((b: any) => {
        setQrBackgroundImageUrl(b.qr_background_image_url || '');
        setQrBackgroundColor(b.qr_background_color || '');
      })
      .catch(() => {});
  }, [businessId]);

  const handleSave = async () => {
    const trimmedName = (menuName || '').trim();
    if (!trimmedName) { setError(t('menus_name_required')); return; }
    if (!businessId) { setError(t('menus_business_required')); return; }
    setSaving(true);
    setError('');
    try {
      await apiClient(`/menus/${menuId}`, {
        method: 'PATCH',
        body: {
          name: trimmedName,
          description: (description || '').trim() || undefined,
          slide_duration: slideDuration,
          pages_config: pages.map((p, i) => ({ name: p.name, order: i })),
        },
      });

      const existingIds = new Set<string>();
      const originalItems = await apiClient(`/menu-items?menu_id=${menuId}`) as any[];
      originalItems.forEach((it: any) => existingIds.add(it.id));

      const currentIds = new Set<string>();
      for (const it of items) {
        if (it.id) currentIds.add(it.id);
      }

      for (const id of Array.from(existingIds)) {
        if (!currentIds.has(id)) {
          await apiClient(`/menu-items/${id}`, { method: 'DELETE' });
        }
      }

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const payload = {
          name: (it.name || '').trim() || 'Ürün',
          description: it.description?.trim() || undefined,
          price: it.price ? parseFloat(it.price) : undefined,
          image_url: it.image_url || undefined,
          display_order: i,
          page_index: it.pageIndex,
        };
        if (it.id) {
          await apiClient(`/menu-items/${it.id}`, { method: 'PATCH', body: payload });
        } else {
          await apiClient('/menu-items', {
            method: 'POST',
            body: { ...payload, menu_id: menuId },
          });
        }
      }
      router.push(localePath('/menus'));
    } catch (err: any) {
      setError(err?.message || err?.data?.message || 'Menü kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-xl font-medium text-white">{t('common_loading')}</div>
      </div>
    );
  }

  if (error && items.length === 0 && !menuName) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400">{error}</div>
        <Link href={localePath('/menus')} className="text-blue-400 hover:underline">← {t('menus_back_to')}</Link>
      </div>
    );
  }

  const handleSaveQrBackground = async () => {
    if (!businessId) return;
    setSavingQrBackground(true);
    try {
      await apiClient(`/businesses/${businessId}`, {
        method: 'PATCH',
        body: {
          qr_background_image_url: qrBackgroundImageUrl.trim() || undefined,
          qr_background_color: qrBackgroundColor.trim() || undefined,
        },
      });
    } finally {
      setSavingQrBackground(false);
    }
  };

  return (
    <MenuBuilder
      menuName={menuName}
      setMenuName={setMenuName}
      description={description}
      setDescription={setDescription}
      slideDuration={slideDuration}
      setSlideDuration={setSlideDuration}
      businessId={businessId}
      setBusinessId={setBusinessId}
      businesses={businesses}
      pages={pages}
      setPages={setPages}
      activePageIndex={activePageIndex}
      setActivePageIndex={setActivePageIndex}
      items={items}
      setItems={setItems}
      onSave={handleSave}
      saving={saving}
      error={error}
      backHref={localePath('/menus')}
      saveLabel={t('menus_update')}
      qrBackgroundImageUrl={qrBackgroundImageUrl}
      qrBackgroundColor={qrBackgroundColor}
      setQrBackgroundImageUrl={setQrBackgroundImageUrl}
      setQrBackgroundColor={setQrBackgroundColor}
      onSaveQrBackground={handleSaveQrBackground}
      savingQrBackground={savingQrBackground}
    />
  );
}
