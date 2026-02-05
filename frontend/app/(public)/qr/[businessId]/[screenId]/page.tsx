'use client';

import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/formatPrice';
import { useParams, useSearchParams } from 'next/navigation';
import { publicApiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export default function QrMenuPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const businessId = (params?.businessId ?? '') as string;
  const screenId = (params?.screenId ?? '') as string;
  const token = searchParams?.get('token');

  const [menu, setMenu] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [languages, setLanguages] = useState<any[]>([]);
  const [currentLang, setCurrentLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const currentCategory = categories[selectedCategoryIndex];

  useEffect(() => {
    loadMenu();
    loadLanguages();
    recordView();
  }, [businessId, screenId, currentLang]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      const data = await publicApiClient(
        `/menu-resolver/business/${businessId}?screenId=${screenId || ''}&lang=${currentLang}`
      );
      setMenu(data.menu);
      setCategories(data.categories || []);
      setSelectedCategoryIndex(0);
    } catch (err) {
      console.error('Error loading menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLanguages = async () => {
    try {
      const data = await publicApiClient(`/menu-resolver/languages/${businessId}`);
      setLanguages(data || []);
      if (data.length > 0 && !data.find((l: any) => l.code === currentLang)) {
        const defaultLang = data.find((l: any) => l.is_default) || data[0];
        setCurrentLang(defaultLang.code);
      }
    } catch (err) {
      console.error('Error loading languages:', err);
    }
  };

  const recordView = async () => {
    if (!token) return;
    try {
      await publicApiClient(`/qr-menus/view/${token}?lang=${currentLang}`, {
        method: 'POST',
      });
    } catch (err) {
      console.error('Error recording view:', err);
    }
  };

  const loadItemDetails = async (itemId: string) => {
    try {
      const item = await publicApiClient(`/menu-resolver/item/${itemId}?lang=${currentLang}`);
      setSelectedItem(item);
    } catch (err) {
      console.error('Error loading item details:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl font-medium text-gray-700 mb-2">{t('qr_loading')}</div>
        </div>
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-4xl mb-4">🍽️</div>
          <div className="text-2xl font-bold text-gray-900 mb-2">{t('qr_menu_not_found')}</div>
          <div className="text-gray-600 mb-4">
            {t('qr_menu_not_created')}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LanguageSwitcher fixed className="!top-4 !left-auto !right-4 z-50" />
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{menu.name}</h1>
            <div className="flex items-center gap-2">
              {languages.length > 1 ? (
              <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
              ) : null}
            </div>
          </div>
          {menu.description && (
            <p className="text-gray-600 text-sm mt-2">{menu.description}</p>
          )}
        </div>
      </header>

      {/* Menu Content - Üst: kategori sekmeleri, Alt: içerik */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Üst: Kategori sekmeleri (Pizza, Drink, vb.) */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {categories.map((category: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setSelectedCategoryIndex(idx)}
                className={`px-4 py-3 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategoryIndex === idx
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {/* İçerik alanı */}
        <div className="min-w-0">
          {categories.length > 0 ? (
            currentCategory ? (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 border-gray-200 pb-2">
                  {currentCategory.name}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(currentCategory.items || []).map((item: any) => (
                    <div
                      key={item.id}
                      onClick={() => loadItemDetails(item.id)}
                      className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow cursor-pointer"
                    >
                      <div className="flex gap-4">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.display_name}
                            className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 mb-1">
                            {item.display_name}
                          </h3>
                          {item.display_description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.display_description}
                            </p>
                          )}
                          {item.display_price && (
                            <div className="text-lg font-bold text-blue-600">
                              {formatPrice(item.display_price)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null
          ) : (
            <div className="text-gray-500 text-center py-12">{t('qr_no_category')}</div>
          )}
        </div>
      </main>

      {/* Item Details Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedItem.display_name}</h2>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {selectedItem.image_url && (
                <div className="mb-4 flex justify-center">
                  <img
                    src={selectedItem.image_url}
                    alt={selectedItem.display_name}
                    className="w-full max-w-md h-auto object-contain rounded-lg"
                    style={{ maxHeight: '400px' }}
                  />
                </div>
              )}

              {selectedItem.display_description && (
                <p className="text-gray-700 mb-4">{selectedItem.display_description}</p>
              )}

              {selectedItem.display_price && (
                <div className="text-3xl font-bold text-blue-600 mb-4">
                  {formatPrice(selectedItem.display_price)}
                </div>
              )}

              {selectedItem.allergens && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">{t('qr_allergens')}</h3>
                  <p className="text-sm text-gray-600">{selectedItem.allergens}</p>
                </div>
              )}

              {selectedItem.calories && (
                <div className="mb-4">
                  <span className="text-sm text-gray-600">{t('qr_calories')}: </span>
                  <span className="font-semibold">{selectedItem.calories} kcal</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
