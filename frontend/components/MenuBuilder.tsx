'use client';

import { useState } from 'react';
import Link from 'next/link';
import ContentLibrary from '@/components/ContentLibrary';
import { useTranslation } from '@/lib/i18n/useTranslation';

export interface MenuBuilderItem {
  tempId: string;
  id?: string;
  name: string;
  description?: string;
  price?: string;
  image_url?: string;
  pageIndex: number;
}

export interface PageConfig {
  name: string;
  order: number;
}

const PLACEHOLDER_IMG = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23374151" width="100" height="100"/%3E%3Ctext fill="%239ca3af" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em"%3EResim%3C/text%3E%3C/svg%3E';

interface MenuBuilderProps {
  menuName: string;
  setMenuName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  slideDuration: number;
  setSlideDuration: (v: number) => void;
  businessId: string;
  setBusinessId: (v: string) => void;
  businesses: any[];
  pages: PageConfig[];
  setPages: (v: PageConfig[] | ((prev: PageConfig[]) => PageConfig[])) => void;
  activePageIndex: number;
  setActivePageIndex: (v: number) => void;
  items: MenuBuilderItem[];
  setItems: (v: MenuBuilderItem[] | ((prev: MenuBuilderItem[]) => MenuBuilderItem[])) => void;
  onSave: () => void;
  saving: boolean;
  error: string;
  backHref: string;
  saveLabel?: string;
  /** QR sayfası arka planı (menü düzenlerken yayındaki QR sayfasının görünümü) */
  qrBackgroundImageUrl?: string;
  qrBackgroundColor?: string;
  setQrBackgroundImageUrl?: (v: string) => void;
  setQrBackgroundColor?: (v: string) => void;
  onSaveQrBackground?: () => void;
  savingQrBackground?: boolean;
}

