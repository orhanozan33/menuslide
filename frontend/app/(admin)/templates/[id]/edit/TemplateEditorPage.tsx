'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';
import ContentLibrary from '@/components/ContentLibrary';
import { logAdminActivity } from '@/lib/admin-activity';
import { VideoRotationPlayer } from '@/components/display/VideoRotationPlayer';
import { ImageRotationPlayer } from '@/components/display/ImageRotationPlayer';
// Resim üzerindeki yazı katmanı tipi
interface TextLayer {
  id: string;
  text: string;
  color: string;
  size: number;
  x: number; // yüzde olarak (0-100)
  y: number; // yüzde olarak (0-100)
  fontWeight: string;
  fontStyle: string;
  fontFamily: string;
  /** Altı çizili / üstü çizili */
  textDecoration?: string;
  /** Metin hizalaması */
  textAlign?: 'left' | 'center' | 'right';
  /** İkon/simge (emoji veya karakter) */
  icon?: string;
  /** Simge yazıdan önce mi sonra mı */
  iconPosition?: 'before' | 'after';
  /** Hareketli indirim bloğu olarak göster (badge + animasyon) */
  isDiscountBlock?: boolean;
  /** İndirim yüzdesi (örn. 20 → "%20 İndirim") */
  discountPercent?: number;
  /** Blok arka plan rengi (hex veya rgba) */
  blockColor?: string;
  /** Hareket tipi: pulse | bounce | shake | glow | wave */
  discountAnimation?: string;
  /** Blok modeli: pill | rounded | badge | ribbon | outline */
  discountBlockStyle?: string;
}

/** Video/resim üzerine eklenen küçük overlay resim katmanı (kütüphaneden) */
interface OverlayImageLayer {
  id: string;
  image_url: string;
  x: number; // yüzde (0-100)
  y: number; // yüzde (0-100)
  size: number; // genişlik yüzdesi (örn. 15)
  shape: 'round' | 'square' | 'rounded' | 'shadow';
}

const OVERLAY_SHAPES = ['round', 'square', 'rounded', 'shadow'] as const;

const DISCOUNT_ANIMATIONS = ['pulse', 'bounce', 'shake', 'glow', 'wave', 'flash', 'swing', 'wiggle', 'float', 'spin', 'heartbeat'] as const;
const DISCOUNT_BLOCK_STYLES = ['pill', 'rounded', 'badge', 'ribbon', 'outline', 'star', 'bubble', 'tag', 'ticket', 'diamond'] as const;

/** Video URL'den süreyi (saniye) tespit eder; yüklenemezse 0 döner */
function getVideoDurationInSeconds(url: string): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const onDone = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('error', onErr);
      video.src = '';
      video.load();
    };
    const onMeta = () => {
      const sec = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      onDone();
      resolve(Math.round(sec));
    };
    const onErr = () => {
      onDone();
      resolve(0);
    };
    video.addEventListener('loadedmetadata', onMeta, { once: true });
    video.addEventListener('error', onErr, { once: true });
    video.src = url;
    video.load();
    timeoutId = setTimeout(onErr, 15000);
  });
}

function getDiscountBlockClasses(layer: { discountAnimation?: string; discountBlockStyle?: string }) {
  const anim = (layer.discountAnimation || 'pulse') as string;
  const style = (layer.discountBlockStyle || 'rounded') as string;
  return `discount-anim-${anim} discount-style-${style}`;
}
function getDiscountBlockStyles(layer: { blockColor?: string; discountBlockStyle?: string }) {
  const blockColor = layer.blockColor || 'rgba(251, 191, 36, 0.95)';
  const isOutline = layer.discountBlockStyle === 'outline';
  return {
    backgroundColor: isOutline ? 'transparent' : blockColor,
    borderColor: blockColor,
    color: isOutline ? blockColor : '#1f2937',
    borderWidth: 2,
    borderStyle: 'solid',
  };
}

import { FONT_GROUPS, FONT_OPTIONS, TEXT_ICON_OPTIONS, GOOGLE_FONT_FAMILIES } from '@/lib/editor-fonts';
import { makeColorTransparent } from '@/lib/image-transparency';

/** Arka plan kaldır: API dene, 501 / Vercel uyumsuzluğu ise tarayıcıda çalıştır */
async function getRemoveBackgroundDataUrl(imageUrl: string): Promise<string> {
  const url = imageUrl.startsWith('/') && !imageUrl.startsWith('//') && typeof window !== 'undefined'
    ? `${window.location.origin}${imageUrl}` : imageUrl;
  try {
    const data = await apiClient('/ai/remove-background', { method: 'POST', body: { image: url } });
    const dataUrl = (data as { dataUrl?: string })?.dataUrl;
    if (dataUrl) return dataUrl;
  } catch (e: any) {
    const useBrowser = e?.status === 501 || (e?.message && /not available on Vercel|external service/i.test(String(e.message)));
    if (!useBrowser) throw e;
  }
  const { removeBackgroundInBrowser } = await import('@/lib/remove-background-browser');
  return removeBackgroundInBrowser(url);
}

interface TemplateEditorPageProps {
  templateId: string;
  showSaveAs?: boolean;
}

