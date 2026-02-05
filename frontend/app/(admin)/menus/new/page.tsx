'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { logAdminActivity } from '@/lib/admin-activity';
import MenuBuilder, { MenuBuilderItem, PageConfig } from '@/components/MenuBuilder';
import { useTranslation } from '@/lib/i18n/useTranslation';

export default function NewMenuBuilderPage() {
  const router = useRouter();
  const { localePath } = useTranslation();
  const searchParams = useSearchParams();
  const businessIdFromUrl = searchParams?.get('business_id');

  const [businessId, setBusinessId] = useState<string>('');
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [menuName, setMenuName] = useState('');
  const [description, setDescription] = useState('');
  const [slideDuration, setSlideDuration] = useState(5);
  const [pages, setPages] = useState<PageConfig[]>([{ name: 'Sayfa 1', order: 0 }]);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [items, setItems] = useState<MenuBuilderItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (!userStr) {
      router.push(localePath('/login'));
      return;
    }
    loadBusinesses();
  }, [router]);

  useEffect(() => {
    if (businessIdFromUrl && businesses.length > 0) setBusinessId(businessIdFromUrl);
  }, [businessIdFromUrl, businesses]);

  const loadBusinesses = async () => {
    try {
      const data = await apiClient('/businesses');
      setBusinesses(data || []);
      if (data?.length > 0 && !businessId) {
        const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
        let target = data[0].id;
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            if (user.business_id && data.some((b: any) => b.id === user.business_id)) target = user.business_id;
          } catch {}
        }
        setBusinessId(target);
      }
    } catch (e) {
      setError('İşletmeler yüklenemedi');
    }
  };

  const handleSave = async () => {
    const trimmedName = (menuName || '').trim();
    if (!trimmedName) { setError('Menü adı girin.'); return; }
    if (!businessId) { setError('İşletme seçin.'); return; }
    setSaving(true);
    setError('');
    try {
      const menu = await apiClient('/menus', {
        method: 'POST',
        body: {
          business_id: businessId,
          name: trimmedName,
          description: (description || '').trim() || undefined,
          slide_duration: slideDuration,
          is_active: true,
          pages_config: pages.map((p, i) => ({ name: p.name, order: i })),
        },
      });
      const menuId = (menu as any).id;
      logAdminActivity({ action_type: 'menu_create', page_key: 'menus', resource_type: 'menu', resource_id: menuId, details: { name: trimmedName } });
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        await apiClient('/menu-items', {
          method: 'POST',
          body: {
            menu_id: menuId,
            name: (it.name || '').trim() || 'Ürün',
            description: it.description?.trim() || undefined,
            price: it.price ? parseFloat(it.price) : undefined,
            image_url: it.image_url || undefined,
            display_order: i,
            page_index: it.pageIndex,
          },
        });
      }
      router.push(localePath('/menus'));
    } catch (err: any) {
      setError(err?.message || err?.data?.message || 'Menü kaydedilemedi');
    } finally {
      setSaving(false);
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
    />
  );
}
