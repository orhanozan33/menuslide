'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

const STORAGE_KEY = 'simple-tv-editor';
const API_BASE = typeof window !== 'undefined' ? ((typeof process.env.NEXT_PUBLIC_API_URL === 'string' && process.env.NEXT_PUBLIC_API_URL.trim()) ? process.env.NEXT_PUBLIC_API_URL.trim() : '/api/proxy') : '';

interface LibraryItem {
  id: string;
  name: string;
  type: string;
  category?: string;
  url?: string;
  content?: string;
  gradient?: string;
  color?: string;
}

interface LibraryCategory {
  id: string;
  slug: string;
  label: string;
  icon: string;
  display_order?: number;
}

type Layout = 1 | 2 | 3;

interface BlockContent {
  text: string;
  imageUrl: string;
  videoUrl: string;
  overlayImageUrl: string; // resim/video üzerine küçük logo vb.
}

const defaultBlocks = (n: Layout): BlockContent[] =>
  Array.from({ length: n }, () => ({ text: '', imageUrl: '', videoUrl: '', overlayImageUrl: '' }));

/** Görüntüleme için tam URL (video/resim backend'deyse) */
function mediaDisplayUrl(url: string): string {
  if (!url) return '';
  return url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** Örnek editor içeriği — demo / örnek sayfa */
const EXAMPLE: { layout: Layout; blocks: BlockContent[] } = {
  layout: 2,
  blocks: [
    { text: '', imageUrl: '', videoUrl: '', overlayImageUrl: '' },
    { text: '', imageUrl: '', videoUrl: '', overlayImageUrl: '' },
  ],
};

export default function SimpleTvEditor() {
  const { t } = useTranslation();
  const [layout, setLayout] = useState<Layout>(1);
  const [blocks, setBlocks] = useState<BlockContent[]>(defaultBlocks(1));
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryCategories, setLibraryCategories] = useState<LibraryCategory[]>([]);
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<string>('all');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [overlayTargetBlock, setOverlayTargetBlock] = useState<number | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Layout değişince blokları sıfırla veya uyarla
  useEffect(() => {
    setBlocks((prev) => {
      const next = defaultBlocks(layout);
      for (let i = 0; i < Math.min(prev.length, next.length); i++) next[i] = prev[i];
      return next;
    });
    setSelectedIndex(null);
  }, [layout]);

  // Kaydet
  const save = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout, blocks }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      //
    }
  }, [layout, blocks]);

  // Örnek yükle
  const loadExample = useCallback(() => {
    setLayout(EXAMPLE.layout);
    setBlocks(
      EXAMPLE.blocks.map((b) => ({ ...b })).concat(defaultBlocks(EXAMPLE.layout).slice(EXAMPLE.blocks.length))
    );
    setSelectedIndex(null);
  }, []);

  // Yükle: önce kayıtlı veri, yoksa örnek
  useEffect(() => {
    if (loaded) return;
    setLoaded(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { layout?: Layout; blocks?: Partial<BlockContent>[] };
        if (data.layout) setLayout(data.layout);
        if (Array.isArray(data.blocks) && data.blocks.length) {
          setBlocks(
            data.blocks.map((b) => ({
              text: b.text ?? '',
              imageUrl: b.imageUrl ?? '',
              videoUrl: b.videoUrl ?? '',
              overlayImageUrl: b.overlayImageUrl ?? '',
            }))
          );
        }
      } else {
        loadExample();
      }
    } catch {
      loadExample();
    }
  }, [loaded, loadExample]);

  const updateBlock = useCallback((index: number, field: keyof BlockContent, value: string) => {
    setBlocks((prev) => {
      const next = [...prev];
      if (!next[index]) next[index] = { text: '', imageUrl: '', videoUrl: '', overlayImageUrl: '' };
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }, []);

  const handleImageUpload = useCallback(
    async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file?.type.startsWith('image/')) return;
      const form = new FormData();
      form.append('files', file);
      try {
        const res = await fetch('/api/upload', { method: 'POST', body: form });
        const json = await res.json();
        const url = json.assets?.[0]?.src ?? json.data?.[0]?.src ?? '';
        if (url) updateBlock(index, 'imageUrl', url);
      } catch {
        //
      }
      e.target.value = '';
    },
    [updateBlock]
  );

  const openLibrary = useCallback((forOverlayBlock: number | null = null) => {
    setOverlayTargetBlock(forOverlayBlock);
    setShowLibraryModal(true);
    setLibraryItems([]);
    setLibraryCategories([]);
    setLibraryCategoryFilter('all');
    setLibraryLoading(true);
    Promise.all([
      apiClient('/content-library'),
      apiClient('/content-library/categories').catch(() => []),
    ])
      .then(([itemsData, catsData]) => {
        let flat: LibraryItem[] = [];
        if (typeof itemsData === 'object' && itemsData !== null && !Array.isArray(itemsData)) {
          Object.values(itemsData).forEach((arr: unknown) => {
            if (Array.isArray(arr)) flat.push(...(arr as LibraryItem[]));
          });
        } else if (Array.isArray(itemsData)) {
          flat = itemsData as LibraryItem[];
        }
        setLibraryItems(flat);
        setLibraryCategories(Array.isArray(catsData) && catsData.length > 0 ? catsData : []);
      })
      .catch(() => setLibraryItems([]))
      .finally(() => setLibraryLoading(false));
  }, []);

  const fullUrl = useCallback((url: string) => {
    return resolveMediaUrl(url);
  }, []);

  const pickFromLibrary = useCallback(
    (item: LibraryItem) => {
      const blockIndex = overlayTargetBlock !== null ? overlayTargetBlock : selectedIndex;
      if (blockIndex === null) return;
      setOverlayTargetBlock(null);
      if (overlayTargetBlock !== null) {
        const url = item.url ? fullUrl(item.url) : '';
        if (url && ['image', 'drink', 'icon', 'background'].includes(item.type)) {
          updateBlock(blockIndex, 'overlayImageUrl', url);
        }
        setShowLibraryModal(false);
        return;
      }
      if (item.type === 'text') {
        updateBlock(blockIndex, 'text', item.content || item.name || '');
        setShowLibraryModal(false);
        return;
      }
      const isVideo = item.type === 'video';
      const url = item.url ? fullUrl(item.url) : '';
      if (isVideo && url) {
        updateBlock(blockIndex, 'videoUrl', url);
        updateBlock(blockIndex, 'imageUrl', '');
      } else if (url) {
        updateBlock(blockIndex, 'imageUrl', url);
        updateBlock(blockIndex, 'videoUrl', '');
      }
      setShowLibraryModal(false);
    },
    [selectedIndex, overlayTargetBlock, updateBlock, fullUrl]
  );

  const libraryFiltered = libraryCategoryFilter === 'all'
    ? libraryItems
    : libraryItems.filter((i) => (i.category || '') === libraryCategoryFilter);

  const selectedBlock = selectedIndex !== null ? blocks[selectedIndex] : null;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      {/* Sol: Kontroller */}
      <div className="lg:w-72 flex-shrink-0 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-800 mb-2">{t('editor_template_label')}</h3>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setLayout(n)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                  layout === n
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {n === 1 ? 'Tek blok' : n === 2 ? "2'li" : "3'lü"}
              </button>
            ))}
          </div>
        </div>

        {/* Hangi bloğu düzenliyorsunuz — tıklayarak seçin */}
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="font-semibold text-slate-800 mb-2">Düzenlenecek blok</h3>
          <p className="text-xs text-slate-500 mb-2">Düzenlemek istediğiniz bloğu seçin, aşağıda metin ve görsel ekleyin.</p>
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: layout }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedIndex(i)}
                className={`py-2 px-4 rounded-lg text-sm font-medium transition ${
                  selectedIndex === i
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Blok {i + 1}
              </button>
            ))}
          </div>
        </div>

        {selectedBlock && selectedIndex !== null && (
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <h3 className="font-semibold text-slate-800 mb-2">Blok {selectedIndex + 1}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Üzerine yazı (resim/video üstünde)</label>
                <textarea
                  value={selectedBlock.text}
                  onChange={(e) => updateBlock(selectedIndex, 'text', e.target.value)}
                  className="w-full rounded border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
                  placeholder="Blokta görünecek yazı (logo altı, kampanya metni vb.)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Arka plan: Görsel / Video</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openLibrary()}
                    className="flex-1 min-w-[120px] py-2 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    Kütüphaneden seç
                  </button>
                  <label className="flex-1 min-w-[100px] py-2 px-3 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 text-center cursor-pointer">
                    Dosya seç
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(selectedIndex, e)}
                      className="hidden"
                    />
                  </label>
                </div>
                {(selectedBlock.imageUrl || selectedBlock.videoUrl) && (
                  <div className="mt-2 relative inline-block">
                    {selectedBlock.videoUrl ? (
                      <div className="max-h-24 rounded border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center w-32 h-24">
                        <video src={selectedBlock.videoUrl} className="max-h-full max-w-full object-contain" muted />
                        <span className="absolute text-xs text-slate-600 bg-white/90 px-2 py-1 rounded">Video</span>
                      </div>
                    ) : selectedBlock.imageUrl ? (
                      <img
                        src={selectedBlock.imageUrl}
                        alt=""
                        className="max-h-24 rounded border border-slate-200"
                      />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => {
                        updateBlock(selectedIndex, 'imageUrl', '');
                        updateBlock(selectedIndex, 'videoUrl', '');
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Üzerine küçük görsel (logo, ikon)</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openLibrary(selectedIndex)}
                    className="flex-1 min-w-[100px] py-2 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    Kütüphaneden
                  </button>
                  <label className="flex-1 min-w-[80px] py-2 px-3 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 text-center cursor-pointer">
                    Dosya
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file?.type.startsWith('image/') || selectedIndex === null) return;
                        const form = new FormData();
                        form.append('files', file);
                        fetch('/api/upload', { method: 'POST', body: form })
                          .then((r) => r.json())
                          .then((j) => {
                            const u = j.assets?.[0]?.src ?? j.data?.[0]?.src ?? '';
                            if (u) updateBlock(selectedIndex, 'overlayImageUrl', u);
                          });
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
                {selectedBlock.overlayImageUrl && (
                  <div className="mt-2 relative inline-block">
                    <img src={selectedBlock.overlayImageUrl} alt="" className="max-h-16 rounded border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => updateBlock(selectedIndex, 'overlayImageUrl', '')}
                      className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={save}
            className="flex-1 min-w-[100px] py-2 px-4 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
          >
            {saved ? 'Kaydedildi' : 'Kaydet'}
          </button>
          <button
            type="button"
            onClick={loadExample}
            className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
          >
            Örnek yükle
          </button>
        </div>

        {selectedIndex === null && (
          <p className="text-sm text-slate-500">Yukarıdan &quot;Blok 1&quot;, &quot;Blok 2&quot; vb. seçin; metin ve görsel ekleyin.</p>
        )}
      </div>

      {/* Sağ: 16:9 Önizleme */}
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border-2 border-slate-300 bg-slate-900 overflow-hidden shadow-lg max-w-4xl mx-auto">
          <div
            ref={previewRef}
            className="w-full relative"
            style={{ aspectRatio: '16/9' }}
          >
            <div
              className="absolute inset-0 grid gap-2 p-2 box-border"
              style={{
                gridTemplateColumns: layout === 1 ? '1fr' : layout === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
              }}
            >
              {blocks.slice(0, layout).map((block, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedIndex(i)}
                  className={`relative flex flex-col rounded-lg overflow-hidden transition outline-none text-left ${
                    selectedIndex === i
                      ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-900'
                      : 'hover:ring-2 hover:ring-slate-500 hover:ring-offset-2 hover:ring-offset-slate-900'
                  }`}
                >
                  {block.videoUrl ? (
                    <video
                      src={mediaDisplayUrl(block.videoUrl)}
                      className="w-full h-full object-cover min-h-0 flex-1"
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                  ) : block.imageUrl ? (
                    <img
                      src={mediaDisplayUrl(block.imageUrl)}
                      alt=""
                      className="w-full h-full object-cover min-h-0 flex-1"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800/50 text-slate-500 text-sm flex-1">
                      Görsel / video yok
                    </div>
                  )}
                  {block.overlayImageUrl && (
                    <div className="absolute top-1 right-1 w-[20%] max-w-[80px] aspect-square z-10 flex items-center justify-center bg-white/90 rounded-lg overflow-hidden shadow">
                      <img src={mediaDisplayUrl(block.overlayImageUrl)} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {block.text && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-2 px-2 text-sm z-10">
                      {block.text}
                    </div>
                  )}
                  {!block.imageUrl && !block.videoUrl && (
                    <span className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                      Blok {i + 1} — tıklayın
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="py-2.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow"
          >
            Tam ekran (TV gibi)
          </button>
          <span className="text-slate-500 text-sm">
            TV görünümü (16:9) — {layout} blok
          </span>
        </div>
      </div>

      {/* Ön izleme — Tam ekran TV */}
      {showPreview && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4"
          role="dialog"
          aria-label="Ön izleme"
        >
          <button
            type="button"
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl"
            aria-label="Kapat"
          >
            ×
          </button>
          <div className="w-full max-w-5xl mx-auto" style={{ aspectRatio: '16/9' }}>
            <div
              className="w-full h-full grid gap-2 p-2 rounded-xl overflow-hidden bg-slate-900 border-2 border-slate-600"
              style={{
                gridTemplateColumns: layout === 1 ? '1fr' : layout === 2 ? '1fr 1fr' : '1fr 1fr 1fr',
              }}
            >
              {blocks.slice(0, layout).map((block, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden bg-slate-800">
                  {block.videoUrl ? (
                    <video
                      src={mediaDisplayUrl(block.videoUrl)}
                      className="w-full h-full object-cover min-h-0"
                      muted
                      loop
                      playsInline
                      autoPlay
                      preload="auto"
                    />
                  ) : block.imageUrl ? (
                    <img
                      src={mediaDisplayUrl(block.imageUrl)}
                      alt=""
                      className="w-full h-full object-cover min-h-0"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800/80 text-slate-500">
                      Görsel / video yok
                    </div>
                  )}
                  {block.overlayImageUrl && (
                    <div className="absolute top-2 right-2 w-[18%] max-w-[100px] aspect-square z-10 flex items-center justify-center bg-white/95 rounded-lg overflow-hidden shadow-lg">
                      <img src={mediaDisplayUrl(block.overlayImageUrl)} alt="" className="w-full h-full object-contain" />
                    </div>
                  )}
                  {block.text && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-3 px-3 text-base sm:text-lg z-10">
                      {block.text}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-3 text-slate-400 text-sm">TV görünümü (16:9) — {layout} blok</p>
        </div>
      )}

      {/* İçerik Kütüphanesi modal — tüm kategoriler, video / görsel / her şey */}
      {showLibraryModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowLibraryModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">İçerik Kütüphanesi</h3>
              <button
                type="button"
                onClick={() => setShowLibraryModal(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
                aria-label="Kapat"
              >
                ×
              </button>
            </div>
            {/* Kategori seçimi */}
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLibraryCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  libraryCategoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Tümü
              </button>
              {libraryCategories
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setLibraryCategoryFilter(cat.slug)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                      libraryCategoryFilter === cat.slug ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {libraryLoading ? (
                <p className="text-center text-slate-500 py-8">Yükleniyor…</p>
              ) : libraryFiltered.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  {libraryCategoryFilter === 'all' ? 'Kütüphanede içerik yok. İçerik Kütüphanesi sayfasından ekleyin.' : 'Bu kategoride içerik yok.'}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {libraryFiltered.map((item) => {
                    const url = item.url ? fullUrl(item.url) : '';
                    const isVideo = item.type === 'video';
                    const isImage = ['image', 'drink', 'icon', 'background'].includes(item.type);
                    const hasGradient = item.gradient && item.type === 'background';
                    const hasColor = item.color && (item.type === 'background' || item.type === 'icon');
                    const canPick = url || item.content || item.gradient || item.color;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => canPick && pickFromLibrary(item)}
                        disabled={!canPick}
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-400 hover:ring-2 hover:ring-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isVideo && url ? (
                          <div className="w-full h-full relative bg-slate-800 flex items-center justify-center overflow-hidden">
                            <video
                              src={url}
                              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                              muted
                              playsInline
                              preload="auto"
                              onLoadedData={(e) => {
                                const v = e.target as HTMLVideoElement;
                                if (v.duration && !isNaN(v.duration)) v.currentTime = Math.min(0.5, v.duration * 0.15);
                              }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                              <span className="text-white text-2xl drop-shadow-lg">▶</span>
                            </span>
                          </div>
                        ) : hasGradient ? (
                          <div
                            className="w-full h-full pointer-events-none"
                            style={{ background: item.gradient }}
                          />
                        ) : hasColor ? (
                          <div
                            className="w-full h-full pointer-events-none"
                            style={{ backgroundColor: item.color }}
                          />
                        ) : isImage && url ? (
                          <img
                            src={url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" font-size="10" x="50%" y="50%" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';
                            }}
                          />
                        ) : item.content ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-3xl">
                            {item.content}
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
                            {item.name || '—'}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-1 truncate text-center">
                          {item.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