export function TemplateEditorPage({ templateId, showSaveAs = false }: TemplateEditorPageProps) {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();

  const [template, setTemplate] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedBlockContent, setSelectedBlockContent] = useState<any>(null);
  const [showContentLibrary, setShowContentLibrary] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [showMergeInput, setShowMergeInput] = useState(false);
  const [mergeBlockNumbersInput, setMergeBlockNumbersInput] = useState('');
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [saveAsChoice, setSaveAsChoice] = useState<'system' | 'user' | null>(null);
  const [saveAsSelectedUserId, setSaveAsSelectedUserId] = useState<string>('');
  const [saveAsUsers, setSaveAsUsers] = useState<any[]>([]);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [showIconPositionModal, setShowIconPositionModal] = useState(false);
  const [pendingIconContent, setPendingIconContent] = useState<any>(null);
  const [showBadgeEditModal, setShowBadgeEditModal] = useState(false);
  const [pendingBadgeContent, setPendingBadgeContent] = useState<any>(null);
  const [editingBadgeText, setEditingBadgeText] = useState<string>('');
  const [editingBadgeBgColor, setEditingBadgeBgColor] = useState<string>('#3B82F6');
  const [editingBadgeTextColor, setEditingBadgeTextColor] = useState<string>('#FFFFFF');
  const [editingBadgePosition, setEditingBadgePosition] = useState<string>('top-left');
  const [editingImageBlur, setEditingImageBlur] = useState<number>(0);

  // Resim yazısı düzenleme modalı - çoklu yazı desteği
  const [showImageTextModal, setShowImageTextModal] = useState(false);
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextLayerId, setSelectedTextLayerId] = useState<string | null>(null);
  const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
  const textPreviewRef = useRef<HTMLDivElement>(null);
  /** Video/resim üzerine eklenen küçük resimler (kütüphaneden) */
  const [overlayImages, setOverlayImages] = useState<OverlayImageLayer[]>([]);
  const [showOverlayImageModal, setShowOverlayImageModal] = useState(false);
  const [overlayNextShape, setOverlayNextShape] = useState<OverlayImageLayer['shape']>('rounded');
  /** Seçilen resim önizleme/düzenleme — Kaydet'e basıldığında bloğa eklenir */
  const [pendingOverlayImage, setPendingOverlayImage] = useState<{ url: string; name: string; shape: OverlayImageLayer['shape'] } | null>(null);
  const [pendingOverlayRemoveBgLoading, setPendingOverlayRemoveBgLoading] = useState(false);
  /** Video döngüsü: ilk video N sn, sonra döngüdeki videolar (her biri kendi süresi + kendi yazıları) */
  const [showVideoRotationModal, setShowVideoRotationModal] = useState(false);
  /** Boş blok tıklandığında: yazı ekle, üzerine resim, video döngü seçenekleri */
  const [showEmptyBlockOptionsModal, setShowEmptyBlockOptionsModal] = useState(false);
  /** Video sırası için kütüphane açıldı - ilk video seçildikten sonra video rotation modal açılacak */
  const [pendingVideoRotationOpen, setPendingVideoRotationOpen] = useState(false);
  const [editingFirstVideoDuration, setEditingFirstVideoDuration] = useState(10);
  const [editingRotationItems, setEditingRotationItems] = useState<Array<{ url: string; durationSeconds: number; sourceDurationSeconds?: number; textLayers?: TextLayer[] }>>([]);
  /** Döngüdeki bir videonun yazılarını düzenlemek için: hangi indeks, geçici yazı listesi */
  const [editingRotationTextIndex, setEditingRotationTextIndex] = useState<number | null>(null);
  const [rotationItemTextLayers, setRotationItemTextLayers] = useState<TextLayer[]>([]);
  const [selectedRotationTextLayerId, setSelectedRotationTextLayerId] = useState<string | null>(null);

  /** Resim döngüsü: birden fazla resim, süre ayarları, geçişler */
  const [showImageRotationModal, setShowImageRotationModal] = useState(false);
  const [editingFirstImageDuration, setEditingFirstImageDuration] = useState(10);
  const [editingFirstImageTitle, setEditingFirstImageTitle] = useState('');
  const [editingFirstImagePrice, setEditingFirstImagePrice] = useState('');
  const [editingImageRotationItems, setEditingImageRotationItems] = useState<Array<{ url: string; durationSeconds: number; textLayers?: TextLayer[]; title?: string; price?: string; isVideo?: boolean }>>([]);
  /** Resim döngüsünde bir resmin yazılarını düzenlemek için: -1 = ilk resim, 0+ = döngü indeksi */
  const [editingImageRotationTextIndex, setEditingImageRotationTextIndex] = useState<number | null>(null);
  const [imageRotationTextLayers, setImageRotationTextLayers] = useState<TextLayer[]>([]);
  const [selectedImageRotationTextLayerId, setSelectedImageRotationTextLayerId] = useState<string | null>(null);
  const [draggingImageRotationLayerId, setDraggingImageRotationLayerId] = useState<string | null>(null);
  const imageRotationTextPreviewRef = useRef<HTMLDivElement>(null);
  /** Resim sıra modalında "Düzenle": kütüphane gizlenir, solda yazı araçları + sağda önizleme + altında döngü listesi */
  const [imageRotationEditMode, setImageRotationEditMode] = useState(false);
  /** Önizlemede gösterilecek öğe: -1 = ilk resim, 0+ = döngü indeksi */
  const [imageRotationPreviewIndex, setImageRotationPreviewIndex] = useState<number>(-1);
  /** Düzenle modunda soldaki yazı araçları için: seçili öğenin yazı katmanları (kaynakla senkron) */
  const [imageRotationInlineTextLayers, setImageRotationInlineTextLayers] = useState<TextLayer[]>([]);
  const [imageRotationInlineSelectedLayerId, setImageRotationInlineSelectedLayerId] = useState<string | null>(null);
  /** Video döngü modalında "Düzenle": kütüphane gizlenir, solda liste + sağda önizleme */
  const [videoRotationEditMode, setVideoRotationEditMode] = useState(false);
  const [videoRotationPreviewIndex, setVideoRotationPreviewIndex] = useState<number>(-1);

  // Tek Menü (Special FOOD MENU) düzenleme modalı: header + 3 kategori
  const [showRegionalMenuEditModal, setShowRegionalMenuEditModal] = useState(false);
  const [editingRegionalHeaderSpecial, setEditingRegionalHeaderSpecial] = useState('');
  const [editingRegionalHeaderTitle, setEditingRegionalHeaderTitle] = useState('');
  const [editingRegionalCategories, setEditingRegionalCategories] = useState<{ id: string; name: string; image_url: string; items: { id: string; name: string; description: string; price: string }[] }[]>([]);
  const [editingRegionalMenuContact, setEditingRegionalMenuContact] = useState('');
  const regionalMenuImageInputRef = useRef<HTMLInputElement>(null);
  const [editingCategoryImageIdx, setEditingCategoryImageIdx] = useState<number | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  /** Ekle paneli: kütüphaneden içerik ekleme (görsel/ikon) */
  const [showAddFromLibraryModal, setShowAddFromLibraryModal] = useState(false);
  const [contentLibraryRefreshTrigger, setContentLibraryRefreshTrigger] = useState(0);
  const [addFromLibraryCategory, setAddFromLibraryCategory] = useState<'image' | 'icon' | undefined>(undefined);
  const blockImageFileInputRef = useRef<HTMLInputElement>(null);

  // Önizlemede yazı sürükleme (fullscreen preview)
  const [previewEditingTextLayers, setPreviewEditingTextLayers] = useState<Record<string, TextLayer[]>>({});
  const [previewDragState, setPreviewDragState] = useState<{ contentId: string; layerId: string; containerEl: HTMLElement; phase?: 'first' | 'rotation'; rotationIndex?: number } | null>(null);
  const [previewResizeState, setPreviewResizeState] = useState<{ contentId: string; layerId: string; containerEl: HTMLElement; handle: string; startSize: number; startX: number; startY: number; phase?: 'first' | 'rotation'; rotationIndex?: number } | null>(null);
  const [selectedOverlayImageId, setSelectedOverlayImageId] = useState<string | null>(null);
  const [previewOverlayDragState, setPreviewOverlayDragState] = useState<{ contentId: string; overlayId: string; containerEl: HTMLElement } | null>(null);
  /** Tam ekran önizlemede seçili olmayan bloktaki overlay sürüklenirken canlı konum (re-render için) */
  const [overlayDragLiveOverlays, setOverlayDragLiveOverlays] = useState<OverlayImageLayer[] | null>(null);
  const [previewOverlayResizeState, setPreviewOverlayResizeState] = useState<{ contentId: string; overlayId: string; containerEl: HTMLElement; handle: string; startSize: number; startX: number; startY: number } | null>(null);
  /** Önizlemede resim manuel ölçeklendirme modu – blok seçili ve resim varsa göster */
  const [scaleModeBlockId, setScaleModeBlockId] = useState<string | null>(null);
  const [imageScaleResizeState, setImageScaleResizeState] = useState<{ blockId: string; contentId: string; containerEl: HTMLElement; handle: string; startScaleX: number; startScaleY: number; startX: number; startY: number } | null>(null);
  useEffect(() => {
    if (imageScaleResizeState) {
      imageScaleDuringResizeRef.current = { scaleX: imageScaleResizeState.startScaleX, scaleY: imageScaleResizeState.startScaleY };
    }
  }, [imageScaleResizeState]);
  const previewDragLayersRef = useRef<TextLayer[] | null>(null);
  const previewResizeLayersRef = useRef<TextLayer[] | null>(null);
  const imageScaleDuringResizeRef = useRef<{ scaleX: number; scaleY: number }>({ scaleX: 1, scaleY: 1 });
  const overlayImagesRef = useRef<OverlayImageLayer[]>([]);
  /** Video döngüsü önizlemede hangi videonun oynadığı (contentId -> phase + index) – yazı katmanlarını buna göre gösteririz */
  const [previewRotationStateByContentId, setPreviewRotationStateByContentId] = useState<Record<string, { phase: 'first' | 'rotation'; index: number }>>({});
  /** Resim döngüsü önizlemede hangi resmin gösterildiği (contentId -> phase + index) */
  const [previewImageRotationStateByContentId, setPreviewImageRotationStateByContentId] = useState<Record<string, { phase: 'first' | 'rotation'; index: number }>>({});
  /** Seçili görsel için: AI/renk arka plan kaldırma */
  const [removeBgColor, setRemoveBgColor] = useState('#ffffff');
  const [removeBgTolerance, setRemoveBgTolerance] = useState(40);
  const [removeBgAiLoading, setRemoveBgAiLoading] = useState(false);
  const [removeBgAiError, setRemoveBgAiError] = useState<string | null>(null);
  const [removeBgLoading, setRemoveBgLoading] = useState(false);
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  // Görsel seç / üzerine resim ekle paneli açıldığında admin ile senkronize yeniden yükle
  useEffect(() => {
    if ((showAddFromLibraryModal && selectedBlock) || showOverlayImageModal) setContentLibraryRefreshTrigger((k) => k + 1);
  }, [showAddFromLibraryModal, selectedBlock, showOverlayImageModal]);

  // Google Fonts yükle (tasarım editörü ile aynı fontlar)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'google-fonts-template-editor';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONT_FAMILIES.map((f) => `family=${f}`).join('&')}&display=swap`;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  // ESC tuşu ile tam ekran önizlemeyi kapat
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullScreenPreview) {
        setShowFullScreenPreview(false);
      }
    };

    if (showFullScreenPreview) {
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [showFullScreenPreview]);

  // Önizlemede yazı sürükleme: mousemove / mouseup (Tam Ekran ve küçük grid)
  useEffect(() => {
    if (!previewDragState) return;
    const { contentId, layerId, containerEl, phase, rotationIndex } = previewDragState;
    const editKey = phase === 'rotation' && rotationIndex != null ? `${contentId}-rot-${rotationIndex}` : contentId;
    const isEditingSelected = selectedBlockContent?.id === contentId && (!phase || phase === 'first') && rotationIndex == null;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      const updateLayers = (layers: TextLayer[]) => layers.map((l) => (l.id === layerId ? { ...l, x, y } : l));
      if (isEditingSelected) {
        setTextLayers((prev) => {
          const updated = updateLayers(prev);
          previewDragLayersRef.current = updated;
          return updated;
        });
      } else {
        setPreviewEditingTextLayers((prev) => {
          const layers = prev[editKey] || previewDragLayersRef.current || [];
          const updated = updateLayers(layers);
          previewDragLayersRef.current = updated;
          return { ...prev, [editKey]: updated };
        });
      }
    };
    const onUp = async () => {
      const layers = previewDragLayersRef.current;
      previewDragLayersRef.current = null;
      setPreviewDragState(null);
      if (layers && layers.length > 0) {
        try {
          const visualContent = blocks.flatMap((b) => b.contents || []).find((c: any) => String(c.id) === String(contentId));
          if (visualContent?.id) {
            const existingStyle = visualContent.style_config
              ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config)
              : {};
            if (phase === 'rotation' && rotationIndex != null) {
              const contentType = (visualContent as any).content_type;
              if (contentType === 'video') {
                const vr = (existingStyle.videoRotation || {}) as { firstVideoDurationSeconds?: number; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: TextLayer[] }> };
                const rotationItems = Array.isArray(vr.rotationItems) ? vr.rotationItems.map((it: any, i: number) => i === rotationIndex ? { ...it, textLayers: layers } : it) : [];
                await apiClient(`/template-block-contents/${visualContent.id}`, {
                  method: 'PATCH',
                  body: { style_config: JSON.stringify({ ...existingStyle, videoRotation: { ...vr, rotationItems } }) },
                });
              } else if (contentType === 'image') {
                const ir = (existingStyle.imageRotation || {}) as { firstImageDurationSeconds?: number; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: TextLayer[] }> };
                const rotationItems = Array.isArray(ir.rotationItems) ? ir.rotationItems.map((it: any, i: number) => i === rotationIndex ? { ...it, textLayers: layers } : it) : [];
                await apiClient(`/template-block-contents/${visualContent.id}`, {
                  method: 'PATCH',
                  body: { style_config: JSON.stringify({ ...existingStyle, imageRotation: { ...ir, rotationItems } }) },
                });
              }
            } else {
              await apiClient(`/template-block-contents/${visualContent.id}`, {
                method: 'PATCH',
                body: { style_config: JSON.stringify({ ...existingStyle, textLayers: layers }) },
              });
            }
            showSuccess(`✅ ${t('editor_text_position_updated')}`);
            await loadTemplate();
          }
        } catch (err: any) {
          alert(`❌ ${err?.message || t('common_error')}`);
        }
        setPreviewEditingTextLayers((prev) => {
          const next = { ...prev };
          delete next[editKey];
          return next;
        });
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [previewDragState, blocks]);

  // Önizlemede yazı boyutu değiştirme (resize handles)
  useEffect(() => {
    if (!previewResizeState) return;
    const { contentId, layerId, containerEl, handle, startSize, startX, startY, phase, rotationIndex } = previewResizeState;
    const editKey = phase === 'rotation' && rotationIndex != null ? `${contentId}-rot-${rotationIndex}` : contentId;
    const isEditingSelected = selectedBlockContent?.id === contentId && (!phase || phase === 'first') && rotationIndex == null;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const curX = ((e.clientX - rect.left) / rect.width) * 100;
      const curY = ((e.clientY - rect.top) / rect.height) * 100;
      const deltaX = curX - startX;
      const deltaY = curY - startY;
      // Köşe/kenar handle'a göre boyut değişimi (büyüt/küçült)
      let delta = 0;
      if (handle.includes('e')) delta += deltaX;
      if (handle.includes('w')) delta -= deltaX;
      if (handle.includes('s')) delta += deltaY;
      if (handle.includes('n')) delta -= deltaY;
      const scale = 1 + delta / 50;
      const newSize = Math.max(8, Math.min(120, Math.round(startSize * scale)));
      if (isEditingSelected) {
        setTextLayers((prev) => {
          const updated = prev.map((l) => (l.id === layerId ? { ...l, size: newSize } : l));
          previewResizeLayersRef.current = updated;
          return updated;
        });
      } else {
        setPreviewEditingTextLayers((prev) => {
          const layers = prev[editKey] || previewDragLayersRef.current || [];
          const updated = layers.map((l) => (l.id === layerId ? { ...l, size: newSize } : l));
          previewDragLayersRef.current = updated;
          return { ...prev, [editKey]: updated };
        });
      }
    };
    const onUp = async () => {
      setPreviewResizeState(null);
      if (isEditingSelected && selectedBlockContent?.id) {
        try {
          const layers = previewResizeLayersRef.current || textLayers;
          const visualContent = blocks.flatMap((b) => b.contents || []).find((c: any) => String(c.id) === String(contentId));
          if (visualContent?.id && layers.length > 0) {
            const existingStyle = visualContent.style_config ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config) : {};
            await apiClient(`/template-block-contents/${visualContent.id}`, {
              method: 'PATCH',
              body: { style_config: JSON.stringify({ ...existingStyle, textLayers: layers }) },
            });
            showSuccess(`✅ ${t('editor_text_size_updated')}`);
            await loadTemplate();
          }
        } catch (err: any) {
          console.error('Resize save error:', err);
        }
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [previewResizeState, selectedBlockContent?.id]);

  // Önizlemede overlay resim sürükleme (tasarım editörü gibi; grid + tam ekran)
  useEffect(() => {
    if (!previewOverlayDragState) return;
    const { contentId, overlayId, containerEl } = previewOverlayDragState;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      updateOverlayImage(overlayId, { x, y }, contentId);
    };
    const onUp = async () => {
      setPreviewOverlayDragState(null);
      setOverlayDragLiveOverlays(null);
      try {
        const visualContent = blocks.flatMap((b) => b.contents || []).find((c: any) => String(c.id) === String(contentId));
        if (visualContent?.id) {
          const existingStyle = visualContent.style_config ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config) : {};
          const currentOverlays = overlayImagesRef.current;
          await apiClient(`/template-block-contents/${visualContent.id}`, {
            method: 'PATCH',
            body: { style_config: JSON.stringify({ ...existingStyle, overlayImages: currentOverlays }) },
          });
          showSuccess(`✅ ${t('editor_overlay_position_updated')}`);
          await loadTemplate();
        }
      } catch (err: any) {
        alert(`❌ ${err?.message || t('common_error')}`);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [previewOverlayDragState, blocks]);

  // Önizlemede overlay resim boyutu (resize - tasarım editörü gibi)
  useEffect(() => {
    if (!previewOverlayResizeState) return;
    const { contentId, overlayId, containerEl, handle, startSize, startX, startY } = previewOverlayResizeState;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const curX = ((e.clientX - rect.left) / rect.width) * 100;
      const curY = ((e.clientY - rect.top) / rect.height) * 100;
      const deltaX = curX - startX;
      const deltaY = curY - startY;
      let delta = 0;
      if (handle.includes('e')) delta += deltaX;
      if (handle.includes('w')) delta -= deltaX;
      if (handle.includes('s')) delta += deltaY;
      if (handle.includes('n')) delta -= deltaY;
      const scale = 1 + delta / 30;
      const newSize = Math.max(10, Math.min(80, Math.round(startSize * scale)));
      updateOverlayImage(overlayId, { size: newSize });
    };
    const onUp = async () => {
      setPreviewOverlayResizeState(null);
      try {
        const visualContent = blocks.flatMap((b) => b.contents || []).find((c: any) => String(c.id) === String(contentId));
        if (visualContent?.id) {
          const existingStyle = visualContent.style_config ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config) : {};
          const currentOverlays = overlayImagesRef.current;
          await apiClient(`/template-block-contents/${visualContent.id}`, {
            method: 'PATCH',
            body: { style_config: JSON.stringify({ ...existingStyle, overlayImages: currentOverlays }) },
          });
          showSuccess(`✅ ${t('editor_overlay_size_updated')}`);
          await loadTemplate();
        }
      } catch (err: any) {
        alert(`❌ ${err?.message || t('common_error')}`);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [previewOverlayResizeState, blocks]);

  // Önizlemede resim ölçeklendirme (imageScaleX, imageScaleY - yatay/dikey bağımsız, tasarım editörü gibi)
  useEffect(() => {
    if (!imageScaleResizeState) return;
    const { blockId, contentId, containerEl, handle, startScaleX, startScaleY, startX, startY } = imageScaleResizeState;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / rect.width;
      const curY = (e.clientY - rect.top) / rect.height;
      const deltaX = curX - startX;
      const deltaY = curY - startY;
      let deltaScaleX = 0, deltaScaleY = 0;
      if (handle.includes('e')) deltaScaleX += deltaX * 2;
      if (handle.includes('w')) deltaScaleX -= deltaX * 2;
      if (handle.includes('s')) deltaScaleY += deltaY * 2;
      if (handle.includes('n')) deltaScaleY -= deltaY * 2;
      const scaleX = Math.max(0.5, Math.min(2.5, startScaleX + deltaScaleX));
      const scaleY = Math.max(0.5, Math.min(2.5, startScaleY + deltaScaleY));
      imageScaleDuringResizeRef.current = { scaleX, scaleY };
      setBlocks((prev) =>
        prev.map((b) => {
          if (b.id !== blockId) return b;
          const contents = (b.contents || []).map((c: any) => {
            if (String(c.id) !== String(contentId)) return c;
            const sc = c.style_config ? (typeof c.style_config === 'string' ? JSON.parse(c.style_config || '{}') : { ...c.style_config }) : {};
            return { ...c, style_config: { ...sc, imageScaleX: scaleX, imageScaleY: scaleY } };
          });
          return { ...b, contents };
        })
      );
    };
    const onUp = async () => {
      setImageScaleResizeState(null);
      try {
        const content = blocks.flatMap((b) => b.contents || []).find((c: any) => String(c.id) === String(contentId));
        if (content?.id) {
          const sc = content.style_config ? (typeof content.style_config === 'string' ? JSON.parse(content.style_config || '{}') : { ...content.style_config }) : {};
          const { scaleX: newScaleX, scaleY: newScaleY } = imageScaleDuringResizeRef.current;
          await apiClient(`/template-block-contents/${content.id}`, {
            method: 'PATCH',
            body: { style_config: JSON.stringify({ ...sc, imageScaleX: newScaleX, imageScaleY: newScaleY }) },
          });
          showSuccess(`✅ ${t('editor_image_scale_updated')}`);
          await loadTemplate();
        }
      } catch (err: any) {
        console.error('Scale save error:', err);
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'nwse-resize';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [imageScaleResizeState, blocks]);

  // Profesyonel grid yapısını hesapla
  const getProfessionalGridLayout = (blockCount: number) => {
    if (blockCount <= 0) return { cols: 2, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 1) return { cols: 1, rows: 1, gap: '0px', specialLayout: false };
    if (blockCount === 2) return { cols: 2, rows: 1, gap: '2px', specialLayout: false };
    if (blockCount === 3) return { cols: 2, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 4) return { cols: 2, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 5) return { cols: 3, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 6) return { cols: 3, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 7) return { cols: 4, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 8) return { cols: 4, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 9) return { cols: 3, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 10) return { cols: 4, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 11) return { cols: 4, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 12) return { cols: 4, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 14) return { cols: 4, rows: 4, gap: '2px', specialLayout: false };
    if (blockCount === 15) return { cols: 4, rows: 4, gap: '2px', specialLayout: false };
    if (blockCount === 16) return { cols: 4, rows: 4, gap: '2px', specialLayout: false };
    const cols = Math.ceil(Math.sqrt(blockCount * 16 / 9));
    const rows = Math.ceil(blockCount / cols);
    return { cols, rows, gap: '2px', specialLayout: false };
  };

  /** Önizleme grid'ine göre blok pozisyonu (yüzde 0-100). Birleştirme hesaplaması için. */
  const getBlockGridPosition = (blockIndex: number, blockCount: number): { x: number; y: number; w: number; h: number } => {
    const g = getProfessionalGridLayout(blockCount);
    const cellW = 100 / g.cols;
    const cellH = 100 / g.rows;
    if (blockCount === 3 && blockIndex === 2) return { x: 0, y: 50, w: 100, h: 50 };
    if (blockCount === 5 && blockIndex === 2) return { x: 100 / 3, y: 0, w: 100 / 3, h: 100 };
    if (blockCount === 7 && blockIndex === 6) return { x: 50, y: 50, w: 50, h: 50 };
    const col = blockIndex % g.cols;
    const row = Math.floor(blockIndex / g.cols);
    return { x: col * cellW, y: row * cellH, w: cellW, h: cellH };
  };

  const handleMergeByBlockNumbers = async () => {
    const nums = mergeBlockNumbersInput.replace(/\./g, ' ').split(/\s+/).map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n) && n >= 1);
    const blockCount = blocks.length;
    const valid = nums.filter((n) => n >= 1 && n <= blockCount);
    if (valid.length < 2) {
      alert(t('editor_merge_min_two'));
      return;
    }
    const blockIndices = Array.from(new Set(valid)).sort((a, b) => a - b);
    const toMerge = blocks.filter((b) => blockIndices.includes((b.block_index ?? 0) + 1)).sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
    if (toMerge.length < 2) {
      alert(t('editor_merge_invalid_numbers'));
      return;
    }
    if (!templateId || !template) return;
    const [targetBlock, ...others] = toMerge;
    const newBlockCount = blockCount - others.length;
    try {
      setSaving(true);
      const pos = (b: any) => getBlockGridPosition(b.block_index ?? 0, blockCount);
      let { x: left, y: top, w: w0, h: h0 } = pos(targetBlock);
      let right = left + w0;
      let bottom = top + h0;
      for (const b of others) {
        const { x, y, w, h } = pos(b);
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x + w);
        bottom = Math.max(bottom, y + h);
      }
      const newW = Math.min(100, Math.round((right - left) * 100) / 100);
      const newH = Math.min(100, Math.round((bottom - top) * 100) / 100);
      const newX = Math.round(left * 100) / 100;
      const newY = Math.round(top * 100) / 100;
      for (const b of others) {
        for (const c of b.contents || []) {
          if (c?.id) {
            await apiClient(`/template-block-contents/${c.id}`, { method: 'PATCH', body: { template_block_id: targetBlock.id } });
          }
        }
      }
      await apiClient(`/template-blocks/${targetBlock.id}`, { method: 'PATCH', body: { position_x: newX, position_y: newY, width: newW, height: newH } });
      for (const b of others) {
        await apiClient(`/template-blocks/${b.id}`, { method: 'DELETE' });
      }
      const mergedIndices = new Set(toMerge.map((b) => b.block_index ?? 0));
      const remainingBlocks = blocks.filter((b) => !toMerge.some((m) => m.id === b.id)).sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
      const availableSlots: { x: number; y: number; w: number; h: number }[] = [];
      for (let i = 0; i < blockCount; i++) {
        if (mergedIndices.has(i)) continue;
        const p = getBlockGridPosition(i, blockCount);
        availableSlots.push(p);
      }
      for (let i = 0; i < remainingBlocks.length && i < availableSlots.length; i++) {
        const b = remainingBlocks[i];
        const p = availableSlots[i];
        await apiClient(`/template-blocks/${b.id}`, {
          method: 'PATCH',
          body: {
            position_x: Math.round(p.x * 100) / 100,
            position_y: Math.round(p.y * 100) / 100,
            width: Math.round(p.w * 100) / 100,
            height: Math.round(p.h * 100) / 100,
          },
        });
      }
      await apiClient(`/templates/${templateId}`, { method: 'PATCH', body: { block_count: newBlockCount } });
      setShowMergeInput(false);
      setMergeBlockNumbersInput('');
      setSelectedBlock(targetBlock.id);
      await loadTemplate();
    } catch (err: any) {
      console.error('Merge failed:', err);
      alert(err?.message || t('common_error'));
    } finally {
      setSaving(false);
    }
  };

  /** Blok en-boy oranı: modal canvas ile önizleme aynı olmalı ki yazı konumu doğru görünsün */
  const getBlockAspectRatio = (blockCount: number): string => {
    const g = getProfessionalGridLayout(blockCount);
    return `${16 * g.rows}/${9 * g.cols}`; // her hücre (16/9)*(rows/cols)
  };

  // Seçili blok değiştiğinde içeriğini yükle; sıfırlanınca içerik de temizlensin
  useEffect(() => {
    if (!selectedBlock) {
      setSelectedBlockContent(null);
      setSelectedOverlayImageId(null);
      return;
    }
    const block = blocks.find(b => b.id === selectedBlock);
    if (block && block.contents && block.contents.length > 0) {
        const imageContent = block.contents.find((c: any) => c.content_type === 'image');
        const videoContent = block.contents.find((c: any) => c.content_type === 'video');
        const regionalMenuContent = block.contents.find((c: any) => c.content_type === 'regional_menu');
        const content = regionalMenuContent || imageContent || videoContent || block.contents[0];
        setSelectedBlockContent(content);
        
        // Düzenleme için mevcut değerleri yükle
        if (content) {
          setEditingTitle(content.title || '');
          setEditingPrice(content.price ? String(content.price) : '');
          setEditingDescription(content.description || '');
            if ((content.content_type === 'image' || content.content_type === 'video') && content.style_config) {
            const sc = typeof content.style_config === 'string' ? JSON.parse(content.style_config || '{}') : content.style_config;
            setEditingImageBlur(typeof sc.blur === 'number' ? Math.min(20, Math.max(0, sc.blur)) : 0);
            // Çoklu yazı katmanlarını yükle (eski verilerde fontFamily olmayabilir)
            if (sc.textLayers && Array.isArray(sc.textLayers)) {
              setTextLayers(sc.textLayers.map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' })));
            } else {
              setTextLayers([]);
            }
            // Overlay resimleri yükle
            if (sc.overlayImages && Array.isArray(sc.overlayImages)) {
              setOverlayImages(sc.overlayImages);
            } else {
              setOverlayImages([]);
            }
            // Video döngüsü (sadece video içeriği için)
            if (content.content_type === 'video' && sc.videoRotation) {
              const vr = sc.videoRotation as { firstVideoDurationSeconds?: number; rotationUrls?: string[]; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: any[] }> };
              setEditingFirstVideoDuration(typeof vr.firstVideoDurationSeconds === 'number' ? Math.max(1, Math.min(120, vr.firstVideoDurationSeconds)) : 10);
              if (Array.isArray(vr.rotationItems) && vr.rotationItems.length > 0) {
                setEditingRotationItems(vr.rotationItems.map((it: any) => {
                  const maxSec = typeof it.sourceDurationSeconds === 'number' ? Math.min(120, it.sourceDurationSeconds) : 120;
                  const dur = typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(maxSec, it.durationSeconds)) : (it.sourceDurationSeconds ?? 10);
                  return {
                    url: it.url,
                    durationSeconds: dur,
                    sourceDurationSeconds: typeof it.sourceDurationSeconds === 'number' ? Math.min(120, it.sourceDurationSeconds) : undefined,
                    textLayers: Array.isArray(it.textLayers) ? it.textLayers.map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' })) : [],
                  };
                }));
              } else if (Array.isArray(vr.rotationUrls)) {
                setEditingRotationItems(vr.rotationUrls.map((url: string) => ({ url, durationSeconds: 10, textLayers: [] })));
              } else {
                setEditingRotationItems([]);
              }
            } else if (content.content_type === 'video') {
              setEditingFirstVideoDuration(10);
              setEditingRotationItems([]);
            }
            // Resim döngüsü (sadece resim içeriği için)
            if (content.content_type === 'image' && sc.imageRotation) {
              const ir = sc.imageRotation as { firstImageDurationSeconds?: number; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: any[]; title?: string; price?: string; isVideo?: boolean }> };
              setEditingFirstImageDuration(typeof ir.firstImageDurationSeconds === 'number' ? Math.max(1, Math.min(120, ir.firstImageDurationSeconds)) : 10);
              setEditingFirstImageTitle((content.title as string) || '');
              setEditingFirstImagePrice(content.price != null ? String(content.price) : '');
              if (Array.isArray(ir.rotationItems) && ir.rotationItems.length > 0) {
                setEditingImageRotationItems(ir.rotationItems.map((it: any) => ({
                  url: it.url,
                  durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 10,
                  textLayers: Array.isArray(it.textLayers) ? it.textLayers.map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' })) : [],
                  title: it.title || '',
                  price: it.price != null ? String(it.price) : '',
                  isVideo: it.isVideo || undefined,
                })));
              } else {
                setEditingImageRotationItems([]);
              }
            } else if (content.content_type === 'image') {
              setEditingFirstImageDuration(10);
              setEditingFirstImageTitle((content.title as string) || '');
              setEditingFirstImagePrice(content.price != null ? String(content.price) : '');
              setEditingImageRotationItems([]);
            }
          } else {
            setEditingImageBlur(0);
          setTextLayers([]);
          setOverlayImages([]);
          setEditingFirstImageDuration(10);
          setEditingFirstImageTitle('');
          setEditingFirstImagePrice('');
          setEditingImageRotationItems([]);
          }
        }
      } else {
        setSelectedBlockContent(null);
        setEditingTitle('');
        setEditingPrice('');
        setEditingDescription('');
        setEditingImageBlur(0);
        setTextLayers([]);
        setOverlayImages([]);
        setEditingFirstImageDuration(10);
        setEditingFirstImageTitle('');
        setEditingFirstImagePrice('');
        setEditingImageRotationItems([]);
      }
  }, [selectedBlock, blocks]);

  // Tek Menü modalı açıldığında: header + 3 kategori doldur
  useEffect(() => {
    if (showRegionalMenuEditModal && selectedBlockContent?.content_type === 'regional_menu') {
      const styleConfig = selectedBlockContent.style_config
        ? (typeof selectedBlockContent.style_config === 'string'
            ? JSON.parse(selectedBlockContent.style_config)
            : selectedBlockContent.style_config)
        : {};
      setEditingRegionalHeaderSpecial(styleConfig.header_special ?? 'Special');
      setEditingRegionalHeaderTitle(styleConfig.header_title ?? selectedBlockContent.title ?? 'FOOD MENU');
      setEditingRegionalMenuContact(styleConfig.contact_info ?? '');
      const defaultCatNames = ['DRINKS', 'FOODS', 'DESSERT'];
      const defaultCat = () => ({ id: `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: '', image_url: '', items: [] });
      if (Array.isArray(styleConfig.categories) && styleConfig.categories.length > 0) {
        const cats = styleConfig.categories.map((c: any) => ({
          id: c.id || defaultCat().id,
          name: c.name || '',
          image_url: c.image_url || '',
          items: Array.isArray(c.items) ? c.items.map((i: any) => ({
            id: i.id || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: i.name ?? '',
            description: i.description ?? '',
            price: i.price != null ? String(i.price) : '',
          })) : [],
        }));
        while (cats.length < 3) cats.push({ ...defaultCat(), name: defaultCatNames[cats.length] });
        setEditingRegionalCategories(cats.slice(0, 3));
      } else {
        // Eski tek liste → 3 kategori (ilk dolu, diğerleri boş)
        const first = {
          id: 'cat-1',
          name: t('editor_menu_default'),
          image_url: selectedBlockContent.image_url || '',
          items: Array.isArray(styleConfig.menu_items) ? styleConfig.menu_items.map((i: any) => ({
            id: i.id || `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: i.name ?? '',
            description: i.description ?? '',
            price: i.price != null ? String(i.price) : '',
          })) : [],
        };
        setEditingRegionalCategories([
          first,
          { ...defaultCat(), name: 'FOODS' },
          { ...defaultCat(), name: 'DESSERT' },
        ]);
      }
    }
  }, [showRegionalMenuEditModal, selectedBlockContent]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const [templateData, blocksData] = await Promise.all([
        apiClient(`/templates/${templateId}`),
        apiClient(`/templates/${templateId}/blocks`),
      ]);

      // Canvas tasarım şablonu: blok editörü yerine tasarım editörüne yönlendir
      const cd = (templateData as any)?.canvas_design;
      if (cd && typeof cd === 'object') {
        router.replace(`${localePath('/editor')}?templateId=${templateId}`);
        return;
      }

      setTemplate(templateData);
      
      // Her blok için içerikleri yükle
      const blocksWithContents = await Promise.all(
        (blocksData || []).map(async (block: any) => {
          try {
            const contents = await apiClient(`/template-block-contents/block/${block.id}`);
            return { ...block, contents: contents || [] };
          } catch (err) {
            console.error(`Error loading contents for block ${block.id}:`, err);
            return { ...block, contents: [] };
          }
        })
      );
      
      setBlocks(blocksWithContents);
    } catch (err: any) {
      console.error('Error loading template:', err);
      setError(err.message || t('editor_template_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleContentSelect = async (content: any) => {
    if (!selectedBlock) {
      alert(`⚠️ ${t('editor_select_block_first')}`);
      return;
    }

    try {
      setSaving(true);
      
      // Seçili bloğu bul
      const block = blocks.find(b => b.id === selectedBlock);
      if (!block) return;

      // Block content'i güncelle veya oluştur
      let contentData: any = { template_block_id: block.id };

      if (content.type === 'image') {
        // Blokta zaten tek resim varsa (döngü değilse) — overlay olarak ekle
        const existingImageContent = block.contents?.find((c: any) => c.content_type === 'image');
        if (existingImageContent?.id) {
          const sc = existingImageContent.style_config
            ? (typeof existingImageContent.style_config === 'string'
                ? JSON.parse(existingImageContent.style_config || '{}')
                : { ...existingImageContent.style_config })
            : {};
          const ir = sc.imageRotation;
          const irItems = Array.isArray(ir?.rotationItems) ? ir.rotationItems : [];
          const isImageRotation = ir && irItems.length > 0;
          if (!isImageRotation) {
            const currentOverlays = Array.isArray(sc.overlayImages) ? sc.overlayImages : [];
            const n = currentOverlays.length;
            const newOverlay = {
              id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              image_url: content.url,
              x: 25 + n * 8,
              y: 25 + n * 8,
              size: 28,
              shape: overlayNextShape,
            };
            const updatedSc = { ...sc, overlayImages: [...currentOverlays, newOverlay] };
            await apiClient(`/template-block-contents/${existingImageContent.id}`, {
              method: 'PATCH',
              body: { style_config: JSON.stringify(updatedSc) },
            });
            showSuccess(`✅ ${content.name} ${t('editor_added_on_image')}`);
            await loadTemplate();
            setShowAddFromLibraryModal(false);
            setAddFromLibraryCategory(undefined);
            setSaving(false);
            return;
          }
        }
        contentData = {
          ...contentData,
          content_type: 'image',
          image_url: content.url,
          title: content.name,
          background_color: '#FFFFFF',
          style_config: JSON.stringify({ imageFit: 'cover' }),
        };
      } else if (content.type === 'icon') {
        // İkon seçildiğinde konum seçim modal'ını aç
        setPendingIconContent({
          ...contentData,
          content_type: 'icon',
          icon_name: content.content,
          text_color: content.color,
        });
        setShowIconPositionModal(true);
        setSaving(false);
        return;
      } else if (content.type === 'badge') {
        // Rozet seçildiğinde düzenleme modal'ını aç
        const badgeText = content.text || content.name || 'YENİ';
        const badgeBg = content.bg || content.color || '#3B82F6';
        const badgeTextColor = content.color || '#FFFFFF';
        
        setPendingBadgeContent({
          ...contentData,
          content_type: 'campaign_badge',
          campaign_text: badgeText,
          background_color: badgeBg,
          text_color: badgeTextColor,
        });
        setEditingBadgeText(badgeText);
        setEditingBadgeBgColor(badgeBg);
        setEditingBadgeTextColor(badgeTextColor);
        setEditingBadgePosition('top-left'); // Varsayılan konum
        setShowBadgeEditModal(true);
        setSaving(false);
        return;
      } else if (content.type === 'background') {
        // Arka plan seçildiğinde blokun style_config'ini güncelle
        const selectedBlockObj = blocks.find(b => b.id === selectedBlock);
        if (selectedBlockObj) {
          const currentStyleConfig = selectedBlockObj.style_config 
            ? (typeof selectedBlockObj.style_config === 'string' 
                ? JSON.parse(selectedBlockObj.style_config) 
                : selectedBlockObj.style_config)
            : {};
          
          // Arka plan bilgilerini ekle
          const updatedStyleConfig = {
            ...currentStyleConfig,
            background_image: content.url || null,
            background_gradient: content.gradient || null,
            background_color: content.color || currentStyleConfig.background_color || '#FFFFFF',
          };

          // Blokun style_config'ini güncelle
          await apiClient(`/template-blocks/${selectedBlock}`, {
            method: 'PATCH',
            body: {
              style_config: JSON.stringify(updatedStyleConfig),
            },
          });
          
          alert(`✅ ${content.name} ${t('editor_background_added')}`);
          await loadTemplate();
          setSaving(false);
          return;
        }
      } else if (content.type === 'drink') {
        // İçecek seçildiğinde küçük overlay olarak ekle
        contentData = {
          ...contentData,
          content_type: 'drink',
          image_url: content.url,
          title: content.name,
          style_config: JSON.stringify({
            position: 'bottom-left',
            size: 'small', // Küçük overlay
          }),
        };
      } else if (content.type === 'regional_menu') {
        // Tek Menü (Special FOOD MENU): 3 sütun, header, categories, contact
        const styleConfig = content.style_config
          ? (typeof content.style_config === 'object' ? content.style_config : {})
          : {
              header_special: content.header_special || 'Special',
              header_title: content.title || content.header_title || 'FOOD MENU',
              categories: content.categories || [],
              contact_info: content.contact_info || '',
            };
        contentData = {
          ...contentData,
          content_type: 'regional_menu',
          image_url: content.image_url || styleConfig.categories?.[0]?.image_url || '',
          title: styleConfig.header_title || content.title || content.name,
          style_config: JSON.stringify(styleConfig),
        };
      } else if (content.type === 'text') {
        contentData = {
          ...contentData,
          content_type: 'text',
          title: content.content,
          text_color: '#000000',
          background_color: '#FFFFFF',
        };
      } else if (content.type === 'video') {
        contentData = {
          ...contentData,
          content_type: 'video',
          image_url: content.url,
          title: content.name,
          background_color: '#000000',
          style_config: JSON.stringify({ imageFit: 'cover' }),
        };
      }

      // Video/resim için mevcut görsel içeriği bul (PATCH) yoksa yeni ekle (POST)
      const existingVisualContent = (content.type === 'video' || content.type === 'image')
        ? block.contents?.find((c: any) => c.content_type === 'image' || c.content_type === 'video')
        : selectedBlockContent;
      
      let savedContent;
      if (existingVisualContent && existingVisualContent.id && (content.type === 'video' || content.type === 'image')) {
        savedContent = await apiClient(`/template-block-contents/${existingVisualContent.id}`, {
          method: 'PATCH',
          body: contentData,
        });
        showSuccess(`✅ ${content.name} ${t('editor_updated')}`);
      } else if (selectedBlockContent && selectedBlockContent.id) {
        savedContent = await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
          method: 'PATCH',
          body: contentData,
        });
        showSuccess(`✅ ${content.name} ${t('editor_updated')}`);
      } else {
        savedContent = await apiClient('/template-block-contents', {
          method: 'POST',
          body: contentData,
        });
        showSuccess(`✅ ${content.name} ${t('editor_added')}`);
      }

      // Eğer resim eklendiyse, ana kütüphaneye ekle (title varsa veya sonra eklenebilir)
      if (content.type === 'image' && contentData.image_url) {
        const imageTitle = contentData.title || content.name || savedContent?.title || t('editor_product_default');
        
        // Title yoksa veya "Ürün" ise, kullanıcı sonra ekleyebilir, şimdilik ekleme
        // Ama title varsa hemen ekle
        if (imageTitle && imageTitle !== t('editor_product_default')) {
          try {
            // Önce aynı isimde bir içerik var mı kontrol et
            const existingItemsData = await apiClient(`/content-library?category=food&type=image`);
            // Backend'den gelen veri formatını kontrol et
            let existingItems: any[] = [];
            if (Array.isArray(existingItemsData)) {
              existingItems = existingItemsData;
            } else if (typeof existingItemsData === 'object' && existingItemsData !== null) {
              // Kategorilere göre gruplanmış ise düzleştir
              Object.values(existingItemsData).forEach((categoryItems: any) => {
                if (Array.isArray(categoryItems)) {
                  existingItems.push(...categoryItems);
                }
              });
            }
            
            const existingItem = existingItems.find((item: any) => item.name === imageTitle);
            
            if (existingItem) {
              // Güncelle
              await apiClient(`/content-library/${existingItem.id}`, {
                method: 'PATCH',
                body: {
                  name: imageTitle,
                  url: contentData.image_url,
                  description: savedContent?.description || null,
                },
              });
            } else {
              // Yeni ekle
              await apiClient('/content-library', {
                method: 'POST',
                body: {
                  name: imageTitle,
                  category: 'food',
                  type: 'image',
                  url: contentData.image_url,
                  description: savedContent?.description || null,
                  display_order: 0,
                },
              });
            }
          } catch (libErr: any) {
            console.error('❌ Kütüphaneye ekleme hatası:', libErr);
            // Hata olsa bile devam et, kullanıcıya gösterme
          }
        }
      }

      await loadTemplate();
      // Video sırası için kütüphane açıldıysa, ilk video seçildikten sonra video rotation modal'ı aç
      if (content.type === 'video' && pendingVideoRotationOpen) {
        setPendingVideoRotationOpen(false);
        // loadTemplate sonrası blocks/selectedBlockContent güncellensin diye kısa gecikme
        setTimeout(() => setShowVideoRotationModal(true), 150);
      }
    } catch (err: any) {
      console.error('Error adding content:', err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** Görsel (dosya) — dosyadan yükleyip bloğa ekle */
  const handleBlockImageFromFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) {
      if (!selectedBlock) alert(`⚠️ ${t('editor_select_block_first')}`);
      return;
    }
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('files', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!up.ok) throw new Error(t('editor_upload_failed'));
      const j = await up.json();
      const url = j?.assets?.[0]?.src ?? j?.data?.[0]?.src ?? j?.url;
      if (!url) throw new Error(t('editor_url_fetch_failed'));
      await handleContentSelect({ type: 'image', url, name: file.name });
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  /** PNG indir — önizleme alanını PNG olarak dışa aktar */
  const handleExportPNG = useCallback(async () => {
    const el = previewContainerRef.current;
    if (!el) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(el, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#0d0d0d',
        scale: 2,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `sablon-onizleme-${template?.name || 'template'}-${Date.now()}.png`;
      a.click();
    } catch (err: any) {
      alert(`${t('editor_export_png_error')}: ${err.message}`);
    }
  }, [template?.name]);

  // Seçili bloğun içeriğini sıfırla (resim, yazı, video temizle)
  const handleResetSelectedBlock = async () => {
    if (!selectedBlock) return;

    const block = blocks.find(b => b.id === selectedBlock);
    if (!block || !block.contents || block.contents.length === 0) {
      setSelectedBlockContent(null);
      setEditingTitle('');
      setEditingPrice('');
      setEditingDescription('');
      setEditingImageBlur(0);
      setTextLayers([]);
      setOverlayImages([]);
      setEditingFirstVideoDuration(10);
      setEditingRotationItems([]);
      setEditingFirstImageDuration(10);
      setEditingImageRotationItems([]);
      return;
    }

    try {
      setSaving(true);
      for (const content of block.contents) {
        if (content.id) {
          await apiClient(`/template-block-contents/${content.id}`, { method: 'DELETE' });
        }
      }
      setBlocks(prev =>
        prev.map(b => (b.id === selectedBlock ? { ...b, contents: [] } : b))
      );
      setSelectedBlockContent(null);
      setEditingTitle('');
      setEditingPrice('');
      setEditingDescription('');
      setEditingImageBlur(0);
      setTextLayers([]);
      setOverlayImages([]);
      setEditingFirstVideoDuration(10);
      setEditingRotationItems([]);
      setEditingFirstImageDuration(10);
      setEditingImageRotationItems([]);
    } catch (err: any) {
      console.error('Reset error:', err);
      toast.showError(`${t('editor_reset_error')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Yazı ve fiyat güncelleme fonksiyonu
  const handleUpdateTitleAndPrice = async () => {
    if (!selectedBlock) {
      alert(`⚠️ ${t('editor_select_block_first')}`);
      return;
    }

    try {
      setSaving(true);
      
      // Seçili bloğun içeriklerini al
      const block = blocks.find(b => b.id === selectedBlock);
      if (!block || !block.contents || block.contents.length === 0) {
        alert(`⚠️ ${t('editor_no_content_in_block')}`);
        return;
      }

      // Resim veya video içeriğini bul ve güncelle
      const imageContent = block.contents.find((c: any) => c.content_type === 'image');
      const videoContent = block.contents.find((c: any) => c.content_type === 'video');
      const visualContent = imageContent || videoContent;
      if (visualContent && visualContent.id) {
        const updatedTitle = editingTitle || visualContent.title;
        const updatedPrice = editingPrice ? parseFloat(editingPrice) : visualContent.price;
        const updatedDescription = editingDescription || visualContent.description || null;
        
        const existingStyle = visualContent.style_config
          ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config)
          : {};
        await apiClient(`/template-block-contents/${visualContent.id}`, {
          method: 'PATCH',
          body: {
            title: updatedTitle,
            price: updatedPrice,
            description: updatedDescription,
            style_config: JSON.stringify({ 
              ...existingStyle, 
              blur: editingImageBlur,
              textLayers: textLayers,
              overlayImages: overlayImages,
            }),
          },
        });
        
        // Eğer resim varsa ve title varsa, ana kütüphaneye ekle veya güncelle (video için atla)
        if (visualContent.content_type === 'image' && visualContent.image_url && updatedTitle && updatedTitle.trim() !== '') {
            try {
            // Önce aynı isimde bir içerik var mı kontrol et
            const existingItemsData = await apiClient(`/content-library?category=food&type=image`);
            // Backend'den gelen veri formatını kontrol et
            let existingItems: any[] = [];
            if (Array.isArray(existingItemsData)) {
              existingItems = existingItemsData;
            } else if (typeof existingItemsData === 'object' && existingItemsData !== null) {
              // Kategorilere göre gruplanmış ise düzleştir
              Object.values(existingItemsData).forEach((categoryItems: any) => {
                if (Array.isArray(categoryItems)) {
                  existingItems.push(...categoryItems);
                }
              });
            }
            
            const existingItem = existingItems.find((item: any) => item.name === updatedTitle);
            
            if (existingItem) {
              // Güncelle
              const updateResult =               await apiClient(`/content-library/${existingItem.id}`, {
                method: 'PATCH',
                body: {
                  name: updatedTitle,
                  url: visualContent.image_url,
                  description: updatedDescription,
                },
              });
            } else {
              // Yeni ekle
              await apiClient('/content-library', {
                method: 'POST',
                body: {
                  name: updatedTitle,
                  category: 'food',
                  type: 'image',
                  url: visualContent.image_url,
                  description: updatedDescription,
                  display_order: 0,
                },
              });
            }
          } catch (libErr: any) {
            console.error('❌ Kütüphaneye ekleme hatası:', libErr);
            // Hata olsa bile devam et, kullanıcıya gösterme
          }
        }
        
        showSuccess(`✅ ${t('editor_product_updated')}`);
        await loadTemplate();
        setIsEditingContent(false);
        setEditingTitle('');
        setEditingPrice('');
        setEditingDescription('');
      } else {
        // Resim yoksa text içeriği oluştur veya güncelle
        const textContent = block.contents.find((c: any) => c.content_type === 'text');
        if (textContent && textContent.id) {
          await apiClient(`/template-block-contents/${textContent.id}`, {
            method: 'PATCH',
            body: {
              title: editingTitle || textContent.title,
              price: editingPrice ? parseFloat(editingPrice) : textContent.price,
              description: editingDescription || textContent.description || null,
            },
          });
        } else {
          await apiClient('/template-block-contents', {
            method: 'POST',
            body: {
              template_block_id: selectedBlock,
              content_type: 'text',
              title: editingTitle,
              price: editingPrice ? parseFloat(editingPrice) : null,
              description: editingDescription || null,
            },
          });
        }
        showSuccess(`✅ ${t('editor_product_updated')}`);
        await loadTemplate();
        setIsEditingContent(false);
        setEditingTitle('');
        setEditingPrice('');
        setEditingDescription('');
      }
    } catch (err: any) {
      console.error('Error updating title and price:', err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Resim yazılarını kaydet (çoklu katman)
  const handleSaveImageText = async () => {
    if (!selectedBlock) {
      alert(`⚠️ ${t('editor_select_block_first')}`);
      return;
    }

    try {
      setSaving(true);
      
      const block = blocks.find(b => b.id === selectedBlock);
      if (!block || !block.contents || block.contents.length === 0) {
        alert(`⚠️ ${t('editor_no_content_in_block')}`);
        return;
      }

      const imageContent = block.contents.find((c: any) => c.content_type === 'image');
      const videoContent = block.contents.find((c: any) => c.content_type === 'video');
      const visualContent = imageContent || videoContent;
      if (visualContent && visualContent.id) {
        const existingStyle = visualContent.style_config
          ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config)
          : {};
        
        await apiClient(`/template-block-contents/${visualContent.id}`, {
          method: 'PATCH',
          body: {
            style_config: JSON.stringify({
              ...existingStyle,
              textLayers: textLayers,
              overlayImages: overlayImages,
            }),
          },
        });
        
        showSuccess(`✅ ${t('editor_texts_saved')}`);
        await loadTemplate();
        setShowImageTextModal(false);
      }
    } catch (err: any) {
      console.error('Error saving image text:', err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Yeni yazı katmanı ekle - "Resme Yazı Ekle" her tıklamada yeni satır; canvas'a tıklayınca o konumda
  const addTextLayer = (clickX?: number, clickY?: number) => {
    const idx = textLayers.length + 1;
    const x = clickX != null ? clickX : 50;
    const y = clickY != null ? clickY : 25 + (idx - 1) * 20; // Üstten aşağı dizilir
    const newLayer: TextLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: `${t('editor_text_default')} ${idx}`,
      color: idx % 2 === 1 ? '#FFFFFF' : '#FFD700',
      size: 24,
      x,
      y,
      fontWeight: 'bold',
      fontStyle: 'normal',
      fontFamily: 'Arial',
      iconPosition: 'before',
      isDiscountBlock: false,
    };
    setTextLayers([...textLayers, newLayer]);
    setSelectedTextLayerId(newLayer.id);
  };

  // Resme Yazı Ekle butonu: sadece modal aç, kullanıcı canvas'a tıklayarak kendi ekler
  const handleResmeYaziEkle = () => {
    setShowImageTextModal(true);
  };

  // Kütüphaneden seçilen resmi önizleme/düzenleme alanına taşı — Kaydet ile bloğa eklenir
  // İçecekler (drink), ikonlar (icon), arka plan (background) dahil URL'si olan tüm resim-benzeri içerik kabul edilir
  const handleOverlayImageSelect = (content: any) => {
    const url = content.url || content.image_url;
    const imageLikeTypes = ['image', 'drink', 'background', 'icon'];
    const canUseAsOverlay = url && (imageLikeTypes.includes(content.type) || content.content_type === 'image');
    if (!canUseAsOverlay) return;
    setPendingOverlayImage({
      url,
      name: content.name || content.title || t('editor_image_default'),
      shape: overlayNextShape,
    });
  };

  // Pending overlay resmini bloğa kaydet (düzenlenmiş haliyle)
  const handleSaveOverlayImage = async () => {
    if (!pendingOverlayImage || !selectedBlockContent?.id || (selectedBlockContent.content_type !== 'image' && selectedBlockContent.content_type !== 'video')) return;
    const sc = selectedBlockContent.style_config ? (typeof selectedBlockContent.style_config === 'string' ? JSON.parse(selectedBlockContent.style_config || '{}') : { ...selectedBlockContent.style_config }) : {};
    const currentOverlays = Array.isArray(sc.overlayImages) ? sc.overlayImages : [];
    const n = currentOverlays.length;
    const newOverlay: OverlayImageLayer = {
      id: `overlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      image_url: pendingOverlayImage.url,
      x: 25 + n * 8,
      y: 25 + n * 8,
      size: 28,
      shape: pendingOverlayImage.shape,
    };
    const updatedSc = { ...sc, overlayImages: [...currentOverlays, newOverlay] };
    try {
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: { style_config: JSON.stringify(updatedSc) },
      });
      showSuccess(`✅ ${pendingOverlayImage.name} ${t('editor_added_on_image')}`);
      setPendingOverlayImage(null);
      setShowOverlayImageModal(false);
      await loadTemplate();
    } catch (err: any) {
      alert(`❌ ${err?.message || t('common_error')}`);
    }
  };

  const removeOverlayImage = async (id: string) => {
    const next = overlayImages.filter(o => o.id !== id);
    setOverlayImages(next);
    const content = selectedBlockContent;
    if (!content?.id || (content.content_type !== 'image' && content.content_type !== 'video')) return;
    try {
      const sc = content.style_config ? (typeof content.style_config === 'string' ? JSON.parse(content.style_config || '{}') : { ...content.style_config }) : {};
      await apiClient(`/template-block-contents/${content.id}`, {
        method: 'PATCH',
        body: { style_config: JSON.stringify({ ...sc, overlayImages: next }) },
      });
      showSuccess(`✅ ${t('editor_overlay_removed')}`);
      await loadTemplate();
    } catch (err: any) {
      setOverlayImages(overlayImages);
      alert(`❌ ${err?.message || t('common_error')}`);
    }
  };

  const updateOverlayImage = (id: string, updates: Partial<OverlayImageLayer>, contentId?: string) => {
    const isSelectedBlock = selectedBlockContent && String(selectedBlockContent.id) === String(contentId);
    if (contentId != null && !isSelectedBlock) {
      const next = (overlayImagesRef.current || []).map(o => o.id === id ? { ...o, ...updates } : o);
      overlayImagesRef.current = next;
      setOverlayDragLiveOverlays(next);
      return;
    }
    setOverlayImages(prev => {
      const next = prev.map(o => o.id === id ? { ...o, ...updates } : o);
      overlayImagesRef.current = next;
      return next;
    });
  };
  useEffect(() => { overlayImagesRef.current = overlayImages; }, [overlayImages]);

  // Boş blokta resim sırası modalı açıldığında: ilk resmi bloğa ekle
  const handleAddFirstImageFromModal = async (content: any) => {
    const url = content.url || content.image_url;
    const imageLikeTypes = ['image', 'drink', 'background', 'icon'];
    const canAdd = url && (imageLikeTypes.includes(content.type) || content.content_type === 'image');
    if (!selectedBlock || !canAdd) return;
    const block = blocks.find((b) => b.id === selectedBlock);
    if (!block) return;
    const contentData = {
      template_block_id: block.id,
      content_type: 'image',
      image_url: url,
      title: content.name || content.title || t('editor_image_default'),
      background_color: '#000000',
      style_config: JSON.stringify({ imageFit: 'cover' }),
    };
    try {
      setSaving(true);
      await apiClient('/template-block-contents', { method: 'POST', body: contentData });
      showSuccess(`✅ ${content.name || t('editor_image_default')} ${t('editor_added')}`);
      await loadTemplate();
    } catch (err: any) {
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Boş blokta video sırası modalı açıldığında: ilk videoyu bloğa ekle, modal aynı kalır ve tam config gösterilir
  const handleAddFirstVideoFromModal = async (content: any) => {
    const isVideo = content.type === 'video' || content.content_type === 'video';
    const url = content.url || content.image_url;
    if (!selectedBlock || !isVideo || !url) return;
    const block = blocks.find((b) => b.id === selectedBlock);
    if (!block) return;
    const contentData = {
      template_block_id: block.id,
      content_type: 'video',
      image_url: url,
      title: content.name || content.title || t('editor_video_default'),
      background_color: '#000000',
      style_config: JSON.stringify({ imageFit: 'cover' }),
    };
    try {
      setSaving(true);
      await apiClient('/template-block-contents', { method: 'POST', body: contentData });
      showSuccess(`✅ ${content.name} ${t('editor_added')}`);
      await loadTemplate();
    } catch (err: any) {
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Video döngüsü modalı: kütüphaneden video seçince döngü listesine ekle (sadece video kabul); video süresini tespit edip varsayılan/üst sınır yapar
  const handleVideoRotationAddFromLibrary = (content: any) => {
    const url = content.url || content.image_url;
    const isVideo = content.type === 'video' || content.content_type === 'video';
    if (!url || !isVideo) return;
    setEditingRotationItems((prev) => {
      if (prev.some((it) => it.url === url)) return prev;
      return [...prev, { url, durationSeconds: 10 }];
    });
    getVideoDurationInSeconds(url).then((sec) => {
      if (sec > 0) {
        const capped = Math.min(120, sec);
        setEditingRotationItems((prev) =>
          prev.map((it) =>
            it.url === url ? { ...it, durationSeconds: capped, sourceDurationSeconds: capped } : it
          )
        );
      }
    });
  };

  const removeRotationVideo = (url: string) => {
    setEditingRotationItems((prev) => prev.filter((it) => it.url !== url));
  };

  const updateRotationItemDuration = (url: string, durationSeconds: number) => {
    setEditingRotationItems((prev) =>
      prev.map((it) => {
        if (it.url !== url) return it;
        const maxSec = it.sourceDurationSeconds ?? 120;
        return { ...it, durationSeconds: Math.max(1, Math.min(maxSec, durationSeconds)) };
      })
    );
  };

  const openRotationItemTextEditor = (index: number) => {
    setEditingRotationTextIndex(index);
    // index === -1: ilk video (ana içeriğin textLayers'ı)
    if (index === -1) {
      setRotationItemTextLayers([...textLayers]);
    } else {
      setRotationItemTextLayers(editingRotationItems[index]?.textLayers ? [...editingRotationItems[index].textLayers!] : []);
    }
    setSelectedRotationTextLayerId(null);
  };

  const saveRotationItemTexts = () => {
    if (editingRotationTextIndex === null) return;
    if (editingRotationTextIndex === -1) {
      setTextLayers([...rotationItemTextLayers]);
    } else {
      setEditingRotationItems((prev) => prev.map((it, i) => (i === editingRotationTextIndex ? { ...it, textLayers: [...rotationItemTextLayers] } : it)));
    }
    setEditingRotationTextIndex(null);
    setRotationItemTextLayers([]);
    setSelectedRotationTextLayerId(null);
  };

  const addRotationItemTextLayer = (x = 50, y = 50) => {
    const newLayer: TextLayer = {
      id: `rot-txt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: t('editor_text_default'),
      color: '#ffffff',
      size: 24,
      x,
      y,
      fontWeight: 'bold',
      fontStyle: 'normal',
      fontFamily: 'Arial',
    };
    setRotationItemTextLayers((prev) => [...prev, newLayer]);
    setSelectedRotationTextLayerId(newLayer.id);
  };

  const updateRotationItemTextLayer = (layerId: string, updates: Partial<TextLayer>) => {
    setRotationItemTextLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...updates } : l)));
  };

  const removeRotationItemTextLayer = (layerId: string) => {
    setRotationItemTextLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedRotationTextLayerId === layerId) setSelectedRotationTextLayerId(null);
  };

  const saveVideoRotation = async () => {
    if (!selectedBlockContent?.id) return;
    const styleConfig = selectedBlockContent.style_config
      ? (typeof selectedBlockContent.style_config === 'string'
          ? JSON.parse(selectedBlockContent.style_config || '{}')
          : { ...selectedBlockContent.style_config })
      : {};
    const firstVideoDurationSeconds = Math.max(1, Math.min(120, editingFirstVideoDuration));
    const rotationItems = editingRotationItems.map((it) => {
      const maxSec = it.sourceDurationSeconds ?? 120;
      return {
        url: it.url,
        durationSeconds: Math.max(1, Math.min(maxSec, it.durationSeconds)),
        sourceDurationSeconds: it.sourceDurationSeconds,
        textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
      };
    });
    try {
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: {
          style_config: JSON.stringify({
            ...styleConfig,
            textLayers: textLayers,
            videoRotation: { firstVideoDurationSeconds, rotationItems },
          }),
        },
      });
      const block = blocks.find((b: any) => (b.contents || []).some((c: any) => c.id === selectedBlockContent.id));
      if (block?.contents) {
        const idx = block.contents.findIndex((c: any) => c.id === selectedBlockContent.id);
        if (idx >= 0) {
          const updated = { ...selectedBlockContent, style_config: { ...styleConfig, textLayers, videoRotation: { firstVideoDurationSeconds, rotationItems } } };
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === block.id
                ? { ...b, contents: b.contents.map((c: any) => (c.id === selectedBlockContent.id ? updated : c)) }
                : b
            )
          );
          setSelectedBlockContent(updated);
        }
      }
      setShowVideoRotationModal(false);
      setVideoRotationEditMode(false);
    } catch (e) {
      setError((e as Error).message || t('editor_save_error'));
    }
  };

  /** Seçili görsel içeriğinin style_config'ini güncelle (opacity, clipShape vb.) */
  const updateContentStyleConfig = useCallback(async (updates: Record<string, unknown>) => {
    if (!selectedBlockContent?.id) return;
    const styleConfig = selectedBlockContent.style_config
      ? (typeof selectedBlockContent.style_config === 'string'
          ? JSON.parse(selectedBlockContent.style_config || '{}')
          : { ...selectedBlockContent.style_config })
      : {};
    const merged = { ...styleConfig, ...updates };
    try {
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: { style_config: JSON.stringify(merged) },
      });
      const block = blocks.find((b: any) => (b.contents || []).some((c: any) => c.id === selectedBlockContent.id));
      if (block?.contents) {
        const updated = { ...selectedBlockContent, style_config: merged };
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, contents: b.contents.map((c: any) => (c.id === selectedBlockContent.id ? updated : c)) } : b
          )
        );
        setSelectedBlockContent(updated);
      }
    } catch (e) {
      setError((e as Error).message || t('editor_update_error'));
    }
  }, [selectedBlockContent, blocks]);

  /** Seçili görsel içeriğinin image_url'ini güncelle (AI/renk arka plan kaldırma sonrası) */
  const updateContentImageUrl = useCallback(async (newUrl: string) => {
    if (!selectedBlockContent?.id) return;
    try {
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: { image_url: newUrl },
      });
      const block = blocks.find((b: any) => (b.contents || []).some((c: any) => c.id === selectedBlockContent.id));
      if (block?.contents) {
        const updated = { ...selectedBlockContent, image_url: newUrl };
        setBlocks((prev) =>
          prev.map((b) =>
            b.id === block.id ? { ...b, contents: b.contents.map((c: any) => (c.id === selectedBlockContent.id ? updated : c)) } : b
          )
        );
        setSelectedBlockContent(updated);
      }
    } catch (e) {
      setError((e as Error).message || t('editor_update_error'));
    }
  }, [selectedBlockContent, blocks]);

  // Resim döngüsü: kütüphaneden resim veya video seçince döngü listesine ekle (tüm kategoriler: Yiyecekler, İçecekler, video, vb.)
  const handleImageRotationAddFromLibrary = (content: any) => {
    const url = content.url || content.image_url;
    const imageLikeTypes = ['image', 'drink', 'background', 'icon'];
    const isVideo = content.type === 'video' || content.content_type === 'video';
    const isImageLike = imageLikeTypes.includes(content.type) || content.content_type === 'image';
    const canAdd = url && (isImageLike || isVideo);
    if (!canAdd) return;
    const title = content.name || content.title || '';
    const durationSeconds = isVideo ? 10 : 5;
    setEditingImageRotationItems((prev) => {
      if (prev.some((it) => it.url === url)) return prev;
      return [...prev, { url, durationSeconds, textLayers: [], title, price: '', isVideo: isVideo || undefined }];
    });
  };

  const updateImageRotationItemTitlePrice = (url: string, updates: { title?: string; price?: string }) => {
    setEditingImageRotationItems((prev) => prev.map((it) => (it.url === url ? { ...it, ...updates } : it)));
  };

  const openImageRotationTextEditor = (index: number) => {
    setEditingImageRotationTextIndex(index);
    if (index === -1) {
      setImageRotationTextLayers([...textLayers]);
    } else {
      setImageRotationTextLayers(editingImageRotationItems[index]?.textLayers ? [...editingImageRotationItems[index].textLayers!] : []);
    }
    setSelectedImageRotationTextLayerId(null);
  };

  const saveImageRotationTexts = () => {
    if (editingImageRotationTextIndex === null) return;
    if (editingImageRotationTextIndex === -1) {
      setTextLayers([...imageRotationTextLayers]);
    } else {
      setEditingImageRotationItems((prev) => prev.map((it, i) => (i === editingImageRotationTextIndex ? { ...it, textLayers: [...imageRotationTextLayers] } : it)));
    }
    setEditingImageRotationTextIndex(null);
    setImageRotationTextLayers([]);
    setSelectedImageRotationTextLayerId(null);
    setDraggingImageRotationLayerId(null);
  };

  const addImageRotationTextLayer = (x = 50, y = 50) => {
    const newLayer: TextLayer = {
      id: `img-rot-txt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: t('editor_text_default'),
      color: '#ffffff',
      size: 24,
      x,
      y,
      fontWeight: 'bold',
      fontStyle: 'normal',
      fontFamily: 'Arial',
    };
    setImageRotationTextLayers((prev) => [...prev, newLayer]);
    setSelectedImageRotationTextLayerId(newLayer.id);
  };

  const updateImageRotationTextLayer = (layerId: string, updates: Partial<TextLayer>) => {
    setImageRotationTextLayers((prev) => prev.map((l) => (l.id === layerId ? { ...l, ...updates } : l)));
  };

  const removeImageRotationTextLayer = (layerId: string) => {
    setImageRotationTextLayers((prev) => prev.filter((l) => l.id !== layerId));
    if (selectedImageRotationTextLayerId === layerId) setSelectedImageRotationTextLayerId(null);
  };

  const handleImageRotationTextDragStart = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setDraggingImageRotationLayerId(layerId);
    setSelectedImageRotationTextLayerId(layerId);
  };

  const handleImageRotationCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRotationTextPreviewRef.current) return;
    const rect = imageRotationTextPreviewRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    addImageRotationTextLayer(x, y);
  };

  useEffect(() => {
    if (!draggingImageRotationLayerId || !imageRotationTextPreviewRef.current) return;
    const onMove = (e: MouseEvent) => {
      const rect = imageRotationTextPreviewRef.current!.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setImageRotationTextLayers((prev) =>
        prev.map((l) => (l.id === draggingImageRotationLayerId ? { ...l, x, y } : l))
      );
    };
    const onUp = () => setDraggingImageRotationLayerId(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggingImageRotationLayerId]);

  const removeImageRotationItem = (url: string) => {
    setEditingImageRotationItems((prev) => prev.filter((it) => it.url !== url));
  };

  const removeFirstImageFromBlock = async () => {
    if (!selectedBlockContent?.id || !confirm(t('editor_confirm_remove_first_image'))) return;
    try {
      const next = editingImageRotationItems[0];
      if (next) {
        await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
          method: 'PATCH',
          body: {
            image_url: next.url,
            title: next.title || '',
            price: next.price || null,
            style_config: JSON.stringify({
              ...(typeof selectedBlockContent.style_config === 'string' ? JSON.parse(selectedBlockContent.style_config || '{}') : selectedBlockContent.style_config || {}),
              imageRotation: {
                firstImageDurationSeconds: editingFirstImageDuration,
                rotationItems: editingImageRotationItems.slice(1).map((it) => ({
                  url: it.url,
                  durationSeconds: it.durationSeconds,
                  textLayers: it.textLayers || [],
                  title: it.title,
                  price: it.price,
                })),
              },
            }),
          },
        });
        setEditingImageRotationItems((prev) => prev.slice(1));
        setEditingFirstImageTitle(next.title || '');
        setEditingFirstImagePrice(next.price || '');
      } else {
        await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
          method: 'PATCH',
          body: { image_url: '', title: '', price: null },
        });
      }
      await loadTemplate();
      setShowImageRotationModal(false);
    } catch (e) {
      setError((e as Error).message || t('editor_delete_error'));
    }
  };

  const updateImageRotationItemDuration = (url: string, durationSeconds: number) => {
    setEditingImageRotationItems((prev) =>
      prev.map((it) => (it.url === url ? { ...it, durationSeconds: Math.max(1, Math.min(120, durationSeconds)) } : it))
    );
  };

  const saveImageRotation = async () => {
    if (!selectedBlockContent?.id) return;
    const styleConfig = selectedBlockContent.style_config
      ? (typeof selectedBlockContent.style_config === 'string'
          ? JSON.parse(selectedBlockContent.style_config || '{}')
          : { ...selectedBlockContent.style_config })
      : {};
    const firstImageDurationSeconds = Math.max(1, Math.min(120, editingFirstImageDuration));
    const rotationItems = editingImageRotationItems.map((it) => ({
      url: it.url,
      durationSeconds: Math.max(1, Math.min(120, it.durationSeconds)),
      textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
      title: it.title || '',
      price: it.price != null && it.price !== '' ? it.price : undefined,
      isVideo: it.isVideo || undefined,
    }));
    const patchTitle = editingFirstImageTitle.trim() || selectedBlockContent.title;
    const patchPrice = editingFirstImagePrice.trim() ? editingFirstImagePrice : null;
    try {
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: {
          title: patchTitle,
          price: patchPrice,
          style_config: JSON.stringify({
            ...styleConfig,
            textLayers: textLayers,
            imageRotation: { firstImageDurationSeconds, rotationItems },
          }),
        },
      });
      const block = blocks.find((b: any) => (b.contents || []).some((c: any) => c.id === selectedBlockContent.id));
      if (block?.contents) {
        const idx = block.contents.findIndex((c: any) => c.id === selectedBlockContent.id);
        if (idx >= 0) {
          const updated = {
            ...selectedBlockContent,
            title: patchTitle,
            price: patchPrice,
            style_config: { ...styleConfig, textLayers, imageRotation: { firstImageDurationSeconds, rotationItems } },
          };
          setBlocks((prev) =>
            prev.map((b) =>
              b.id === block.id
                ? { ...b, contents: b.contents.map((c: any) => (c.id === selectedBlockContent.id ? updated : c)) }
                : b
            )
          );
          setSelectedBlockContent(updated);
        }
      }
      setShowImageRotationModal(false);
      setImageRotationEditMode(false);
    } catch (e) {
      setError((e as Error).message || t('editor_save_error'));
    }
  };

  // Canvas'a (resme) tıklayınca o noktada yeni yazı ekle
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!textPreviewRef.current) return;
    const rect = textPreviewRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    addTextLayer(x, y);
  };

  // Yazı katmanını sil
  const removeTextLayer = (layerId: string) => {
    setTextLayers(textLayers.filter(l => l.id !== layerId));
    if (selectedTextLayerId === layerId) {
      setSelectedTextLayerId(null);
    }
  };

  // Yazı katmanını güncelle
  const updateTextLayer = (layerId: string, updates: Partial<TextLayer>) => {
    setTextLayers(textLayers.map(l => l.id === layerId ? { ...l, ...updates } : l));
  };

  // Mouse ile sürükleme başlat
  const handleTextDragStart = (e: React.MouseEvent, layerId: string) => {
    e.preventDefault();
    setDraggingLayerId(layerId);
    setSelectedTextLayerId(layerId);
  };

  // Sürükleme aktifken document seviyesinde mouse event'leri (önizleme dışına çıksa bile sürükleme devam eder) (mouse önizleme dışına çıksa bile takip için)
  useEffect(() => {
    if (!draggingLayerId || !textPreviewRef.current) return;
    const onMove = (e: MouseEvent) => {
      const rect = textPreviewRef.current!.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.max(0, Math.min(100, x));
      const clampedY = Math.max(0, Math.min(100, y));
      setTextLayers(prev => prev.map(l => l.id === draggingLayerId ? { ...l, x: clampedX, y: clampedY } : l));
    };
    const onUp = () => setDraggingLayerId(null);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [draggingLayerId]);

  // Tek Menü (Special FOOD MENU) kaydet: header + 3 kategori
  const handleSaveRegionalMenuEdit = async () => {
    if (!selectedBlockContent?.id) return;
    try {
      setSaving(true);
      const styleConfig = {
        header_special: editingRegionalHeaderSpecial,
        header_title: editingRegionalHeaderTitle,
        categories: editingRegionalCategories.map((cat) => ({
          id: cat.id,
          name: cat.name,
          image_url: cat.image_url,
          items: cat.items.map((i) => ({
            id: i.id,
            name: i.name,
            description: i.description,
            price: i.price.trim() || '$$',
          })),
        })),
        contact_info: editingRegionalMenuContact,
      };
      await apiClient(`/template-block-contents/${selectedBlockContent.id}`, {
        method: 'PATCH',
        body: {
          content_type: 'regional_menu',
          title: editingRegionalHeaderTitle,
          image_url: editingRegionalCategories[0]?.image_url || '',
          style_config: JSON.stringify(styleConfig),
        },
      });
      showSuccess(`✅ ${t('editor_menu_updated')}`);
      await loadTemplate();
      setShowRegionalMenuEditModal(false);
    } catch (err: any) {
      console.error(err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Kategori resmi değiştir (dosya seç, kategori index) — Supabase Storage'a yükle
  const handleRegionalCategoryImageChange = async (categoryIdx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setEditingCategoryImageIdx(null);
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const up = await fetch('/api/upload', { method: 'POST', body: fd });
      const upJson = await up.json();
      const url = upJson?.assets?.[0]?.src || upJson?.data?.[0]?.src;
      if (url) {
        setEditingRegionalCategories((prev) =>
          prev.map((c, i) => (i === categoryIdx ? { ...c, image_url: url } : c))
        );
      } else {
        alert(upJson?.error || 'Yükleme başarısız');
      }
    } catch (err: any) {
      alert(err?.message || 'Yükleme başarısız');
    }
  };

  // İkon konumlandırma fonksiyonu
  const handleIconPositionSelect = async (position: string) => {
    if (!pendingIconContent || !selectedBlock) {
      return;
    }

    try {
      setSaving(true);
      
      // Konum bilgisini ekle
      const styleConfig = {
        position: position,
      };
      
      const iconData = {
        ...pendingIconContent,
        style_config: JSON.stringify(styleConfig),
      };

      // Yeni ikon ekle (mevcut resim içeriğini koru)
      await apiClient('/template-block-contents', {
        method: 'POST',
        body: iconData,
      });
      
      showSuccess(`✅ ${t('editor_icon_added')}`);
      await loadTemplate();
      setShowIconPositionModal(false);
      setPendingIconContent(null);
    } catch (err: any) {
      console.error('Error adding icon:', err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Rozet düzenleme fonksiyonu
  const handleBadgeSave = async () => {
    if (!pendingBadgeContent || !selectedBlock) {
      return;
    }

    try {
      setSaving(true);
      
      const styleConfig = {
        position: editingBadgePosition,
      };
      
      const badgeData = {
        ...pendingBadgeContent,
        campaign_text: editingBadgeText || t('editor_default_new'),
        background_color: editingBadgeBgColor,
        text_color: editingBadgeTextColor,
        style_config: JSON.stringify(styleConfig),
      };

      // Yeni rozet ekle (mevcut resim içeriğini koru)
      await apiClient('/template-block-contents', {
        method: 'POST',
        body: badgeData,
      });
      
      showSuccess(`✅ ${t('editor_badge_added')}`);
      await loadTemplate();
      setShowBadgeEditModal(false);
      setPendingBadgeContent(null);
      setEditingBadgeText('');
      setEditingBadgeBgColor('#3B82F6');
      setEditingBadgeTextColor('#FFFFFF');
      setEditingBadgePosition('top-left');
    } catch (err: any) {
      console.error('Error adding badge:', err);
      alert(`❌ Hata: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // İçerik silme fonksiyonu
  const handleDeleteContent = async (contentId: string, contentType: string) => {
    if (!contentId) {
      alert(`⚠️ ${t('editor_content_id_not_found')}`);
      return;
    }

    const typeLabel = contentType === 'icon' ? t('editor_icon') : contentType === 'campaign_badge' ? t('editor_badge') : contentType === 'drink' ? t('editor_category_drinks') : t('editor_content');
    if (!confirm(t('editor_confirm_delete_content').replace('{type}', typeLabel))) {
      return;
    }

    try {
      setSaving(true);
      await apiClient(`/template-block-contents/${contentId}`, {
        method: 'DELETE',
      });
      
      alert(`✅ ${t('editor_content_deleted')}`);
      await loadTemplate();
    } catch (err: any) {
      console.error('Error deleting content:', err);
      alert(`❌ ${t('common_error')}: ${err.message || t('editor_content_delete_error')}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplate = async () => {
    try {
      setSaving(true);
      
      // Template'i kaydet
      await apiClient(`/templates/${templateId}`, {
        method: 'PATCH',
        body: {
          display_name: template.display_name,
          description: template.description,
        },
      });
      logAdminActivity({ action_type: 'template_save', page_key: 'editor', resource_type: 'template', resource_id: templateId, details: { name: template?.display_name } });

      showSuccess(`✅ ${t('editor_template_saved')}`);

      // Template listesine dön
      setTimeout(() => {
        router.push(localePath('/templates'));
      }, 1500);
    } catch (err: any) {
      console.error('Error saving template:', err);
      alert(`❌ ${t('editor_save_record_error')}: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const showSuccess = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  };

  const handleSaveAsOpen = async () => {
    setShowSaveAsModal(true);
    setSaveAsChoice(null);
    setSaveAsSelectedUserId('');
    try {
      const users = await apiClient('/users');
      setSaveAsUsers(Array.isArray(users) ? users : []);
    } catch {
      setSaveAsUsers([]);
    }
  };

  const handleSaveAsSubmit = async () => {
    if (!templateId) return;
    if (saveAsChoice === 'user' && !saveAsSelectedUserId) {
      alert(t('editor_save_as_select_user_alert'));
      return;
    }
    if (!saveAsChoice) return;
    try {
      setSaving(true);
      await apiClient(`/templates/${templateId}/save-as`, {
        method: 'POST',
        body: {
          scope: saveAsChoice,
          ...(saveAsChoice === 'user' && { target_user_id: saveAsSelectedUserId }),
        },
      });
      setShowSaveAsModal(false);
      showSuccess(saveAsChoice === 'system' ? t('editor_save_as_system_success') : t('editor_save_as_user_success'));
      setTimeout(() => router.push(localePath(showSaveAs ? '/editor' : '/templates')), 1500);
    } catch (err: any) {
      alert(err?.message || t('common_error'));
    } finally {
      setSaving(false);
    }
  };


  const selectedBlockData = blocks.find(b => b.id === selectedBlock);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-xl font-medium text-white mb-2">⏳ {t('common_loading')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-xl font-medium text-red-400 mb-4">❌ {error}</div>
          <Link href="/templates" className="text-blue-400 hover:text-blue-300">
            ← Template'lere Dön
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                {t('login_title')}
              </Link>
              <span className="text-gray-400">|</span>
              <span className="text-gray-700">{template?.display_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={showSaveAs ? localePath('/editor') : localePath('/templates')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </Link>
              <button
                onClick={handleSaveTemplate}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all font-semibold disabled:opacity-50"
              >
                {saving ? '⏳ ' + t('editor_saving') : '💾 ' + t('btn_save')}
              </button>
              {showSaveAs && (
                <button
                  onClick={handleSaveAsOpen}
                  disabled={saving}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold disabled:opacity-50"
                >
                  📄 {t('editor_save_as')}
                </button>
              )}
              <button
                type="button"
                onClick={handleExportPNG}
                className="py-2 px-4 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {t('editor_png_download')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Ana panel: Sol kolon (bilgi kartları küçük), Sağ kolon (önizleme) */}
          <div className="lg:col-span-12 flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* Sol: Ekle / Arka plan / Bilgi Kartları — tasarım editörü birebir */}
            <div className="flex flex-col gap-3 lg:w-72 xl:w-80 shrink-0 order-2 lg:order-1">
              {/* Ekle — tasarım editöründe birebir */}
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <h3 className="font-semibold text-slate-800 mb-2">{t('editor_add_section')}</h3>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBlock) { alert(`⚠️ ${t('editor_select_block_first')}`); return; }
                      if (selectedBlockContent?.content_type === 'image' || selectedBlockContent?.content_type === 'video') {
                        addTextLayer(50, 50);
                      } else {
                        alert(`⚠️ ${t('editor_select_block_first')}`);
                      }
                    }}
                    className="py-2 px-4 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
                  >
                    + {t('editor_text_default')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBlock) { alert(`⚠️ ${t('editor_select_block_first')}`); return; }
                      setAddFromLibraryCategory('image');
                      setShowAddFromLibraryModal(!showAddFromLibraryModal);
                    }}
                    className={`py-2 px-4 rounded-lg border text-sm font-medium ${showAddFromLibraryModal ? 'bg-slate-200 border-slate-400' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
                  >
                    + {t('editor_image_library')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBlock) { alert(`⚠️ ${t('editor_select_block_first')}`); return; }
                      blockImageFileInputRef.current?.click();
                    }}
                    className="py-2 px-4 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
                  >
                    + {t('editor_image_file')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedBlock) { alert(`⚠️ ${t('editor_select_block_first')}`); return; }
                      setShowImageRotationModal(true);
                    }}
                    className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
                  >
                    + {t('editor_image_carousel')}
                  </button>
                </div>
              </div>
              <input
                ref={blockImageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBlockImageFromFile}
              />

              {/* Arka plan — tasarım editöründe birebir (seçili blok varsa) */}
              {selectedBlock && selectedBlockData && (() => {
                const blockSc = selectedBlockData.style_config ? (typeof selectedBlockData.style_config === 'string' ? JSON.parse(selectedBlockData.style_config || '{}') : selectedBlockData.style_config) : {};
                const bgColor = blockSc.background_color || '#374151';
                return (
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <h3 className="font-semibold text-slate-800 mb-2">{t('editor_background')}</h3>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={async (e) => {
                        const c = e.target.value;
                        try {
                          await apiClient(`/template-blocks/${selectedBlock}`, {
                            method: 'PATCH',
                            body: { style_config: JSON.stringify({ ...blockSc, background_color: c }) },
                          });
                          setBlocks((prev) => prev.map((b) => (b.id === selectedBlock ? { ...b, style_config: { ...blockSc, background_color: c } } : b)));
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                      className="w-full h-10 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                );
              })()}

              {/* Seçili Blok Kartı */}
              {selectedBlockData && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-3 rounded-lg shadow border border-blue-200">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center shrink-0">
                      <span className="text-white text-xs">📦</span>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-gray-900">{t('editor_selected_block')}</h3>
                      <p className="text-[11px] text-gray-600">{t('editor_block')} {selectedBlockData.block_index + 1}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <div className="bg-white px-2 py-1 rounded text-[11px]">
                      <p className="text-gray-500">{t('editor_position')}</p>
                      <p className="font-semibold text-gray-900">
                        {Number(selectedBlockData.position_x || 0).toFixed(0)}%, {Number(selectedBlockData.position_y || 0).toFixed(0)}%
                      </p>
                    </div>
                    <div className="bg-white px-2 py-1 rounded text-[11px]">
                      <p className="text-gray-500">{t('editor_size')}</p>
                      <p className="font-semibold text-gray-900">
                        {Number(selectedBlockData.width || 20).toFixed(0)}% × {Number(selectedBlockData.height || 20).toFixed(0)}%
                      </p>
                    </div>
                  </div>

                  <p className="text-[11px] text-center text-gray-500 mb-2">
                    💡 {t('editor_add_content_hint')}
                  </p>
                  
                  {/* Düzenleme Butonu - Yöresel Menü */}
                  {selectedBlockContent?.content_type === 'regional_menu' && (
                    <button
                      onClick={() => setShowRegionalMenuEditModal(true)}
                      className="w-full px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-black rounded text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <span>✏️</span>
                      <span>{t('editor_edit_menu')}</span>
                    </button>
                  )}
                  {/* Düzenleme Butonu - Ürün / Resim */}
                  {selectedBlockContent && selectedBlockContent.content_type !== 'regional_menu' && (selectedBlockContent.content_type === 'image' || selectedBlockContent.content_type === 'video' || selectedBlockContent.title || selectedBlockContent.price) && (
                    <button
                      onClick={() => setIsEditingContent(true)}
                      className="w-full px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold flex items-center justify-center gap-1"
                    >
                      <span>✏️</span>
                      <span>{t('editor_product_name_price')}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Yazı katmanları — inline (modal yok), tasarım editörü gibi */}
              {selectedBlock && (selectedBlockContent?.content_type === 'image' || selectedBlockContent?.content_type === 'video') && textLayers.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-800">{t('editor_texts_count').replace('{count}', String(textLayers.length))}</h3>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto">
                    {textLayers.map((layer, idx) => (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedTextLayerId(layer.id)}
                        className={`flex items-center justify-between p-1.5 rounded cursor-pointer text-xs ${selectedTextLayerId === layer.id ? 'bg-slate-200 border border-slate-400' : 'bg-slate-50 border border-slate-200 hover:bg-slate-100'}`}
                      >
                        <span className="truncate flex-1" style={{ color: layer.color }}>#{idx + 1} {(layer.text || '').slice(0, 20)}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeTextLayer(layer.id); }} className="p-0.5 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                      </div>
                    ))}
                  </div>
                  {selectedTextLayerId && textLayers.find(l => l.id === selectedTextLayerId) && (() => {
                    const layer = textLayers.find(l => l.id === selectedTextLayerId)!;
                    return (
                      <div className="pt-2 border-t border-slate-200 space-y-2">
                        <input type="text" value={layer.text} onChange={(e) => updateTextLayer(layer.id, { text: e.target.value })} className="w-full px-2 py-1 rounded border border-slate-200 text-xs" placeholder={t('editor_text_default')} />
                        <div className="flex gap-1">
                          <button type="button" onClick={() => updateTextLayer(layer.id, { fontWeight: (layer.fontWeight || '').includes('bold') ? 'normal' : 'bold' })} className={`w-6 h-6 rounded border text-xs font-bold ${(layer.fontWeight || '').includes('bold') ? 'bg-slate-800 text-white' : 'border-slate-200'}`}>B</button>
                          <button type="button" onClick={() => updateTextLayer(layer.id, { fontStyle: (layer.fontStyle || '').includes('italic') ? 'normal' : 'italic' })} className={`w-6 h-6 rounded border text-xs italic ${(layer.fontStyle || '').includes('italic') ? 'bg-slate-800 text-white' : 'border-slate-200'}`}>I</button>
                          <input type="color" value={layer.color} onChange={(e) => updateTextLayer(layer.id, { color: e.target.value })} className="w-6 h-6 rounded border cursor-pointer" />
                          <input type="number" min={8} max={72} value={layer.size} onChange={(e) => updateTextLayer(layer.id, { size: Number(e.target.value) || 24 })} className="w-12 px-1 py-0.5 rounded border border-slate-200 text-xs" />
                        </div>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((a) => (
                            <button key={a} type="button" onClick={() => updateTextLayer(layer.id, { textAlign: a })} className={`flex-1 py-0.5 rounded text-[10px] ${(layer.textAlign || 'center') === a ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>{a === 'left' ? t('editor_align_left') : a === 'center' ? t('editor_align_center') : t('editor_align_right')}</button>
                          ))}
                        </div>
                        <div className="flex gap-1">
                          <input type="number" min={0} max={100} value={Math.round(layer.x)} onChange={(e) => updateTextLayer(layer.id, { x: Number(e.target.value) || 0 })} className="w-12 px-1 py-0.5 rounded border text-[10px]" title="X %" />
                          <input type="number" min={0} max={100} value={Math.round(layer.y)} onChange={(e) => updateTextLayer(layer.id, { y: Number(e.target.value) || 0 })} className="w-12 px-1 py-0.5 rounded border text-[10px]" title="Y %" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Resme Yazı Ekle - küçük butonlar yan yana (artık modal açmaz, direkt ekler) */}
              {selectedBlock && (selectedBlockContent?.content_type === 'image' || selectedBlockContent?.content_type === 'video') && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => addTextLayer(50, 50)}
                    title={t('editor_add_text_hint')}
                    className="px-2 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span>✏️</span>
                    <span>{t('editor_add_text_to_image')}</span>
                  </button>
                  <button
                    onClick={() => setShowOverlayImageModal(true)}
                    title={t('editor_add_overlay_image_hint')}
                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                  >
                    <span>🖼️</span>
                    <span>{t('editor_add_overlay_image')}</span>
                    {overlayImages.length > 0 && <span className="text-[10px] opacity-90">({overlayImages.length})</span>}
                  </button>
                  {selectedBlockContent?.content_type === 'video' && (
                    <button
                      onClick={() => setShowVideoRotationModal(true)}
                      title={t('editor_video_rotation_hint')}
                      className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                    >
                      <span>🎬</span>
                      <span>{t('editor_video_rotation')}</span>
                    </button>
                  )}
                  {selectedBlockContent?.content_type === 'image' && (
                    <button
                      onClick={() => setShowImageRotationModal(true)}
                      title={t('editor_image_rotation_hint')}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-xs font-semibold flex items-center gap-1.5"
                    >
                      <span>🖼️</span>
                      <span>{t('editor_image_rotation')}</span>
                    </button>
                  )}
                </div>
              )}

              {/* Seçili öğe — Görsel: Opaklık, Şekil, Arka plan kaldırma (tasarım editörüyle aynı) */}
              {selectedBlockContent?.content_type === 'image' && selectedBlockContent?.image_url && (() => {
                const sc = selectedBlockContent.style_config
                  ? (typeof selectedBlockContent.style_config === 'string' ? JSON.parse(selectedBlockContent.style_config || '{}') : selectedBlockContent.style_config)
                  : {};
                const opacity = typeof sc.imageOpacity === 'number' ? sc.imageOpacity : 1;
                const clipShape = sc.imageClipShape === 'circle' ? 'circle' : 'rect';
                const imageFit = sc.imageFit === 'contain' ? 'contain' : 'cover';
                return (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-2">{t('editor_selected_item')}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('editor_appearance')}</label>
                        <div className="flex gap-1">
                          {[
                            { v: 'contain' as const, label: t('editor_fit') },
                            { v: 'cover' as const, label: t('editor_crop') },
                          ].map(({ v, label }) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateContentStyleConfig({ ...sc, imageFit: v })}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border-2 ${imageFit === v ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{imageFit === 'contain' ? t('editor_image_full_visible') : t('editor_fill_crop_desc')}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('editor_opacity')}</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={opacity}
                            onChange={(e) => updateContentStyleConfig({ ...sc, imageOpacity: Number(e.target.value) })}
                            className="flex-1 max-w-[120px] h-2 accent-slate-600"
                          />
                          <span className="text-xs text-slate-600 w-10">{Math.round(opacity * 100)}%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('editor_shape')}</label>
                        <div className="flex gap-1">
                          {(['rect', 'circle'] as const).map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => updateContentStyleConfig({ ...sc, imageClipShape: shape })}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border-2 ${clipShape === shape ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {shape === 'rect' ? `▭ ${t('editor_rect')}` : `○ ${t('editor_circle')}`}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="pt-2 border-t border-slate-200">
                        <h4 className="text-xs font-semibold text-slate-700 mb-2">{t('editor_make_bg_transparent')}</h4>
                        <p className="text-[11px] text-slate-500 mb-2">{t('editor_make_transparent_desc')}</p>
                        {removeBgAiError && <p className="text-xs text-red-600 mb-2">{removeBgAiError}</p>}
                        <button
                          type="button"
                          disabled={removeBgAiLoading || removeBgLoading}
                          onClick={async () => {
                            setRemoveBgAiLoading(true);
                            setRemoveBgAiError(null);
                            try {
                              const dataUrl = await getRemoveBackgroundDataUrl(selectedBlockContent.image_url);
                              const res = await fetch(dataUrl);
                              const blob = await res.blob();
                              const file = new File([blob], `bg-removed-${Date.now()}.png`, { type: 'image/png' });
                              const fd = new FormData();
                              fd.append('files', file);
                              const up = await fetch('/api/upload', { method: 'POST', body: fd });
                              if (!up.ok) throw new Error(t('editor_upload_failed'));
                              const j = await up.json();
                              const newUrl = j?.assets?.[0]?.src ?? j?.data?.[0]?.src;
                              if (newUrl) await updateContentImageUrl(newUrl);
                            } catch (err) {
                              setRemoveBgAiError(err instanceof Error ? err.message : t('editor_operation_failed'));
                            } finally {
                              setRemoveBgAiLoading(false);
                            }
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-violet-600 text-white text-xs font-medium hover:bg-violet-700 disabled:opacity-50 mb-3"
                        >
                          {removeBgAiLoading ? t('editor_processing') : t('editor_remove_bg_ai')}
                        </button>
                        <p className="text-[11px] text-slate-500 mb-2">{t('editor_or_make_color_transparent')}</p>
                        <div className="flex gap-2 items-center mb-2">
                          <input type="color" value={removeBgColor} onChange={(e) => { setRemoveBgColor(e.target.value); setRemoveBgError(null); }} className="h-8 w-12 rounded border cursor-pointer" />
                          <input type="text" value={removeBgColor} onChange={(e) => { setRemoveBgColor(e.target.value); setRemoveBgError(null); }} className="flex-1 min-w-0 rounded border px-2 py-1 text-xs" />
                        </div>
                        <div className="flex gap-2 items-center mb-2">
                          <span className="text-xs text-slate-600">{t('editor_tolerance')}</span>
                          <input type="range" min={0} max={120} value={removeBgTolerance} onChange={(e) => { setRemoveBgTolerance(Number(e.target.value)); setRemoveBgError(null); }} className="flex-1" />
                          <span className="text-xs w-6">{removeBgTolerance}</span>
                        </div>
                        {removeBgError && <p className="text-xs text-red-600 mb-2">{removeBgError}</p>}
                        <button
                          type="button"
                          disabled={removeBgLoading || removeBgAiLoading}
                          onClick={async () => {
                            setRemoveBgLoading(true);
                            setRemoveBgError(null);
                            try {
                              const dataUrl = await makeColorTransparent(selectedBlockContent.image_url, removeBgColor, removeBgTolerance);
                              const res = await fetch(dataUrl);
                              const blob = await res.blob();
                              const file = new File([blob], `transparent-${Date.now()}.png`, { type: 'image/png' });
                              const fd = new FormData();
                              fd.append('files', file);
                              const up = await fetch('/api/upload', { method: 'POST', body: fd });
                              if (!up.ok) throw new Error(t('editor_upload_failed'));
                              const j = await up.json();
                              const newUrl = j?.assets?.[0]?.src ?? j?.data?.[0]?.src;
                              if (newUrl) await updateContentImageUrl(newUrl);
                            } catch (err) {
                              setRemoveBgError(err instanceof Error ? err.message : t('editor_operation_failed'));
                            } finally {
                              setRemoveBgLoading(false);
                            }
                          }}
                          className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {removeBgLoading ? t('editor_processing') : t('editor_make_color_transparent')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Seçili öğe — Video: Kırp / Sığdır */}
              {selectedBlockContent?.content_type === 'video' && (() => {
                const sc = selectedBlockContent.style_config
                  ? (typeof selectedBlockContent.style_config === 'string' ? JSON.parse(selectedBlockContent.style_config || '{}') : selectedBlockContent.style_config)
                  : {};
                const imageFit = sc.imageFit === 'contain' ? 'contain' : 'cover';
                return (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 rounded-lg border border-slate-200">
                    <h3 className="text-xs font-bold text-slate-800 mb-2">{t('editor_selected_item')}</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">{t('editor_appearance')}</label>
                        <div className="flex gap-1">
                          {[
                            { v: 'contain' as const, label: t('editor_fit') },
                            { v: 'cover' as const, label: t('editor_crop') },
                          ].map(({ v, label }) => (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateContentStyleConfig({ ...sc, imageFit: v })}
                              className={`flex-1 py-1.5 rounded text-xs font-medium border-2 ${imageFit === v ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-200'}`}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{imageFit === 'contain' ? t('editor_video_full_visible') : t('editor_fill_crop_desc')}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

            </div>

            {/* Önizleme - sağda (mobilde üstte) */}
            <div className="bg-white p-4 lg:p-6 rounded-xl shadow-lg order-1 lg:order-2 flex-1 min-w-0">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-bold text-gray-900">
                  👁️ {t('editor_preview')}
                </h2>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="text-sm text-gray-600">
                    {blocks.length} {t('editor_block')}
                  </div>
                  {selectedBlock && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleResetSelectedBlock();
                        }}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ↺ {t('editor_reset_selected_block')}
                      </button>
                    </>
                  )}
                  {selectedBlock && (() => {
                    const block = blocks.find((b: any) => b.id === selectedBlock);
                    const hasImage = block?.contents?.some((c: any) => c.content_type === 'image');
                    return hasImage ? (
                      <button
                        type="button"
                        onClick={() => setScaleModeBlockId((prev) => (prev === selectedBlock ? null : selectedBlock))}
                        className={`px-4 py-2 font-semibold rounded-lg shadow-md transition-all text-sm flex items-center gap-2 ${scaleModeBlockId === selectedBlock ? 'bg-blue-700 text-white ring-2 ring-blue-400' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                      >
                        <span>📐</span>
                        <span>{t('editor_scale_btn')}</span>
                      </button>
                    ) : null;
                  })()}
                  <button
                    onClick={() => setShowFullScreenPreview(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 flex items-center gap-2 hover:scale-105 text-sm"
                  >
                    <span className="text-lg">🖥️</span>
                    <span>{t('editor_fullscreen')}</span>
                  </button>
                </div>
              </div>
              {blocks.length > 0 && (
                <p className="text-sm text-gray-500 mb-3">
                  🖱️ {t('editor_preview_drag_hint')}
                </p>
              )}

              {blocks.length > 0 ? (() => {
                const gridLayout = getProfessionalGridLayout(blocks.length);
                const sortedBlocks = [...blocks].sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
                const useCustomPositions = sortedBlocks.every((b: any) => {
                  const x = Number(b.position_x);
                  const y = Number(b.position_y);
                  const w = Number(b.width);
                  const h = Number(b.height);
                  return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
                });
                const hasVariableSizes = useCustomPositions && (() => {
                  const sizes = sortedBlocks.map((b: any) => `${Number(b.width)}x${Number(b.height)}`);
                  return new Set(sizes).size > 1;
                })();
                const useAbsoluteLayout = useCustomPositions && hasVariableSizes;
                return (
                  <div
                    ref={previewContainerRef}
                    className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-4 border-gray-700 rounded-xl shadow-2xl mx-auto overflow-hidden"
                    style={{ 
                      aspectRatio: '16/9',
                      width: '100%',
                      maxWidth: '1920px',
                      minHeight: '200px',
                      height: 'auto',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      className="w-full h-full relative"
                      style={{
                        ...(useAbsoluteLayout
                          ? { padding: '20px', overflow: 'hidden', boxSizing: 'border-box' }
                          : {
                              display: 'grid',
                              gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                              gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                              gap: gridLayout.gap,
                              padding: '20px',
                              boxSizing: 'border-box',
                              minHeight: '0',
                            }),
                      }}
                    >
                      {sortedBlocks.map((block, index) => {
                        const styleConfig = block.style_config ? (typeof block.style_config === 'string' ? JSON.parse(block.style_config) : block.style_config) : {};
                        const bgColor = styleConfig.background_color || '#374151';
                        const bgGradient = styleConfig.background_gradient;
                        const bgImage = styleConfig.background_image;
                        
                        // Tüm içerikleri al
                    const contents = block.contents || [];
                    const imageContent = contents.find((c: any) => c.content_type === 'image');
                    const videoContent = contents.find((c: any) => c.content_type === 'video');
                    const regionalMenuContent = contents.find((c: any) => c.content_type === 'regional_menu');
                    const iconContent = contents.find((c: any) => c.content_type === 'icon');
                    const badgeContent = contents.find((c: any) => c.content_type === 'campaign_badge');
                    const drinkContent = contents.find((c: any) => c.content_type === 'drink');
                    const textContent = contents.find((c: any) => c.content_type === 'text');
                    const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                    
                    const displayTitle = textContent?.title || productContent?.title || productContent?.name || imageContent?.title || videoContent?.title || '';
                    const displayPrice = textContent?.price || productContent?.price || imageContent?.price || videoContent?.price || null;
                        
                        const is3BlockLast = blocks.length === 3 && index === 2;
                        const is5BlockThird = blocks.length === 5 && index === 2;
                        const is7BlockLast = blocks.length === 7 && index === 6;
                        const shouldSpanRows = !useAbsoluteLayout && gridLayout.specialLayout && (is3BlockLast || is5BlockThird);
                        const shouldSpanCols = !useAbsoluteLayout && (is3BlockLast || is7BlockLast);
                        
                        const hasBackground = bgImage || bgGradient || (bgColor && bgColor !== '#1a1a1a');
                        
                        const blockPositionStyle = useAbsoluteLayout ? {
                          position: 'absolute' as const,
                          left: `${Number(block.position_x ?? 0)}%`,
                          top: `${Number(block.position_y ?? 0)}%`,
                          width: `${Number(block.width ?? 25)}%`,
                          height: `${Number(block.height ?? 25)}%`,
                        } : {};
                        
                        return (
                          <div
                            key={block.id}
                            className={`relative overflow-hidden shadow-xl transition-all duration-200 ${
                              hasBackground ? '' : 'rounded-lg'
                            } ${
                              selectedBlock === block.id && !hasBackground
                                ? 'ring-4 ring-blue-500 scale-105 z-10 rounded-lg'
                                : selectedBlock === block.id && hasBackground
                                ? 'z-10'
                                : 'cursor-pointer hover:scale-102 hover:shadow-2xl'
                            }`}
                            onClick={() => {
                              setSelectedBlock(block.id);
                              const hasImageOrVideo = !!(imageContent || videoContent);
                              if (!hasImageOrVideo) {
                                setShowEmptyBlockOptionsModal(true);
                              }
                            }}
                            style={{
                              ...blockPositionStyle,
                              background: bgImage 
                                ? `url(${bgImage}) center/cover no-repeat, ${bgGradient || bgColor}`
                                : bgGradient || bgColor,
                              backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                              backgroundSize: bgImage ? 'cover' : undefined,
                              backgroundPosition: bgImage ? 'center' : undefined,
                              backgroundRepeat: bgImage ? 'no-repeat' : undefined,
                              minHeight: '0',
                              gridRow: shouldSpanRows ? 'span 2' : 'auto',
                              gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                              border: hasBackground ? 'none' : undefined,
                            }}
                          >
                            {/* Blok numarası badge */}
                            <div className="absolute bottom-2 left-2 z-20 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                              {block.block_index + 1}
                            </div>
                            
                            {/* İçerik Alanı */}
                            <div className="w-full h-full relative">
                              {/* Yöresel tek menü */}
                              {regionalMenuContent && (() => {
                                const styleConfig = regionalMenuContent.style_config
                                  ? (typeof regionalMenuContent.style_config === 'string'
                                      ? JSON.parse(regionalMenuContent.style_config)
                                      : regionalMenuContent.style_config)
                                  : {};
                                const categories = styleConfig.categories || [];
                                const contactInfo = styleConfig.contact_info || '';
                                const headerSpecial = styleConfig.header_special || '';
                                const headerTitle = styleConfig.header_title || regionalMenuContent.title || '';
                                if (categories.length >= 1) {
                                  return (
                                    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400 bg-[#0d0d0d] text-white">
                                      <div className="flex-shrink-0 text-center py-0.5 px-1 border-b border-amber-400/30">
                                        {headerSpecial && <p className="text-amber-400 text-[8px] font-serif italic">{headerSpecial}</p>}
                                        {headerTitle && <h2 className="text-white font-bold text-[9px] uppercase">{headerTitle}</h2>}
                                      </div>
                                      <div className="flex-1 min-h-0 flex overflow-hidden">
                                        {categories.slice(0, 3).map((cat: any, idx: number) => (
                                          <div key={cat.id || idx} className="flex-1 flex flex-col min-w-0 border-r border-dotted border-amber-400/40 last:border-r-0 overflow-hidden">
                                            {cat.image_url && (
                                              <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ minHeight: '18%', maxHeight: '24%' }}>
                                                <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                              </div>
                                            )}
                                            <p className="flex-shrink-0 text-center text-amber-400 font-bold text-[7px] py-0.5 uppercase border-b border-amber-400/30">{cat.name}</p>
                                            <div className="flex-1 min-h-0 overflow-y-auto p-0.5 space-y-0">
                                              {(cat.items || []).slice(0, 4).map((item: any, i: number) => (
                                                <div key={item.id || i} className="border-b border-dotted border-amber-400/30 pb-0.5 last:border-0">
                                                  <p className="text-white font-medium text-[6px] truncate">{item.name}</p>
                                                  {item.description && <p className="text-gray-400 text-[5px] truncate">{item.description}</p>}
                                                  <span className="text-amber-400 font-semibold text-[6px]">{item.price}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {contactInfo && <p className="flex-shrink-0 text-center text-gray-400 text-[5px] py-0.5 border-t border-amber-400/30 truncate">{contactInfo}</p>}
                                    </div>
                                  );
                                }
                                const menuItems = styleConfig.menu_items || [];
                                return (
                                  <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400 bg-[#1a1a1a] text-white">
                                    {regionalMenuContent.image_url && (
                                      <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ maxHeight: '38%', minHeight: '38%' }}>
                                        <img src={regionalMenuContent.image_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }} />
                                      </div>
                                    )}
                                    <div className="flex-1 min-h-0 flex flex-col p-1.5 overflow-hidden flex-nowrap">
                                      {regionalMenuContent.title && <h3 className="text-amber-400 font-bold text-xs mb-0.5 truncate flex-shrink-0">{regionalMenuContent.title}</h3>}
                                      <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5">
                                        {menuItems.slice(0, 6).map((item: any) => (
                                          <div key={item.id || item.name} className="border-b border-dotted border-amber-400/30 pb-0.5 last:border-0">
                                            <div className="flex justify-between items-start gap-1">
                                              <div className="min-w-0 flex-1">
                                                <p className="text-white font-medium text-[10px] truncate">{item.name}</p>
                                                {item.description && <p className="text-gray-400 text-[8px] truncate">{item.description}</p>}
                                              </div>
                                              {item.price != null && item.price !== '' && (
                                                <span className="text-amber-400 font-semibold text-[10px] flex-shrink-0">${Number(item.price).toFixed(2)}</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                      {contactInfo && <p className="text-gray-400 text-[8px] mt-0.5 truncate flex-shrink-0">{contactInfo}</p>}
                                    </div>
                                  </div>
                                );
                              })()}
                              {/* Video (regional_menu yoksa) - üzerine yazı katmanları */}
                              {!regionalMenuContent && videoContent?.image_url && (() => {
                                const videoStyleConfig = videoContent.style_config
                                  ? (typeof videoContent.style_config === 'string' ? JSON.parse(videoContent.style_config || '{}') : videoContent.style_config)
                                  : {};
                                const savedTextLayers = videoStyleConfig.textLayers || [];
                                const savedOverlayImages = videoStyleConfig.overlayImages || [];
                                const fit = videoStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                                const pos = (videoStyleConfig.imagePosition as string) || 'center';
                                const scale = typeof videoStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, videoStyleConfig.imageScale)) : 1;
                                const vr = videoStyleConfig.videoRotation as { firstVideoDurationSeconds?: number; rotationUrls?: string[]; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: any[] }> } | undefined;
                                const rotationItems = (() => {
                                  if (!vr) return [];
                                  if (Array.isArray(vr.rotationItems) && vr.rotationItems.length > 0)
                                    return vr.rotationItems.map((it: any) => ({
                                      url: it.url,
                                      durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 10,
                                      textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
                                    }));
                                  if (Array.isArray(vr.rotationUrls)) return vr.rotationUrls.map((url: string) => ({ url, durationSeconds: 10, textLayers: [] }));
                                  return [];
                                })();
                                const useRotation = vr && (rotationItems.length > 0 || (typeof vr.firstVideoDurationSeconds === 'number' && vr.firstVideoDurationSeconds > 0));
                                const firstDuration = typeof vr?.firstVideoDurationSeconds === 'number' ? Math.max(1, Math.min(120, vr.firstVideoDurationSeconds)) : 10;
                                const rotState = previewRotationStateByContentId[videoContent.id];
                                const rotKey = rotState && rotState.phase === 'rotation' ? `${videoContent.id}-rot-${rotState.index}` : videoContent.id;
                                const isEditingThisBlockVideo = selectedBlockContent?.id === videoContent.id && selectedBlock === block.id && (!useRotation || !rotState || rotState.phase === 'first');
                                const activeTextLayers = isEditingThisBlockVideo
                                  ? textLayers
                                  : (useRotation && rotState
                                    ? (rotState.phase === 'first' ? (previewEditingTextLayers[videoContent.id] || savedTextLayers) : (previewEditingTextLayers[rotKey] || rotationItems[rotState.index]?.textLayers || []))
                                    : (previewEditingTextLayers[videoContent.id] || savedTextLayers));
                                return (
                                  <div className="absolute inset-0 w-full h-full overflow-hidden">
                                    <div className="absolute inset-0 pointer-events-none" style={{ transformOrigin: pos }}>
                                      {useRotation ? (
                                        <VideoRotationPlayer
                                          firstVideoUrl={videoContent.image_url}
                                          firstVideoDurationSeconds={firstDuration}
                                          rotationItems={rotationItems}
                                          onPhaseChange={(phase, index) => setPreviewRotationStateByContentId((prev) => ({ ...prev, [videoContent.id]: { phase, index } }))}
                                          className="w-full h-full"
                                          objectFit={fit}
                                          objectPosition={pos}
                                          imageScale={scale}
                                        />
                                      ) : (
                                        <video
                                          src={videoContent.image_url}
                                          className="w-full h-full"
                                          autoPlay
                                          loop
                                          muted
                                          playsInline
                                          style={{ transform: `scale(${scale})`, transformOrigin: pos, objectFit: fit, objectPosition: pos, imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                                        />
                                      )}
                                    </div>
                                    {(isEditingThisBlockVideo ? overlayImages : savedOverlayImages).map((o: any) => {
                                      const isSelected = isEditingThisBlockVideo && selectedOverlayImageId === o.id;
                                      const handleResizeStart = (handle: string) => (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                        if (!container || !videoContent?.id) return;
                                        const rect = container.getBoundingClientRect();
                                        setPreviewOverlayResizeState({
                                          contentId: videoContent.id,
                                          overlayId: o.id,
                                          containerEl: container as HTMLElement,
                                          handle,
                                          startSize: o.size || 28,
                                          startX: ((e.clientX - rect.left) / rect.width) * 100,
                                          startY: ((e.clientY - rect.top) / rect.height) * 100,
                                        });
                                      };
                                      return (
                                        <div
                                          key={o.id}
                                          className={`absolute z-30 select-none ${isEditingThisBlockVideo ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                          style={{
                                            left: `${o.x}%`,
                                            top: `${o.y}%`,
                                            width: `${o.size}%`,
                                            aspectRatio: '1',
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                                            boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                                            overflow: 'hidden',
                                            pointerEvents: isEditingThisBlockVideo ? 'auto' : 'none',
                                          }}
                                        >
                                          {isSelected && (
                                            <>
                                              <div className="absolute -inset-2 border-2 border-blue-500 rounded pointer-events-none z-10" />
                                              {['nw','ne','sw','se'].map((h) => (
                                                <div key={h} data-resize-handle className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize z-20 shadow" style={{
                                                  top: h.includes('n') ? '-10px' : 'auto',
                                                  bottom: h.includes('s') ? '-10px' : 'auto',
                                                  left: h.includes('w') ? '-10px' : 'auto',
                                                  right: h.includes('e') ? '-10px' : 'auto',
                                                }} onMouseDown={handleResizeStart(h)} />
                                              ))}
                                            </>
                                          )}
                                          <div
                                            className={`w-full h-full ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 rounded' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); if (isEditingThisBlockVideo) setSelectedOverlayImageId(o.id); }}
                                            onMouseDown={(e) => {
                                              if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                              if (!container || !videoContent?.id) return;
                                              setPreviewOverlayDragState({ contentId: videoContent.id, overlayId: o.id, containerEl: container as HTMLElement });
                                            }}
                                          >
                                            <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {activeTextLayers.map((layer: any) => {
                                      const isDisc = !!layer.isDiscountBlock;
                                      const iconB = layer.icon && layer.iconPosition !== 'after';
                                      const iconA = layer.icon && layer.iconPosition === 'after';
                                      const isSelected = isEditingThisBlockVideo && selectedTextLayerId === layer.id;
                                      const phase = useRotation && rotState ? rotState.phase : 'first';
                                      const rotIdx = useRotation && rotState ? rotState.index : undefined;
                                      const handleResizeStart = (handle: string) => (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                        if (!container || !videoContent?.id) return;
                                        previewResizeLayersRef.current = (activeTextLayers as any[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                        const rect = container.getBoundingClientRect();
                                        setPreviewResizeState({
                                          contentId: videoContent.id,
                                          layerId: layer.id,
                                          containerEl: container as HTMLElement,
                                          handle,
                                          startSize: layer.size || 24,
                                          startX: ((e.clientX - rect.left) / rect.width) * 100,
                                          startY: ((e.clientY - rect.top) / rect.height) * 100,
                                          phase,
                                          rotationIndex: rotIdx,
                                        });
                                      };
                                      return (
                                        <div
                                          key={layer.id}
                                          className={`absolute z-30 select-none ${isDisc ? getDiscountBlockClasses(layer) + ' px-2 py-1 shadow border' : ''}`}
                                          style={{
                                            left: `${layer.x}%`,
                                            top: `${layer.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            pointerEvents: 'auto',
                                          }}
                                        >
                                          {isSelected && (
                                            <>
                                              <div className="absolute -inset-2 border-2 border-blue-500 rounded pointer-events-none" />
                                              {['nw','ne','sw','se'].map((h) => (
                                                <div key={h} data-resize-handle className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize z-40 shadow" style={{
                                                  top: h.includes('n') ? '-10px' : 'auto',
                                                  bottom: h.includes('s') ? '-10px' : 'auto',
                                                  left: h.includes('w') ? '-10px' : 'auto',
                                                  right: h.includes('e') ? '-10px' : 'auto',
                                                }} onMouseDown={handleResizeStart(h)} />
                                              ))}
                                            </>
                                          )}
                                          <div
                                            className={`cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 rounded' : ''}`}
                                            style={{
                                              ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                              fontSize: `${layer.size * 0.4}px`,
                                              fontWeight: layer.fontWeight,
                                              fontStyle: layer.fontStyle,
                                              fontFamily: layer.fontFamily || 'Arial',
                                              textDecoration: layer.textDecoration || 'none',
                                              textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.8)',
                                              whiteSpace: 'pre' as const,
                                              textAlign: (layer.textAlign || 'center') as 'left' | 'center' | 'right',
                                            }}
                                            onClick={(e) => { e.stopPropagation(); if (isEditingThisBlockVideo) setSelectedTextLayerId(layer.id); }}
                                            onMouseDown={(e) => {
                                              if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                              if (!container || !videoContent?.id) return;
                                              const layers = (activeTextLayers as any[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                              const editKey = phase === 'rotation' && rotIdx != null ? `${videoContent.id}-rot-${rotIdx}` : videoContent.id;
                                              setPreviewEditingTextLayers((prev) => ({ ...prev, [editKey]: layers }));
                                              previewDragLayersRef.current = layers;
                                              setPreviewDragState({ contentId: videoContent.id, layerId: layer.id, containerEl: container as HTMLElement, phase, rotationIndex: rotIdx });
                                            }}
                                          >
                                            {iconB && <span className="mr-0.5">{layer.icon}</span>}
                                            {layer.text}
                                            {iconA && <span className="ml-0.5">{layer.icon}</span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })()}
                              {/* Arka Plan: Resim (regional_menu ve video yoksa) */}
                              {!regionalMenuContent && !videoContent && imageContent && imageContent.image_url && (() => {
                                const imageStyleConfig = imageContent.style_config
                                  ? (typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config)
                                  : {};
                                const blurPx = typeof imageStyleConfig.blur === 'number' ? imageStyleConfig.blur : 0;
                                const savedTextLayers = imageStyleConfig.textLayers || [];
                                const savedOverlayImages = imageStyleConfig.overlayImages || [];
                                const fit = imageStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                                const pos = (imageStyleConfig.imagePosition as string) || 'center';
                                const fallbackScale = typeof imageStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScale)) : 1;
                                const scaleX = typeof imageStyleConfig.imageScaleX === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScaleX)) : fallbackScale;
                                const scaleY = typeof imageStyleConfig.imageScaleY === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScaleY)) : fallbackScale;
                                const ir = imageStyleConfig.imageRotation;
                                const irRotationItems = ir && Array.isArray(ir?.rotationItems) && ir.rotationItems.length > 0 ? ir.rotationItems : [];
                                const useImageRotation = ir && (irRotationItems.length > 0 || (typeof ir.firstImageDurationSeconds === 'number' && ir.firstImageDurationSeconds > 0));
                                const imageRotTransition = (imageStyleConfig.imageRotationTransition as string) || 'fade';
                                const imageRotTransitionDuration = typeof imageStyleConfig.imageRotationTransitionDuration === 'number' ? Math.max(200, Math.min(5000, imageStyleConfig.imageRotationTransitionDuration)) : 500;
                                const imageOpacity = typeof imageStyleConfig.imageOpacity === 'number' ? imageStyleConfig.imageOpacity : 1;
                                const imageClipShape = imageStyleConfig.imageClipShape === 'circle' ? 'circle' : 'rect';
                                const imgRotState = previewImageRotationStateByContentId[imageContent.id];
                                const imgRotKey = imgRotState && imgRotState.phase === 'rotation' ? `${imageContent.id}-rot-${imgRotState.index}` : imageContent.id;
                                const isEditingThisBlock = selectedBlockContent?.id === imageContent.id && selectedBlock === block.id && (!useImageRotation || !imgRotState || imgRotState.phase === 'first');
                                const activeImageTextLayersSm = isEditingThisBlock
                                  ? textLayers
                                  : (useImageRotation && imgRotState
                                    ? (imgRotState.phase === 'first' ? (previewEditingTextLayers[imageContent.id] || savedTextLayers) : (previewEditingTextLayers[imgRotKey] || irRotationItems[imgRotState.index]?.textLayers || []))
                                    : (previewEditingTextLayers[imageContent.id] || savedTextLayers));
                                const isScaleMode = scaleModeBlockId === block.id;
                                const handleImageScaleStart = (handle: string) => (e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                  if (!container || !imageContent?.id) return;
                                  const rect = container.getBoundingClientRect();
                                  setImageScaleResizeState({
                                    blockId: block.id,
                                    contentId: imageContent.id,
                                    containerEl: container as HTMLElement,
                                    handle,
                                    startScaleX: scaleX,
                                    startScaleY: scaleY,
                                    startX: (e.clientX - rect.left) / rect.width,
                                    startY: (e.clientY - rect.top) / rect.height,
                                  });
                                };
                                return (
                                  <div
                                    className="absolute inset-0 w-full h-full overflow-hidden"
                                    style={{
                                      opacity: imageOpacity,
                                      overflow: imageClipShape === 'circle' ? 'hidden' : undefined,
                                      borderRadius: imageClipShape === 'circle' ? '50%' : undefined,
                                    }}
                                  >
                                    <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: pos }}>
                                    {useImageRotation ? (
                                      <ImageRotationPlayer
                                        firstImageUrl={imageContent.image_url}
                                        firstImageDurationSeconds={typeof ir?.firstImageDurationSeconds === 'number' ? Math.max(1, ir.firstImageDurationSeconds) : 10}
                                        rotationItems={irRotationItems.map((it: any) => ({ url: it.url, durationSeconds: typeof it.durationSeconds === 'number' ? it.durationSeconds : 5, isVideo: it.isVideo }))}
                                        onPhaseChange={(phase, idx) => setPreviewImageRotationStateByContentId((prev) => ({ ...prev, [imageContent.id]: { phase, index: idx } }))}
                                        objectFit={fit}
                                        objectPosition={pos}
                                        imageScale={1}
                                        imageBlur={blurPx}
                                        transitionType={imageRotTransition as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'blur-in' | 'flip-h' | 'flip-v' | 'rotate-in' | 'reveal-center' | 'dissolve' | 'iris-open' | 'iris-close' | 'spiral-in' | 'blinds-h' | 'blinds-v' | 'tiles' | 'puzzle-expand' | 'puzzle-rows' | 'puzzle-cols' | 'puzzle-diagonal' | 'puzzle-grid' | 'none'}
                                        transitionDuration={imageRotTransitionDuration}
                                        className="w-full h-full"
                                      />
                                    ) : (
                                    <img
                                      src={imageContent.image_url}
                                      alt={imageContent.title || 'Image'}
                                      className="w-full h-full"
                                      style={{ 
                                        display: 'block', 
                                        minHeight: '100%',
                                        objectFit: fit,
                                        objectPosition: pos,
                                        imageRendering: '-webkit-optimize-contrast',
                                        ...(blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {}),
                                      }}
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                    )}
                                    </div>
                                    {/* Overlay resimleri (kütüphaneden) — tasarım editörü gibi sürüklenebilir, resize tutamakları */}
                                    {(isEditingThisBlock ? overlayImages : savedOverlayImages).map((o: any) => {
                                      const isSelected = isEditingThisBlock && selectedOverlayImageId === o.id;
                                      const handleResizeStart = (handle: string) => (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                        if (!container || !imageContent?.id) return;
                                        const rect = container.getBoundingClientRect();
                                        setPreviewOverlayResizeState({
                                          contentId: imageContent.id,
                                          overlayId: o.id,
                                          containerEl: container as HTMLElement,
                                          handle,
                                          startSize: o.size || 28,
                                          startX: ((e.clientX - rect.left) / rect.width) * 100,
                                          startY: ((e.clientY - rect.top) / rect.height) * 100,
                                        });
                                      };
                                      return (
                                        <div
                                          key={o.id}
                                          className={`absolute z-30 select-none ${isEditingThisBlock ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                          style={{
                                            left: `${o.x}%`,
                                            top: `${o.y}%`,
                                            width: `${o.size}%`,
                                            aspectRatio: '1',
                                            transform: 'translate(-50%, -50%)',
                                            borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                                            boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                                            overflow: 'hidden',
                                            pointerEvents: isEditingThisBlock ? 'auto' : 'none',
                                          }}
                                        >
                                          {isSelected && (
                                            <>
                                              <div className="absolute -inset-2 border-2 border-blue-500 rounded pointer-events-none z-10" />
                                              {['nw','ne','sw','se'].map((h) => (
                                                <div key={h} data-resize-handle className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize z-20 shadow" style={{
                                                  top: h.includes('n') ? '-10px' : 'auto',
                                                  bottom: h.includes('s') ? '-10px' : 'auto',
                                                  left: h.includes('w') ? '-10px' : 'auto',
                                                  right: h.includes('e') ? '-10px' : 'auto',
                                                }} onMouseDown={handleResizeStart(h)} />
                                              ))}
                                            </>
                                          )}
                                          <div
                                            className={`w-full h-full ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 rounded' : ''}`}
                                            onClick={(e) => { e.stopPropagation(); if (isEditingThisBlock) setSelectedOverlayImageId(o.id); }}
                                            onMouseDown={(e) => {
                                              if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                              if (!container || !imageContent?.id) return;
                                              setPreviewOverlayDragState({ contentId: imageContent.id, overlayId: o.id, containerEl: container as HTMLElement });
                                            }}
                                          >
                                            <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {/* Çoklu yazı katmanları (ikon + indirim bloğu) - sürüklenebilir, seçildiğinde resize */}
                                    {activeImageTextLayersSm.map((layer: any) => {
                                      const isDisc = !!layer.isDiscountBlock;
                                      const iconB = layer.icon && layer.iconPosition !== 'after';
                                      const iconA = layer.icon && layer.iconPosition === 'after';
                                      const isSelected = isEditingThisBlock && selectedTextLayerId === layer.id;
                                      const phase = useImageRotation && imgRotState ? imgRotState.phase : 'first';
                                      const rotIdx = useImageRotation && imgRotState ? imgRotState.index : undefined;
                                      const handleResizeStart = (handle: string) => (e: React.MouseEvent) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                        if (!container || !imageContent?.id) return;
                                        previewResizeLayersRef.current = (activeImageTextLayersSm as TextLayer[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                        const rect = container.getBoundingClientRect();
                                        setPreviewResizeState({
                                          contentId: imageContent.id,
                                          layerId: layer.id,
                                          containerEl: container as HTMLElement,
                                          handle,
                                          startSize: layer.size || 24,
                                          startX: ((e.clientX - rect.left) / rect.width) * 100,
                                          startY: ((e.clientY - rect.top) / rect.height) * 100,
                                          phase,
                                          rotationIndex: rotIdx,
                                        });
                                      };
                                      return (
                                        <div
                                          key={layer.id}
                                          className={`absolute z-30 select-none ${isDisc ? getDiscountBlockClasses(layer) + ' px-2 py-1 shadow border' : ''}`}
                                          style={{
                                            left: `${layer.x}%`,
                                            top: `${layer.y}%`,
                                            transform: 'translate(-50%, -50%)',
                                            pointerEvents: 'auto',
                                          }}
                                        >
                                          {isSelected && (
                                            <>
                                              <div className="absolute -inset-2 border-2 border-blue-500 rounded pointer-events-none" />
                                              {['nw','ne','sw','se'].map((h) => (
                                                <div key={h} data-resize-handle className="absolute w-2.5 h-2.5 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize z-40 shadow" style={{
                                                  top: h.includes('n') ? '-10px' : 'auto',
                                                  bottom: h.includes('s') ? '-10px' : 'auto',
                                                  left: h.includes('w') ? '-10px' : 'auto',
                                                  right: h.includes('e') ? '-10px' : 'auto',
                                                }} onMouseDown={handleResizeStart(h)} />
                                              ))}
                                            </>
                                          )}
                                          <div
                                            className={`cursor-grab active:cursor-grabbing ${isSelected ? 'ring-2 ring-blue-400 ring-offset-1 rounded' : ''}`}
                                            style={{
                                              ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                              fontSize: `${layer.size * 0.4}px`,
                                              fontWeight: layer.fontWeight,
                                              fontStyle: layer.fontStyle,
                                              fontFamily: layer.fontFamily || 'Arial',
                                              textDecoration: layer.textDecoration || 'none',
                                              textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.8)',
                                              whiteSpace: 'pre' as const,
                                              textAlign: (layer.textAlign || 'center') as 'left' | 'center' | 'right',
                                            }}
                                            onClick={(e) => { e.stopPropagation(); if (isEditingThisBlock) setSelectedTextLayerId(layer.id); }}
                                            onMouseDown={(e) => {
                                              if ((e.target as HTMLElement).closest('[data-resize-handle]')) return;
                                              e.preventDefault();
                                              e.stopPropagation();
                                              const container = (e.currentTarget as HTMLElement).closest('.absolute.inset-0');
                                              if (!container || !imageContent?.id) return;
                                              const layers = (activeImageTextLayersSm as any[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                              const editKey = phase === 'rotation' && rotIdx != null ? `${imageContent.id}-rot-${rotIdx}` : imageContent.id;
                                              setPreviewEditingTextLayers((prev) => ({ ...prev, [editKey]: layers }));
                                              previewDragLayersRef.current = layers;
                                              setPreviewDragState({ contentId: imageContent.id, layerId: layer.id, containerEl: container as HTMLElement, phase, rotationIndex: rotIdx });
                                            }}
                                          >
                                            {iconB && <span className="mr-0.5">{layer.icon}</span>}
                                            {layer.text}
                                            {iconA && <span className="ml-0.5">{layer.icon}</span>}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {/* Manuel ölçeklendirme: mavi kutu + 8 tutamak */}
                                    {isScaleMode && (
                                      <div className="absolute inset-0 z-50 pointer-events-none">
                                        <div className="absolute inset-0 border-2 border-blue-500 rounded" />
                                        {['nw','n','ne','e','se','s','sw','w'].map((h) => (
                                          <div
                                            key={h}
                                            data-scale-handle
                                            className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow"
                                            style={{
                                              top: h === 'nw' || h === 'n' || h === 'ne' ? '-6px' : h === 'e' || h === 'w' ? '50%' : 'auto',
                                              bottom: h === 'sw' || h === 's' || h === 'se' ? '-6px' : undefined,
                                              left: h === 'nw' || h === 'w' || h === 'sw' ? '-6px' : h === 'n' || h === 's' ? '50%' : undefined,
                                              right: h === 'ne' || h === 'e' || h === 'se' ? '-6px' : undefined,
                                              transform: h === 'n' || h === 's' ? 'translate(-50%, 0)' : h === 'e' || h === 'w' ? 'translate(0, -50%)' : undefined,
                                              marginTop: (h === 'e' || h === 'w') ? '-6px' : undefined,
                                              marginLeft: (h === 'n' || h === 's') ? '-6px' : undefined,
                                            }}
                                            onMouseDown={handleImageScaleStart(h)}
                                          />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* İkon (regional_menu yoksa) */}
                              {!regionalMenuContent && iconContent && iconContent.icon_name && (() => {
                                const iconStyleConfig = iconContent.style_config 
                                  ? (typeof iconContent.style_config === 'string' 
                                      ? JSON.parse(iconContent.style_config) 
                                      : iconContent.style_config)
                                  : {};
                                const iconPosition = iconStyleConfig.position || 'top-right';
                                const positionStyles: { [key: string]: any } = {
                                  'top-left': { top: '4px', left: '4px', right: 'auto', bottom: 'auto' },
                                  'top-right': { top: '4px', right: '4px', left: 'auto', bottom: 'auto' },
                                  'bottom-left': { bottom: '4px', left: '4px', right: 'auto', top: 'auto' },
                                  'bottom-right': { bottom: '4px', right: '4px', left: 'auto', top: 'auto' },
                                  'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
                                };
                                
                                return (
                                  <div 
                                    className="absolute z-20 flex items-center justify-center group/icon" 
                                    style={{ 
                                      color: iconContent.text_color || '#ffffff', 
                                      fontSize: '3rem',
                                      ...(positionStyles[iconPosition] || positionStyles['top-right']),
                                      ...iconStyleConfig,
                                    }}
                                  >
                                    {iconContent.icon_name}
                                    {/* Silme Butonu */}
                                    {iconContent.id && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteContent(iconContent.id, 'icon');
                                        }}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/icon:opacity-100 transition-opacity shadow-lg z-30"
                                        title={t('editor_icon_delete')}
                                      >
                                        <span className="text-xs">×</span>
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                              
                              {/* Rozet (regional_menu yoksa) */}
                              {!regionalMenuContent && badgeContent && badgeContent.campaign_text && (() => {
                                const badgeStyleConfig = badgeContent.style_config 
                                  ? (typeof badgeContent.style_config === 'string' 
                                      ? JSON.parse(badgeContent.style_config) 
                                      : badgeContent.style_config)
                                  : {};
                                const badgePosition = badgeStyleConfig.position || 'top-left';
                                const positionStyles: { [key: string]: any } = {
                                  'top-left': { top: '4px', left: '4px', right: 'auto', bottom: 'auto' },
                                  'top-right': { top: '4px', right: '4px', left: 'auto', bottom: 'auto' },
                                  'bottom-left': { bottom: '4px', left: '4px', right: 'auto', top: 'auto' },
                                  'bottom-right': { bottom: '4px', right: '4px', left: 'auto', top: 'auto' },
                                  'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
                                };
                                
                                return (
                                  <div 
                                    className="absolute z-20 group/badge"
                                    style={{
                                      ...(positionStyles[badgePosition] || positionStyles['top-left']),
                                    }}
                                  >
                                    <span 
                                      className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg badge-pulse relative"
                                      style={{ 
                                        backgroundColor: badgeContent.background_color || '#3B82F6', 
                                        color: badgeContent.text_color || '#FFFFFF',
                                      }}
                                    >
                                      {badgeContent.campaign_text}
                                      {/* Silme Butonu */}
                                      {badgeContent.id && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteContent(badgeContent.id, 'campaign_badge');
                                          }}
                                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/badge:opacity-100 transition-opacity shadow-lg z-30 text-xs"
                                          title={t('btn_delete')}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </span>
                                  </div>
                                );
                              })()}
                              
                              {/* İçecek (regional_menu yoksa) */}
                              {!regionalMenuContent && drinkContent && drinkContent.image_url && (
                                <div 
                                  className="absolute z-15 group/drink"
                                  style={{
                                    bottom: '60px',
                                    left: displayTitle ? '120px' : '16px',
                                    width: '60px',
                                    height: '60px',
                                  }}
                                >
                                  <img
                                    src={drinkContent.image_url}
                                    alt={drinkContent.title || 'Drink'}
                                    className="w-full h-full object-contain rounded-lg shadow-lg bg-white/10 backdrop-blur-sm"
                                    style={{
                                      border: '2px solid rgba(255, 255, 255, 0.3)',
                                    }}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  {/* Silme Butonu */}
                                  {drinkContent.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteContent(drinkContent.id, 'drink');
                                      }}
                                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/drink:opacity-100 transition-opacity shadow-lg z-30 text-xs"
                                      title={t('btn_delete')}
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              )}
                              
                              {/* Yazı ve Fiyat (regional_menu yoksa) */}
                              {!regionalMenuContent && (displayTitle || displayPrice) && (
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 z-10 flex items-end justify-between">
                                  {displayTitle && (
                                    <div className="text-white text-base font-bold drop-shadow-lg flex items-center gap-2">
                                      <span>{displayTitle}</span>
                                      {/* İçecek varsa ürün isminin yanında göster */}
                                      {drinkContent && drinkContent.image_url && (
                                        <div className="relative group/drink-inline">
                                          <img
                                            src={drinkContent.image_url}
                                            alt={drinkContent.title || 'Drink'}
                                            className="w-8 h-8 object-contain rounded shadow-md bg-white/20 backdrop-blur-sm"
                                            style={{
                                              border: '1px solid rgba(255, 255, 255, 0.3)',
                                            }}
                                            loading="lazy"
                                            decoding="async"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                          {/* Silme Butonu */}
                                          {drinkContent.id && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteContent(drinkContent.id, 'drink');
                                              }}
                                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/drink-inline:opacity-100 transition-opacity shadow-lg z-30 text-[10px]"
                                              title={t('btn_delete')}
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {displayPrice && (
                                    <div className="text-green-400 text-xl font-extrabold drop-shadow-lg">
                                      ${Number(displayPrice || 0).toFixed(2)}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Boş Blok Göstergesi */}
                              {!regionalMenuContent && !videoContent && !imageContent && !iconContent && !badgeContent && !drinkContent && !textContent && !productContent && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                                  <div className="text-gray-500 text-lg font-medium">
                                    Boş
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-gray-600">
                  <p className="mb-4">{t('editor_no_blocks_yet')}</p>
                </div>
              )}

              {blocks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowMergeInput((v) => !v)}
                    className="px-3 py-2 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg transition-colors"
                  >
                    ⊞ {t('editor_merge_blocks')}
                  </button>
                  {showMergeInput && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="text-sm text-gray-600">
                        {t('editor_merge_block_numbers')} (1–{blocks.length}):
                      </span>
                      <input
                        type="text"
                        value={mergeBlockNumbersInput}
                        onChange={(e) => setMergeBlockNumbersInput(e.target.value)}
                        placeholder="2.3.6.7"
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-40"
                      />
                      <button
                        type="button"
                        onClick={handleMergeByBlockNumbers}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50"
                      >
                        ✓ {t('editor_merge_do')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Görsel seç — önizleme altında, tüm kategoriler (resim, video, ikon vb.) */}
              {showAddFromLibraryModal && selectedBlock && (
                <div className="mt-4 pt-4 border-t border-gray-200 rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-slate-800 text-sm">{t('editor_select_image')}</h3>
                    <button type="button" onClick={() => { setShowAddFromLibraryModal(false); setAddFromLibraryCategory(undefined); }} className="p-1 rounded hover:bg-slate-100 text-slate-600">✕</button>
                  </div>
                  <div className="rounded border border-slate-200 overflow-auto" style={{ minHeight: 360, maxHeight: 560 }}>
                    <ContentLibrary
                      onSelectContent={(content) => {
                        handleContentSelect(content);
                        setShowAddFromLibraryModal(false);
                        setAddFromLibraryCategory(undefined);
                      }}
                      initialCategory="all"
                      showAllTab={true}
                      compact={true}
                      refreshTrigger={contentLibraryRefreshTrigger}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Full Screen TV Preview Modal */}
      {showFullScreenPreview && blocks.length > 0 && (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setShowFullScreenPreview(false)}
        >
          <div 
            className="relative w-full h-full min-w-0 min-h-0 bg-black"
            style={{ aspectRatio: '16/9', maxWidth: '100vw', maxHeight: '100vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowFullScreenPreview(false)}
              className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <span>✕</span>
              <span>Kapat (ESC)</span>
            </button>

            {/* TV Preview Content */}
            {(() => {
              const gridLayout = getProfessionalGridLayout(blocks.length);
              const sortedBlocks = [...blocks].sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
              const useCustomPositions = sortedBlocks.every((b: any) => {
                const x = Number(b.position_x);
                const y = Number(b.position_y);
                const w = Number(b.width);
                const h = Number(b.height);
                return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
              });
              const hasVariableSizes = useCustomPositions && (() => {
                const sizes = sortedBlocks.map((b: any) => `${Number(b.width)}x${Number(b.height)}`);
                return new Set(sizes).size > 1;
              })();
              const useAbsoluteLayout = useCustomPositions && hasVariableSizes;
              
              return (
                <div
                  className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black relative"
                  style={{ 
                    ...(useAbsoluteLayout ? {} : {
                      display: 'grid',
                      gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                      gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                      gap: '2px',
                      padding: '8px',
                    }),
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                    textRendering: 'optimizeLegibility',
                  }}
                >
                  {sortedBlocks.map((block, index) => {
                    const styleConfig = block.style_config ? (typeof block.style_config === 'string' ? JSON.parse(block.style_config) : block.style_config) : {};
                    const bgColor = styleConfig.background_color || '#374151';
                    const bgGradient = styleConfig.background_gradient;
                    const bgImage = styleConfig.background_image;
                    
                    const contents = block.contents || [];
                    const imageContent = contents.find((c: any) => c.content_type === 'image');
                    const videoContent = contents.find((c: any) => c.content_type === 'video');
                    const regionalMenuContent = contents.find((c: any) => c.content_type === 'regional_menu');
                    const iconContent = contents.find((c: any) => c.content_type === 'icon');
                    const badgeContent = contents.find((c: any) => c.content_type === 'campaign_badge');
                    const drinkContent = contents.find((c: any) => c.content_type === 'drink');
                    const textContent = contents.find((c: any) => c.content_type === 'text');
                    const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                    
                    const displayTitle = textContent?.title || productContent?.title || productContent?.name || imageContent?.title || videoContent?.title || '';
                    const displayPrice = textContent?.price || productContent?.price || imageContent?.price || videoContent?.price || null;
                    const effectiveDisplayTitle = (() => {
                      if (!imageContent?.id || !imageContent?.style_config) return displayTitle;
                      try {
                        const sc = typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config || {};
                        const ir = sc.imageRotation;
                        if (!ir || !Array.isArray(ir.rotationItems) || ir.rotationItems.length === 0) return displayTitle;
                        const phaseState = previewImageRotationStateByContentId[imageContent.id];
                        if (!phaseState) return displayTitle;
                        return phaseState.phase === 'first' ? (imageContent.title || displayTitle) : (ir.rotationItems[phaseState.index]?.title || '');
                      } catch { return displayTitle; }
                    })();
                    const effectiveDisplayPrice = (() => {
                      if (!imageContent?.id || !imageContent?.style_config) return displayPrice;
                      try {
                        const sc = typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config || {};
                        const ir = sc.imageRotation;
                        if (!ir || !Array.isArray(ir.rotationItems) || ir.rotationItems.length === 0) return displayPrice;
                        const phaseState = previewImageRotationStateByContentId[imageContent.id];
                        if (!phaseState) return displayPrice;
                        return phaseState.phase === 'first' ? (imageContent.price ?? displayPrice) : (ir.rotationItems[phaseState.index]?.price ?? null);
                      } catch { return displayPrice; }
                    })();
                    
                    const hasBackground = bgImage || bgGradient || (bgColor && bgColor !== '#1a1a1a');
                    
                    const is3BlockLast = blocks.length === 3 && index === 2;
                    const is5BlockThird = blocks.length === 5 && index === 2;
                    const is7BlockLast = blocks.length === 7 && index === 6;
                    const shouldSpanRows = !useAbsoluteLayout && gridLayout.specialLayout && (is3BlockLast || is5BlockThird);
                    const shouldSpanCols = !useAbsoluteLayout && (is3BlockLast || is7BlockLast);
                    const blockPositionStyle = useAbsoluteLayout ? {
                      position: 'absolute' as const,
                      left: `${Number(block.position_x ?? 0)}%`,
                      top: `${Number(block.position_y ?? 0)}%`,
                      width: `${Number(block.width ?? 25)}%`,
                      height: `${Number(block.height ?? 25)}%`,
                    } : {};
                    
                    return (
                      <div
                        key={block.id}
                        className={`relative overflow-hidden shadow-2xl ${
                          hasBackground ? '' : 'rounded-lg'
                        }`}
                        style={{
                          ...blockPositionStyle,
                          background: bgImage 
                            ? `url(${bgImage}) center/cover no-repeat, ${bgGradient || bgColor}`
                            : bgGradient || bgColor,
                          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                          backgroundSize: bgImage ? 'cover' : undefined,
                          backgroundPosition: bgImage ? 'center' : undefined,
                          backgroundRepeat: bgImage ? 'no-repeat' : undefined,
                          minHeight: '0',
                          gridRow: shouldSpanRows ? 'span 2' : 'auto',
                          gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                          border: hasBackground ? 'none' : undefined,
                        }}
                      >
                        <div className="w-full h-full relative">
                          {regionalMenuContent && (() => {
                            const styleConfig = regionalMenuContent.style_config
                              ? (typeof regionalMenuContent.style_config === 'string'
                                  ? JSON.parse(regionalMenuContent.style_config)
                                  : regionalMenuContent.style_config)
                              : {};
                            const categories = styleConfig.categories || [];
                            const contactInfo = styleConfig.contact_info || '';
                            const headerSpecial = styleConfig.header_special || '';
                            const headerTitle = styleConfig.header_title || regionalMenuContent.title || '';
                            if (categories.length >= 1) {
                              return (
                                <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400 bg-[#0d0d0d] text-white">
                                  <div className="flex-shrink-0 text-center py-3 px-4 border-b border-amber-400/30">
                                    {headerSpecial && <p className="text-amber-400 text-2xl font-serif italic tracking-wide">{headerSpecial}</p>}
                                    {headerTitle && <h2 className="text-white font-bold text-3xl uppercase tracking-wider">{headerTitle}</h2>}
                                  </div>
                                  <div className="flex-1 min-h-0 flex overflow-hidden">
                                    {categories.slice(0, 3).map((cat: any, idx: number) => (
                                      <div key={cat.id || idx} className="flex-1 flex flex-col min-w-0 border-r border-dotted border-amber-400/40 last:border-r-0 overflow-hidden">
                                        {cat.image_url && (
                                          <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ minHeight: '22%', maxHeight: '30%' }}>
                                            <img src={cat.image_url} alt="" className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                        <p className="flex-shrink-0 text-center text-amber-400 font-bold text-base py-2 uppercase tracking-wider border-b border-amber-400/30">{cat.name}</p>
                                        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-1">
                                          {(cat.items || []).map((item: any, i: number) => (
                                            <div key={item.id || i} className="border-b border-dotted border-amber-400/30 pb-1 last:border-0">
                                              <p className="text-white font-medium text-sm truncate">{item.name}</p>
                                              {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                                              <span className="text-amber-400 font-semibold text-sm">{item.price}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {contactInfo && <p className="flex-shrink-0 text-center text-gray-400 text-sm py-2 border-t border-amber-400/30">{contactInfo}</p>}
                                </div>
                              );
                            }
                            const menuItems = styleConfig.menu_items || [];
                            return (
                              <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400 bg-[#1a1a1a] text-white">
                                {regionalMenuContent.image_url && (
                                  <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ maxHeight: '40%', minHeight: '40%' }}>
                                    <img src={regionalMenuContent.image_url} alt="" className="w-full h-full object-cover" style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }} />
                                  </div>
                                )}
                                <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
                                  {regionalMenuContent.title && <h3 className="text-amber-400 font-bold text-lg mb-2 truncate flex-shrink-0">{regionalMenuContent.title}</h3>}
                                  <div className="flex-1 min-h-0 overflow-y-auto space-y-1">
                                    {menuItems.map((item: any) => (
                                      <div key={item.id || item.name} className="border-b border-dotted border-amber-400/30 pb-1 last:border-0">
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="min-w-0 flex-1">
                                            <p className="text-white font-medium text-sm truncate">{item.name}</p>
                                            {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                                          </div>
                                          {item.price != null && item.price !== '' && (
                                            <span className="text-amber-400 font-semibold text-sm flex-shrink-0">${Number(item.price).toFixed(2)}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {contactInfo && <p className="text-gray-400 text-xs mt-2 truncate flex-shrink-0">{contactInfo}</p>}
                                </div>
                              </div>
                            );
                          })()}
                          {!regionalMenuContent && videoContent?.image_url && (() => {
                            const videoStyleConfig = videoContent.style_config
                              ? (typeof videoContent.style_config === 'string' ? JSON.parse(videoContent.style_config || '{}') : videoContent.style_config)
                              : {};
                            const savedTextLayers = videoStyleConfig.textLayers || [];
                            const savedOverlayImages = videoStyleConfig.overlayImages || [];
                            const fit = videoStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                            const pos = (videoStyleConfig.imagePosition as string) || 'center';
                            const scale = typeof videoStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, videoStyleConfig.imageScale)) : 1;
                            const vr = videoStyleConfig.videoRotation as { firstVideoDurationSeconds?: number; rotationUrls?: string[]; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: any[] }> } | undefined;
                            const rotationItems = (() => {
                              if (!vr) return [];
                              if (Array.isArray(vr.rotationItems) && vr.rotationItems.length > 0)
                                return vr.rotationItems.map((it: any) => ({
                                  url: it.url,
                                  durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 10,
                                  textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
                                }));
                              if (Array.isArray(vr.rotationUrls)) return vr.rotationUrls.map((url: string) => ({ url, durationSeconds: 10, textLayers: [] }));
                              return [];
                            })();
                            const useRotation = vr && (rotationItems.length > 0 || (typeof vr.firstVideoDurationSeconds === 'number' && vr.firstVideoDurationSeconds > 0));
                            const firstDuration = typeof vr?.firstVideoDurationSeconds === 'number' ? Math.max(1, Math.min(120, vr.firstVideoDurationSeconds)) : 10;
                            const rotState = previewRotationStateByContentId[videoContent.id];
                            const rotKey = rotState ? `${videoContent.id}-rot-${rotState.index}` : videoContent.id;
                            const activeTextLayersFullscreen = useRotation && rotState
                              ? (rotState.phase === 'first' ? (previewEditingTextLayers[videoContent.id] || savedTextLayers) : (previewEditingTextLayers[rotKey] || rotationItems[rotState.index]?.textLayers || []))
                              : (previewEditingTextLayers[videoContent.id] || savedTextLayers);
                            return (
                              <div className="absolute inset-0 w-full h-full overflow-hidden">
                                <div className="absolute inset-0 pointer-events-none" style={{ transformOrigin: pos }}>
                                  {useRotation ? (
                                    <VideoRotationPlayer
                                      firstVideoUrl={videoContent.image_url}
                                      firstVideoDurationSeconds={firstDuration}
                                      rotationItems={rotationItems}
                                      onPhaseChange={(phase, index) => setPreviewRotationStateByContentId((prev) => ({ ...prev, [videoContent.id]: { phase, index } }))}
                                      className="w-full h-full"
                                      objectFit={fit}
                                      objectPosition={pos}
                                      imageScale={scale}
                                    />
                                  ) : (
                                    <video
                                      src={videoContent.image_url}
                                      className="w-full h-full"
                                      autoPlay
                                      loop
                                      muted
                                      playsInline
                                      style={{ transform: `scale(${scale})`, transformOrigin: pos, objectFit: fit, objectPosition: pos, imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                                    />
                                  )}
                                </div>
                                {((previewOverlayDragState?.contentId === videoContent.id && overlayDragLiveOverlays) ? overlayDragLiveOverlays : savedOverlayImages).map((o: any) => (
                                  <div
                                    key={o.id}
                                    className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
                                    style={{
                                      left: `${o.x}%`,
                                      top: `${o.y}%`,
                                      width: `${o.size}%`,
                                      aspectRatio: '1',
                                      transform: 'translate(-50%, -50%)',
                                      borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                                      boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                                      overflow: 'hidden',
                                      pointerEvents: 'auto',
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const container = (e.currentTarget as HTMLElement).parentElement;
                                      if (!container || !videoContent?.id) return;
                                      overlayImagesRef.current = [...savedOverlayImages];
                                      setOverlayDragLiveOverlays(overlayImagesRef.current);
                                      setPreviewOverlayDragState({ contentId: videoContent.id, overlayId: o.id, containerEl: container });
                                    }}
                                  >
                                    <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                  </div>
                                ))}
                                {activeTextLayersFullscreen.map((layer: any) => {
                                  const isDisc = !!layer.isDiscountBlock;
                                  const iconB = layer.icon && layer.iconPosition !== 'after';
                                  const iconA = layer.icon && layer.iconPosition === 'after';
                                  return (
                                    <div
                                      key={layer.id}
                                      className={`absolute z-30 cursor-grab active:cursor-grabbing select-none ${isDisc ? getDiscountBlockClasses(layer) + ' px-3 py-1.5 shadow-lg border' : ''}`}
                                      style={{
                                        left: `${layer.x}%`,
                                        top: `${layer.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'auto',
                                        ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                        fontSize: `${layer.size}px`,
                                        fontWeight: layer.fontWeight,
                                        fontStyle: layer.fontStyle,
                                        fontFamily: layer.fontFamily || 'Arial',
                                        textDecoration: layer.textDecoration || 'none',
                                        textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '3px 3px 6px rgba(0,0,0,0.9)',
                                        whiteSpace: 'pre' as const,
                                        textAlign: 'center',
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).parentElement;
                                        if (!container || !videoContent?.id) return;
                                        const layers = (activeTextLayersFullscreen as any[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                        const phase = useRotation && rotState ? rotState.phase : 'first';
                                        const rotationIndex = useRotation && rotState ? rotState.index : undefined;
                                        const editKey = phase === 'rotation' && rotationIndex != null ? `${videoContent.id}-rot-${rotationIndex}` : videoContent.id;
                                        setPreviewEditingTextLayers((prev) => ({ ...prev, [editKey]: layers }));
                                        previewDragLayersRef.current = layers;
                                        setPreviewDragState({ contentId: videoContent.id, layerId: layer.id, containerEl: container, phase, rotationIndex });
                                      }}
                                    >
                                      {iconB && <span className="mr-1">{layer.icon}</span>}
                                      {layer.text}
                                      {iconA && <span className="ml-1">{layer.icon}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          {!regionalMenuContent && !videoContent && imageContent && imageContent.image_url && (() => {
                            const imageStyleConfig = imageContent.style_config
                              ? (typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config)
                              : {};
                            const blurPx = typeof imageStyleConfig.blur === 'number' ? imageStyleConfig.blur : 0;
                            const imageOpacity = typeof imageStyleConfig.imageOpacity === 'number' ? Math.max(0, Math.min(1, imageStyleConfig.imageOpacity)) : 1;
                            const imageClipShape = imageStyleConfig.imageClipShape === 'circle' ? 'circle' : 'rect';
                            const savedTextLayers = imageStyleConfig.textLayers || [];
                            const savedOverlayImages = imageStyleConfig.overlayImages || [];
                            const fit = imageStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                            const pos = (imageStyleConfig.imagePosition as string) || 'center';
                            const fallbackS = typeof imageStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScale)) : 1;
                            const scaleX = typeof imageStyleConfig.imageScaleX === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScaleX)) : fallbackS;
                            const scaleY = typeof imageStyleConfig.imageScaleY === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScaleY)) : fallbackS;
                            const ir = imageStyleConfig.imageRotation as { firstImageDurationSeconds?: number; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: any[]; title?: string; price?: string; isVideo?: boolean }> } | undefined;
                            const irRotationItems = ir && Array.isArray(ir.rotationItems) && ir.rotationItems.length > 0
                              ? ir.rotationItems.map((it: any) => ({ url: it.url, durationSeconds: typeof it.durationSeconds === 'number' ? it.durationSeconds : 5, textLayers: Array.isArray(it.textLayers) ? it.textLayers : [], title: it.title || '', price: it.price != null ? String(it.price) : '', isVideo: it.isVideo }))
                              : [];
                            const useImageRotation = ir && (irRotationItems.length > 0 || (typeof ir.firstImageDurationSeconds === 'number' && ir.firstImageDurationSeconds > 0));
                            const firstImageDuration = ir && typeof ir.firstImageDurationSeconds === 'number' ? Math.max(1, Math.min(120, ir.firstImageDurationSeconds)) : 10;
                            const imageRotTransitionFull = (imageStyleConfig.imageRotationTransition as string) || 'fade';
                            const imageRotTransitionDurationFull = typeof imageStyleConfig.imageRotationTransitionDuration === 'number' ? Math.max(200, Math.min(5000, imageStyleConfig.imageRotationTransitionDuration)) : 500;
                            const imgRotState = previewImageRotationStateByContentId[imageContent.id];
                            const imgRotKey = imgRotState && imgRotState.phase === 'rotation' ? `${imageContent.id}-rot-${imgRotState.index}` : imageContent.id;
                            const activeImageTextLayers = useImageRotation && imgRotState
                              ? (imgRotState.phase === 'first' ? (previewEditingTextLayers[imageContent.id] || savedTextLayers) : (previewEditingTextLayers[imgRotKey] || irRotationItems[imgRotState.index]?.textLayers || []))
                              : (previewEditingTextLayers[imageContent.id] || savedTextLayers);
                            return (
                              <div
                                className="absolute inset-0 w-full h-full overflow-hidden"
                                style={{
                                  backfaceVisibility: 'hidden',
                                  transform: 'translateZ(0)',
                                  opacity: imageOpacity,
                                  overflow: imageClipShape === 'circle' ? 'hidden' : undefined,
                                  borderRadius: imageClipShape === 'circle' ? '50%' : undefined,
                                }}
                              >
                                <div className="absolute inset-0 pointer-events-none" style={{ transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: pos }}>
                                  {useImageRotation ? (
                                    <ImageRotationPlayer
                                      firstImageUrl={imageContent.image_url}
                                      firstImageDurationSeconds={firstImageDuration}
                                      rotationItems={irRotationItems}
                                      onPhaseChange={(phase, idx) => setPreviewImageRotationStateByContentId((prev) => ({ ...prev, [imageContent.id]: { phase, index: idx } }))}
                                      objectFit={fit}
                                      objectPosition={pos}
                                      imageScale={1}
                                      imageBlur={blurPx}
                                      transitionType={imageRotTransitionFull as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'blur-in' | 'flip-h' | 'flip-v' | 'rotate-in' | 'reveal-center' | 'dissolve' | 'iris-open' | 'iris-close' | 'spiral-in' | 'blinds-h' | 'blinds-v' | 'tiles' | 'puzzle-expand' | 'puzzle-rows' | 'puzzle-cols' | 'puzzle-diagonal' | 'puzzle-grid' | 'none'}
                                      transitionDuration={imageRotTransitionDurationFull}
                                      className="w-full h-full"
                                    />
                                  ) : (
                                    <img
                                      src={imageContent.image_url}
                                      alt={imageContent.title || 'Image'}
                                      className="w-full h-full"
                                      style={{
                                        display: 'block',
                                        minHeight: '100%',
                                        objectFit: fit,
                                        objectPosition: pos,
                                        imageRendering: '-webkit-optimize-contrast',
                                        WebkitBackfaceVisibility: 'hidden',
                                        backfaceVisibility: 'hidden',
                                        ...(blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {}),
                                      }}
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  )}
                                </div>
                                {((previewOverlayDragState?.contentId === imageContent.id && overlayDragLiveOverlays) ? overlayDragLiveOverlays : savedOverlayImages).map((o: any) => (
                                  <div
                                    key={o.id}
                                    className="absolute z-20 cursor-grab active:cursor-grabbing select-none"
                                    style={{
                                      left: `${o.x}%`,
                                      top: `${o.y}%`,
                                      width: `${o.size}%`,
                                      aspectRatio: '1',
                                      transform: 'translate(-50%, -50%)',
                                      borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                                      boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                                      overflow: 'hidden',
                                      pointerEvents: 'auto',
                                    }}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const container = (e.currentTarget as HTMLElement).parentElement;
                                      if (!container || !imageContent?.id) return;
                                      overlayImagesRef.current = [...savedOverlayImages];
                                      setOverlayDragLiveOverlays(overlayImagesRef.current);
                                      setPreviewOverlayDragState({ contentId: imageContent.id, overlayId: o.id, containerEl: container });
                                    }}
                                  >
                                    <img src={o.image_url} alt="" className="w-full h-full object-cover pointer-events-none" />
                                  </div>
                                ))}
                                {/* Çoklu yazı katmanları - Tam Ekran (ikon + indirim bloğu, sürüklenebilir) - resim döngüsünde fase göre */}
                                {activeImageTextLayers.map((layer: any) => {
                                  const isDisc = !!layer.isDiscountBlock;
                                  const iconB = layer.icon && layer.iconPosition !== 'after';
                                  const iconA = layer.icon && layer.iconPosition === 'after';
                                  return (
                                    <div
                                      key={layer.id}
                                      className={`absolute z-30 cursor-grab active:cursor-grabbing select-none ${isDisc ? getDiscountBlockClasses(layer) + ' px-3 py-1.5 shadow-lg border' : ''}`}
                                      style={{
                                        left: `${layer.x}%`,
                                        top: `${layer.y}%`,
                                        transform: 'translate(-50%, -50%)',
                                        pointerEvents: 'auto',
                                        ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                        fontSize: `${layer.size}px`,
                                        fontWeight: layer.fontWeight,
                                        fontStyle: layer.fontStyle,
                                        fontFamily: layer.fontFamily || 'Arial',
                                        textDecoration: layer.textDecoration || 'none',
                                        textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '3px 3px 6px rgba(0,0,0,0.9)',
                                        whiteSpace: 'pre' as const,
                                        textAlign: 'center',
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const container = (e.currentTarget as HTMLElement).parentElement;
                                        if (!container || !imageContent?.id) return;
                                        const layers = (activeImageTextLayers as any[]).map((l: any) => ({ ...l, fontFamily: l.fontFamily || 'Arial' }));
                                        const phase = useImageRotation && imgRotState ? imgRotState.phase : 'first';
                                        const rotationIndex = useImageRotation && imgRotState ? imgRotState.index : undefined;
                                        const editKey = phase === 'rotation' && rotationIndex != null ? `${imageContent.id}-rot-${rotationIndex}` : imageContent.id;
                                        setPreviewEditingTextLayers((prev) => ({ ...prev, [editKey]: layers }));
                                        previewDragLayersRef.current = layers;
                                        setPreviewDragState({ contentId: imageContent.id, layerId: layer.id, containerEl: container, phase, rotationIndex });
                                      }}
                                    >
                                      {iconB && <span className="mr-1">{layer.icon}</span>}
                                      {layer.text}
                                      {iconA && <span className="ml-1">{layer.icon}</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                          
                          {!regionalMenuContent && iconContent && iconContent.icon_name && (() => {
                            const iconStyleConfig = iconContent.style_config 
                              ? (typeof iconContent.style_config === 'string' 
                                  ? JSON.parse(iconContent.style_config) 
                                  : iconContent.style_config)
                              : {};
                            const iconPosition = iconStyleConfig.position || 'top-right';
                            const positionStyles: { [key: string]: any } = {
                              'top-left': { top: '24px', left: '24px', right: 'auto', bottom: 'auto' },
                              'top-right': { top: '24px', right: '24px', left: 'auto', bottom: 'auto' },
                              'bottom-left': { bottom: '24px', left: '24px', right: 'auto', top: 'auto' },
                              'bottom-right': { bottom: '24px', right: '24px', left: 'auto', top: 'auto' },
                              'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
                            };
                            
                            return (
                              <div 
                                className="absolute z-20 flex items-center justify-center group/icon-full" 
                                style={{ 
                                  color: iconContent.text_color || '#ffffff', 
                                  fontSize: '5rem',
                                  ...(positionStyles[iconPosition] || positionStyles['top-right']),
                                  ...iconStyleConfig,
                                }}
                              >
                                {iconContent.icon_name}
                                {/* Silme Butonu */}
                                {iconContent.id && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteContent(iconContent.id, 'icon');
                                    }}
                                    className="absolute -top-3 -right-3 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/icon-full:opacity-100 transition-opacity shadow-lg z-30"
                                    title={t('editor_icon_delete')}
                                  >
                                    <span className="text-sm">×</span>
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                          
                          {!regionalMenuContent && badgeContent && badgeContent.campaign_text && (() => {
                            const badgeStyleConfig = badgeContent.style_config 
                              ? (typeof badgeContent.style_config === 'string' 
                                  ? JSON.parse(badgeContent.style_config) 
                                  : badgeContent.style_config)
                              : {};
                            const badgePosition = badgeStyleConfig.position || 'top-left';
                            const positionStyles: { [key: string]: any } = {
                              'top-left': { top: '24px', left: '24px', right: 'auto', bottom: 'auto' },
                              'top-right': { top: '24px', right: '24px', left: 'auto', bottom: 'auto' },
                              'bottom-left': { bottom: '24px', left: '24px', right: 'auto', top: 'auto' },
                              'bottom-right': { bottom: '24px', right: '24px', left: 'auto', top: 'auto' },
                              'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
                            };
                            
                            return (
                              <div 
                                className="absolute z-20 group/badge-full"
                                style={{
                                  ...(positionStyles[badgePosition] || positionStyles['top-left']),
                                }}
                              >
                                <span 
                                  className="px-6 py-3 rounded-lg text-xl font-bold shadow-2xl badge-pulse relative"
                                  style={{ 
                                    backgroundColor: badgeContent.background_color || '#3B82F6', 
                                    color: badgeContent.text_color || '#FFFFFF',
                                  }}
                                >
                                  {badgeContent.campaign_text}
                                  {/* Silme Butonu */}
                                  {badgeContent.id && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteContent(badgeContent.id, 'campaign_badge');
                                      }}
                                      className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/badge-full:opacity-100 transition-opacity shadow-lg z-30 text-sm"
                                      title={t('btn_delete')}
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              </div>
                            );
                          })()}
                          
                          {!regionalMenuContent && drinkContent && drinkContent.image_url && (
                            <div 
                              className="absolute z-15 group/drink-full"
                              style={{
                                bottom: '100px',
                                left: displayTitle ? '200px' : '32px',
                                width: '80px',
                                height: '80px',
                                backfaceVisibility: 'hidden',
                                transform: 'translateZ(0)',
                              }}
                            >
                              <img
                                src={drinkContent.image_url}
                                alt={drinkContent.title || 'Drink'}
                                className="w-full h-full object-contain rounded-lg shadow-2xl bg-white/10 backdrop-blur-sm"
                                style={{
                                  border: '3px solid rgba(255, 255, 255, 0.3)',
                                  imageRendering: 'auto',
                                  backfaceVisibility: 'hidden',
                                }}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              {/* Silme Butonu */}
                              {drinkContent.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteContent(drinkContent.id, 'drink');
                                  }}
                                  className="absolute -top-3 -right-3 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/drink-full:opacity-100 transition-opacity shadow-lg z-30 text-sm"
                                  title={t('btn_delete')}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )}
                          
                          {!regionalMenuContent && (effectiveDisplayTitle || effectiveDisplayPrice != null) && (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 z-10 flex items-end justify-between">
                              {effectiveDisplayTitle && (
                                <div className="text-white text-2xl font-bold drop-shadow-lg flex items-center gap-3">
                                  <span>{effectiveDisplayTitle}</span>
                                  {/* İçecek varsa ürün isminin yanında göster */}
                                  {drinkContent && drinkContent.image_url && (
                                    <div className="relative group/drink-inline-full" style={{ backfaceVisibility: 'hidden' }}>
                                      <img
                                        src={drinkContent.image_url}
                                        alt={drinkContent.title || 'Drink'}
                                        className="w-12 h-12 object-contain rounded shadow-lg bg-white/20 backdrop-blur-sm"
                                        style={{
                                          border: '2px solid rgba(255, 255, 255, 0.3)',
                                          imageRendering: 'auto',
                                          backfaceVisibility: 'hidden',
                                        }}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                      {/* Silme Butonu */}
                                      {drinkContent.id && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteContent(drinkContent.id, 'drink');
                                          }}
                                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover/drink-inline-full:opacity-100 transition-opacity shadow-lg z-30 text-xs"
                                          title={t('btn_delete')}
                                        >
                                          ×
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {effectiveDisplayPrice != null && effectiveDisplayPrice !== '' && (
                                <div className="text-green-400 text-3xl font-extrabold drop-shadow-lg">
                                  ${Number(effectiveDisplayPrice || 0).toFixed(2)}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {!regionalMenuContent && !videoContent && !imageContent && !iconContent && !badgeContent && !drinkContent && !textContent && !productContent && (
                            <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                              <div className="text-gray-500 text-2xl font-medium">{t('editor_empty')}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Farklı Kaydet Modal */}
      {showSaveAs && showSaveAsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowSaveAsModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>🎨</span> {t('editor_save_as_title')}
            </h2>
            <p className="text-sm text-gray-600 mb-4">{t('editor_save_as_prompt')}</p>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => { setSaveAsChoice('system'); setSaveAsSelectedUserId(''); }}
                className={`w-full px-4 py-3 rounded-lg font-semibold text-left flex items-center gap-3 transition-colors ${saveAsChoice === 'system' ? 'bg-blue-600 text-white ring-2 ring-blue-400' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
              >
                <span className="text-2xl">🏢</span>
                <span>{t('editor_save_as_system')}</span>
              </button>
              <button
                onClick={() => { setSaveAsChoice('user'); setSaveAsSelectedUserId(''); }}
                className={`w-full px-4 py-3 rounded-lg font-semibold text-left flex items-center gap-3 transition-colors ${saveAsChoice === 'user' ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'}`}
              >
                <span className="text-2xl">👤</span>
                <span>{t('editor_save_as_user')}</span>
              </button>
              {saveAsChoice === 'user' && (
                <div className="mt-3 pl-4 border-l-2 border-purple-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('editor_save_as_select_user')}</label>
                  <select
                    value={saveAsSelectedUserId}
                    onChange={(e) => setSaveAsSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">{t('editor_save_as_select_user_placeholder')}</option>
                    {saveAsUsers.map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSaveAsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
              >
                {t('common_close')}
              </button>
              <button
                onClick={handleSaveAsSubmit}
                disabled={saving || !saveAsChoice || (saveAsChoice === 'user' && !saveAsSelectedUserId)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
              >
                {saving ? t('common_loading') : t('editor_save_as_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boş blok tıklandığında: Yazı ekle, Üzerine resim, Video döngü seçenekleri */}
      {showEmptyBlockOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t('editor_empty_block_modal_title')}
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('editor_empty_block_add_content_first')}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowEmptyBlockOptionsModal(false);
                  setShowImageTextModal(true);
                }}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">✏️</span>
                <span>{t('editor_add_text_to_image')}</span>
              </button>
              <button
                onClick={() => {
                  setShowEmptyBlockOptionsModal(false);
                  setShowOverlayImageModal(true);
                }}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🖼️</span>
                <span>{t('editor_add_overlay_image')}</span>
              </button>
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowVideoRotationModal(true); }}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🎬</span>
                <span>{t('editor_video_rotation')}</span>
              </button>
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowImageRotationModal(true); }}
                className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🖼️</span>
                <span>{t('editor_image_rotation')}</span>
              </button>
            </div>
            <button
              onClick={() => setShowEmptyBlockOptionsModal(false)}
              className="w-full mt-4 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium"
            >
              {t('btn_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Ürün Adı ve Fiyat Düzenleme Modal */}
      {isEditingContent && selectedBlockContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('editor_product_name_price')}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_product_name')}
                </label>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder={t('editor_example_pizza')}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Fiyat ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editingPrice}
                  onChange={(e) => setEditingPrice(e.target.value)}
                  placeholder={t('editor_example_price')}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_product_description')}
                </label>
                <textarea
                  value={editingDescription}
                  onChange={(e) => setEditingDescription(e.target.value)}
                  placeholder={t('editor_example_description')}
                  rows={3}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 resize-none"
                />
              </div>
              {selectedBlockContent?.content_type === 'image' && (() => {
                const previewUrl = (editingImageRotationItems?.[0]?.url) || selectedBlockContent?.image_url || '';
                const resolvedUrl = resolveMediaUrl(previewUrl);
                return (
                  <div>
                    {resolvedUrl && (
                      <div className="mb-3 rounded-lg overflow-hidden bg-gray-100 aspect-video max-h-32">
                        <img
                          src={resolvedUrl}
                          alt=""
                          className="w-full h-full object-cover transition-[filter] duration-150"
                          style={{ filter: `blur(${editingImageBlur}px)` }}
                        />
                      </div>
                    )}
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {t('editor_image_blur')}
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={20}
                        value={editingImageBlur}
                        onChange={(e) => setEditingImageBlur(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <span className="text-sm font-medium text-gray-700 tabular-nums w-8">{editingImageBlur}px</span>
                    </div>
                  </div>
                );
              })()}
              {/* Resim / içerik düzenleme: yazı ekleme, resim sırası, indirim bloğu */}
              {(selectedBlockContent?.content_type === 'image' || selectedBlockContent?.content_type === 'video') && (
                <div className="pt-2 border-t border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_quick_edit_section')}</p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingContent(false);
                        setShowImageTextModal(true);
                      }}
                      className="px-3 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <span>✏️</span>
                      <span>{t('editor_add_text_to_image')}</span>
                    </button>
                    {selectedBlockContent?.content_type === 'image' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingContent(false);
                          setShowImageRotationModal(true);
                        }}
                        className="px-3 py-2 bg-teal-100 hover:bg-teal-200 text-teal-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <span>🖼️</span>
                        <span>{t('editor_image_rotation')}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingContent(false);
                        setShowImageTextModal(true);
                      }}
                      className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                    >
                      <span>🏷️</span>
                      <span>{t('editor_animated_discount_block')}</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">{t('editor_quick_edit_section_hint')}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setIsEditingContent(false);
                  setEditingTitle('');
                  setEditingPrice('');
                  setEditingDescription('');
                  setEditingImageBlur(0);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleUpdateTitleAndPrice}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? t('editor_saving') : t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Boş blok tıklandığında: yazı ekle / üzerine resim / video döngü seçenekleri */}
      {showEmptyBlockOptionsModal && selectedBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowEmptyBlockOptionsModal(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{t('editor_empty_block_modal_title')}</h2>
            <p className="text-sm text-gray-500 mb-4">{t('editor_empty_block_add_content_first')}</p>
            <div className="space-y-3">
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowImageTextModal(true); }}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">✏️</span>
                <span>{t('editor_add_text_to_image')}</span>
              </button>
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowOverlayImageModal(true); }}
                className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🖼️</span>
                <span>{t('editor_add_overlay_image')}</span>
              </button>
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowVideoRotationModal(true); }}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🎬</span>
                <span>{t('editor_video_rotation')}</span>
              </button>
              <button
                onClick={() => { setShowEmptyBlockOptionsModal(false); setShowImageRotationModal(true); }}
                className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors text-sm font-semibold flex items-center justify-center gap-2"
              >
                <span className="text-lg">🖼️</span>
                <span>{t('editor_image_rotation')}</span>
              </button>
            </div>
            <button
              onClick={() => setShowEmptyBlockOptionsModal(false)}
              className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              {t('btn_cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Ekle — Görsel (kütüphane) / İkon / Simge — kütüphaneden seç */}
      {/* Üzerine Resim Ekle - kütüphaneden overlay resim seç */}
      {showOverlayImageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🖼️ {t('editor_add_overlay_image')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('editor_select_from_library_overlay')}</p>
              </div>
              <button type="button" onClick={() => { setPendingOverlayImage(null); setShowOverlayImageModal(false); }} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
            </div>
            {(!selectedBlockContent || (selectedBlockContent.content_type !== 'image' && selectedBlockContent.content_type !== 'video')) ? (
              <>
                <p className="text-gray-600 py-6">{t('editor_empty_block_add_content_first')}</p>
                <button onClick={() => setShowOverlayImageModal(false)} className="self-start px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">{t('common_close')}</button>
              </>
            ) : (
            <div className="flex gap-4 flex-1 min-h-0">
              {/* Sol: Kütüphane */}
              <div className="flex-1 min-w-0 rounded-lg border border-gray-200 flex flex-col h-[420px] overflow-hidden">
                <ContentLibrary
                  key={`overlay-lib-${contentLibraryRefreshTrigger}`}
                  onSelectContent={handleOverlayImageSelect}
                  showAllTab={true}
                  initialCategory="all"
                  compact={true}
                  refreshTrigger={contentLibraryRefreshTrigger}
                />
              </div>
              {/* Sağ üst: Önizleme + düzenleme alanı */}
              <div className="w-72 flex-shrink-0 flex flex-col gap-3">
                <div className="rounded-lg border-2 border-gray-200 bg-gray-50 p-4 min-h-[180px] flex flex-col">
                  <p className="text-xs font-semibold text-gray-700 mb-2">{t('editor_preview_edit')}</p>
                  {pendingOverlayImage ? (
                    <>
                      <div className="flex-1 flex items-center justify-center mb-3">
                        <img
                          src={pendingOverlayImage.url}
                          alt={pendingOverlayImage.name}
                          className="max-w-full max-h-[140px] object-contain"
                          style={{
                            borderRadius: pendingOverlayImage.shape === 'round' ? '50%' : pendingOverlayImage.shape === 'rounded' ? '12px' : 0,
                            boxShadow: pendingOverlayImage.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 truncate mb-2" title={pendingOverlayImage.name}>{pendingOverlayImage.name}</p>
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-emerald-800">{t('editor_shape')}:</p>
                        <div className="flex flex-wrap gap-1">
                          {OVERLAY_SHAPES.map((shape) => (
                            <button
                              key={shape}
                              type="button"
                              onClick={() => setPendingOverlayImage(p => p ? { ...p, shape } : null)}
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                pendingOverlayImage.shape === shape ? 'bg-emerald-600 text-white' : 'bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                              }`}
                            >
                              {t(`editor_overlay_shape_${shape}` as 'editor_overlay_shape_round')}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          disabled={pendingOverlayRemoveBgLoading}
                          onClick={async () => {
                            if (!pendingOverlayImage) return;
                            setPendingOverlayRemoveBgLoading(true);
                            try {
                              const dataUrl = await getRemoveBackgroundDataUrl(pendingOverlayImage.url);
                              const res = await fetch(dataUrl);
                              const blob = await res.blob();
                              const file = new File([blob], `bg-removed-${Date.now()}.png`, { type: 'image/png' });
                              const fd = new FormData();
                              fd.append('files', file);
                              const up = await fetch('/api/upload', { method: 'POST', body: fd });
                              if (!up.ok) throw new Error(t('editor_upload_failed'));
                              const j = await up.json();
                              const newUrl = j?.assets?.[0]?.src ?? j?.data?.[0]?.src;
                              if (newUrl) setPendingOverlayImage(p => p ? { ...p, url: newUrl } : null);
                            } catch (err) {
                              alert(err instanceof Error ? err.message : t('editor_remove_bg_failed'));
                            } finally {
                              setPendingOverlayRemoveBgLoading(false);
                            }
                          }}
                          className="w-full px-3 py-2 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-lg text-sm font-medium text-amber-900 disabled:opacity-50"
                        >
                          {pendingOverlayRemoveBgLoading ? `⏳ ${t('editor_processing')}` : `🔄 ${t('editor_remove_bg')}`}
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveOverlayImage}
                          className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
                        >
                          ✓ Kaydet
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                      Resim seçin →
                    </div>
                  )}
                </div>
                {overlayImages.length > 0 && (
                  <div className="rounded border border-gray-200 p-2">
                    <p className="text-xs font-semibold text-gray-700 mb-2">{t('editor_overlay_images_count').replace('{count}', String(overlayImages.length))}</p>
                    <div className="flex flex-wrap gap-2">
                      {overlayImages.map((o) => (
                        <div key={o.id} className="relative group flex flex-col items-center gap-1">
                          <img src={o.image_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-gray-200" style={{ borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '6px' : 0 }} />
                          <button type="button" onClick={() => removeOverlayImage(o.id)} className="px-1.5 py-0.5 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs" title={t('btn_delete')}>🗑️</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {/* Video sırası / döngü modalı */}
      {showVideoRotationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col ${selectedBlockContent?.content_type === 'video' ? (videoRotationEditMode ? 'max-w-5xl' : 'max-w-2xl') : 'max-w-4xl'}`}>
            {selectedBlockContent?.content_type !== 'video' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">🎬 {t('editor_video_sequence_modal_title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('editor_video_rotation_hint')}</p>
                  </div>
                  <button type="button" onClick={() => setShowVideoRotationModal(false)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
                </div>
                <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-semibold text-amber-800 mb-2">{t('editor_add_video_from_library')}</p>
                    <div className="rounded border border-amber-200 overflow-hidden" style={{ minHeight: 280 }}>
                      <ContentLibrary onSelectContent={handleAddFirstVideoFromModal} initialCategory="video" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowVideoRotationModal(false)} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                      {t('btn_cancel')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
            <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🎬 {t('editor_video_sequence_modal_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('editor_video_rotation_hint')}</p>
              </div>
              <button type="button" onClick={() => { setShowVideoRotationModal(false); setVideoRotationEditMode(false); }} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
            </div>
            {videoRotationEditMode ? (
              /* Düzenle modu: solda liste (tıklanınca önizlemeye gelir), sağda video önizleme */
              <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="w-[45%] flex flex-col min-h-0 overflow-y-auto pr-2 border-r border-gray-200">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_rotation_videos')}</p>
                  <ul className="space-y-2">
                    {selectedBlockContent?.image_url && (
                      <li
                        onClick={() => setVideoRotationPreviewIndex(-1)}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${videoRotationPreviewIndex === -1 ? 'bg-amber-100 border-amber-500' : 'bg-amber-50 border-amber-200 hover:border-amber-300'}`}
                      >
                        <span className="text-xs text-amber-700 font-medium w-6 shrink-0">#1</span>
                        <span className="text-[10px] text-amber-600 shrink-0 px-1.5 py-0.5 rounded bg-amber-100">{t('editor_first_video_label')}</span>
                        <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300">
                          <video src={selectedBlockContent.image_url} muted playsInline preload="metadata" className="w-full h-full object-cover" onLoadedData={(e) => { const v = e.currentTarget; if (v.duration && !isNaN(v.duration)) v.currentTime = Math.min(0.5, v.duration * 0.1); }} />
                        </div>
                        <span className="flex-1 min-w-0 truncate text-xs text-gray-800" title={selectedBlockContent.image_url}>{selectedBlockContent.image_url.slice(-30)}</span>
                        <label className="shrink-0 flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-gray-600">{t('editor_video_duration_seconds')}</span>
                          <input type="number" min={1} max={120} value={editingFirstVideoDuration} onChange={(e) => setEditingFirstVideoDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-gray-900" />
                        </label>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openRotationItemTextEditor(-1); }} className="px-2 py-1 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded text-xs shrink-0" title={t('editor_edit_texts_for_video')}>✏️</button>
                      </li>
                    )}
                    {editingRotationItems.map((item, i) => (
                      <li
                        key={item.url}
                        onClick={() => setVideoRotationPreviewIndex(i)}
                        className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${videoRotationPreviewIndex === i ? 'bg-amber-100 border-amber-500' : 'bg-gray-50 border-gray-200 hover:border-amber-300'}`}
                      >
                        <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 2}</span>
                        <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300">
                          <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" onLoadedData={(e) => { const v = e.currentTarget; if (v.duration && !isNaN(v.duration)) v.currentTime = Math.min(0.5, v.duration * 0.1); }} />
                        </div>
                        <span className="flex-1 min-w-0 truncate text-xs text-gray-800" title={item.url}>{item.url.slice(-30)}</span>
                        <label className="shrink-0 flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[10px] text-gray-600">{t('editor_video_duration_seconds')}</span>
                          <input type="number" min={1} max={item.sourceDurationSeconds ?? 120} value={item.durationSeconds} onChange={(e) => updateRotationItemDuration(item.url, Number(e.target.value) || 1)} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-gray-900" />
                        </label>
                        <button type="button" onClick={(e) => { e.stopPropagation(); openRotationItemTextEditor(i); }} className="px-2 py-1 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded text-xs shrink-0" title={t('editor_edit_texts_for_video')}>✏️</button>
                        <button type="button" onClick={(e) => { e.stopPropagation(); removeRotationVideo(item.url); if (videoRotationPreviewIndex === i) setVideoRotationPreviewIndex(Math.max(-1, i - 1)); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0" title={t('btn_delete')}>🗑️</button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_preview')}</p>
                  <div className="flex-1 min-h-0 rounded-xl border-2 border-gray-300 bg-black overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                    {videoRotationPreviewIndex === -1 && selectedBlockContent?.image_url ? (
                      <video src={selectedBlockContent.image_url} className="w-full h-full object-contain" controls muted playsInline />
                    ) : editingRotationItems[videoRotationPreviewIndex] ? (
                      <video src={editingRotationItems[videoRotationPreviewIndex].url} className="w-full h-full object-contain" controls muted playsInline />
                    ) : (
                      <p className="text-gray-500 text-sm">{t('editor_select_video_from_left')}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_rotation_videos')}</p>
                <ul className="space-y-2">
                  {selectedBlockContent?.image_url && (
                    <li className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <span className="text-xs text-amber-700 font-medium w-6 shrink-0">#1</span>
                      <span className="text-[10px] text-amber-600 shrink-0 px-1.5 py-0.5 rounded bg-amber-100">{t('editor_first_video_label')}</span>
                      <div className="w-20 h-12 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                        <video src={selectedBlockContent.image_url} muted playsInline preload="metadata" className="w-full h-full object-cover" onLoadedData={(e) => { const v = e.currentTarget; if (v.duration && !isNaN(v.duration)) v.currentTime = Math.min(0.5, v.duration * 0.1); }} />
                      </div>
                      <span className="flex-1 min-w-0 truncate text-sm text-gray-800" title={selectedBlockContent.image_url}>{selectedBlockContent.image_url.slice(-40)}</span>
                      <label className="flex items-center gap-1 shrink-0 flex flex-col items-end">
                        <span className="text-xs text-gray-600">{t('editor_video_duration_seconds')}</span>
                        <input type="number" min={1} max={120} value={editingFirstVideoDuration} onChange={(e) => setEditingFirstVideoDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))} className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                      </label>
                      <button type="button" onClick={() => openRotationItemTextEditor(-1)} className="px-2 py-1.5 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded text-xs font-medium whitespace-nowrap" title={t('editor_edit_texts_for_video')}>✏️ {t('editor_edit_texts_for_video')}</button>
                    </li>
                  )}
                  {editingRotationItems.map((item, i) => (
                    <li key={item.url} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 2}</span>
                      <div className="w-20 h-12 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                        <video src={item.url} muted playsInline preload="metadata" className="w-full h-full object-cover" onLoadedData={(e) => { const v = e.currentTarget; if (v.duration && !isNaN(v.duration)) v.currentTime = Math.min(0.5, v.duration * 0.1); }} />
                      </div>
                      <span className="flex-1 min-w-0 truncate text-sm text-gray-800" title={item.url}>{item.url.slice(-40)}</span>
                      <label className="flex items-center gap-1 shrink-0 flex flex-col items-end">
                        <span className="text-xs text-gray-600">{t('editor_video_duration_seconds')}</span>
                        <input type="number" min={1} max={item.sourceDurationSeconds ?? 120} value={item.durationSeconds} onChange={(e) => updateRotationItemDuration(item.url, Number(e.target.value) || 1)} className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                        {item.sourceDurationSeconds != null && <span className="text-[10px] text-amber-600 mt-0.5">{t('editor_video_length_detected').replace('{n}', String(item.sourceDurationSeconds))}</span>}
                      </label>
                      <button type="button" onClick={() => openRotationItemTextEditor(i)} className="px-2 py-1.5 text-amber-700 bg-amber-100 hover:bg-amber-200 rounded text-xs font-medium whitespace-nowrap" title={t('editor_edit_texts_for_video')}>✏️ {t('editor_edit_texts_for_video')}</button>
                      <button type="button" onClick={() => removeRotationVideo(item.url)} className="px-2 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs font-medium flex items-center gap-1" title={t('btn_delete')}>🗑️ {t('btn_delete')}</button>
                    </li>
                  ))}
                </ul>
                {editingRotationItems.length === 0 && !selectedBlockContent?.image_url && <p className="text-sm text-gray-500 py-2 mt-1">{t('editor_add_video_from_library')}</p>}
                <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-800 mb-2">{t('editor_add_video_from_library')}</p>
                  <div className="rounded border border-amber-200 overflow-hidden" style={{ minHeight: 200 }}>
                    <ContentLibrary onSelectContent={handleVideoRotationAddFromLibrary} />
                  </div>
                </div>
              </div>
            </div>
            )}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => { setShowVideoRotationModal(false); setVideoRotationEditMode(false); }} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">{t('btn_cancel')}</button>
              {!videoRotationEditMode ? (
                <button type="button" onClick={() => { setVideoRotationEditMode(true); setVideoRotationPreviewIndex(selectedBlockContent?.image_url ? -1 : 0); }} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold">{t('btn_edit')}</button>
              ) : (
                <button type="button" onClick={() => setVideoRotationEditMode(false)} className="flex-1 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-semibold">{t('editor_add_video_from_library')}</button>
              )}
              <button type="button" onClick={() => { saveVideoRotation(); setVideoRotationEditMode(false); }} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">{t('btn_save')}</button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Resim sırası / döngü modalı - boş blokta kütüphane, resim blokta config */}
      {showImageRotationModal && selectedBlock && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`bg-white rounded-xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col ${selectedBlockContent?.content_type === 'image' ? (imageRotationEditMode ? 'max-w-5xl' : 'max-w-2xl') : 'max-w-4xl'}`}>
            {selectedBlockContent?.content_type !== 'image' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">🖼️ {t('editor_image_sequence_modal_title')}</h2>
                    <p className="text-sm text-gray-500 mt-1">{t('editor_image_rotation_hint')}</p>
                  </div>
                  <button type="button" onClick={() => setShowImageRotationModal(false)} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
                </div>
                <div className="space-y-4 flex-1 min-h-0 flex flex-col">
                  <div className="p-3 bg-teal-50 rounded-lg border border-teal-200">
                    <p className="text-xs font-semibold text-teal-800 mb-2">{t('editor_add_image_from_library')}</p>
                    <div className="rounded border border-teal-200 overflow-hidden" style={{ minHeight: 280 }}>
                      <ContentLibrary onSelectContent={handleAddFirstImageFromModal} initialCategory="all" showAllTab={true} />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => setShowImageRotationModal(false)} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                      {t('btn_cancel')}
                    </button>
                  </div>
                </div>
              </>
            ) : (
            <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">🖼️ {t('editor_image_sequence_modal_title')}</h2>
                <p className="text-sm text-gray-500 mt-1">{t('editor_image_rotation_hint')}</p>
              </div>
              <button type="button" onClick={() => { setShowImageRotationModal(false); setImageRotationEditMode(false); }} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
            </div>
            {imageRotationEditMode ? (
              /* Düzenle modu: solda liste (tıklanınca önizlemeye gelir), sağda önizleme bloğu */
              <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
                <div className="w-[45%] flex flex-col min-h-0 overflow-y-auto pr-2 border-r border-gray-200">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('editor_first_image_duration')}</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={editingFirstImageDuration}
                    onChange={(e) => setEditingFirstImageDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900 mb-3"
                  />
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_rotation_images')}</p>
                  <ul className="space-y-2">
                    {selectedBlockContent?.image_url && (
                      <li
                        onClick={() => setImageRotationPreviewIndex(-1)}
                        className={`flex flex-col gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${imageRotationPreviewIndex === -1 ? 'bg-teal-100 border-teal-500' : 'bg-teal-50 border-teal-200 hover:border-teal-300'}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-teal-700 font-medium w-6 shrink-0">#1</span>
                          <span className="text-[10px] text-teal-600 shrink-0 px-1.5 py-0.5 rounded bg-teal-100">{t('editor_first_image_label')}</span>
                          <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300">
                            <img src={selectedBlockContent.image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <input type="text" placeholder={t('editor_product_name')} value={editingFirstImageTitle} onChange={(e) => setEditingFirstImageTitle(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" onClick={(e) => e.stopPropagation()} />
                            <input type="text" placeholder={t('editor_price')} value={editingFirstImagePrice} onChange={(e) => setEditingFirstImagePrice(e.target.value)} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <label className="shrink-0 flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-gray-600">{t('editor_video_duration_seconds')}</span>
                            <input type="number" min={1} max={120} value={editingFirstImageDuration} onChange={(e) => setEditingFirstImageDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-gray-900" />
                          </label>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openImageRotationTextEditor(-1); }} className="px-2 py-1 text-teal-700 bg-teal-100 hover:bg-teal-200 rounded text-xs shrink-0" title={t('editor_edit_texts_for_image')}>✏️</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeFirstImageFromBlock(); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0" title={t('btn_delete')}>🗑️</button>
                        </div>
                      </li>
                    )}
                    {editingImageRotationItems.map((item, i) => (
                      <li
                        key={item.url}
                        onClick={() => setImageRotationPreviewIndex(i)}
                        className={`flex flex-col gap-2 p-2 rounded-lg border-2 cursor-pointer transition-colors ${imageRotationPreviewIndex === i ? 'bg-teal-100 border-teal-500' : 'bg-gray-50 border-gray-200 hover:border-teal-300'}`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 2}</span>
                          <div className="w-16 h-10 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 relative">
                            {item.isVideo ? <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" /> : <img src={item.url} alt="" className="w-full h-full object-cover" />}
                            {item.isVideo && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] text-center">Video</span>}
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <input type="text" placeholder={t('editor_product_name')} value={item.title || ''} onChange={(e) => updateImageRotationItemTitlePrice(item.url, { title: e.target.value })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" onClick={(e) => e.stopPropagation()} />
                            <input type="text" placeholder={t('editor_price')} value={item.price || ''} onChange={(e) => updateImageRotationItemTitlePrice(item.url, { price: e.target.value })} className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" onClick={(e) => e.stopPropagation()} />
                          </div>
                          <label className="shrink-0 flex flex-col items-end" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] text-gray-600">{t('editor_video_duration_seconds')}</span>
                            <input type="number" min={1} max={120} value={item.durationSeconds} onChange={(e) => updateImageRotationItemDuration(item.url, Number(e.target.value) || 1)} className="w-12 px-1 py-0.5 border border-gray-300 rounded text-xs text-gray-900" />
                          </label>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openImageRotationTextEditor(i); }} className="px-2 py-1 text-teal-700 bg-teal-100 hover:bg-teal-200 rounded text-xs shrink-0" title={t('editor_edit_texts_for_image')}>✏️</button>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImageRotationItem(item.url); if (imageRotationPreviewIndex === i) setImageRotationPreviewIndex(Math.max(-1, i - 1)); }} className="px-2 py-1 text-red-600 hover:bg-red-50 rounded text-xs shrink-0" title={t('btn_delete')}>🗑️</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex-1 min-h-0 flex flex-col">
                  <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_preview')}</p>
                  <div className="flex-1 min-h-0 rounded-xl border-2 border-gray-300 bg-black overflow-hidden flex items-center justify-center" style={{ aspectRatio: '16/9' }}>
                    {imageRotationPreviewIndex === -1 && selectedBlockContent?.image_url ? (
                      <img src={selectedBlockContent.image_url} alt="" className="w-full h-full object-contain" />
                    ) : editingImageRotationItems[imageRotationPreviewIndex] ? (
                      editingImageRotationItems[imageRotationPreviewIndex].isVideo ? (
                        <video src={editingImageRotationItems[imageRotationPreviewIndex].url} className="w-full h-full object-contain" controls muted playsInline />
                      ) : (
                        <img src={editingImageRotationItems[imageRotationPreviewIndex].url} alt="" className="w-full h-full object-contain" />
                      )
                    ) : (
                      <p className="text-gray-500 text-sm">{t('editor_select_item_from_left')}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
            <div className="space-y-4 flex-1 min-h-0 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('editor_first_image_duration')}</label>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={editingFirstImageDuration}
                  onChange={(e) => setEditingFirstImageDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{t('editor_rotation_images')}</p>
                <ul className="space-y-2">
                  {selectedBlockContent?.image_url && (
                    <li className="flex flex-col gap-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-teal-700 font-medium w-6 shrink-0">#1</span>
                        <span className="text-[10px] text-teal-600 shrink-0 px-1.5 py-0.5 rounded bg-teal-100">{t('editor_first_image_label')}</span>
                        <div className="w-20 h-12 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center">
                          <img src={selectedBlockContent.image_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            placeholder={t('editor_product_name')}
                            value={editingFirstImageTitle}
                            onChange={(e) => setEditingFirstImageTitle(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                          <input
                            type="text"
                            placeholder={t('editor_price')}
                            value={editingFirstImagePrice}
                            onChange={(e) => setEditingFirstImagePrice(e.target.value)}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                        </div>
                        <label className="flex items-center gap-1 shrink-0 flex flex-col items-end">
                          <span className="text-xs text-gray-600">{t('editor_video_duration_seconds')}</span>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={editingFirstImageDuration}
                            onChange={(e) => setEditingFirstImageDuration(Math.max(1, Math.min(120, Number(e.target.value) || 10)))}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                        </label>
                        <button type="button" onClick={() => openImageRotationTextEditor(-1)} className="px-2 py-1.5 text-teal-700 bg-teal-100 hover:bg-teal-200 rounded text-xs font-medium whitespace-nowrap" title={t('editor_edit_texts_for_image')}>
                          ✏️ {t('editor_edit_texts_for_image')}
                        </button>
                        <button type="button" onClick={removeFirstImageFromBlock} className="px-2 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs font-medium flex items-center gap-1" title={t('btn_delete')}>
                          🗑️ {t('btn_delete')}
                        </button>
                      </div>
                    </li>
                  )}
                  {editingImageRotationItems.map((item, i) => (
                    <li key={item.url} className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500 w-6 shrink-0">#{i + 2}</span>
                        <div className="w-20 h-12 shrink-0 rounded overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center relative">
                          {item.isVideo ? (
                            <video src={item.url} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                          ) : (
                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                          )}
                          {item.isVideo && <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-0.5">Video</span>}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <input
                            type="text"
                            placeholder={t('editor_product_name')}
                            value={item.title || ''}
                            onChange={(e) => updateImageRotationItemTitlePrice(item.url, { title: e.target.value })}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                          <input
                            type="text"
                            placeholder={t('editor_price')}
                            value={item.price || ''}
                            onChange={(e) => updateImageRotationItemTitlePrice(item.url, { price: e.target.value })}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                        </div>
                        <label className="flex items-center gap-1 shrink-0 flex flex-col items-end">
                          <span className="text-xs text-gray-600">{t('editor_video_duration_seconds')}</span>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={item.durationSeconds}
                            onChange={(e) => updateImageRotationItemDuration(item.url, Number(e.target.value) || 1)}
                            className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-gray-900"
                          />
                        </label>
                        <button type="button" onClick={() => openImageRotationTextEditor(i)} className="px-2 py-1.5 text-teal-700 bg-teal-100 hover:bg-teal-200 rounded text-xs font-medium whitespace-nowrap" title={t('editor_edit_texts_for_image')}>
                          ✏️ {t('editor_edit_texts_for_image')}
                        </button>
                        <button type="button" onClick={() => removeImageRotationItem(item.url)} className="px-2 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded text-xs font-medium flex items-center gap-1" title={t('btn_delete')}>
                          🗑️ {t('btn_delete')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                {editingImageRotationItems.length === 0 && (
                  <p className="text-sm text-gray-500 py-2 mt-1">{t('editor_add_image_from_library')}</p>
                )}
                <div className="mt-3 p-3 bg-teal-50 rounded-lg border border-teal-200">
                  <p className="text-xs font-semibold text-teal-800 mb-2">{t('editor_add_image_from_library')}</p>
                  <div className="rounded border border-teal-200 overflow-hidden" style={{ minHeight: 200 }}>
                    <ContentLibrary onSelectContent={handleImageRotationAddFromLibrary} initialCategory="all" showAllTab={true} />
                  </div>
                </div>
              </div>
            </div>
            )}
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => { setShowImageRotationModal(false); setImageRotationEditMode(false); }} className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-semibold">
                {t('btn_cancel')}
              </button>
              {!imageRotationEditMode ? (
                <button type="button" onClick={() => { setImageRotationEditMode(true); setImageRotationPreviewIndex(selectedBlockContent?.image_url ? -1 : 0); }} className="flex-1 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-semibold">
                  {t('btn_edit')}
                </button>
              ) : (
                <button type="button" onClick={() => setImageRotationEditMode(false)} className="flex-1 px-4 py-2 bg-slate-500 hover:bg-slate-600 text-white rounded-lg font-semibold">
                  {t('editor_add_image_from_library')}
                </button>
              )}
              <button type="button" onClick={() => { saveImageRotation(); setImageRotationEditMode(false); }} className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold">
                {t('btn_save')}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Döngüdeki bir resim için yazıları düzenle (resim sırası modalı içinden açılır) - sol: menü, sağ: resim + sürükleme */}
      {editingImageRotationTextIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">✏️ {t('editor_edit_texts_for_image')} (#{editingImageRotationTextIndex === -1 ? 1 : editingImageRotationTextIndex + 2})</h2>
              <button type="button" onClick={saveImageRotationTexts} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
            </div>
            <p className="text-sm text-gray-500 mb-3">{t('editor_preview_drag_hint')}</p>
            <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
              {/* Sol Panel - Yazı listesi ve ayarlar */}
              <div className="w-1/2 flex flex-col gap-3 overflow-y-auto pr-2">
                <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                  <h3 className="text-sm font-semibold text-teal-800 mb-2">{t('editor_texts_count').replace('{count}', String(imageRotationTextLayers.length))}</h3>
                  {imageRotationTextLayers.length === 0 ? (
                    <p className="text-gray-500 text-sm py-2">{t('editor_no_text_yet')}</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {imageRotationTextLayers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedImageRotationTextLayerId(layer.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                            selectedImageRotationTextLayerId === layer.id ? 'bg-teal-200 border-2 border-teal-600' : 'bg-white border border-teal-200 hover:bg-teal-100'
                          }`}
                        >
                          <span className="truncate text-sm flex-1" style={{ color: layer.color }}>#{idx + 1} {(layer.text || '').slice(0, 30)}{(layer.text || '').length > 30 ? '…' : ''}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeImageRotationTextLayer(layer.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => addImageRotationTextLayer()} className="mt-2 w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">
                    + {t('editor_add_new_text')}
                  </button>
                </div>
                {selectedImageRotationTextLayerId && (() => {
                  const layer = imageRotationTextLayers.find((l) => l.id === selectedImageRotationTextLayerId);
                  if (!layer) return null;
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3 overflow-y-auto max-h-[60vh]">
                      <h3 className="text-sm font-semibold text-gray-800">{t('editor_selected_text_settings')}</h3>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_text_content')}</label>
                        <textarea value={layer.text} onChange={(e) => updateImageRotationTextLayer(layer.id, { text: e.target.value })} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_color')}</label>
                          <div className="flex gap-1">
                            <input type="color" value={layer.color} onChange={(e) => updateImageRotationTextLayer(layer.id, { color: e.target.value })} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                            <input type="text" value={layer.color} onChange={(e) => updateImageRotationTextLayer(layer.id, { color: e.target.value })} className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs text-gray-900" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_size')}: {layer.size}px</label>
                          <input type="range" min={12} max={72} value={layer.size} onChange={(e) => updateImageRotationTextLayer(layer.id, { size: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">X %</label>
                          <input type="number" min={0} max={100} value={Math.round(layer.x)} onChange={(e) => updateImageRotationTextLayer(layer.id, { x: Number(e.target.value) || 0 })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Y %</label>
                          <input type="number" min={0} max={100} value={Math.round(layer.y)} onChange={(e) => updateImageRotationTextLayer(layer.id, { y: Number(e.target.value) || 0 })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_font_type')}</label>
                        <select value={layer.fontFamily || 'Arial'} onChange={(e) => updateImageRotationTextLayer(layer.id, { fontFamily: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900" style={{ fontFamily: layer.fontFamily || 'Arial' }}>
                          {FONT_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.fonts.map((f) => (
                                <option key={f} value={f.includes(' ') ? `"${f}"` : f}>{f}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateImageRotationTextLayer(layer.id, { textDecoration: layer.textDecoration === 'underline' ? undefined : 'underline' })} className={`w-8 h-8 rounded border text-xs underline ${layer.textDecoration === 'underline' ? 'bg-teal-500 text-white border-teal-600' : 'border-gray-300'}`} title={t('editor_underline')}>U</button>
                        <button type="button" onClick={() => updateImageRotationTextLayer(layer.id, { textDecoration: layer.textDecoration === 'line-through' ? undefined : 'line-through' })} className={`w-8 h-8 rounded border text-xs line-through ${layer.textDecoration === 'line-through' ? 'bg-teal-500 text-white border-teal-600' : 'border-gray-300'}`} title={t('editor_strikethrough')}>S</button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_alignment')}</label>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button key={align} type="button" onClick={() => updateImageRotationTextLayer(layer.id, { textAlign: align })} className={`flex-1 py-1 rounded text-xs ${layer.textAlign === align ? 'bg-teal-600 text-white' : 'bg-gray-100'}`}>{align === 'left' ? t('editor_align_left') : align === 'center' ? t('editor_align_center') : t('editor_align_right')}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_icon_symbol')}</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {TEXT_ICON_OPTIONS.map((emoji) => (
                            <button
                              key={emoji || 'none'}
                              type="button"
                              onClick={() => updateImageRotationTextLayer(layer.id, { icon: emoji || undefined })}
                              className={`w-8 h-8 rounded border text-lg flex items-center justify-center transition-colors ${
                                (layer.icon || '') === (emoji || '') ? 'bg-teal-500 text-white border-teal-600' : 'bg-white border-gray-300 hover:bg-gray-100'
                              }`}
                              title={emoji || t('editor_none')}
                            >
                              {emoji || '✕'}
                            </button>
                          ))}
                        </div>
                        {(layer.icon != null && layer.icon !== '') && (
                          <div className="flex items-center gap-2 mt-1">
                            <label className="text-xs text-gray-600">{t('editor_icon_position')}:</label>
                            <select value={layer.iconPosition || 'before'} onChange={(e) => updateImageRotationTextLayer(layer.id, { iconPosition: e.target.value as 'before' | 'after' })} className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900">
                              <option value="before">{t('editor_icon_before')}</option>
                              <option value="after">{t('editor_icon_after')}</option>
                            </select>
                          </div>
                        )}
                      </div>
                      <div className="bg-teal-50 rounded-lg p-3 border border-teal-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={!!layer.isDiscountBlock} onChange={(e) => updateImageRotationTextLayer(layer.id, { isDiscountBlock: e.target.checked, ...(e.target.checked && { text: layer.text || t('editor_discount_label').replace('{n}', String(layer.discountPercent ?? 20)), discountPercent: layer.discountPercent ?? 20, blockColor: layer.blockColor || '#FBBF24', discountAnimation: layer.discountAnimation || 'pulse', discountBlockStyle: layer.discountBlockStyle || 'rounded' }) })} className="w-4 h-4 text-teal-600 rounded" />
                          <span className="text-xs font-semibold text-teal-800">{t('editor_animated_discount_block')}</span>
                        </label>
                        {layer.isDiscountBlock && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-xs text-teal-800 mb-1">{t('editor_discount_percent')}</label>
                              <input type="number" min={1} max={99} value={layer.discountPercent ?? 20} onChange={(e) => { const p = Number(e.target.value) || 20; updateImageRotationTextLayer(layer.id, { discountPercent: p, text: t('editor_discount_label').replace('{n}', String(p)) }); }} className="w-full px-2 py-1.5 border border-teal-300 rounded text-sm text-gray-900" />
                            </div>
                            <div>
                              <label className="block text-xs text-teal-800 mb-1">{t('editor_block_color')}</label>
                              <div className="flex gap-2">
                                <input type="color" value={layer.blockColor || '#FBBF24'} onChange={(e) => updateImageRotationTextLayer(layer.id, { blockColor: e.target.value })} className="w-10 h-8 rounded border border-teal-300 cursor-pointer" />
                                <input type="text" value={layer.blockColor || '#FBBF24'} onChange={(e) => updateImageRotationTextLayer(layer.id, { blockColor: e.target.value })} className="flex-1 px-2 py-1 border border-teal-300 rounded text-xs text-gray-900" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-teal-800 mb-1">{t('editor_discount_animation')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_ANIMATIONS.map((anim) => (
                                  <button key={anim} type="button" onClick={() => updateImageRotationTextLayer(layer.id, { discountAnimation: anim })} className={`px-2 py-1 rounded text-xs font-medium ${(layer.discountAnimation || 'pulse') === anim ? 'bg-teal-600 text-white' : 'bg-white border border-teal-300 text-teal-800'}`}>
                                    {t(`editor_anim_${anim}` as 'editor_anim_pulse')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-teal-800 mb-1">{t('editor_discount_style')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_BLOCK_STYLES.map((style) => (
                                  <button key={style} type="button" onClick={() => updateImageRotationTextLayer(layer.id, { discountBlockStyle: style })} className={`px-2 py-1 rounded text-xs font-medium ${(layer.discountBlockStyle || 'rounded') === style ? 'bg-teal-600 text-white' : 'bg-white border border-teal-300 text-teal-800'}`}>
                                    {t(`editor_style_${style}` as 'editor_style_pill')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                        📍 {t('editor_position_label')}: X: {layer.x.toFixed(0)}%, Y: {layer.y.toFixed(0)}%
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sağ Panel - Resim canvas (tıkla = yeni yazı, yazıya tıkla = sürükle) */}
              <div className="w-1/2 flex flex-col">
                <label className="block text-sm font-semibold text-teal-800 mb-2">{t('editor_canvas_hint')}</label>
                <div
                  ref={imageRotationTextPreviewRef}
                  className="relative bg-gray-800 rounded-lg overflow-hidden flex-1 select-none"
                  style={{ minHeight: '320px', aspectRatio: getBlockAspectRatio(blocks.length) }}
                >
                  {(() => {
                    const imgUrl = editingImageRotationTextIndex === -1
                      ? (selectedBlockContent?.image_url as string)
                      : editingImageRotationItems[editingImageRotationTextIndex]?.url;
                    return imgUrl ? (
                      <img
                        src={imgUrl}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-90"
                        draggable={false}
                        style={{ pointerEvents: 'none' }}
                      />
                    ) : null;
                  })()}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '10% 10%'
                  }} />
                  <div
                    className="absolute inset-0 z-10 cursor-crosshair"
                    onClick={handleImageRotationCanvasClick}
                    aria-label={t('editor_image_text_modal_click_hint')}
                  />
                  {imageRotationTextLayers.map((layer) => {
                    const isDisc = !!layer.isDiscountBlock;
                    const iconB = layer.icon && layer.iconPosition !== 'after';
                    const iconA = layer.icon && layer.iconPosition === 'after';
                    return (
                      <div
                        key={layer.id}
                        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); handleImageRotationTextDragStart(e, layer.id); }}
                        onClick={(e) => { e.stopPropagation(); setSelectedImageRotationTextLayerId(layer.id); }}
                        className={`absolute z-30 cursor-grab active:cursor-grabbing ${
                          selectedImageRotationTextLayerId === layer.id ? 'ring-2 ring-teal-500 ring-offset-2' : ''
                        } ${draggingImageRotationLayerId === layer.id ? 'opacity-80' : ''} ${
                          isDisc ? getDiscountBlockClasses(layer) + ' px-3 py-1.5 shadow-lg border' : ''
                        }`}
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: 'translate(-50%, -50%)',
                          pointerEvents: 'auto',
                          ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                          fontSize: `${layer.size * 0.5}px`,
                          fontWeight: layer.fontWeight,
                          fontStyle: layer.fontStyle,
                          fontFamily: layer.fontFamily || 'Arial',
                          textDecoration: layer.textDecoration || 'none',
                          textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
                          whiteSpace: 'pre',
                          textAlign: (layer.textAlign || 'center') as 'left' | 'center' | 'right',
                        }}
                      >
                        {iconB && <span className="mr-1">{layer.icon}</span>}
                        {layer.text || t('editor_text_default')}
                        {iconA && <span className="ml-1">{layer.icon}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Döngüdeki bir video için yazıları düzenle (video sırası modalı içinden açılır) */}
      {editingRotationTextIndex !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">✏️ {t('editor_edit_texts_for_video')} (#{editingRotationTextIndex === -1 ? 1 : editingRotationTextIndex + 2})</h2>
              <button type="button" onClick={saveRotationItemTexts} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold">✕</button>
            </div>
            <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                  <h3 className="text-sm font-semibold text-amber-800 mb-2">{t('editor_texts_count').replace('{count}', String(rotationItemTextLayers.length))}</h3>
                  {rotationItemTextLayers.length === 0 ? (
                    <p className="text-gray-500 text-sm py-2">{t('editor_no_text_yet')}</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {rotationItemTextLayers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedRotationTextLayerId(layer.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                            selectedRotationTextLayerId === layer.id ? 'bg-amber-200 border-2 border-amber-600' : 'bg-white border border-amber-200 hover:bg-amber-100'
                          }`}
                        >
                          <span className="truncate text-sm flex-1" style={{ color: layer.color }}>#{idx + 1} {(layer.text || '').slice(0, 30)}{(layer.text || '').length > 30 ? '…' : ''}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeRotationItemTextLayer(layer.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded">🗑️</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <button type="button" onClick={() => addRotationItemTextLayer()} className="mt-2 w-full px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium">
                    + {t('editor_add_new_text')}
                  </button>
                </div>
                {selectedRotationTextLayerId && (() => {
                  const layer = rotationItemTextLayers.find((l) => l.id === selectedRotationTextLayerId);
                  if (!layer) return null;
                  return (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3 overflow-y-auto max-h-[60vh]">
                      <h3 className="text-sm font-semibold text-gray-800">{t('editor_selected_text_settings')}</h3>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_text_content')}</label>
                        <textarea value={layer.text} onChange={(e) => updateRotationItemTextLayer(layer.id, { text: e.target.value })} rows={2} className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-900" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_color')}</label>
                          <div className="flex gap-1">
                            <input type="color" value={layer.color} onChange={(e) => updateRotationItemTextLayer(layer.id, { color: e.target.value })} className="w-8 h-8 rounded border border-gray-300 cursor-pointer" />
                            <input type="text" value={layer.color} onChange={(e) => updateRotationItemTextLayer(layer.id, { color: e.target.value })} className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs text-gray-900" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_size')}: {layer.size}px</label>
                          <input type="range" min={12} max={72} value={layer.size} onChange={(e) => updateRotationItemTextLayer(layer.id, { size: Number(e.target.value) })} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">X %</label>
                          <input type="number" min={0} max={100} value={Math.round(layer.x)} onChange={(e) => updateRotationItemTextLayer(layer.id, { x: Number(e.target.value) || 0 })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Y %</label>
                          <input type="number" min={0} max={100} value={Math.round(layer.y)} onChange={(e) => updateRotationItemTextLayer(layer.id, { y: Number(e.target.value) || 0 })} className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-gray-900" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_font_type')}</label>
                        <select value={layer.fontFamily || 'Arial'} onChange={(e) => updateRotationItemTextLayer(layer.id, { fontFamily: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900" style={{ fontFamily: layer.fontFamily || 'Arial' }}>
                          {FONT_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.fonts.map((f) => (
                                <option key={f} value={f.includes(' ') ? `"${f}"` : f}>{f}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => updateRotationItemTextLayer(layer.id, { textDecoration: layer.textDecoration === 'underline' ? undefined : 'underline' })} className={`w-8 h-8 rounded border text-xs underline ${layer.textDecoration === 'underline' ? 'bg-amber-500 text-white border-amber-600' : 'border-gray-300'}`} title={t('editor_underline')}>U</button>
                        <button type="button" onClick={() => updateRotationItemTextLayer(layer.id, { textDecoration: layer.textDecoration === 'line-through' ? undefined : 'line-through' })} className={`w-8 h-8 rounded border text-xs line-through ${layer.textDecoration === 'line-through' ? 'bg-amber-500 text-white border-amber-600' : 'border-gray-300'}`} title={t('editor_strikethrough')}>S</button>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_alignment')}</label>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button key={align} type="button" onClick={() => updateRotationItemTextLayer(layer.id, { textAlign: align })} className={`flex-1 py-1 rounded text-xs ${layer.textAlign === align ? 'bg-amber-600 text-white' : 'bg-gray-100'}`}>{align === 'left' ? t('editor_align_left') : align === 'center' ? t('editor_align_center') : t('editor_align_right')}</button>
                          ))}
                        </div>
                      </div>
                      {/* İkon / Simge */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_icon_symbol')}</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {TEXT_ICON_OPTIONS.map((emoji) => (
                            <button
                              key={emoji || 'none'}
                              type="button"
                              onClick={() => updateRotationItemTextLayer(layer.id, { icon: emoji || undefined })}
                              className={`w-8 h-8 rounded border text-lg flex items-center justify-center transition-colors ${
                                (layer.icon || '') === (emoji || '') ? 'bg-amber-500 text-white border-amber-600' : 'bg-white border-gray-300 hover:bg-gray-100'
                              }`}
                              title={emoji || t('editor_none')}
                            >
                              {emoji || '✕'}
                            </button>
                          ))}
                        </div>
                        {(layer.icon != null && layer.icon !== '') && (
                          <div className="flex items-center gap-2 mt-1">
                            <label className="text-xs text-gray-600">{t('editor_icon_position')}:</label>
                            <select
                              value={layer.iconPosition || 'before'}
                              onChange={(e) => updateRotationItemTextLayer(layer.id, { iconPosition: e.target.value as 'before' | 'after' })}
                              className="px-2 py-1 border border-gray-300 rounded text-xs text-gray-900"
                            >
                              <option value="before">{t('editor_icon_before')}</option>
                              <option value="after">{t('editor_icon_after')}</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Hareketli indirim bloğu */}
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!layer.isDiscountBlock}
                            onChange={(e) => updateRotationItemTextLayer(layer.id, {
                              isDiscountBlock: e.target.checked,
                              ...(e.target.checked && {
                                text: layer.text || t('editor_discount_label').replace('{n}', String(layer.discountPercent ?? 20)),
                                discountPercent: layer.discountPercent ?? 20,
                                blockColor: layer.blockColor || '#FBBF24',
                                discountAnimation: layer.discountAnimation || 'pulse',
                                discountBlockStyle: layer.discountBlockStyle || 'rounded',
                              }),
                            })}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span className="text-xs font-semibold text-amber-800">{t('editor_animated_discount_block')}</span>
                        </label>
                        {layer.isDiscountBlock && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_percent')}</label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={layer.discountPercent ?? 20}
                                onChange={(e) => {
                                  const p = Number(e.target.value) || 20;
                                  updateRotationItemTextLayer(layer.id, { discountPercent: p, text: t('editor_discount_label').replace('{n}', String(p)) });
                                }}
                                className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_block_color')}</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={layer.blockColor || '#FBBF24'}
                                  onChange={(e) => updateRotationItemTextLayer(layer.id, { blockColor: e.target.value })}
                                  className="w-10 h-8 rounded border border-amber-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={layer.blockColor || '#FBBF24'}
                                  onChange={(e) => updateRotationItemTextLayer(layer.id, { blockColor: e.target.value })}
                                  className="flex-1 px-2 py-1 border border-amber-300 rounded text-xs text-gray-900"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_animation')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_ANIMATIONS.map((anim) => (
                                  <button
                                    key={anim}
                                    type="button"
                                    onClick={() => updateRotationItemTextLayer(layer.id, { discountAnimation: anim })}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      (layer.discountAnimation || 'pulse') === anim ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-800'
                                    }`}
                                  >
                                    {t(`editor_anim_${anim}` as 'editor_anim_pulse')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_style')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_BLOCK_STYLES.map((style) => (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => updateRotationItemTextLayer(layer.id, { discountBlockStyle: style })}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      (layer.discountBlockStyle || 'rounded') === style ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-800'
                                    }`}
                                  >
                                    {t(`editor_style_${style}` as 'editor_style_pill')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                        📍 {t('editor_position_label')}: X: {layer.x.toFixed(0)}%, Y: {layer.y.toFixed(0)}%
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={saveRotationItemTexts} className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold">
                {t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resim Yazısı - Canvas benzeri Modal */}
      {showImageTextModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full p-6 max-h-[90vh] overflow-hidden flex flex-col">
            {(!selectedBlockContent || (selectedBlockContent.content_type !== 'image' && selectedBlockContent.content_type !== 'video')) ? (
              <>
                <div className="mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">✏️ {t('editor_add_text_to_image')}</h2>
                </div>
                <p className="text-gray-600 py-6">{t('editor_empty_block_add_content_first')}</p>
                <button onClick={() => setShowImageTextModal(false)} className="self-start px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium">
                  {t('common_close')}
                </button>
              </>
            ) : (
            <>
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">✏️ {t('editor_add_text_to_image')}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {t('editor_image_text_modal_click_hint')}
              </p>
            </div>
            
            <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
              {/* Sol Panel - Yazı Listesi ve Ayarlar */}
              <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2">
                {/* Yazı Listesi */}
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('editor_texts_count').replace('{count}', String(textLayers.length))}</h3>
                  {textLayers.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">
                      {t('editor_no_text_yet')}<br/>
                      <span className="text-purple-600">"{t('editor_add_new_text')}"</span> {t('editor_click_button')}
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {textLayers.map((layer, idx) => (
                        <div
                          key={layer.id}
                          onClick={() => setSelectedTextLayerId(layer.id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                            selectedTextLayerId === layer.id
                              ? 'bg-purple-100 border-2 border-purple-500'
                              : 'bg-white border border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                            <span className="truncate text-sm" style={{ color: layer.color, textShadow: '0 0 2px rgba(0,0,0,0.5)' }}>
                              {(layer.text || t('editor_empty_text')).split('\n')[0]}
                              {(layer.text || '').includes('\n') && ` (+${(layer.text || '').split('\n').length - 1} ${t('editor_lines')})`}
                            </span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeTextLayer(layer.id); }}
                            className="text-red-500 hover:text-red-700 p-1"
                            title={t('btn_delete')}
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seçili Yazı Ayarları */}
                {selectedTextLayerId && (() => {
                  const selectedLayer = textLayers.find(l => l.id === selectedTextLayerId);
                  if (!selectedLayer) return null;
                  const fontFamilyValue = selectedLayer.fontFamily || 'Arial';
                  const fontForSelect = fontFamilyValue.replace(/^"|"$/g, '');
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm space-y-3">
                      <h3 className="font-semibold text-slate-800 text-sm mb-1.5">{t('editor_selected_text_settings')}</h3>
                      
                      {/* Tasarım editörü sırası: Yazı stili → B/I/U/S → İkon → Metin → Boyut → Renk → Hizalama */}
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_font_type')}</label>
                        <select
                          value={fontForSelect}
                          onChange={(e) => updateTextLayer(selectedLayer.id, { fontFamily: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs mb-1.5"
                          style={{ fontFamily: fontForSelect }}
                        >
                          {!FONT_OPTIONS.includes(fontForSelect) && (
                            <option value={fontForSelect}>{fontForSelect}</option>
                          )}
                          {FONT_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.fonts.map((f) => (
                                <option key={f} value={f}>{f}</option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-1 mb-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => updateTextLayer(selectedLayer.id, { fontWeight: (selectedLayer.fontWeight || '').includes('bold') ? 'normal' : 'bold' })}
                          className={`w-6 h-6 rounded border text-xs font-bold ${(selectedLayer.fontWeight || '').includes('bold') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          title={t('editor_bold')}
                        >
                          B
                        </button>
                        <button
                          type="button"
                          onClick={() => updateTextLayer(selectedLayer.id, { fontStyle: (selectedLayer.fontStyle || '').includes('italic') ? 'normal' : 'italic' })}
                          className={`w-6 h-6 rounded border text-xs italic ${(selectedLayer.fontStyle || '').includes('italic') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          title={t('editor_italic')}
                        >
                          I
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = selectedLayer.textDecoration === 'underline' ? undefined : 'underline';
                            updateTextLayer(selectedLayer.id, { textDecoration: next });
                          }}
                          className={`w-6 h-6 rounded border text-xs underline ${selectedLayer.textDecoration === 'underline' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          title={t('editor_underline')}
                        >
                          U
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = selectedLayer.textDecoration === 'line-through' ? undefined : 'line-through';
                            updateTextLayer(selectedLayer.id, { textDecoration: next });
                          }}
                          className={`w-6 h-6 rounded border text-xs line-through ${selectedLayer.textDecoration === 'line-through' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                          title={t('editor_strikethrough')}
                        >
                          S
                        </button>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_icon_symbol')}</label>
                        <div className="flex flex-wrap gap-1 mb-1.5">
                          {TEXT_ICON_OPTIONS.map((emoji) => (
                            <button
                              key={emoji || 'none'}
                              type="button"
                              onClick={() => updateTextLayer(selectedLayer.id, { icon: emoji || undefined })}
                              className={`w-6 h-6 rounded border text-sm flex items-center justify-center transition-colors ${
                                (selectedLayer.icon || '') === (emoji || '') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                              }`}
                              title={emoji || t('editor_none')}
                            >
                              {emoji || '✕'}
                            </button>
                          ))}
                        </div>
                        {selectedLayer.icon && (
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-[11px] text-slate-500">{t('editor_icon_position')}:</label>
                            <select
                              value={selectedLayer.iconPosition || 'before'}
                              onChange={(e) => updateTextLayer(selectedLayer.id, { iconPosition: e.target.value as 'before' | 'after' })}
                              className="rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                              <option value="before">{t('editor_icon_before')}</option>
                              <option value="after">{t('editor_icon_after')}</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_text_content')}</label>
                        <textarea
                          value={selectedLayer.text}
                          onChange={(e) => updateTextLayer(selectedLayer.id, { text: e.target.value })}
                          placeholder={t('editor_enter_text_placeholder')}
                          rows={3}
                          className="w-full rounded border border-slate-200 px-2 py-1 text-xs mb-1.5"
                        />
                        <p className="text-[10px] text-slate-500">{t('editor_enter_new_line')}</p>
                      </div>

                      <div className="flex gap-2 items-center mb-1.5">
                        <label className="text-[11px] text-slate-500">Boyut</label>
                        <input
                          type="number"
                          min={8}
                          max={120}
                          value={selectedLayer.size}
                          onChange={(e) => updateTextLayer(selectedLayer.id, { size: Number(e.target.value) || 24 })}
                          className="w-12 rounded border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      </div>
                      <div className="flex gap-2 items-center mb-1.5">
                        <label className="text-[11px] text-slate-500">{t('editor_color')}</label>
                        <input
                          type="color"
                          value={selectedLayer.color}
                          onChange={(e) => updateTextLayer(selectedLayer.id, { color: e.target.value })}
                          className="w-8 h-6 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedLayer.color}
                          onChange={(e) => updateTextLayer(selectedLayer.id, { color: e.target.value })}
                          className="flex-1 rounded border border-slate-200 px-2 py-0.5 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_alignment')}</label>
                        <div className="flex gap-1">
                          {(['left', 'center', 'right'] as const).map((align) => (
                            <button
                              key={align}
                              type="button"
                              onClick={() => updateTextLayer(selectedLayer.id, { textAlign: align })}
                              className={`flex-1 py-1 rounded text-[11px] ${(selectedLayer.textAlign || 'center') === align ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                              {align === 'left' ? t('editor_align_left') : align === 'center' ? t('editor_align_center') : t('editor_align_right')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Hareketli indirim bloğu */}
                      <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!selectedLayer.isDiscountBlock}
                            onChange={(e) => updateTextLayer(selectedLayer.id, {
                              isDiscountBlock: e.target.checked,
                              ...(e.target.checked && {
                                text: selectedLayer.text || t('editor_discount_label').replace('{n}', String(selectedLayer.discountPercent ?? 20)),
                                discountPercent: selectedLayer.discountPercent ?? 20,
                                blockColor: selectedLayer.blockColor || '#FBBF24',
                                discountAnimation: selectedLayer.discountAnimation || 'pulse',
                                discountBlockStyle: selectedLayer.discountBlockStyle || 'rounded',
                              }),
                            })}
                            className="w-4 h-4 text-amber-600 rounded"
                          />
                          <span className="text-xs font-semibold text-amber-800">{t('editor_animated_discount_block')}</span>
                        </label>
                        {selectedLayer.isDiscountBlock && (
                          <div className="mt-3 space-y-3">
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_percent')}</label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={selectedLayer.discountPercent ?? 20}
                                onChange={(e) => {
                                  const p = Number(e.target.value) || 20;
                                  updateTextLayer(selectedLayer.id, { discountPercent: p, text: t('editor_discount_label').replace('{n}', String(p)) });
                                }}
                                className="w-full px-2 py-1.5 border border-amber-300 rounded text-sm text-gray-900"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_block_color')}</label>
                              <div className="flex gap-2">
                                <input
                                  type="color"
                                  value={selectedLayer.blockColor || '#FBBF24'}
                                  onChange={(e) => updateTextLayer(selectedLayer.id, { blockColor: e.target.value })}
                                  className="w-10 h-8 rounded border border-amber-300 cursor-pointer"
                                />
                                <input
                                  type="text"
                                  value={selectedLayer.blockColor || '#FBBF24'}
                                  onChange={(e) => updateTextLayer(selectedLayer.id, { blockColor: e.target.value })}
                                  className="flex-1 px-2 py-1 border border-amber-300 rounded text-xs text-gray-900"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_animation')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_ANIMATIONS.map((anim) => (
                                  <button
                                    key={anim}
                                    type="button"
                                    onClick={() => updateTextLayer(selectedLayer.id, { discountAnimation: anim })}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      (selectedLayer.discountAnimation || 'pulse') === anim ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-800'
                                    }`}
                                  >
                                    {t(`editor_anim_${anim}` as 'editor_anim_pulse')}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs text-amber-800 mb-1">{t('editor_discount_style')}</label>
                              <div className="flex flex-wrap gap-1">
                                {DISCOUNT_BLOCK_STYLES.map((style) => (
                                  <button
                                    key={style}
                                    type="button"
                                    onClick={() => updateTextLayer(selectedLayer.id, { discountBlockStyle: style })}
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      (selectedLayer.discountBlockStyle || 'rounded') === style ? 'bg-amber-600 text-white' : 'bg-white border border-amber-300 text-amber-800'
                                    }`}
                                  >
                                    {t(`editor_style_${style}` as 'editor_style_pill')}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 bg-white p-2 rounded border">
                        📍 {t('editor_position_label')}: X: {selectedLayer.x.toFixed(0)}%, Y: {selectedLayer.y.toFixed(0)}%
                        <br/>
                        <span className="text-purple-600">💡 {t('editor_preview_drag_hint')}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Sağ Panel - Canvas (resme tıkla = yeni yazı, yazıya tıkla = seç + sürükle) */}
              <div className="w-1/2 flex flex-col">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Canvas <span className="text-purple-600 font-normal">{t('editor_canvas_hint')}</span>
                </label>
                <div
                  ref={textPreviewRef}
                  className="relative bg-gray-800 rounded-lg overflow-hidden flex-1 select-none"
                  style={{ minHeight: '300px', aspectRatio: getBlockAspectRatio(blocks.length) }}
                >
                  {/* Resim/video arka planı (varsa) */}
                  {selectedBlockContent?.image_url && (
                    selectedBlockContent.content_type === 'video' ? (() => {
                      const sc = selectedBlockContent.style_config
                        ? (typeof selectedBlockContent.style_config === 'string' ? JSON.parse(selectedBlockContent.style_config || '{}') : selectedBlockContent.style_config)
                        : {};
                      const vr = sc.videoRotation as { firstVideoDurationSeconds?: number; rotationUrls?: string[]; rotationItems?: Array<{ url: string; durationSeconds?: number }> } | undefined;
                      const rotationItems = (() => {
                        if (!vr) return [];
                        if (Array.isArray(vr.rotationItems) && vr.rotationItems.length > 0)
                          return vr.rotationItems.map((it: any) => ({ url: it.url, durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 10 }));
                        if (Array.isArray(vr.rotationUrls)) return vr.rotationUrls.map((url: string) => ({ url, durationSeconds: 10 }));
                        return [];
                      })();
                      const useRotation = vr && (rotationItems.length > 0 || (typeof vr.firstVideoDurationSeconds === 'number' && vr.firstVideoDurationSeconds > 0));
                      const firstDuration = typeof vr?.firstVideoDurationSeconds === 'number' ? Math.max(1, Math.min(120, vr.firstVideoDurationSeconds)) : 10;
                      return useRotation ? (
                        <VideoRotationPlayer
                          firstVideoUrl={selectedBlockContent.image_url}
                          firstVideoDurationSeconds={firstDuration}
                          rotationItems={rotationItems}
                          className="absolute inset-0 w-full h-full opacity-80"
                          objectFit="cover"
                          objectPosition="center"
                          imageScale={1}
                        />
                      ) : (
                        <video
                          src={selectedBlockContent.image_url}
                          className="absolute inset-0 w-full h-full object-cover opacity-80"
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ pointerEvents: 'none' }}
                        />
                      );
                    })() : (
                      <img
                        src={selectedBlockContent.image_url}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover opacity-80"
                        draggable={false}
                      />
                    )
                  )}
                  
                  {/* Grid çizgileri */}
                  <div className="absolute inset-0 pointer-events-none z-0" style={{
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                    backgroundSize: '10% 10%'
                  }} />

                  {/* Resme tıklayınca yeni yazı ekle - boş alana tıklanınca tetiklenir */}
                  <div
                    className="absolute inset-0 z-10 cursor-crosshair"
                    onClick={handleCanvasClick}
                    aria-label={t('editor_click_image_to_add_text')}
                  />

                  {/* Yazı katmanları - tıklayınca seçilir, sürüklenebilir; ikon + hareketli indirim bloğu */}
                  {textLayers.map((layer) => {
                    const isDiscount = !!layer.isDiscountBlock;
                    const iconBefore = layer.icon && (layer.iconPosition !== 'after');
                    const iconAfter = layer.icon && (layer.iconPosition === 'after');
                    const content = (
                      <>
                        {iconBefore && <span className="mr-1" style={{ fontSize: '1em' }}>{layer.icon}</span>}
                        {layer.text || t('editor_text_default')}
                        {iconAfter && <span className="ml-1" style={{ fontSize: '1em' }}>{layer.icon}</span>}
                      </>
                    );
                    return (
                      <div
                        key={layer.id}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          handleTextDragStart(e, layer.id);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTextLayerId(layer.id);
                        }}
                        className={`absolute z-30 cursor-grab active:cursor-grabbing transition-shadow ${
                          selectedTextLayerId === layer.id ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                        } ${draggingLayerId === layer.id ? 'opacity-80' : ''} ${
                          isDiscount ? getDiscountBlockClasses(layer) + ' px-3 py-1.5 shadow-lg border' : ''
                        }`}
                        style={{
                          left: `${layer.x}%`,
                          top: `${layer.y}%`,
                          transform: 'translate(-50%, -50%)',
                          ...(isDiscount ? getDiscountBlockStyles(layer) : { color: layer.color }),
                          fontSize: `${layer.size * 0.6}px`,
                          fontWeight: layer.fontWeight,
                          fontStyle: layer.fontStyle,
                          fontFamily: layer.fontFamily || 'Arial',
                          textDecoration: layer.textDecoration || 'none',
                          textShadow: isDiscount ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
                          whiteSpace: 'pre' as const,
                          userSelect: 'none',
                          pointerEvents: 'auto',
                          textAlign: (layer.textAlign || 'center') as 'left' | 'center' | 'right',
                        }}
                      >
                        {content}
                      </div>
                    );
                  })}

                  {textLayers.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-400 z-20 pointer-events-none">
                      Resme tıklayarak yeni yazı ekleyin
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-4 pt-4 border-t">
              <button
                onClick={() => {
                  setShowImageTextModal(false);
                  setSelectedTextLayerId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleSaveImageText}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? t('editor_saving') : t('btn_save') + ` (${textLayers.length})`}
              </button>
            </div>
            </>
            )}
          </div>
        </div>
      )}

      {/* Tek Menü (Special FOOD MENU) Düzenleme Modal: header + 3 sütun */}
      {showRegionalMenuEditModal && selectedBlockContent?.content_type === 'regional_menu' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-4xl w-full p-6 my-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">{t('editor_edit_food_menu')}</h2>
            <input
              ref={regionalMenuImageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => editingCategoryImageIdx !== null && handleRegionalCategoryImageChange(editingCategoryImageIdx, e)}
            />
            <div className="space-y-4 mb-6 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('editor_special_script')}</label>
                  <input
                    type="text"
                    value={editingRegionalHeaderSpecial}
                    onChange={(e) => setEditingRegionalHeaderSpecial(e.target.value)}
                    placeholder="Special"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{t('editor_food_menu_title')}</label>
                  <input
                    type="text"
                    value={editingRegionalHeaderTitle}
                    onChange={(e) => setEditingRegionalHeaderTitle(e.target.value)}
                    placeholder="FOOD MENU"
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {editingRegionalCategories.slice(0, 3).map((cat, catIdx) => (
                  <div key={cat.id} className="border border-amber-200 rounded-lg p-3 bg-amber-50/30">
                    <label className="block text-sm font-semibold text-amber-800 mb-2">{t('editor_column_n').replace('{n}', String(catIdx + 1))}</label>
                    <input
                      type="text"
                      value={cat.name}
                      onChange={(e) => setEditingRegionalCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, name: e.target.value } : c)))}
                      placeholder={t('editor_category_placeholder')}
                      className="w-full px-2 py-1.5 border rounded text-sm mb-2"
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => { setEditingCategoryImageIdx(catIdx); regionalMenuImageInputRef.current?.click(); }}
                      onKeyDown={(e) => e.key === 'Enter' && (setEditingCategoryImageIdx(catIdx), regionalMenuImageInputRef.current?.click())}
                      className="border-2 border-dashed border-amber-300 rounded-lg p-2 text-center cursor-pointer hover:border-amber-500 mb-2"
                    >
                      {cat.image_url ? (
                        <img src={cat.image_url} alt="" className="mx-auto h-16 object-cover rounded" style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }} />
                      ) : (
                        <span className="text-gray-500 text-xs">{t('editor_image')}</span>
                      )}
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {(cat.items || []).map((item, itemIdx) => (
                        <div key={item.id} className="p-1.5 border border-gray-200 rounded space-y-0.5 bg-white">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => setEditingRegionalCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, items: c.items.map((it, j) => (j === itemIdx ? { ...it, name: e.target.value } : it)) } : c)))}
                            placeholder={t('editor_name_placeholder')}
                            className="w-full px-1.5 py-0.5 border rounded text-xs"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => setEditingRegionalCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, items: c.items.map((it, j) => (j === itemIdx ? { ...it, description: e.target.value } : it)) } : c)))}
                            placeholder={t('editor_product_description')}
                            className="w-full px-1.5 py-0.5 border rounded text-[10px]"
                          />
                          <input
                            type="text"
                            value={item.price}
                            onChange={(e) => setEditingRegionalCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, items: c.items.map((it, j) => (j === itemIdx ? { ...it, price: e.target.value } : it)) } : c)))}
                            placeholder={t('editor_price_placeholder')}
                            className="w-full px-1.5 py-0.5 border rounded text-xs"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => setEditingRegionalCategories((prev) => prev.map((c, i) => (i === catIdx ? { ...c, items: [...c.items, { id: `item-${Date.now()}`, name: '', description: '', price: '' }] } : c)))}
                        className="text-xs text-amber-600 hover:underline"
                      >
                        {t('editor_add_item')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{t('editor_contact_footer')}</label>
                <input
                  type="text"
                  value={editingRegionalMenuContact}
                  onChange={(e) => setEditingRegionalMenuContact(e.target.value)}
                  placeholder={t('editor_contact_placeholder')}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowRegionalMenuEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleSaveRegionalMenuEdit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? t('editor_saving') : t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* İkon Konumlandırma Modal */}
      {showIconPositionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('editor_icon_position_modal')}</h2>
            <p className="text-sm text-gray-600 mb-6">
              {t('editor_icon_position_question')}
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Sol Üst */}
              <button
                onClick={() => handleIconPositionSelect('top-left')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↖️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_top_left')}</div>
              </button>
              
              {/* Üst Merkez */}
              <button
                onClick={() => handleIconPositionSelect('center')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">⬆️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_center')}</div>
              </button>
              
              {/* Sağ Üst */}
              <button
                onClick={() => handleIconPositionSelect('top-right')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↗️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_top_right')}</div>
              </button>
              
              {/* Sol Alt */}
              <button
                onClick={() => handleIconPositionSelect('bottom-left')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↙️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_bottom_left')}</div>
              </button>
              
              {/* Alt Merkez - Boş */}
              <div className="p-4"></div>
              
              {/* Sağ Alt */}
              <button
                onClick={() => handleIconPositionSelect('bottom-right')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↘️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_bottom_right')}</div>
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowIconPositionModal(false);
                  setPendingIconContent(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rozet Düzenleme Modal */}
      {showBadgeEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('editor_badge_edit')}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_badge_text')}
                </label>
                <input
                  type="text"
                  value={editingBadgeText}
                  onChange={(e) => setEditingBadgeText(e.target.value)}
                  placeholder={t('editor_badge_placeholder')}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_badge_bg_color')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingBadgeBgColor}
                    onChange={(e) => setEditingBadgeBgColor(e.target.value)}
                    className="w-16 h-10 border-2 border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingBadgeBgColor}
                    onChange={(e) => setEditingBadgeBgColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Yazı Rengi
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingBadgeTextColor}
                    onChange={(e) => setEditingBadgeTextColor(e.target.value)}
                    className="w-16 h-10 border-2 border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingBadgeTextColor}
                    onChange={(e) => setEditingBadgeTextColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
              </div>
              
              {/* Konum Seçimi */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Konum
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingBadgePosition('top-left')}
                    className={`p-2 border-2 rounded-lg text-xs font-semibold transition-all ${
                      editingBadgePosition === 'top-left'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    ↖️ {t('editor_top_left')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBadgePosition('top-right')}
                    className={`p-2 border-2 rounded-lg text-xs font-semibold transition-all ${
                      editingBadgePosition === 'top-right'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    ↗️ {t('editor_top_right')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBadgePosition('bottom-left')}
                    className={`p-2 border-2 rounded-lg text-xs font-semibold transition-all ${
                      editingBadgePosition === 'bottom-left'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    ↙️ {t('editor_bottom_left')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBadgePosition('bottom-right')}
                    className={`p-2 border-2 rounded-lg text-xs font-semibold transition-all ${
                      editingBadgePosition === 'bottom-right'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    ↘️ {t('editor_bottom_right')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingBadgePosition('center')}
                    className={`p-2 border-2 rounded-lg text-xs font-semibold transition-all ${
                      editingBadgePosition === 'center'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    }`}
                  >
                    ⬆️ Merkez
                  </button>
                </div>
              </div>
              
              {/* {t('editor_preview')} */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_preview')}
                </label>
                <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span 
                    className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg badge-pulse"
                    style={{ 
                      backgroundColor: editingBadgeBgColor, 
                      color: editingBadgeTextColor,
                    }}
                  >
                    {editingBadgeText || t('editor_default_new')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBadgeEditModal(false);
                  setPendingBadgeContent(null);
                  setEditingBadgeText('');
                  setEditingBadgeBgColor('#3B82F6');
                  setEditingBadgeTextColor('#FFFFFF');
                  setEditingBadgePosition('top-left');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleBadgeSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold disabled:opacity-50"
              >
                {saving ? t('editor_saving') : t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
