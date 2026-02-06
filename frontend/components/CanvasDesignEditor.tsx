'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Stage, Layer, Group, Text, Image, Transformer, Rect } from 'react-konva';
import Konva from 'konva';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { FONT_GROUPS, FONT_OPTIONS, TEXT_ICON_OPTIONS, GOOGLE_FONT_FAMILIES } from '@/lib/editor-fonts';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

function useImage(src: string | undefined, crossOrigin?: string): [HTMLImageElement | undefined] {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const image = new window.Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => setImg(image);
    image.onerror = () => setImg(undefined);
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [src, crossOrigin]);
  return [img];
}

const STORAGE_KEY = 'canvas-design-editor';
const API_BASE = '/api/proxy';

function mediaUrl(url: string): string {
  return resolveMediaUrl(url) || '';
}

type ShapeType = 'text' | 'image' | 'video' | 'imageRotation';

interface ShapeBase {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  opacity?: number;
}

interface TextShape extends ShapeBase {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fill: string;
  align: 'left' | 'center' | 'right';
  fontStyle?: string;
  textDecoration?: string;
  /** İkon/simge (emoji) — metnin başına veya sonuna eklenir */
  icon?: string;
  iconPosition?: 'before' | 'after';
}

/** Resmin kırpılma şekli: dikdörtgen veya daire */
type ImageClipShape = 'rect' | 'circle';

interface ImageShape extends ShapeBase {
  type: 'image';
  src: string;
  /** Görünüm şekli: dikdörtgen (varsayılan) veya daire */
  clipShape?: ImageClipShape;
}

interface VideoShape extends ShapeBase {
  type: 'video';
  src: string;
}

/** Her slot için üzerine eklenen metin vb. (koordinatlar döngü kutusuna göre) */
interface ImageRotationShape extends ShapeBase {
  type: 'imageRotation';
  urls: string[];
  durationSeconds: number;
  /** overlayShapes[slotIndex] = o slottaki overlay şekiller (sadece metin) */
  overlayShapes?: (TextShape)[][];
}

type Shape = TextShape | ImageShape | VideoShape | ImageRotationShape;

function generateId(): string {
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const CANVAS_W = 800;
const CANVAS_H = 450; // 16:9

/** Blok layout'ta belirli bloğun sınırlarını döndür (x, y, width, height) */
function getBlockRect(layoutType: string, blockIndex: number): { x: number; y: number; width: number; height: number } {
  const n = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
  if (n <= 1) return { x: 0, y: 0, width: CANVAS_W, height: CANVAS_H };
  const w = CANVAS_W / n;
  const i = Math.max(0, Math.min(blockIndex, n - 1));
  return { x: i * w, y: 0, width: w, height: CANVAS_H };
}

/** Şeklin hangi blokta olduğunu döndür (-1 = hiçbirinde) */
function shapeBlockIndex(shape: { x: number; y: number; width: number; height: number }, layoutType: string): number {
  const n = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
  if (n <= 1) return 0;
  const cx = shape.x + shape.width / 2;
  const w = CANVAS_W / n;
  const i = Math.floor(cx / w);
  return Math.max(0, Math.min(i, n - 1));
}

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

/** Slug → translation key for category labels (locale-aware). Includes EN and TR slug/label variants from API. */
const CATEGORY_SLUG_TO_KEY: Record<string, string> = {
  food: 'editor_category_food',
  pasta: 'editor_category_pasta',
  pastas: 'editor_category_pasta',
  drinks: 'editor_category_drinks',
  drink: 'editor_category_drinks',
  icon: 'editor_category_icons',
  icons: 'editor_category_icons',
  badges: 'editor_category_badges',
  badge: 'editor_category_badges',
  background: 'editor_category_backgrounds',
  backgrounds: 'editor_category_backgrounds',
  'arka-plan': 'editor_category_backgrounds',
  arka_plan: 'editor_category_backgrounds',
  'arka plan': 'editor_category_backgrounds',
  arkaplan: 'editor_category_backgrounds',
  text_templates: 'editor_category_text_templates',
  'text-templates': 'editor_category_text_templates',
  'metin-sablonlari': 'editor_category_text_templates',
  metin_sablonlari: 'editor_category_text_templates',
  'metin şablonları': 'editor_category_text_templates',
  'metin sablonlari': 'editor_category_text_templates',
  metinşablonları: 'editor_category_text_templates',
  regional: 'editor_category_regional',
  'tek-menu': 'editor_category_regional',
  tek_menu: 'editor_category_regional',
  'tek-menü': 'editor_category_regional',
  'tek menü': 'editor_category_regional',
  video: 'editor_category_video',
  salad: 'editor_category_salad',
  salata: 'editor_category_salad',
};

/** Known category labels (TR/EN) → translation key, when slug is not in map */
const CATEGORY_LABEL_TO_KEY: Record<string, string> = {
  'metin şablonları': 'editor_category_text_templates',
  'metin sablonlari': 'editor_category_text_templates',
  'text templates': 'editor_category_text_templates',
  'arka plan': 'editor_category_backgrounds',
  'backgrounds': 'editor_category_backgrounds',
  'background': 'editor_category_backgrounds',
};

function dataUrlForGradientOrColor(gradient?: string, color?: string): string {
  if (color) {
    try {
      const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
      if (canvas) {
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, 200, 200);
          return canvas.toDataURL('image/png');
        }
      }
    } catch {
      //
    }
  }
  if (gradient) {
    try {
      const firstColor = gradient.match(/#[0-9A-Fa-f]{3,8}/)?.[0] || '#888888';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${firstColor}"/></svg>`;
      return 'data:image/svg+xml,' + encodeURIComponent(svg);
    } catch {
      //
    }
  }
  return '';
}

/** Seçilen rengi ve yakın tonları saydam yapar; PNG data URL döner. */
function makeColorTransparent(
  imageUrl: string,
  colorHex: string,
  tolerance: number,
  translate: (key: string) => string
): Promise<string> {
  const url = mediaUrl(imageUrl);
  if (!url) return Promise.reject(new Error(translate('editor_invalid_image')));
  return new Promise((resolve, reject) => {
    const img = typeof document !== 'undefined' ? new window.Image() : null;
    if (!img) {
      reject(new Error(translate('editor_canvas_not_supported')));
      return;
    }
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error(translate('editor_canvas_2d_unavailable')));
          return;
        }
        ctx.drawImage(img, 0, 0);
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = id.data;
        let hex = colorHex.replace(/^#/, '').replace(/[^0-9A-Fa-f]/g, '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        if (hex.length !== 6) {
          reject(new Error(translate('editor_invalid_color')));
          return;
        }
        const r0 = parseInt(hex.slice(0, 2), 16);
        const g0 = parseInt(hex.slice(2, 4), 16);
        const b0 = parseInt(hex.slice(4, 6), 16);
        const t = Math.max(0, Math.min(255, tolerance));
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          if (
            Math.abs(r - r0) <= t &&
            Math.abs(g - g0) <= t &&
            Math.abs(b - b0) <= t
          ) {
            data[i + 3] = 0;
          }
        }
        ctx.putImageData(id, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => reject(new Error(translate('editor_image_load_failed')));
    img.src = url;
  });
}

function VideoThumbnail({ url, loadingLabel = 'Loading…' }: { url: string; loadingLabel?: string }) {
  const [seeked, setSeeked] = useState(false);
  const [errored, setErrored] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const seekToFrame = useCallback((v: HTMLVideoElement) => {
    if (v.duration && !isNaN(v.duration)) {
      v.currentTime = Math.min(1, v.duration * 0.15);
    } else {
      v.currentTime = 0.5;
    }
  }, []);

  if (errored) {
    return (
      <span className="absolute inset-0 flex items-center justify-center bg-slate-700 text-white/80">
        <span className="text-2xl">▶</span>
      </span>
    );
  }

  return (
    <span className="absolute inset-0 block w-full h-full bg-slate-800 overflow-hidden">
      <video
        src={url}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        muted
        playsInline
        preload="auto"
        onLoadedMetadata={(e) => seekToFrame(e.target as HTMLVideoElement)}
        onLoadedData={(e) => seekToFrame(e.target as HTMLVideoElement)}
        onSeeked={() => setSeeked(true)}
        onError={() => setErrored(true)}
      />
      {seeked ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <span className="text-white text-2xl drop-shadow-lg">▶</span>
        </span>
      ) : (
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <span className="text-white text-sm">{loadingLabel}</span>
        </span>
      )}
    </span>
  );
}

