'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface Block {
  id: string;
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  animation_type: string;
  animation_duration: number;
  animation_delay: number;
  block_index: number;
  is_locked: boolean;
}

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { t, localePath } = useTranslation();
  const screenId = (params?.id ?? '') as string;

  const [screen, setScreen] = useState<any>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<Layout[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiParams, setAiParams] = useState({
    business_type: 'pizza',
    style: 'modern',
    content_type: 'balanced',
  });
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cols = 100;
  const rowHeight = 1;

  useEffect(() => {
    loadData();
  }, [screenId]);

  const loadData = async () => {
    try {
      const [screenData, blocksData] = await Promise.all([
        apiClient(`/screens/${screenId}`),
        apiClient(`/screen-blocks/screen/${screenId}`),
      ]);

      setScreen(screenData);

      if (blocksData && blocksData.length > 0) {
        const gridLayout: Layout[] = blocksData.map((block: any) => ({
          i: block.id,
          x: Math.max(0, Math.min(100, Math.round(Number(block.position_x) || 0))),
          y: Math.max(0, Math.min(100, Math.round(Number(block.position_y) || 0))),
          w: Math.max(5, Math.min(100, Math.round(Number(block.width) || 20))),
          h: Math.max(5, Math.min(100, Math.round(Number(block.height) || 20))),
          minW: 5,
          minH: 5,
          maxW: 100,
          maxH: 100,
          isResizable: !block.is_locked,
          isDraggable: !block.is_locked,
        }));

        setLayout(gridLayout);
        setBlocks(blocksData);
        setHistory([gridLayout]);
        setHistoryIndex(0);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const saveBlockPositions = useCallback(async (newLayout: Layout[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updates = newLayout.map((item) => {
          const layoutItem = item as any;
          return {
            id: layoutItem.i,
            updates: {
              position_x: Math.max(0, Math.min(100, Number(layoutItem.x))),
              position_y: Math.max(0, Math.min(100, Number(layoutItem.y))),
              width: Math.max(5, Math.min(100, Number(layoutItem.w))),
              height: Math.max(5, Math.min(100, Number(layoutItem.h))),
            },
          };
        });

        await apiClient('/screen-blocks/batch-update', {
          method: 'POST',
          body: JSON.stringify({ updates }),
        });

        setBlocks((prev) =>
          prev.map((block) => {
            const update = updates.find((u) => u.id === block.id);
            if (update) {
              return {
                ...block,
                position_x: update.updates.position_x,
                position_y: update.updates.position_y,
                width: update.updates.width,
                height: update.updates.height,
              };
            }
            return block;
          })
        );
      } catch (err: any) {
        console.error('Error saving positions:', err);
        setError(err.message || 'Pozisyonlar kaydedilemedi');
      } finally {
        setSaving(false);
      }
    }, 500);
  }, []);

  const onLayoutChange = (newLayout: Layout) => {
    const layoutArray = Array.isArray(newLayout) ? (newLayout as any) : [newLayout];
    setLayout(layoutArray);
    saveBlockPositions(layoutArray);

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(layoutArray);
      if (newHistory.length > 50) newHistory.shift();
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevLayout = history[historyIndex - 1];
      setLayout(prevLayout);
      setHistoryIndex((prev) => prev - 1);
      saveBlockPositions(prevLayout);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextLayout = history[historyIndex + 1];
      setLayout(nextLayout);
      setHistoryIndex((prev) => prev + 1);
      saveBlockPositions(nextLayout);
    }
  };

  const handleBlockClick = (blockId: string) => {
    setSelectedBlock(blockId);
  };

  const handleLayerOrder = async (blockId: string, direction: 'up' | 'down') => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;

    const currentZIndex = Number(block.z_index) || 0;
    const newZIndex = direction === 'up' ? currentZIndex + 1 : Math.max(0, currentZIndex - 1);

    try {
      await apiClient(`/screen-blocks/screen/${screenId}/layer-order`, {
        method: 'POST',
        body: JSON.stringify({
          blockOrders: [{ id: blockId, z_index: newZIndex }],
        }),
      });
      await loadData();
    } catch (err: any) {
      alert('Katman sırası güncellenemedi: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('common_loading')}</div>
      </div>
    );
  }

  if (!screen || blocks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-4xl mx-auto bg-white rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Template Editor</h2>
          <p className="text-gray-600 mb-4">
            Bu ekran için henüz template seçilmemiş veya blok yok.
          </p>
          <Link
            href={localePath(`/screens/${screenId}/template`)}
            className="text-blue-600 hover:underline"
          >
            Template Seç →
          </Link>
        </div>
      </div>
    );
  }

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                Dijital Menü Yönetimi
              </Link>
              <span className="text-gray-500">/</span>
              <Link href={localePath(`/screens/${screenId}`)} className="text-gray-700 hover:text-gray-900">
                {screen.name}
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 font-semibold">🎨 Drag & Drop Editor</span>
            </div>
            <div className="flex items-center space-x-2">
              {screen?.public_token && (
                <Link
                  href={localePath(`/display/${screen.public_token}`)}
                  target="_blank"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2"
                >
                  <span>📺</span>
                  TV Önizleme
                </Link>
              )}
              <button
                onClick={() => setShowAIModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm flex items-center gap-2"
              >
                <span>✨</span>
                AI ile Oluştur (Ücretsiz)
              </button>
              {saving && <span className="text-sm text-gray-600">Kaydediliyor...</span>}
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                title="Geri Al (Ctrl+Z)"
              >
                ↶ Geri Al
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                title="Yinele (Ctrl+Y)"
              >
                ↷ Yinele
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Properties Panel */}
          <div className="lg:col-span-1">
            {selectedBlockData ? (
              <div className="bg-white p-6 rounded-xl shadow-lg sticky top-4">
                <h3 className="text-xl font-bold mb-4 text-gray-900">
                  Blok {selectedBlockData.block_index + 1} Özellikleri
                </h3>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      X: {Number(selectedBlockData.position_x || 0).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Math.max(0, Math.min(100, Number(selectedBlockData.position_x || 0)))}
                      onChange={(e) => {
                        const newValue = Math.max(0, Math.min(100, parseInt(e.target.value)));
                        const newLayout = layout.map((l) => {
                          const layoutItem = l as any;
                          return layoutItem.i === selectedBlock ? { ...layoutItem, x: newValue } : layoutItem;
                        });
                        onLayoutChange(newLayout);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Y: {Number(selectedBlockData.position_y || 0).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={Number(selectedBlockData.position_y || 0)}
                      onChange={(e) => {
                        const newValue = parseInt(e.target.value);
                        const newLayout = layout.map((l) => {
                          const layoutItem = l as any;
                          return layoutItem.i === selectedBlock ? { ...layoutItem, y: newValue } : layoutItem;
                        });
                        onLayoutChange(newLayout);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Genişlik: {Number(selectedBlockData.width || 20).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={Math.max(5, Math.min(100, Number(selectedBlockData.width || 20)))}
                      onChange={(e) => {
                        const newValue = Math.max(5, Math.min(100, parseInt(e.target.value)));
                        const newLayout = layout.map((l) => {
                          const layoutItem = l as any;
                          return layoutItem.i === selectedBlock ? { ...layoutItem, w: newValue } : layoutItem;
                        });
                        onLayoutChange(newLayout);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Yükseklik: {Number(selectedBlockData.height || 20).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={Math.max(5, Math.min(100, Number(selectedBlockData.height || 20)))}
                      onChange={(e) => {
                        const newValue = Math.max(5, Math.min(100, parseInt(e.target.value)));
                        const newLayout = layout.map((l) => {
                          const layoutItem = l as any;
                          return layoutItem.i === selectedBlock ? { ...layoutItem, h: newValue } : layoutItem;
                        });
                        onLayoutChange(newLayout);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-4 mb-6 border-t pt-4">
                  <h4 className="font-semibold text-gray-800">Animasyon</h4>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Tip
                    </label>
                    <select
                      value={selectedBlockData.animation_type || 'fade'}
                      onChange={async (e) => {
                        try {
                          await apiClient(`/screen-blocks/${selectedBlock}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ animation_type: e.target.value }),
                          });
                          await loadData();
                        } catch (err: any) {
                          alert('Animasyon güncellenemedi: ' + err.message);
                        }
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                    >
                      <option value="none">Yok</option>
                      <option value="fade">Fade</option>
                      <option value="slide">Slide</option>
                      <option value="zoom">Zoom</option>
                      <option value="rotate">Rotate</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">
                      Süre: {Number(selectedBlockData.animation_duration || 500)}ms
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="5000"
                      step="100"
                      value={Number(selectedBlockData.animation_duration || 500)}
                      onChange={async (e) => {
                        try {
                          await apiClient(`/screen-blocks/${selectedBlock}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ animation_duration: parseInt(e.target.value) }),
                          });
                          await loadData();
                        } catch (err: any) {
                          alert('Animasyon süresi güncellenemedi: ' + err.message);
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <h4 className="font-semibold text-gray-800 mb-2">Katman</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectedBlock && handleLayerOrder(selectedBlock, 'up')}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Öne Getir
                    </button>
                    <button
                      onClick={() => selectedBlock && handleLayerOrder(selectedBlock, 'down')}
                      className="flex-1 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Geri Gönder
                    </button>
                  </div>
                </div>

                <div className="mt-6 border-t pt-4">
                  <Link
                    href={localePath(`/screens/${screenId}/template`)}
                    className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mb-2"
                  >
                    İçerik Düzenle
                  </Link>
                </div>
              </div>
            ) : (
              <div className="bg-white p-6 rounded-xl shadow-lg">
                <p className="text-gray-600 text-center">
                  Bir blok seçmek için canvas'ta bir bloka tıklayın
                </p>
              </div>
            )}
          </div>

          {/* Center: Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">Canvas (16:9 TV Oranı)</h2>
              <div
                className="relative bg-gray-100 border-2 border-gray-300 rounded-lg overflow-hidden"
                style={{ aspectRatio: '16/9', minHeight: '400px' }}
              >
                <GridLayout
                  className="layout"
                  {...({
                    layout: layout as any,
                    cols,
                    rowHeight,
                    width: 1200,
                    onLayoutChange,
                    isDraggable: true,
                    isResizable: true,
                    compactType: null,
                    preventCollision: false,
                  } as any)}
                >
                  {blocks.map((block) => (
                    <div
                      key={block.id}
                      className={`bg-white border-2 rounded-lg cursor-move ${
                        selectedBlock === block.id
                          ? 'border-blue-500 shadow-lg'
                          : 'border-gray-300 hover:border-gray-400'
                      } ${block.is_locked ? 'opacity-50' : ''}`}
                      onClick={() => handleBlockClick(block.id)}
                    >
                      <div className="p-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700">
                          Blok {block.block_index + 1}
                        </span>
                        {block.is_locked && (
                          <span className="text-xs text-gray-500">🔒</span>
                        )}
                      </div>
                      <div className="p-4 text-center text-sm text-gray-600">
                        <div>
                          <div className="font-semibold">İçerik var</div>
                          <div className="text-xs mt-1">
                            {Number(block.width || 0).toFixed(0)}% × {Number(block.height || 0).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </GridLayout>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ✨ AI ile Template Oluştur (Ücretsiz)
            </h2>
            <p className="text-gray-600 mb-6">
              AI, işletme tipinize ve tercihlerinize göre profesyonel bir template oluşturacak.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  İşletme Tipi
                </label>
                <select
                  value={aiParams.business_type}
                  onChange={(e) => setAiParams({ ...aiParams, business_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="pizza">Pizza</option>
                  <option value="cafe">Cafe</option>
                  <option value="burger">Burger</option>
                  <option value="bakery">Fırın / Pastane</option>
                  <option value="restaurant">Restoran</option>
                  <option value="bar">Bar</option>
                  <option value="ice_cream">Dondurma</option>
                  <option value="other">Diğer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Stil
                </label>
                <select
                  value={aiParams.style}
                  onChange={(e) => setAiParams({ ...aiParams, style: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">Klasik</option>
                  <option value="minimal">Minimal</option>
                  <option value="colorful">Renkli</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  İçerik Tipi
                </label>
                <select
                  value={aiParams.content_type}
                  onChange={(e) => setAiParams({ ...aiParams, content_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                >
                  <option value="balanced">Dengeli</option>
                  <option value="menu-heavy">Menü Ağırlıklı</option>
                  <option value="image-heavy">Görsel Ağırlıklı</option>
                  <option value="campaign-focused">Kampanya Odaklı</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                İptal
              </button>
              <button
                onClick={async () => {
                  try {
                    setSaving(true);
                    const result = await apiClient('/ai-templates/generate', {
                      method: 'POST',
                      body: JSON.stringify({
                        ...aiParams,
                        business_id: screen?.business_id,
                      }),
                    });

                    // Apply generated template to screen
                    await apiClient('/templates/apply', {
                      method: 'POST',
                      body: JSON.stringify({
                        template_id: result.template.id,
                        screen_id: screenId,
                        keep_content: false,
                      }),
                    });

                    alert('AI template başarıyla oluşturuldu ve ekrana uygulandı!');
                    setShowAIModal(false);
                    await loadData();
                  } catch (err: any) {
                    console.error('Error generating AI template:', err);
                    alert('AI template oluşturulamadı: ' + err.message);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold disabled:opacity-50"
              >
                {saving ? 'Oluşturuluyor...' : '✨ Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
