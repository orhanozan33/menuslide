'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  display_order: number;
  is_active: boolean;
}

export default function MenuDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const menuId = (params?.id ?? '') as string;

  const [menu, setMenu] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMenu();
    loadMenuItems();
  }, [menuId]);

  const loadMenu = async () => {
    try {
      const data = await apiClient(`/menus/${menuId}`);
      setMenu(data);
    } catch (error) {
      setError(t('menus_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const loadMenuItems = async () => {
    try {
      const data = await apiClient(`/menu-items?menu_id=${menuId}`);
      setMenuItems(data);
    } catch (error) {
      console.error('Error loading menu items:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm(t('menus_confirm_delete_item'))) return;

    try {
      await apiClient(`/menu-items/${itemId}`, { method: 'DELETE' });
      loadMenuItems();
      toast.showSuccess(t('menus_item_deleted'));
    } catch (error) {
      toast.showError(t('menus_item_delete_failed'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-xl font-medium text-white">{t('common_loading')}</div>
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-xl text-red-400">{error || t('menus_not_found')}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href={localePath('/dashboard')} className="text-xl font-bold">
                {t('sidebar_title')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <Link href={localePath('/menus')} className="text-blue-400 hover:text-blue-300 transition-colors">
            ← {t('menus_back_to')}
          </Link>
          <Link
            href={localePath(`/menus/${menuId}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('menus_edit_design')}
          </Link>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-2xl font-bold mb-2 text-gray-900">{menu.name}</h2>
          <p className="text-gray-600 mb-4">{menu.description || t('menus_no_desc')}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-700">
            <span>{t('menus_slide_duration')}: {menu.slide_duration}{t('menus_seconds_short')}</span>
            <span className={`px-2 py-1 rounded ${menu.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {menu.is_active ? t('menus_active') : t('menus_inactive')}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{t('menus_products')}</h3>
          <Link
            href={localePath(`/menus/${menuId}/items/new`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {t('menus_add_product')}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {menuItems.map((item) => (
            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Image Section */}
              {item.image_url ? (
                <div className="w-full aspect-square overflow-hidden bg-gray-100">
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-sm">{t('menus_no_image')}</span>
                </div>
              )}
              
              {/* Content Section */}
              <div className="p-4 bg-white">
                {/* Product Name */}
                <h4 className="text-base font-bold text-gray-900 mb-2 line-clamp-2 min-h-[2.5rem]">
                  {item.name}
                </h4>
                
                {/* Tags */}
                <div className="flex gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded">
                    food
                  </span>
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded">
                    image
                  </span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Link
                    href={localePath(`/menus/${menuId}/items/${item.id}`)}
                    className="flex-1 text-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                  >
                    {t('btn_edit')}
                  </Link>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="flex-1 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
                  >
                    {t('btn_delete')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-700 mb-4">{t('menus_no_products_on_page')}</p>
            <Link
              href={localePath(`/menus/${menuId}/items/new`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {t('menus_add_product')}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