function ImageNode({
  shape,
  isSelected,
  onSelect,
  onDragEnd,
  onTransformEnd,
  onCircleInnerDragEnd,
  draggable = true,
}: {
  shape: ImageShape;
  isSelected: boolean;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  /** Daire kırpılmış resimde iç Rect sürüklenince: konum güncelle + Rect sıfırla */
  onCircleInnerDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  draggable?: boolean;
}) {
  const [img] = useImage(mediaUrl(shape.src), 'anonymous');
  const clipShape = shape.clipShape ?? 'rect';
  const w = shape.width;
  const h = shape.height;

  if (clipShape === 'circle') {
    return (
      <Group
        id={shape.id}
        x={shape.x}
        y={shape.y}
        width={w}
        height={h}
        rotation={shape.rotation ?? 0}
        opacity={shape.opacity ?? 1}
        draggable={false}
        onClick={onSelect}
        onTap={onSelect}
        onTransformEnd={onTransformEnd}
        clipFunc={(ctx) => {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(w, h) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
        }}
      >
        <Rect
          x={0}
          y={0}
          width={w}
          height={h}
          fill="transparent"
          listening={true}
          draggable={draggable}
          onDragEnd={onCircleInnerDragEnd}
        />
        <Image image={img} x={0} y={0} width={w} height={h} listening={false} />
      </Group>
    );
  }

  return (
    <Image
      id={shape.id}
      image={img}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function VideoNode({
  shape,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  shape: VideoShape;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const src = mediaUrl(shape.src);

  useEffect(() => {
    if (!src) return;
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.autoplay = true;
    v.crossOrigin = 'anonymous';
    const onReady = () => {
      setVideoEl(v);
      const play = () => v.play().catch(() => {});
      play();
      setTimeout(play, 100);
      requestAnimationFrame(play);
    };
    v.onloadeddata = onReady;
    v.oncanplay = onReady;
    v.oncanplaythrough = onReady;
    v.load();
    return () => {
      v.pause();
      v.removeAttribute('src');
      v.load();
      setVideoEl(null);
    };
  }, [src]);

  if (!videoEl) return null;
  return (
    <Image
      id={shape.id}
      image={videoEl}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

function ImageRotationNode({
  shape,
  onSelect,
  onDragEnd,
  onTransformEnd,
  draggable = true,
}: {
  shape: ImageRotationShape;
  onSelect: () => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd: (e: Konva.KonvaEventObject<Event>) => void;
  draggable?: boolean;
}) {
  const urls = shape.urls?.length ? shape.urls : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const durationMs = Math.max(1, (shape.durationSeconds ?? 5) * 1000);
  const currentUrl = urls[currentIndex % urls.length] ?? '';
  const [img] = useImage(mediaUrl(currentUrl), 'anonymous');

  useEffect(() => {
    if (urls.length <= 1) return;
    const t = setInterval(() => {
      setCurrentIndex((i) => i + 1);
    }, durationMs);
    return () => clearInterval(t);
  }, [urls.length, durationMs]);

  if (urls.length === 0) {
    return (
      <Rect
        id={shape.id}
        x={shape.x}
        y={shape.y}
        width={shape.width}
        height={shape.height}
        fill="#334155"
        stroke="#64748b"
        strokeWidth={2}
        dash={[8, 4]}
        draggable={draggable}
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={onDragEnd}
        onTransformEnd={onTransformEnd}
      />
    );
  }

  return (
    <Image
      key={`${shape.id}-${currentIndex}`}
      id={shape.id}
      image={img}
      x={shape.x}
      y={shape.y}
      width={shape.width}
      height={shape.height}
      rotation={shape.rotation ?? 0}
      opacity={shape.opacity ?? 1}
      draggable={draggable}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
    />
  );
}

/** Tek slot önizlemesi: bir görsel + üzerindeki metin overlay'leri (düzenleme modu) */
function ImageRotationSingleSlotNode({
  shape,
  slotIndex,
  slotOverlays,
  onSelectShape,
  onSelectOverlay,
  onShapeDragEnd,
  onOverlayDragEnd,
  onOverlayTransformEnd,
}: {
  shape: ImageRotationShape;
  slotIndex: number;
  slotOverlays: TextShape[];
  onSelectShape: () => void;
  onSelectOverlay: (overlayId: string) => void;
  onShapeDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onOverlayDragEnd: (overlayId: string) => (e: Konva.KonvaEventObject<DragEvent>) => void;
  onOverlayTransformEnd: (overlayId: string) => (e: Konva.KonvaEventObject<Event>) => void;
}) {
  const url = shape.urls[slotIndex];
  const [img] = useImage(mediaUrl(url), 'anonymous');
  return (
    <Group
      x={shape.x}
      y={shape.y}
      draggable
      onClick={(e) => {
        e.cancelBubble = true;
        if (e.target.getClassName() === 'Group') onSelectShape();
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        if (e.target.getClassName() === 'Group') onSelectShape();
      }}
      onDragEnd={onShapeDragEnd}
    >
      <Image
        image={img}
        x={0}
        y={0}
        width={shape.width}
        height={shape.height}
        listening={false}
      />
      {slotOverlays.map((t) => {
          const overlayDisplayText = t.icon
            ? (t.iconPosition === 'after' ? `${t.text} ${t.icon}` : `${t.icon} ${t.text}`)
            : t.text;
          return (
        <Text
          key={t.id}
          id={`rotation-overlay-${shape.id}-${slotIndex}-${t.id}`}
          x={t.x}
          y={t.y}
          width={t.width}
          height={t.height}
          text={overlayDisplayText}
          fontSize={t.fontSize}
          fontFamily={t.fontFamily}
          fill={t.fill}
          align={t.align}
          fontStyle={t.fontStyle}
          textDecoration={t.textDecoration}
          draggable
          onClick={(e) => {
            e.cancelBubble = true;
            onSelectOverlay(t.id);
          }}
          onTap={(e) => {
            e.cancelBubble = true;
            onSelectOverlay(t.id);
          }}
          onDragEnd={onOverlayDragEnd(t.id)}
          onTransformEnd={onOverlayTransformEnd(t.id)}
        />
          );
      })}
    </Group>
  );
}

interface CanvasDesignEditorProps {
  /** Şablondan yükle: "Bunu kullan" ile açıldığında geçer */
  templateId?: string;
}

export default function CanvasDesignEditor({ templateId }: CanvasDesignEditorProps) {
  const { t } = useTranslation();
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [backgroundColor, setBackgroundColor] = useState('#1e293b');
  const [showLibrary, setShowLibrary] = useState(false);
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([]);
  const [libraryCategories, setLibraryCategories] = useState<LibraryCategory[]>([]);
  const [libraryCategoryFilter, setLibraryCategoryFilter] = useState<string>('all');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [layoutType, setLayoutType] = useState<'full' | '2block' | '3block' | '4block' | '5block' | '6block'>('full');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [openLibraryForRotation, setOpenLibraryForRotation] = useState(false);
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rotationFileInputRef = useRef<HTMLInputElement>(null);
  const [canvasDisplaySize, setCanvasDisplaySize] = useState({ w: CANVAS_W, h: CANVAS_H });
  /** Görsel döngüsünde hangi slot önizlemede / düzenlemede (sol paneldeki thumbnail tıklanınca) */
  const [selectedRotationSlot, setSelectedRotationSlot] = useState<number | null>(null);
  /** Seçili overlay node id (transformer için) */
  const [selectedOverlayNodeId, setSelectedOverlayNodeId] = useState<string | null>(null);
  /** Seçili overlay: "shapeId|slotIndex|overlayId" — panelde düzenleme için */
  const [selectedOverlayKey, setSelectedOverlayKey] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const previewWrapRef = useRef<HTMLDivElement>(null);
  const [previewDisplaySize, setPreviewDisplaySize] = useState({ w: CANVAS_W, h: CANVAS_H });
  /** Sol panel (dashboard) açık/kapalı — kapalıyken düzenleme alanı genişler */
  const [sidebarOpen, setSidebarOpen] = useState(true);
  /** Arka plan kaldır: saydam yapılacak renk ve tolerans */
  const [removeBgColor, setRemoveBgColor] = useState('#ffffff');
  const [removeBgTolerance, setRemoveBgTolerance] = useState(40);
  const [removeBgLoading, setRemoveBgLoading] = useState(false);
  const [removeBgError, setRemoveBgError] = useState<string | null>(null);
  const [removeBgAiLoading, setRemoveBgAiLoading] = useState(false);
  const [removeBgAiError, setRemoveBgAiError] = useState<string | null>(null);
  /** Farklı kaydet modal — admin: sistem şablonu / kullanıcı seçimi */
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  /** Blok layout'ta seçili blok (resim eklerken bu bloğa eklenir) — null = otomatik */
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [users, setUsers] = useState<{ id: string; email: string; business_name?: string }[]>([]);
  const [saveAsLoading, setSaveAsLoading] = useState(false);
  const [saveAsDisplayName, setSaveAsDisplayName] = useState('');
  const [saveAsSelectedUserId, setSaveAsSelectedUserId] = useState('');

  const selectedShape = shapes.find((s) => s.id === selectedId);

  /** AI ile arka plan kaldır: backend API üzerinden (önemli: build hatasını önler). */
  const removeBackgroundAi = useCallback(async (imageSrc: string): Promise<string> => {
    let src = imageSrc.startsWith('data:') ? imageSrc : mediaUrl(imageSrc);
    if (typeof window !== 'undefined' && src.startsWith('/') && !src.startsWith('//')) {
      src = `${window.location.origin}${src}`;
    }
    const data = await apiClient('/ai/remove-background', {
      method: 'POST',
      body: { image: src },
    });
    const dataUrl = (data as { dataUrl?: string })?.dataUrl;
    if (!dataUrl) throw new Error(t('editor_server_no_data'));
    return dataUrl;
  }, [t]);

  useEffect(() => {
    if (layoutType === 'full') setSelectedBlockIndex(null);
  }, [layoutType]);

  useEffect(() => {
    if (layoutType !== 'full' && selectedId) {
      const s = shapes.find((x) => x.id === selectedId);
      if (s && (s.type === 'image' || s.type === 'video' || s.type === 'imageRotation')) {
        setSelectedBlockIndex(shapeBlockIndex(s, layoutType));
      }
    }
  }, [selectedId, layoutType, shapes]);

  useEffect(() => {
    if (!showPreviewModal && !showFullScreenPreview) return;
    const el = previewWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        const scale = Math.min(width / CANVAS_W, height / CANVAS_H);
        setPreviewDisplaySize({ w: Math.round(CANVAS_W * scale), h: Math.round(CANVAS_H * scale) });
      }
    });
    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      const scale = Math.min(width / CANVAS_W, height / CANVAS_H);
      setPreviewDisplaySize({ w: Math.round(CANVAS_W * scale), h: Math.round(CANVAS_H * scale) });
    }
    return () => ro.disconnect();
  }, [showPreviewModal, showFullScreenPreview]);

  useEffect(() => {
    if (!selectedShape || selectedShape.type !== 'imageRotation') {
      setSelectedRotationSlot(null);
      setSelectedOverlayNodeId(null);
      setSelectedOverlayKey(null);
      return;
    }
    const urlsLen = selectedShape.urls?.length ?? 0;
    if (selectedRotationSlot !== null && selectedRotationSlot >= urlsLen) setSelectedRotationSlot(urlsLen > 0 ? 0 : null);
  }, [selectedId, selectedShape, selectedRotationSlot]);

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const { width, height } = el.getBoundingClientRect();
      if (width > 0 && height > 0) {
        const scale = Math.min(width / CANVAS_W, height / CANVAS_H);
        setCanvasDisplaySize({ w: Math.round(CANVAS_W * scale), h: Math.round(CANVAS_H * scale) });
      }
    });
    ro.observe(el);
    const { width, height } = el.getBoundingClientRect();
    if (width > 0 && height > 0) {
      const scale = Math.min(width / CANVAS_W, height / CANVAS_H);
      setCanvasDisplaySize({ w: Math.round(CANVAS_W * scale), h: Math.round(CANVAS_H * scale) });
    }
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!trRef.current) return;
    const stage = stageRef.current;
    if (!stage) return;
    if (selectedOverlayNodeId) {
      const node = stage.findOne('#' + selectedOverlayNodeId);
      if (node) {
        trRef.current.nodes([node]);
        return () => { trRef.current?.nodes([]); };
      }
    }
    if (!selectedId) {
      trRef.current.nodes([]);
      return;
    }
    const node = stage.findOne('#' + selectedId);
    if (node) trRef.current.nodes([node]);
    return () => {
      trRef.current?.nodes([]);
    };
  }, [selectedId, selectedOverlayNodeId]);

  const hasVideoOrRotationShapes = shapes.some((s) => s.type === 'video' || s.type === 'imageRotation');
  useEffect(() => {
    if (!hasVideoOrRotationShapes) return;
    const layer = stageRef.current?.getLayers()[0];
    if (!layer) return;
    const anim = new Konva.Animation(() => {
      layer.batchDraw();
    }, layer);
    anim.start();
    return () => { anim.stop(); };
  }, [hasVideoOrRotationShapes]);

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
      setSelectedOverlayNodeId(null);
      setSelectedOverlayKey(null);
      if (layoutType !== 'full') {
        const stage = e.target.getStage();
        const pos = stage?.getPointerPosition();
        if (pos) {
          const scaleX = canvasDisplaySize.w / CANVAS_W;
          const scaleY = canvasDisplaySize.h / CANVAS_H;
          const canvasX = pos.x / scaleX;
          const n = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
          const w = CANVAS_W / n;
          const bi = Math.floor(canvasX / w);
          setSelectedBlockIndex(Math.max(0, Math.min(bi, n - 1)));
        }
      }
    }
  }, [layoutType, canvasDisplaySize.w]);

  const updateShape = useCallback((id: string, updates: Partial<Shape>) => {
    setShapes((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } as Shape : s)));
  }, []);

  const handleDragEnd = useCallback(
    (id: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateShape(id, { x: node.x(), y: node.y() });
    },
    [updateShape]
  );

  const handleTransformEnd = useCallback(
    (id: string) => (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      updateShape(id, {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY(),
        rotation: node.rotation(),
      });
      node.scaleX(1);
      node.scaleY(1);
    },
    [updateShape]
  );

  /** Daire kırpılmış resimde iç Rect sürüklendiğinde: konumu şekle yansıt, Rect'i (0,0) yap */
  const handleCircleImageDragEnd = useCallback(
    (shape: ImageShape) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateShape(shape.id, {
        x: shape.x + node.x(),
        y: shape.y + node.y(),
      });
      node.position({ x: 0, y: 0 });
    },
    [updateShape]
  );

  const handleResetSelectedBlock = useCallback(() => {
    if (layoutType === 'full') return;
    const blockIdx = selectedBlockIndex ?? (selectedId ? (() => {
      const s = shapes.find((x) => x.id === selectedId);
      return s ? shapeBlockIndex(s, layoutType) : null;
    })() : null);
    if (blockIdx == null) return;
    const n = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
    setShapes((prev) => prev.filter((s) => {
      if (s.type !== 'image' && s.type !== 'video' && s.type !== 'imageRotation') return true;
      return shapeBlockIndex(s, layoutType) !== blockIdx;
    }));
    setSelectedId(null);
  }, [layoutType, selectedBlockIndex, selectedId, shapes]);

  const addText = useCallback((initialText?: string) => {
    const newShape: TextShape = {
      id: generateId(),
      type: 'text',
      x: 80,
      y: 80,
      width: 200,
      height: 40,
      text: initialText ?? t('editor_new_text'),
      fontSize: 28,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'left',
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
  }, [t]);

  const addImage = useCallback((src: string) => {
    const width = 200;
    const height = 150;
    let x = 100, y = 100;
    if (layoutType !== 'full') {
      const blockCount = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
      const visualShapes = shapes.filter((s) => s.type === 'image' || s.type === 'video' || s.type === 'imageRotation');
      const countByBlock: Record<number, number> = {};
      visualShapes.forEach((s) => {
        const bi = shapeBlockIndex(s, layoutType);
        countByBlock[bi] = (countByBlock[bi] ?? 0) + 1;
      });
      const blocksWithContent = Object.keys(countByBlock).map(Number);
      const blockIndex = selectedBlockIndex != null ? Math.min(selectedBlockIndex, blockCount - 1) : blocksWithContent.length > 0 ? blocksWithContent.reduce((a, b) => (countByBlock[a]! >= (countByBlock[b] ?? 0) ? a : b)) : visualShapes.length % blockCount;
      const rect = getBlockRect(layoutType, blockIndex);
      const isOverlay = (countByBlock[blockIndex] ?? 0) > 0;
      if (isOverlay) {
        const shapesInBlock = visualShapes.filter((s) => shapeBlockIndex(s, layoutType) === blockIndex);
        const n = shapesInBlock.length;
        x = rect.x + 40 + n * 20;
        y = rect.y + 40 + n * 20;
      } else {
        x = rect.x + rect.width / 2 - width / 2;
        y = rect.y + rect.height / 2 - height / 2;
      }
    }
    const newShape: ImageShape = {
      id: generateId(),
      type: 'image',
      x,
      y,
      width,
      height,
      src,
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
    setShowLibrary(false);
  }, [layoutType, shapes, selectedBlockIndex]);

  const addVideo = useCallback((src: string) => {
    const width = 320;
    const height = 180;
    let x = 100, y = 100;
    if (layoutType !== 'full') {
      const blockCount = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
      const visualShapes = shapes.filter((s) => s.type === 'image' || s.type === 'video' || s.type === 'imageRotation');
      const countByBlock: Record<number, number> = {};
      visualShapes.forEach((s) => {
        const bi = shapeBlockIndex(s, layoutType);
        countByBlock[bi] = (countByBlock[bi] ?? 0) + 1;
      });
      const blocksWithContent = Object.keys(countByBlock).map(Number);
      const blockIndex = selectedBlockIndex != null ? Math.min(selectedBlockIndex, blockCount - 1) : blocksWithContent.length > 0 ? blocksWithContent.reduce((a, b) => (countByBlock[a]! >= (countByBlock[b] ?? 0) ? a : b)) : visualShapes.length % blockCount;
      const rect = getBlockRect(layoutType, blockIndex);
      const isOverlay = (countByBlock[blockIndex] ?? 0) > 0;
      if (isOverlay) {
        const shapesInBlock = visualShapes.filter((s) => shapeBlockIndex(s, layoutType) === blockIndex);
        const n = shapesInBlock.length;
        x = rect.x + 40 + n * 20;
        y = rect.y + 40 + n * 20;
      } else {
        x = rect.x + rect.width / 2 - width / 2;
        y = rect.y + rect.height / 2 - height / 2;
      }
    }
    const newShape: VideoShape = {
      id: generateId(),
      type: 'video',
      x,
      y,
      width,
      height,
      src,
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
    setShowLibrary(false);
  }, [layoutType, shapes, selectedBlockIndex]);

  const addImageRotation = useCallback((initialUrl?: string) => {
    const width = 200;
    const height = 150;
    let x = 100, y = 100;
    if (layoutType !== 'full') {
      const blockCount = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
      const visualShapes = shapes.filter((s) => s.type === 'image' || s.type === 'video' || s.type === 'imageRotation');
      const blockIndex = selectedBlockIndex != null ? Math.min(selectedBlockIndex, blockCount - 1) : visualShapes.length % blockCount;
      const rect = getBlockRect(layoutType, blockIndex);
      x = rect.x + rect.width / 2 - width / 2;
      y = rect.y + rect.height / 2 - height / 2;
    }
    const newShape: ImageRotationShape = {
      id: generateId(),
      type: 'imageRotation',
      x,
      y,
      width,
      height,
      urls: initialUrl ? [initialUrl] : [],
      durationSeconds: 5,
    };
    setShapes((prev) => [...prev, newShape]);
    setSelectedId(newShape.id);
    setShowLibrary(false);
  }, [layoutType, shapes, selectedBlockIndex]);

  const addImageToRotation = useCallback(
    (shapeId: string, url: string) => {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== shapeId || s.type !== 'imageRotation') return s;
          const overlays = s.overlayShapes ?? s.urls.map(() => []);
          return { ...s, urls: [...s.urls, url], overlayShapes: [...overlays, []] };
        })
      );
      setShowLibrary(false);
    },
    []
  );

  const removeImageFromRotation = useCallback((shapeId: string, index: number) => {
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId || s.type !== 'imageRotation') return s;
        const overlays = (s.overlayShapes ?? s.urls.map(() => [])).filter((_, i) => i !== index);
        return { ...s, urls: s.urls.filter((_, i) => i !== index), overlayShapes: overlays };
      })
    );
    if (selectedRotationSlot === index) setSelectedRotationSlot(null);
    else if (selectedRotationSlot !== null && selectedRotationSlot > index) setSelectedRotationSlot(selectedRotationSlot - 1);
  }, [selectedRotationSlot]);

  const overlayShapesFor = useCallback((shape: ImageRotationShape): (TextShape)[][] => {
    return shape.overlayShapes ?? shape.urls.map(() => []);
  }, []);

  const addOverlayToRotationSlot = useCallback((shapeId: string, slotIndex: number) => {
    const newText: TextShape = {
      id: generateId(),
      type: 'text',
      x: 20,
      y: 20,
      width: 160,
      height: 36,
      text: t('editor_new_text'),
      fontSize: 24,
      fontFamily: 'Arial',
      fill: '#ffffff',
      align: 'left',
    };
    setShapes((prev) =>
      prev.map((s) => {
        if (s.id !== shapeId || s.type !== 'imageRotation') return s;
        const overlays = overlayShapesFor(s);
        const slotOverlays = [...(overlays[slotIndex] ?? []), newText];
        const next = [...overlays];
        next[slotIndex] = slotOverlays;
        return { ...s, overlayShapes: next };
      })
    );
    setSelectedOverlayNodeId(`rotation-overlay-${shapeId}-${slotIndex}-${newText.id}`);
    setSelectedOverlayKey(`${shapeId}|${slotIndex}|${newText.id}`);
  }, [overlayShapesFor, t]);

  const updateRotationOverlay = useCallback(
    (shapeId: string, slotIndex: number, overlayId: string, updates: Partial<TextShape>) => {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== shapeId || s.type !== 'imageRotation') return s;
          const overlays = overlayShapesFor(s);
          const slotOverlays = (overlays[slotIndex] ?? []).map((t) => (t.id === overlayId ? { ...t, ...updates } : t));
          const next = [...overlays];
          next[slotIndex] = slotOverlays;
          return { ...s, overlayShapes: next };
        })
      );
    },
    [overlayShapesFor]
  );

  const handleRotationOverlayDragEnd = useCallback(
    (shapeId: string, slotIndex: number, overlayId: string) => (e: Konva.KonvaEventObject<DragEvent>) => {
      const node = e.target;
      updateRotationOverlay(shapeId, slotIndex, overlayId, { x: node.x(), y: node.y() });
    },
    [updateRotationOverlay]
  );

  const handleRotationOverlayTransformEnd = useCallback(
    (shapeId: string, slotIndex: number, overlayId: string) => (e: Konva.KonvaEventObject<Event>) => {
      const node = e.target;
      updateRotationOverlay(shapeId, slotIndex, overlayId, {
        x: node.x(),
        y: node.y(),
        width: node.width() * node.scaleX(),
        height: node.height() * node.scaleY(),
      });
      node.scaleX(1);
      node.scaleY(1);
    },
    [updateRotationOverlay]
  );

  const deleteRotationOverlay = useCallback(
    (shapeId: string, slotIndex: number, overlayId: string) => {
      setShapes((prev) =>
        prev.map((s) => {
          if (s.id !== shapeId || s.type !== 'imageRotation') return s;
          const overlays = overlayShapesFor(s);
          const next = [...overlays];
          next[slotIndex] = (overlays[slotIndex] ?? []).filter((t) => t.id !== overlayId);
          return { ...s, overlayShapes: next };
        })
      );
      setSelectedOverlayNodeId((prev) => (prev === `rotation-overlay-${shapeId}-${slotIndex}-${overlayId}` ? null : prev));
      setSelectedOverlayKey((prev) => (prev === `${shapeId}|${slotIndex}|${overlayId}` ? null : prev));
    },
    [overlayShapesFor]
  );

  const libraryFiltered = libraryCategoryFilter === 'all'
    ? libraryItems
    : libraryItems.filter((i) => (i.category || '') === libraryCategoryFilter);

  const pickFromLibrary = useCallback(
    (item: LibraryItem) => {
      if (openLibraryForRotation && selectedId && selectedShape?.type === 'imageRotation') {
        const url = item.url ? mediaUrl(item.url) : '';
        if (url && ['image', 'video', 'drink', 'icon', 'background'].includes(item.type)) {
          addImageToRotation(selectedId, url);
          setOpenLibraryForRotation(false);
        }
        setShowLibrary(false);
        return;
      }
      if (item.type === 'text' && (item.content || item.name)) {
        addText(item.content || item.name || '');
        setShowLibrary(false);
        return;
      }
      const url = item.url ? mediaUrl(item.url) : '';
      const hasGradient = item.gradient && item.type === 'background';
      const hasColor = item.color && (item.type === 'background' || item.type === 'icon');
      const isImage = ['image', 'drink', 'icon', 'background'].includes(item.type);
      if (hasGradient || hasColor) {
        const dataUrl = dataUrlForGradientOrColor(item.gradient, item.color);
        if (dataUrl) addImage(dataUrl);
      } else if (item.type === 'video' && url) {
        addVideo(url);
      } else if (isImage && url) {
        addImage(url);
      }
    },
    [openLibraryForRotation, selectedId, selectedShape, addText, addImage, addVideo, addImageToRotation]
  );

  const openLibrary = useCallback((initialFilter?: string) => {
    setShowLibrary(true);
    setLibraryItems([]);
    setLibraryCategories([]);
    setLibraryCategoryFilter(initialFilter ?? 'all');
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
        } else if (Array.isArray(itemsData)) flat = itemsData as LibraryItem[];
        setLibraryItems(flat);
        setLibraryCategories(Array.isArray(catsData) && catsData.length > 0 ? catsData : []);
      })
      .catch(() => setLibraryItems([]))
      .finally(() => setLibraryLoading(false));
  }, []);

  /** Kullanıcı rolü ve admin için kullanıcı listesi */
  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_user') || localStorage.getItem('user')) : null;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        if (user.role === 'super_admin' || user.role === 'admin') {
          apiClient('/users')
            .then((data: unknown) => setUsers(Array.isArray(data) ? data : []))
            .catch(() => {});
        }
    } catch {
      //
    }
    }
  }, []);

  /** Canvas'ı PNG olarak export et ve upload et — önizleme için URL döner */
  const exportAndUploadPreview = useCallback(async (): Promise<string | undefined> => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    const pixelRatio = Math.max(CANVAS_W / canvasDisplaySize.w, CANVAS_H / canvasDisplaySize.h);
    const dataUrl = stage.toDataURL({ pixelRatio: Math.max(2, pixelRatio), mimeType: 'image/png' });
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `preview-${Date.now()}.png`, { type: 'image/png' });
    const formData = new FormData();
    formData.append('files', file);
    const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
    if (!uploadRes.ok) return undefined;
    const data = await uploadRes.json();
    const src = data?.assets?.[0]?.src ?? data?.data?.[0]?.src;
    return typeof src === 'string' ? src : undefined;
  }, [canvasDisplaySize]);

  /** Kaydet: Benim şablonlarıma kaydet — TV yayını için (herkes). templateId varsa mevcut şablonu günceller, yoksa yeni oluşturur. */
  const save = useCallback(async () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes, backgroundColor, layoutType }));
      const previewUrl = await exportAndUploadPreview();
      if (templateId) {
        // "Bunu kullan" ile açıldıysa — mevcut şablonu güncelle (Benim şablonlarım)
        await apiClient(`/templates/${templateId}`, {
          method: 'PATCH',
          body: {
            canvas_design: { shapes, backgroundColor, layoutType },
            preview_image_url: previewUrl,
          },
        });
      } else {
        // Boş editörden — yeni şablon oluştur (Benim şablonlarım)
        const displayName = `Tasarım ${new Date().toLocaleDateString('tr-TR')}`;
        await apiClient('/templates/from-canvas', {
          method: 'POST',
          body: {
            display_name: displayName,
            shapes,
            backgroundColor,
            layoutType,
            scope: 'user',
            preview_image_url: previewUrl,
          },
        });
      }
      alert(t('editor_saved_to_my_templates'));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || t('editor_upload_failed'));
    }
  }, [shapes, backgroundColor, layoutType, templateId, exportAndUploadPreview]);

  /** Yükle: localStorage taslağından (yerel taslak) */
  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as { shapes?: Shape[]; backgroundColor?: string; layoutType?: string };
        if (Array.isArray(data.shapes)) setShapes(data.shapes);
        if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
        const validLayouts = ['full', '2block', '3block', '4block', '5block', '6block'] as const;
        if (data.layoutType && validLayouts.includes(data.layoutType as any)) {
          setLayoutType(data.layoutType as (typeof validLayouts)[number]);
        }
      }
    } catch {
      //
    }
  }, []);

  /** Farklı kaydet — Admin: sistem şablonu veya kullanıcı seçimi */
  const saveAsSubmit = useCallback(
    async (scope: 'system' | 'user', targetUserId?: string) => {
      const displayName = saveAsDisplayName.trim() || `Tasarım ${new Date().toLocaleDateString('tr-TR')}`;
      if (scope === 'user' && (userRole === 'super_admin' || userRole === 'admin') && targetUserId) {
        // Admin saves for specific user
      } else if (scope === 'system' && (userRole !== 'super_admin' && userRole !== 'admin')) {
        alert(t('editor_only_admin_system_template'));
        return;
      }
      try {
        setSaveAsLoading(true);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ shapes, backgroundColor, layoutType }));
        const previewUrl = await exportAndUploadPreview();
        await apiClient('/templates/from-canvas', {
          method: 'POST',
          body: {
            display_name: displayName,
            shapes,
            backgroundColor,
            layoutType,
            scope,
            target_user_id: scope === 'user' && targetUserId ? targetUserId : undefined,
            preview_image_url: previewUrl,
          },
        });
        setShowSaveAsModal(false);
        setSaveAsDisplayName('');
        setSaveAsSelectedUserId('');
        alert(scope === 'system' ? t('editor_saved_system') : t('editor_saved_template'));
      } catch (err: any) {
        console.error(err);
        alert(err?.message || t('editor_upload_failed'));
      } finally {
        setSaveAsLoading(false);
      }
    },
    [shapes, backgroundColor, layoutType, saveAsDisplayName, userRole, exportAndUploadPreview]
  );

  const exportPNG = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const pixelRatio = Math.max(CANVAS_W / canvasDisplaySize.w, CANVAS_H / canvasDisplaySize.h);
    const dataUrl = stage.toDataURL({ pixelRatio: Math.max(2, pixelRatio) });
    const link = document.createElement('a');
    link.download = t('editor_download_filename');
    link.href = dataUrl;
    link.click();
  }, [canvasDisplaySize]);

  const deleteSelected = useCallback(() => {
    if (selectedId) {
      setShapes((prev) => prev.filter((s) => s.id !== selectedId));
      setSelectedId(null);
    }
  }, [selectedId]);

  /** templateId varsa API'den şablon yükle, yoksa localStorage taslağından */
  useEffect(() => {
    if (templateId) {
      apiClient(`/templates/${templateId}`)
        .then((t: any) => {
          const cd = t?.canvas_design;
          if (cd && typeof cd === 'object') {
            if (Array.isArray(cd.shapes)) setShapes(cd.shapes);
            if (cd.backgroundColor) setBackgroundColor(cd.backgroundColor);
            const validLayouts = ['full', '2block', '3block', '4block', '5block', '6block'] as const;
            if (cd.layoutType && validLayouts.includes(cd.layoutType)) {
              setLayoutType(cd.layoutType);
            }
          }
        })
        .catch(() => load());
    } else {
    load();
    }
  }, [templateId]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'google-fonts-canvas-editor';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${GOOGLE_FONT_FAMILIES.map((f) => `family=${f}`).join('&')}&display=swap`;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, []);

  const toggleFontStyle = useCallback(
    (style: 'bold' | 'italic') => {
      if (!selectedShape || selectedShape.type !== 'text') return;
      const current = selectedShape.fontStyle ?? '';
      const hasBold = current.includes('bold');
      const hasItalic = current.includes('italic');
      let next: string;
      if (style === 'bold') {
        next = hasItalic ? (hasBold ? 'italic' : 'bold italic') : hasBold ? '' : 'bold';
      } else {
        next = hasBold ? (hasItalic ? 'bold' : 'bold italic') : hasItalic ? '' : 'italic';
      }
      updateShape(selectedShape.id, { fontStyle: next || undefined });
    },
    [selectedShape, updateShape]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file?.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) addImage(dataUrl);
      };
      reader.onerror = () => alert(t('editor_image_read_error'));
      reader.readAsDataURL(file);
    },
    [addImage]
  );

  const handleRotationFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file?.type.startsWith('image/') || !selectedShape || selectedShape.type !== 'imageRotation') return;
      const shapeId = selectedShape.id;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        if (dataUrl) addImageToRotation(shapeId, dataUrl);
      };
      reader.onerror = () => alert(t('editor_image_read_error'));
      reader.readAsDataURL(file);
    },
    [addImageToRotation, selectedShape]
  );

  return (
    <>
      {/* File input'lar body'de — hiçbir overlay engelleyemez */}
      {typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden
              style={{ position: 'fixed', left: -99999, top: 0, width: 1, height: 1, opacity: 0 }}
              onChange={handleFileSelect}
            />
            <input
              ref={rotationFileInputRef}
              type="file"
              accept="image/*"
              tabIndex={-1}
              aria-hidden
              style={{ position: 'fixed', left: -99998, top: 0, width: 1, height: 1, opacity: 0 }}
              onChange={handleRotationFileSelect}
            />
          </>,
          document.body
        )}
      {/* Farklı kaydet modal — Admin: sistem şablonu veya kullanıcı seçimi */}
      {showSaveAsModal &&
        typeof document !== 'undefined' &&
        document.body &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => !saveAsLoading && setShowSaveAsModal(false)}>
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-4" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-slate-800 mb-3">{t('editor_save_as_title')}</h3>
              <input
                type="text"
                value={saveAsDisplayName}
                onChange={(e) => setSaveAsDisplayName(e.target.value)}
                placeholder={t('editor_template_name_placeholder')}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm mb-4"
                disabled={saveAsLoading}
              />
              <div className="space-y-2 mb-4">
                <button
                  type="button"
                  disabled={saveAsLoading}
                  onClick={() => saveAsSubmit('system')}
                  className="w-full py-2 px-3 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('editor_save_to_system_btn')}
                </button>
                <p className="text-xs text-slate-500">{t('editor_save_as_user_hint')}</p>
                <div className="border-t border-slate-200 pt-3 mt-3">
                  <label className="block text-sm font-medium text-slate-700 mb-2">{t('editor_user_selection')}</label>
                  <select
                    value={saveAsSelectedUserId}
                    onChange={(e) => setSaveAsSelectedUserId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-slate-800 text-sm mb-2"
                    disabled={saveAsLoading}
                  >
                    <option value="">{t('editor_select_user_placeholder')}</option>
                    {users.filter((u) => u.business_name).map((u) => (
                      <option key={u.id} value={u.id}>{u.business_name || u.email} — {u.email}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={saveAsLoading || !saveAsSelectedUserId}
                    onClick={() => saveAsSubmit('user', saveAsSelectedUserId)}
                    className="w-full py-2 px-3 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('editor_save_to_user_btn')}
                  </button>
                  <p className="text-xs text-slate-500 mt-1">{t('editor_save_to_user_hint')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !saveAsLoading && setShowSaveAsModal(false)}
                className="w-full py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
              >
                {t('editor_cancel')}
              </button>
            </div>
          </div>,
          document.body
        )}
      <div className="flex flex-col gap-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Sol: Kaydet/Yükle/PNG + Ekle / Arka plan — açılıp kapatılabilir (Seçili öğe düzenleme ekranının altında) */}
        {sidebarOpen && (
        <div className="lg:w-64 flex-shrink-0 space-y-3 overflow-y-auto max-h-[calc(100vh-10rem)] relative z-[50] bg-transparent">
          <div className="rounded-lg border border-slate-200 bg-white p-3 flex flex-wrap gap-2 items-center">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50 shrink-0 flex items-center justify-center"
              title={t('editor_panel_close')}
              aria-label={t('editor_panel_close')}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
            </button>
            <button type="button" onClick={save} className="py-1.5 px-3 rounded-lg bg-slate-800 text-white text-xs font-medium hover:bg-slate-700">
              {t('editor_save')}
            </button>
            {(userRole === 'super_admin' || userRole === 'admin') ? (
              <button type="button" onClick={() => setShowSaveAsModal(true)} className="py-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 text-xs hover:bg-slate-100">
                {t('editor_save_as')}
            </button>
            ) : null}
            <button type="button" onClick={exportPNG} className="py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700">
              {t('editor_png_download')}
            </button>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="font-semibold text-slate-800 mb-2">{t('editor_add_section')}</h3>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => addText()}
                className="py-2 px-4 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
              >
                {t('editor_add_text_btn')}
              </button>
              <button
                type="button"
                onClick={() => openLibrary()}
                className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
              >
                + {t('editor_image_library')}
              </button>
              <button
                type="button"
                onClick={() => openLibrary('icon')}
                className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100 flex items-center gap-1.5"
                title={t('editor_icon_add_title')}
              >
                <span aria-hidden>◇</span>
                + {t('editor_icon_symbol')}
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-2 px-4 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
              >
                + {t('editor_image_file')}
              </button>
              <button
                type="button"
                onClick={() => addImageRotation()}
                className="py-2 px-4 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-100"
              >
                + {t('editor_image_carousel')}
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="font-semibold text-slate-800 mb-2">{t('editor_background')}</h3>
            <input
              type="color"
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="w-full h-10 rounded border border-slate-200 cursor-pointer"
            />
          </div>
        </div>
        )}

        {/* Sol panel kapalıyken hamburger ile açma */}
        {!sidebarOpen && (
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="fixed left-2 top-24 z-50 flex items-center justify-center w-10 h-10 rounded-r-lg bg-slate-700 text-white shadow-lg hover:bg-slate-600 transition-colors"
            title={t('editor_panel_open')}
            aria-label={t('editor_panel_open')}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden><path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
          </button>
        )}

        {/* Orta: Canvas (16:9 TV oranı, responsive) */}
        <div className="flex-1 min-w-0 flex flex-col items-center overflow-auto bg-slate-100 rounded-xl p-4">
          {/* Ön izleme üstü: hamburger menü — şablon & blok seçimleri */}
          <div className="w-full max-w-[900px] flex items-center justify-between mb-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowTemplateMenu((v) => !v)}
                className="flex items-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 shadow-sm"
                aria-expanded={showTemplateMenu}
                aria-haspopup="true"
              >
                <span className="text-lg leading-none" aria-hidden>☰</span>
                <span>{t('editor_template_and_block')}</span>
              </button>
              {showTemplateMenu && (
                <>
                  <div className="fixed inset-0 z-10" aria-hidden onClick={() => setShowTemplateMenu(false)} />
                  <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[200px]">
                    <p className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('editor_template_and_layout')}</p>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('full'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === 'full' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_canvas_single_block')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('2block'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === '2block' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_blocks_horizontal', { n: 2 })}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('3block'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === '3block' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_blocks_horizontal', { n: 3 })}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('4block'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === '4block' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_blocks_horizontal', { n: 4 })}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('5block'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === '5block' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_blocks_horizontal', { n: 5 })}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setLayoutType('6block'); setShowTemplateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm ${layoutType === '6block' ? 'bg-slate-100 text-slate-800 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                    >
                      {t('editor_blocks_horizontal', { n: 6 })}
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              {layoutType !== 'full' && (selectedBlockIndex != null || selectedId) && (
                <button
                  type="button"
                  onClick={handleResetSelectedBlock}
                  className="py-1.5 px-3 rounded-lg border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-100"
                >
                  ↺ {t('editor_reset_selected_block')}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="py-1.5 px-3 rounded-lg bg-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-300"
              >
                {t('editor_show_preview')}
              </button>
              <button
                type="button"
                onClick={() => setShowFullScreenPreview(true)}
                className="py-1.5 px-3 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 flex items-center gap-1.5"
              >
                <span>🖥️</span>
                <span>{t('editor_fullscreen')}</span>
              </button>
            </div>
          </div>

          {/* TV çerçevesi (bezel) ile ön izleme — büyütülmüş düzenleme ekranı */}
          <div className="w-full max-w-[820px] p-4 bg-slate-800 rounded-2xl shadow-xl border-4 border-slate-700">
            <div className="rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-900/50">
              <div
                ref={canvasWrapRef}
                className="relative"
                style={{
                  width: '100%',
                  maxWidth: 760,
                  aspectRatio: '16/9',
                  background: backgroundColor,
                  overflow: 'hidden',
                }}
              >
                <Stage
              ref={stageRef}
              width={canvasDisplaySize.w}
              height={canvasDisplaySize.h}
              onClick={handleStageClick}
              onTap={handleStageClick}
            >
              <Layer>
                <Group scaleX={canvasDisplaySize.w / CANVAS_W} scaleY={canvasDisplaySize.h / CANVAS_H}>
              {shapes.map((shape) => {
                if (shape.type === 'text') {
                  const displayText = shape.icon
                    ? (shape.iconPosition === 'after' ? `${shape.text} ${shape.icon}` : `${shape.icon} ${shape.text}`)
                    : shape.text;
                  return (
                    <Text
                      key={shape.id}
                      id={shape.id}
                      x={shape.x}
                      y={shape.y}
                      width={shape.width}
                      height={shape.height}
                      text={displayText}
                      fontSize={shape.fontSize}
                      fontFamily={shape.fontFamily}
                      fill={shape.fill}
                      align={shape.align}
                      fontStyle={shape.fontStyle}
                      textDecoration={shape.textDecoration}
                      draggable
                      onClick={() => setSelectedId(shape.id)}
                      onTap={() => setSelectedId(shape.id)}
                      onDragEnd={handleDragEnd(shape.id)}
                      onTransformEnd={handleTransformEnd(shape.id)}
                    />
                  );
                }
                if (shape.type === 'video') {
                  return (
                    <VideoNode
                      key={shape.id}
                      shape={shape}
                      onSelect={() => setSelectedId(shape.id)}
                      onDragEnd={handleDragEnd(shape.id)}
                      onTransformEnd={handleTransformEnd(shape.id)}
                    />
                  );
                }
                if (shape.type === 'imageRotation') {
                  const isThisSelected = selectedId === shape.id;
                  const slot = selectedRotationSlot;
                  const overlays = overlayShapesFor(shape);
                  const inSingleSlotMode = isThisSelected && slot !== null && slot < shape.urls.length;
                  if (inSingleSlotMode) {
                    return (
                      <ImageRotationSingleSlotNode
                        key={shape.id}
                        shape={shape}
                        slotIndex={slot}
                        slotOverlays={overlays[slot] ?? []}
                        onSelectShape={() => setSelectedId(shape.id)}
                        onSelectOverlay={(overlayId) => {
                          setSelectedOverlayNodeId(`rotation-overlay-${shape.id}-${slot}-${overlayId}`);
                          setSelectedOverlayKey(`${shape.id}|${slot}|${overlayId}`);
                        }}
                        onShapeDragEnd={(e) => {
                          const node = e.target;
                          updateShape(shape.id, { x: node.x(), y: node.y() });
                        }}
                        onOverlayDragEnd={(overlayId) => handleRotationOverlayDragEnd(shape.id, slot, overlayId)}
                        onOverlayTransformEnd={(overlayId) => handleRotationOverlayTransformEnd(shape.id, slot, overlayId)}
                      />
                    );
                  }
                  return (
                    <ImageRotationNode
                      key={shape.id}
                      shape={shape}
                      onSelect={() => setSelectedId(shape.id)}
                      onDragEnd={handleDragEnd(shape.id)}
                      onTransformEnd={handleTransformEnd(shape.id)}
                    />
                  );
                }
                return (
                  <ImageNode
                    key={shape.id}
                    shape={shape}
                    isSelected={selectedId === shape.id}
                    onSelect={() => setSelectedId(shape.id)}
                    onDragEnd={handleDragEnd(shape.id)}
                    onTransformEnd={handleTransformEnd(shape.id)}
                    onCircleInnerDragEnd={shape.clipShape === 'circle' ? handleCircleImageDragEnd(shape) : undefined}
                  />
                );
              })}
                  <Transformer
                    ref={trRef}
                    boundBoxFunc={
                      selectedShape?.type === 'image' && (selectedShape.clipShape ?? 'rect') === 'circle'
                        ? (_oldBox, newBox) => {
                            const s = Math.max(10, Math.min(newBox.width, newBox.height));
                            const cx = newBox.x + newBox.width / 2;
                            const cy = newBox.y + newBox.height / 2;
                            return { x: cx - s / 2, y: cy - s / 2, width: s, height: s, rotation: newBox.rotation };
                          }
                        : undefined
                    }
                  />
                </Group>
              </Layer>
            </Stage>
            {/* Blok numara etiketleri — tıklanarak blok seçilir */}
            {layoutType !== 'full' && (() => {
              const n = layoutType === '2block' ? 2 : layoutType === '3block' ? 3 : layoutType === '4block' ? 4 : layoutType === '5block' ? 5 : layoutType === '6block' ? 6 : 1;
              return (
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                  {Array.from({ length: n }, (_, i) => (
                    <div
                      key={i}
                      className={`absolute bottom-2 z-20 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded cursor-pointer pointer-events-auto hover:bg-black/90 ${selectedBlockIndex === i ? 'ring-2 ring-blue-400' : ''}`}
                      style={{ left: `calc(${(i / n) * 100}% + 8px)`, bottom: '8px' }}
                      onClick={(e) => { e.stopPropagation(); setSelectedBlockIndex(i); }}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              );
            })()}
            {/* Blok rehber çizgileri (PNG dışa aktarmada görünmez) */}
            {layoutType !== 'full' && (
              <div className="absolute inset-0 pointer-events-none flex" aria-hidden>
                {layoutType === '2block' && (
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                )}
                {layoutType === '3block' && (
                  <>
                    <div className="absolute top-0 bottom-0 left-1/3 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-2/3 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                  </>
                )}
                {layoutType === '4block' && (
                  <>
                    <div className="absolute top-0 bottom-0 left-1/4 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-3/4 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                  </>
                )}
                {layoutType === '5block' && (
                  <>
                    <div className="absolute top-0 bottom-0 left-[20%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-[40%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-[60%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-[80%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                  </>
                )}
                {layoutType === '6block' && (
                  <>
                    <div className="absolute top-0 bottom-0 left-[16.67%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-1/3 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-2/3 w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                    <div className="absolute top-0 bottom-0 left-[83.33%] w-0.5 -translate-x-px bg-white/50" style={{ width: 2 }} />
                  </>
                )}
              </div>
            )}
          </div>
            </div>
          </div>

          {/* Seçili öğe — düzenleme ekranının altında (metin vb. seçilince görünür) */}
          {selectedShape && (
            <div className="w-full max-w-[820px] mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <h3 className="font-semibold text-slate-800 text-sm mb-1.5">{t('editor_selected_item')}</h3>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <button
                  type="button"
                  onClick={() => selectedShape && navigator.clipboard?.writeText(JSON.stringify(selectedShape)).then(() => {})}
                  className="py-1 px-2 rounded border border-slate-200 text-slate-600 text-[11px] hover:bg-slate-50"
                >
                  {t('editor_copy_style')}
                </button>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="py-1 px-2 rounded bg-red-100 text-red-700 text-[11px] hover:bg-red-200"
                >
                  {t('editor_delete')}
                </button>
              </div>
              {selectedShape.type === 'text' && (
                <>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_font_type')}</label>
                  <select
                    value={selectedShape.fontFamily}
                    onChange={(e) => updateShape(selectedShape.id, { fontFamily: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs mb-1.5"
                  >
                    {!FONT_OPTIONS.includes(selectedShape.fontFamily) && (
                      <option value={selectedShape.fontFamily}>{selectedShape.fontFamily}</option>
                    )}
                    {FONT_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label}>
                        {group.fonts.map((f) => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <div className="flex gap-1 mb-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => toggleFontStyle('bold')}
                      className={`w-6 h-6 rounded border text-xs font-bold ${(selectedShape.fontStyle ?? '').includes('bold') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      title={t('editor_bold')}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFontStyle('italic')}
                      className={`w-6 h-6 rounded border text-xs italic ${(selectedShape.fontStyle ?? '').includes('italic') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      title={t('editor_italic')}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = selectedShape.textDecoration === 'underline' ? undefined : 'underline';
                        updateShape(selectedShape.id, { textDecoration: next });
                      }}
                      className={`w-6 h-6 rounded border text-xs underline ${selectedShape.textDecoration === 'underline' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      title={t('editor_underline')}
                    >
                      U
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = selectedShape.textDecoration === 'line-through' ? undefined : 'line-through';
                        updateShape(selectedShape.id, { textDecoration: next });
                      }}
                      className={`w-6 h-6 rounded border text-xs line-through ${selectedShape.textDecoration === 'line-through' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                      title={t('editor_strikethrough')}
                    >
                      S
                    </button>
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_icon_symbol')}</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {TEXT_ICON_OPTIONS.map((emoji) => (
                      <button
                        key={emoji || 'none'}
                        type="button"
                        onClick={() => updateShape(selectedShape.id, { icon: emoji || undefined })}
                        className={`w-6 h-6 rounded border text-sm flex items-center justify-center transition-colors ${
                          (selectedShape.icon || '') === (emoji || '') ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                        title={emoji || t('editor_icon_delete')}
                      >
                        {emoji || '✕'}
                      </button>
                    ))}
                  </div>
                  {selectedShape.icon && (
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-xs text-slate-500">{t('editor_position_label')}:</label>
                      <select
                        value={selectedShape.iconPosition || 'before'}
                        onChange={(e) => updateShape(selectedShape.id, { iconPosition: e.target.value as 'before' | 'after' })}
                        className="rounded border border-slate-200 px-2 py-1 text-xs"
                      >
                        <option value="before">{t('editor_icon_before')}</option>
                        <option value="after">{t('editor_icon_after')}</option>
                      </select>
                    </div>
                  )}
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_text_content')}</label>
                  <input
                    type="text"
                    value={selectedShape.text}
                    onChange={(e) => updateShape(selectedShape.id, { text: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs mb-1.5"
                    placeholder={t('editor_text_default')}
                  />
                  <div className="flex gap-2 items-center mb-1.5">
                    <label className="text-[11px] text-slate-500">{t('editor_size')}</label>
                    <input
                      type="number"
                      min={8}
                      max={120}
                      value={selectedShape.fontSize}
                      onChange={(e) => updateShape(selectedShape.id, { fontSize: Number(e.target.value) || 24 })}
                      className="w-12 rounded border border-slate-200 px-2 py-0.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2 items-center mb-1.5">
                    <label className="text-[11px] text-slate-500">{t('editor_color')}</label>
                    <input
                      type="color"
                      value={selectedShape.fill}
                      onChange={(e) => updateShape(selectedShape.id, { fill: e.target.value })}
                      className="w-8 h-6 rounded border border-slate-200 cursor-pointer"
                    />
                  </div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_alignment')}</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((align) => (
                      <button
                        key={align}
                        type="button"
                        onClick={() => updateShape(selectedShape.id, { align })}
                        className={`flex-1 py-1 rounded text-[11px] ${selectedShape.align === align ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                      >
                        {align === 'left' ? t('editor_align_left') : align === 'center' ? t('editor_align_center') : t('editor_align_right')}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {(selectedShape.type === 'image' || selectedShape.type === 'video') && (
                <>
                  <label className="block text-[11px] text-slate-500 mb-0.5">{t('editor_opacity')}</label>
                  <div className="flex items-center gap-2 mb-1.5">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedShape.opacity ?? 1}
                    onChange={(e) => updateShape(selectedShape.id, { opacity: Number(e.target.value) })}
                      className="flex-1 max-w-[120px]"
                  />
                    <span className="text-[11px] text-slate-500 w-8">{Math.round((selectedShape.opacity ?? 1) * 100)}%</span>
                  </div>
                  {selectedShape.type === 'image' && (
                    <>
                      <label className="block text-[11px] text-slate-500 mt-1.5 mb-0.5">{t('editor_shape')}</label>
                      <div className="flex gap-1">
                        {(['rect', 'circle'] as const).map((clip) => (
                          <button
                            key={clip}
                            type="button"
                            onClick={() => updateShape(selectedShape.id, { clipShape: clip })}
                            className={`flex-1 py-1.5 rounded text-[11px] font-medium border-2 flex items-center justify-center gap-0.5 ${
                              (selectedShape.clipShape ?? 'rect') === clip
                                ? 'border-slate-800 bg-slate-800 text-white'
                                : 'border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                            title={clip === 'rect' ? t('editor_rect') : t('editor_circle')}
                          >
                            {clip === 'rect' ? `▭ ${t('editor_rect')}` : `○ ${t('editor_circle')}`}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {selectedShape.type === 'video' && (
                    <p className="text-xs text-slate-500 mt-1">{t('editor_video_loop_canvas')}</p>
                  )}
                </>
              )}
              {selectedShape.type === 'image' && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <h4 className="text-xs font-medium text-slate-700 mb-2">{t('editor_make_bg_transparent')}</h4>

                  {/* AI: Nesneyi bırak, etrafı sil (hamburger vb.) */}
                  <p className="text-xs text-slate-500 mb-2">{t('editor_make_transparent_desc')}</p>
                  {removeBgAiError && (
                    <p className="text-xs text-red-600 mb-2">{removeBgAiError}</p>
                  )}
                  <button
                    type="button"
                    disabled={removeBgAiLoading || removeBgLoading}
                    onClick={async () => {
                      if (selectedShape.type !== 'image') return;
                      setRemoveBgAiLoading(true);
                      setRemoveBgAiError(null);
                      try {
                        const dataUrl = await removeBackgroundAi(selectedShape.src);
                        updateShape(selectedShape.id, { src: dataUrl });
                      } catch (err) {
                        setRemoveBgAiError(err instanceof Error ? err.message : t('editor_operation_failed'));
                      } finally {
                        setRemoveBgAiLoading(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:pointer-events-none mb-3"
                  >
                    {removeBgAiLoading ? t('editor_processing') : t('editor_remove_bg_ai')}
                  </button>

                  {/* Renk saydam: tek renk (beyaz vb.) */}
                  <p className="text-xs text-slate-500 mb-2">{t('editor_or_make_color_transparent')}</p>
                  <div className="flex gap-2 items-center mb-2">
                    <label className="text-xs text-slate-500 shrink-0">{t('editor_color')}</label>
                    <input
                      type="color"
                      value={removeBgColor}
                      onChange={(e) => { setRemoveBgColor(e.target.value); setRemoveBgError(null); }}
                      className="h-8 w-14 rounded border border-slate-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={removeBgColor}
                      onChange={(e) => { setRemoveBgColor(e.target.value); setRemoveBgError(null); }}
                      className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                    />
                  </div>
                  <div className="flex gap-2 items-center mb-2">
                    <label className="text-xs text-slate-500 shrink-0">{t('editor_tolerance')}</label>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      value={removeBgTolerance}
                      onChange={(e) => { setRemoveBgTolerance(Number(e.target.value)); setRemoveBgError(null); }}
                      className="flex-1"
                    />
                    <span className="text-xs text-slate-500 w-6">{removeBgTolerance}</span>
                  </div>
                  {removeBgError && (
                    <p className="text-xs text-red-600 mb-2">{removeBgError}</p>
                  )}
                  <button
                    type="button"
                    disabled={removeBgLoading || removeBgAiLoading}
                    onClick={async () => {
                      if (selectedShape.type !== 'image') return;
                      setRemoveBgLoading(true);
                      setRemoveBgError(null);
                      try {
                        const dataUrl = await makeColorTransparent(selectedShape.src, removeBgColor, removeBgTolerance, t);
                        updateShape(selectedShape.id, { src: dataUrl });
                      } catch (err) {
                        setRemoveBgError(err instanceof Error ? err.message : t('editor_save_error'));
                      } finally {
                        setRemoveBgLoading(false);
                      }
                    }}
                    className="w-full py-2 px-3 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {removeBgLoading ? t('editor_processing') : t('editor_make_color_transparent')}
                  </button>
                </div>
              )}
              {selectedShape.type === 'imageRotation' && (
                <>
                  <p className="text-xs text-slate-600 font-medium mb-1">{t('editor_image_carousel')}</p>
                  <label className="block text-xs text-slate-500 mb-1">{t('editor_first_image_duration')}</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={selectedShape.durationSeconds ?? 5}
                    onChange={(e) => updateShape(selectedShape.id, { durationSeconds: Math.max(1, Number(e.target.value) || 5) })}
                    className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm mb-2"
                  />
                  <p className="text-xs text-slate-600 mb-1">{t('editor_click_image_to_edit_in_preview')}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {selectedShape.urls.map((url, i) => (
                      <div key={i} className="relative group">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRotationSlot(i);
                            setSelectedOverlayNodeId(null);
                            setSelectedOverlayKey(null);
                          }}
                          className={`block w-10 h-10 rounded border-2 object-cover overflow-hidden p-0 ${selectedRotationSlot === i ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-200 hover:border-slate-400'}`}
                        >
                          <img src={mediaUrl(url)} alt="" className="w-full h-full object-cover pointer-events-none" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImageFromRotation(selectedShape.id, i); }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs leading-none opacity-0 group-hover:opacity-100"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{t('editor_add_image_label')}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setOpenLibraryForRotation(true); openLibrary(); }}
                      className="flex-1 py-1.5 px-2 rounded border border-slate-200 text-slate-600 text-xs hover:bg-slate-50"
                    >
                      {t('editor_library_btn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => rotationFileInputRef.current?.click()}
                      className="flex-1 py-1.5 px-2 rounded bg-slate-100 text-slate-600 text-xs hover:bg-slate-200"
                    >
                      {t('editor_file_btn')}
                    </button>
                  </div>
                  {selectedShape.urls.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">{t('editor_add_at_least_one_rotation_hint')}</p>
                  )}
                  {selectedRotationSlot !== null && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => addOverlayToRotationSlot(selectedShape.id, selectedRotationSlot)}
                        className="w-full py-2 px-3 rounded-lg bg-slate-800 text-white text-sm font-medium hover:bg-slate-700"
                      >
                        Bu slota metin ekle
                      </button>
                    </div>
                  )}
                  {selectedOverlayKey && (() => {
                    const parts = selectedOverlayKey.split('|');
                    const shapeId = parts[0];
                    const slotIndex = parseInt(parts[1], 10);
                    const overlayId = parts[2];
                    const shape = shapes.find((s) => s.id === shapeId);
                    if (!shape || shape.type !== 'imageRotation') return null;
                    const overlays = overlayShapesFor(shape);
                    const overlay = (overlays[slotIndex] ?? []).find((t) => t.id === overlayId);
                    if (!overlay) return null;
                    return (
                      <div className="mt-2 pt-2 border-t border-slate-200 space-y-2">
                        <p className="text-xs font-medium text-slate-700">Slottaki metin</p>
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => updateRotationOverlay(shapeId, slotIndex, overlayId, { text: e.target.value })}
                          className="w-full rounded border border-slate-200 px-2 py-1.5 text-sm"
                          placeholder={t('editor_text_default')}
                        />
                        <div className="flex gap-1 flex-wrap">
                          <select
                            value={overlay.fontFamily}
                            onChange={(e) => updateRotationOverlay(shapeId, slotIndex, overlayId, { fontFamily: e.target.value })}
                            className="flex-1 min-w-0 rounded border border-slate-200 px-2 py-1 text-sm"
                          >
                            {!FONT_OPTIONS.includes(overlay.fontFamily) && (
                              <option value={overlay.fontFamily}>{overlay.fontFamily}</option>
                            )}
                            {FONT_GROUPS.map((group) => (
                              <optgroup key={group.label} label={group.label}>
                                {group.fonts.map((f) => (
                                  <option key={f} value={f}>{f}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                          <input
                            type="number"
                            min={8}
                            max={120}
                            value={overlay.fontSize}
                            onChange={(e) => updateRotationOverlay(shapeId, slotIndex, overlayId, { fontSize: Number(e.target.value) || 24 })}
                            className="w-14 rounded border border-slate-200 px-2 py-1 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = overlay.textDecoration === 'underline' ? undefined : 'underline';
                              updateRotationOverlay(shapeId, slotIndex, overlayId, { textDecoration: next });
                            }}
                            className={`w-8 h-8 rounded border text-xs font-bold underline ${overlay.textDecoration === 'underline' ? 'bg-slate-800 text-white' : 'border-slate-200'}`}
                            title={t('editor_underline')}
                          >
                            U
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">İkon</label>
                          <div className="flex flex-wrap gap-1">
                            {TEXT_ICON_OPTIONS.slice(0, 20).map((emoji) => (
                              <button
                                key={emoji || 'none'}
                                type="button"
                                onClick={() => updateRotationOverlay(shapeId, slotIndex, overlayId, { icon: emoji || undefined })}
                                className={`w-7 h-7 rounded border text-base flex items-center justify-center ${
                                  (overlay.icon || '') === (emoji || '') ? 'bg-slate-800 text-white' : 'border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {emoji || '✕'}
                              </button>
                            ))}
                          </div>
                          {overlay.icon && (
                            <select
                              value={overlay.iconPosition || 'before'}
                              onChange={(e) => updateRotationOverlay(shapeId, slotIndex, overlayId, { iconPosition: e.target.value as 'before' | 'after' })}
                              className="mt-1 rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                              <option value="before">Önce</option>
                              <option value="after">Sonra</option>
                            </select>
                          )}
                        </div>
                        <input
                          type="color"
                          value={overlay.fill}
                          onChange={(e) => updateRotationOverlay(shapeId, slotIndex, overlayId, { fill: e.target.value })}
                          className="w-full h-8 rounded border border-slate-200 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => deleteRotationOverlay(shapeId, slotIndex, overlayId)}
                          className="w-full py-1.5 rounded bg-red-100 text-red-700 text-xs hover:bg-red-200"
                        >
                          {t('editor_delete_text')}
                        </button>
                      </div>
                    );
                  })()}
                  <label className="block text-xs text-slate-500 mt-2 mb-1">{t('editor_opacity')}</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedShape.opacity ?? 1}
                    onChange={(e) => updateShape(selectedShape.id, { opacity: Number(e.target.value) })}
                    className="w-full"
                  />
                </>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Tam ekran önizleme */}
      {showFullScreenPreview && (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center" onClick={() => setShowFullScreenPreview(false)}>
          <div className="w-full h-full flex items-center justify-center p-0" onClick={(e) => e.stopPropagation()}>
            <div ref={previewWrapRef} className="relative w-full" style={{ aspectRatio: '16/9', maxHeight: '100vh', background: backgroundColor }}>
              <Stage width={previewDisplaySize.w} height={previewDisplaySize.h}>
                <Layer>
                  <Group scaleX={previewDisplaySize.w / CANVAS_W} scaleY={previewDisplaySize.h / CANVAS_H}>
                    <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={backgroundColor} listening={false} />
                    {shapes.map((shape) => {
                      if (shape.type === 'text') {
                        const prevDisplayText = shape.icon ? (shape.iconPosition === 'after' ? `${shape.text} ${shape.icon}` : `${shape.icon} ${shape.text}`) : shape.text;
                        return <Text key={shape.id} x={shape.x} y={shape.y} width={shape.width} height={shape.height} text={prevDisplayText} fontSize={shape.fontSize} fontFamily={shape.fontFamily} fill={shape.fill} align={shape.align} fontStyle={shape.fontStyle} textDecoration={shape.textDecoration} listening={false} />;
                      }
                      if (shape.type === 'video') return <VideoNode key={shape.id} shape={shape} onSelect={() => {}} onDragEnd={() => {}} onTransformEnd={() => {}} />;
                      if (shape.type === 'imageRotation') return <ImageRotationNode key={shape.id} shape={shape} draggable={false} onSelect={() => {}} onDragEnd={() => {}} onTransformEnd={() => {}} />;
                      return <ImageNode key={shape.id} shape={shape} isSelected={false} onSelect={() => {}} onDragEnd={() => {}} onTransformEnd={() => {}} onCircleInnerDragEnd={undefined} draggable={false} />;
                    })}
                  </Group>
                </Layer>
              </Stage>
            </div>
          </div>
          <button type="button" onClick={() => setShowFullScreenPreview(false)} className="absolute top-4 right-4 py-2 px-4 rounded-lg bg-white/90 text-slate-800 font-medium hover:bg-white z-10">Kapat</button>
        </div>
      )}

      {/* Büyük önizleme modalı — canlı Konva Stage (döngüdeki resimler döner) */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setShowPreviewModal(false)}>
          <div className="relative flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 bg-slate-800 rounded-3xl shadow-2xl border-8 border-slate-700 max-w-[95vw] max-h-[95vh] flex items-center justify-center">
              <div className="rounded-xl overflow-hidden border-4 border-slate-600 bg-slate-900/50">
                <div
                  ref={previewWrapRef}
                  className="relative"
                  style={{
                    width: '100%',
                    maxWidth: 800,
                    aspectRatio: '16/9',
                    background: backgroundColor,
                  }}
                >
                  <Stage width={previewDisplaySize.w} height={previewDisplaySize.h}>
                    <Layer>
                      <Group scaleX={previewDisplaySize.w / CANVAS_W} scaleY={previewDisplaySize.h / CANVAS_H}>
                        <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={backgroundColor} listening={false} />
                        {shapes.map((shape) => {
                          if (shape.type === 'text') {
                            const prevDisplayText = shape.icon
                              ? (shape.iconPosition === 'after' ? `${shape.text} ${shape.icon}` : `${shape.icon} ${shape.text}`)
                              : shape.text;
                            return (
                              <Text
                                key={shape.id}
                                x={shape.x}
                                y={shape.y}
                                width={shape.width}
                                height={shape.height}
                                text={prevDisplayText}
                                fontSize={shape.fontSize}
                                fontFamily={shape.fontFamily}
                                fill={shape.fill}
                                align={shape.align}
                                fontStyle={shape.fontStyle}
                                textDecoration={shape.textDecoration}
                                draggable
                                onDragEnd={handleDragEnd(shape.id)}
                              />
                            );
                          }
                          if (shape.type === 'video') {
                            return (
                              <VideoNode
                                key={shape.id}
                                shape={shape}
                                onSelect={() => {}}
                                onDragEnd={handleDragEnd(shape.id)}
                                onTransformEnd={() => {}}
                              />
                            );
                          }
                          if (shape.type === 'imageRotation') {
                            return (
                              <ImageRotationNode
                                key={shape.id}
                                shape={shape}
                                draggable
                                onSelect={() => {}}
                                onDragEnd={handleDragEnd(shape.id)}
                                onTransformEnd={() => {}}
                              />
                            );
                          }
                          return (
                            <ImageNode
                              key={shape.id}
                              shape={shape}
                              isSelected={false}
                              draggable
                              onSelect={() => {}}
                              onDragEnd={handleDragEnd(shape.id)}
                              onTransformEnd={() => {}}
                              onCircleInnerDragEnd={shape.clipShape === 'circle' ? handleCircleImageDragEnd(shape) : undefined}
                            />
                          );
                        })}
                      </Group>
                    </Layer>
                  </Stage>
                </div>
              </div>
            </div>
            <p className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-6 text-xs text-white/80">
              Öğeleri sürükleyerek konumlandırabilirsiniz.
            </p>
            <button
              type="button"
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-2 right-0 py-2 px-4 rounded-lg bg-white text-slate-800 font-medium hover:bg-slate-100 shadow-lg"
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* İçerik Kütüphanesi modal — tüm kategoriler, video / resim / ikon / simge */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => { setShowLibrary(false); setOpenLibraryForRotation(false); }}>
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">{t('editor_content_library')}</h3>
              <button type="button" onClick={() => setShowLibrary(false)} className="p-2 rounded-lg hover:bg-slate-100">×</button>
            </div>
            <div className="px-4 pt-3 pb-2 border-b border-slate-100 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setLibraryCategoryFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${libraryCategoryFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                {t('editor_filter_all')}
              </button>
              {libraryCategories
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                .map((cat) => {
                  const slug = (cat.slug ?? '').toLowerCase();
                  const labelNorm = (cat.label ?? '').toLowerCase().trim();
                  const labelKey = CATEGORY_SLUG_TO_KEY[slug] ?? CATEGORY_LABEL_TO_KEY[labelNorm];
                  const label = labelKey ? t(labelKey) : cat.label;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setLibraryCategoryFilter(cat.slug)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${libraryCategoryFilter === cat.slug ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                    >
                      <span>{cat.icon}</span>
                      <span>{label}</span>
                    </button>
                  );
                })}
            </div>
            <div className="p-4 overflow-y-auto flex-1 min-h-0">
              {libraryLoading ? (
                <p className="text-center text-slate-500 py-8">{t('common_loading')}</p>
              ) : libraryFiltered.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  {t(libraryCategoryFilter === 'all' ? 'editor_library_empty' : 'editor_category_empty_short')}
                </p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {libraryFiltered.map((item) => {
                    const url = item.url ? mediaUrl(item.url) : '';
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
                        className="relative aspect-square rounded-lg overflow-hidden border-2 border-slate-200 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                      >
                        <span className="absolute inset-0 block w-full h-full">
                          {isVideo && url ? (
                            <VideoThumbnail key={`thumb-${item.id}`} url={url} loadingLabel={t('common_loading')} />
                          ) : hasGradient ? (
                            <span className="absolute inset-0 block w-full h-full" style={{ background: item.gradient }} />
                          ) : hasColor ? (
                            <span className="absolute inset-0 block w-full h-full" style={{ backgroundColor: item.color }} />
                          ) : isImage && url ? (
                            <img
                              src={url}
                              alt={item.name}
                              className="absolute inset-0 w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23e2e8f0" width="100" height="100"/%3E%3Ctext fill="%2394a3b8" font-size="10" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3E?%3C/text%3E%3C/svg%3E';
                              }}
                            />
                          ) : item.content ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-100 text-3xl">
                              {item.content}
                            </span>
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center bg-slate-100 text-slate-400 text-sm">
                              {item.name || '—'}
                            </span>
                          )}
                        </span>
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-1 truncate text-center">
                          {item.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