export default function MenuBuilder({
  menuName,
  setMenuName,
  description,
  setDescription,
  slideDuration,
  setSlideDuration,
  businessId,
  setBusinessId,
  businesses,
  pages,
  setPages,
  activePageIndex,
  setActivePageIndex,
  items,
  setItems,
  onSave,
  saving,
  error,
  backHref,
  saveLabel = 'Kaydet',
  qrBackgroundImageUrl = '',
  qrBackgroundColor = '',
  setQrBackgroundImageUrl,
  setQrBackgroundColor,
  onSaveQrBackground,
  savingQrBackground = false,
}: MenuBuilderProps) {
  const { t } = useTranslation();
  const [showContentLibrary, setShowContentLibrary] = useState(true);
  const [showQrBackground, setShowQrBackground] = useState(false);

  const handleContentSelect = (content: any) => {
    const name = content.name || content.title || t('menus_new_product');
    let image_url = content.url || content.image_url;
    if (content.type === 'icon' && content.content) image_url = undefined;
    setItems((prev) => [
      ...prev,
      {
        tempId: `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: typeof name === 'string' ? name : t('menus_new_product'),
        image_url: image_url || undefined,
        pageIndex: activePageIndex,
      },
    ]);
  };

  const addPage = () => {
    const newOrder = pages.length;
    setPages((prev) => [...prev, { name: `${t('menus_page_default')} ${newOrder + 1}`, order: newOrder }]);
    setActivePageIndex(newOrder);
  };

  const removePage = (index: number) => {
    if (pages.length <= 1) return;
    setPages((prev) => prev.filter((_, i) => i !== index));
    setItems((prev) =>
      prev.map((it) => ({
        ...it,
        pageIndex: it.pageIndex > index ? it.pageIndex - 1 : it.pageIndex === index ? 0 : it.pageIndex,
      }))
    );
    const newIndex =
      activePageIndex === index
        ? index > 0 ? index - 1 : 0
        : activePageIndex > index
          ? activePageIndex - 1
          : activePageIndex;
    setActivePageIndex(Math.min(Math.max(0, newIndex), pages.length - 2));
  };

  const renamePage = (index: number, newName: string) => {
    setPages((prev) => prev.map((p, i) => (i === index ? { ...p, name: newName } : p)));
  };

  const removeItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const updateItem = (tempId: string, updates: Partial<MenuBuilderItem>) => {
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, ...updates } : it)));
  };

  const itemsInCurrentPage = items.filter((it) => it.pageIndex === activePageIndex);

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex flex-wrap items-center gap-4">
        <Link href={backHref} className="text-slate-400 hover:text-white text-sm">
          ← {t('menus_back')}
        </Link>
        <div className="flex-1 flex flex-wrap gap-4 items-center">
          {businesses.length > 1 && (
            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
            >
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <input
            type="text"
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder={t('menus_title') + ' *'}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 w-48"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('menus_description_placeholder')}
            className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 w-40"
          />
          <input
            type="number"
            min={1}
            value={slideDuration}
            onChange={(e) => setSlideDuration(parseInt(e.target.value) || 5)}
            className="w-20 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
          />
          <span className="text-slate-400 text-sm">{t('menus_slide')}</span>
        </div>
        <div className="flex gap-2">
          {businessId && setQrBackgroundImageUrl && onSaveQrBackground && (
            <button
              type="button"
              onClick={() => setShowQrBackground((v) => !v)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
            >
              {showQrBackground ? '🖼️ ' + t('qr_background_hide') : '🖼️ ' + t('qr_background_edit')}
            </button>
          )}
          <button
            onClick={() => setShowContentLibrary(!showContentLibrary)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm"
          >
            {showContentLibrary ? '📚 ' + t('menus_hide_library') : '📚 ' + t('menus_show_library')}
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-white font-medium"
          >
            {saving ? t('editor_saving') : saveLabel}
          </button>
          <Link
            href={backHref}
            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-white text-sm"
          >
            {t('btn_cancel')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-2 p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
          {error}
        </div>
      )}

      {businessId && showQrBackground && setQrBackgroundImageUrl && setQrBackgroundColor && onSaveQrBackground && (
        <div className="mx-4 mt-2 p-4 bg-slate-800 border border-slate-600 rounded-lg">
          <h3 className="text-white font-medium mb-3">{t('qr_background_title')}</h3>
          <p className="text-slate-400 text-sm mb-3">{t('qr_background_description')}</p>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('qr_background_image_url')}</label>
              <input
                type="url"
                value={qrBackgroundImageUrl}
                onChange={(e) => setQrBackgroundImageUrl(e.target.value)}
                placeholder="https://..."
                className="w-72 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('qr_background_color')}</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  value={qrBackgroundColor}
                  onChange={(e) => setQrBackgroundColor(e.target.value)}
                  placeholder="#f3f4f6"
                  className="w-28 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm"
                />
                <input
                  type="color"
                  value={qrBackgroundColor && /^#[0-9A-Fa-f]{6}$/.test(qrBackgroundColor) ? qrBackgroundColor : '#f3f4f6'}
                  onChange={(e) => setQrBackgroundColor(e.target.value)}
                  className="w-10 h-10 rounded border border-slate-600 cursor-pointer bg-slate-700"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={onSaveQrBackground}
              disabled={savingQrBackground}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-white text-sm"
            >
              {savingQrBackground ? t('common_loading') : t('qr_background_save')}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {showContentLibrary && (
          <div className="w-80 flex-shrink-0 border-r border-slate-700 flex flex-col bg-slate-800/50">
            <div className="p-3 border-b border-slate-700">
              <h3 className="font-semibold text-white">{t('editor_content_library')}</h3>
              <p className="text-xs text-slate-400 mt-1">{t('menus_click_to_add')}</p>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <ContentLibrary onSelectContent={handleContentSelect} />
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col overflow-hidden p-4">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {pages.map((p, idx) => (
              <div
                key={idx}
                role="button"
                tabIndex={0}
                onClick={() => setActivePageIndex(idx)}
                onKeyDown={(e) => e.key === 'Enter' && setActivePageIndex(idx)}
                className={`flex items-center gap-1 px-4 py-2 rounded-lg border transition-colors cursor-pointer ${
                  activePageIndex === idx ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <input
                  type="text"
                  value={p.name}
                  onChange={(e) => { e.stopPropagation(); renamePage(idx, e.target.value); }}
                  className="bg-transparent border-none outline-none w-28 text-sm font-medium"
                  style={{ color: 'inherit' }}
                  placeholder={t('menus_page_placeholder')}
                />
                {pages.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removePage(idx); }}
                    className="ml-1 text-slate-400 hover:text-red-400 text-lg leading-none"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addPage}
              className="px-4 py-2 rounded-lg border border-dashed border-slate-500 text-slate-400 hover:border-slate-400 hover:text-slate-300 text-sm"
            >
              + {t('menus_add_page')}
            </button>
          </div>

          <div className="flex-1 overflow-auto bg-slate-800/30 rounded-xl border border-slate-700 p-6">
            <h4 className="text-white font-medium mb-4">{pages[activePageIndex]?.name || t('menus_page_default')} – {t('menus_products')}</h4>
            {itemsInCurrentPage.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <p className="mb-2">{t('menus_no_products')}</p>
                <p className="text-sm">{t('menus_select_from_library')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {itemsInCurrentPage.map((item) => (
                  <div key={item.tempId} className="bg-slate-700/50 rounded-xl overflow-hidden border border-slate-600 group">
                    <div className="aspect-square bg-slate-600 relative">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={(e) => ((e.target as HTMLImageElement).src = PLACEHOLDER_IMG)} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-500">📦</div>
                      )}
                      <button
                        onClick={() => removeItem(item.tempId)}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-600 hover:bg-red-700 rounded-full text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(item.tempId, { name: e.target.value })}
                        placeholder={t('menus_product_name_placeholder')}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      />
                      <input
                        type="text"
                        value={item.price || ''}
                        onChange={(e) => updateItem(item.tempId, { price: e.target.value })}
                        placeholder={t('menus_price_placeholder')}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm"
                      />
                      <textarea
                        value={item.description || ''}
                        onChange={(e) => updateItem(item.tempId, { description: e.target.value })}
                        placeholder={t('menus_product_desc_placeholder')}
                        rows={2}
                        className="w-full px-2 py-1 bg-slate-800 border border-slate-600 rounded text-white text-sm resize-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
