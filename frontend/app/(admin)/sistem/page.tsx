'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import Link from 'next/link';
import {
  Upload, LayoutTemplate, Image, Type, Sparkles, Palette, Grid3X3, CircleDot, MoreHorizontal,
  Square, Bold, Italic, ChevronDown, RotateCcw, RotateCw, Copy, Trash2, Tv, Repeat, Check, X,
} from 'lucide-react';
import { GRADIENT_PRESETS, createFabricGradient } from '@/lib/full-editor/gradient';
import { FONT_GROUPS, FONT_OPTIONS, GOOGLE_FONT_CHUNKS, getGoogleFontsUrl } from '@/lib/editor-fonts';
import { apiClient } from '@/lib/api';
import { useAdminUser } from '@/lib/AdminUserContext';
import { useToast } from '@/lib/ToastContext';
import { FullEditorPreviewThumb, sanitizeCanvasJsonForFabric, sanitizeCanvasJsonForFabricWithVideoRestore, getVideoSrcFromFabricObject } from '@/components/FullEditorPreviewThumb';

const OBJECT_CONFIG = { left: 200, top: 200 };
const DRAFT_KEY = 'sistem-editor-draft';
const CANVAS_PADDING = 80;

/** Nesneyi beyaz blok (canvas) sınırları içinde tutar – dışarı çıkmayı engeller */
function constrainObjectToCanvas(obj: import('fabric').FabricObject, cw: number, ch: number) {
  obj.setCoords();
  const r = obj.getBoundingRect();
  const o = obj as { scaleX?: number; scaleY?: number };

  // 1) Nesne canvas'tan büyükse önce küçült
  if (r.width > cw || r.height > ch) {
    const s = Math.min(cw / r.width, ch / r.height, 1);
    const sx = (o.scaleX ?? 1) * s;
    const sy = (o.scaleY ?? 1) * s;
    obj.set({ scaleX: sx, scaleY: sy });
    obj.setCoords();
  }

  const r2 = obj.getBoundingRect();
  let dx = 0, dy = 0;
  if (r2.left < 0) dx = -r2.left;
  else if (r2.left + r2.width > cw) dx = cw - r2.left - r2.width;
  if (r2.top < 0) dy = -r2.top;
  else if (r2.top + r2.height > ch) dy = ch - r2.top - r2.height;

  if (dx !== 0 || dy !== 0) {
    obj.set({ left: (obj.left ?? 0) + dx, top: (obj.top ?? 0) + dy });
    obj.setCoords();
  }
}

/** Tüm nesneleri canvas sınırları içinde tutar */
function constrainAllObjects(canvas: { getObjects: () => import('fabric').FabricObject[]; width?: number; height?: number }) {
  const cw = canvas.width ?? 1920;
  const ch = canvas.height ?? 1080;
  canvas.getObjects().forEach((o) => constrainObjectToCanvas(o, cw, ch));
}

function fitObjectToCanvas(obj: import('fabric').FabricObject, cw: number, ch: number, options?: { center?: boolean; fullArea?: boolean }) {
  const center = options?.center !== false;
  const fullArea = options?.fullArea === true;
  obj.setCoords();
  const rect = obj.getBoundingRect();
  const w = rect.width;
  const h = rect.height;
  const maxW = fullArea ? cw : Math.max(100, (cw - CANVAS_PADDING * 2) * 0.98);
  const maxH = fullArea ? ch : Math.max(100, (ch - CANVAS_PADDING * 2) * 0.98);
  if (w <= 0 || h <= 0) return;
  const scale = fullArea ? Math.min(maxW / w, maxH / h) : Math.min(1, maxW / w, maxH / h);
  const o = obj as { scaleX?: number; scaleY?: number };
  const sx = (o.scaleX ?? 1) * scale;
  const sy = (o.scaleY ?? 1) * scale;
  if (center) {
    obj.set({ scaleX: sx, scaleY: sy, left: cw / 2, top: ch / 2, originX: 'center', originY: 'center' });
  } else {
    obj.set({ scaleX: sx, scaleY: sy });
  }
  obj.setCoords();
}
const DRAFT_BG_KEY = 'sistem-editor-draft-bg';

type FabricObjWithVideo = import('fabric').FabricObject & { __videoSrc?: string; getObjects?: () => import('fabric').FabricObject[] };
type VideoParent = import('fabric').Canvas | import('fabric').FabricObject;

/** loadFromJSON sonrası __videoSrc taşıyan nesneleri gerçek video FabricImage ile değiştirir (üst seviye + grup içi). */
async function restoreVideoObjectsInCanvas(
  canvas: import('fabric').Canvas,
  cw: number,
  ch: number,
  startVideoRenderLoop: () => void,
): Promise<void> {
  const fabric = await import('fabric');
  const toReplace: { parent: VideoParent; obj: FabricObjWithVideo }[] = [];

  function collect(obj: FabricObjWithVideo, parent: VideoParent): void {
    if (getVideoSrcFromFabricObject(obj as unknown as Record<string, unknown>)) {
      toReplace.push({ parent, obj });
      return;
    }
    if (typeof obj.getObjects === 'function') {
      const inner = obj.getObjects();
      for (let i = 0; i < inner.length; i++) {
        collect(inner[i] as FabricObjWithVideo, obj as VideoParent);
      }
    }
  }
  canvas.getObjects().forEach((o) => collect(o as FabricObjWithVideo, canvas));

  for (const { parent, obj } of toReplace) {
    const videoSrc = getVideoSrcFromFabricObject(obj as unknown as Record<string, unknown>);
    if (!videoSrc) continue;
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video yüklenemedi'));
        video.src = videoSrc;
      });
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      video.width = vw;
      video.height = vh;
      const left = (obj as { left?: number }).left ?? 0;
      const top = (obj as { top?: number }).top ?? 0;
      const scaleX = (obj as { scaleX?: number }).scaleX ?? 1;
      const scaleY = (obj as { scaleY?: number }).scaleY ?? 1;
      const angle = (obj as { angle?: number }).angle ?? 0;
      const originX = (obj as { originX?: string }).originX ?? 'left';
      const originY = (obj as { originY?: string }).originY ?? 'top';
      const newImg = new fabric.FabricImage(video as unknown as HTMLImageElement, {
        left,
        top,
        scaleX,
        scaleY,
        angle,
        originX: originX as 'left' | 'center' | 'right',
        originY: originY as 'top' | 'center' | 'bottom',
      });
      (parent as { remove: (a: unknown) => void; add: (...a: unknown[]) => void }).remove(obj);
      (parent as { add: (...a: unknown[]) => void }).add(newImg);
      if (parent === canvas) canvas.sendObjectToBack(newImg);
      newImg.setCoords();
      constrainObjectToCanvas(newImg, cw, ch);
      (newImg.getElement() as HTMLVideoElement)?.play?.();
      startVideoRenderLoop();
    } catch {
      // placeholder kalır, video yüklenemezse sessizce devam et
    }
  }
}

type LeftTab = 'uploads' | 'templates' | 'media' | 'text' | 'ai' | 'background' | 'layout' | 'record' | 'more';

/** Full Editor – PosterMyWall tarzı tasarım editörü */
export default function SistemPage() {
  const { t, localePath } = useTranslation();
  const adminUser = useAdminUser();
  const isAdmin = adminUser?.role === 'super_admin' || adminUser?.role === 'admin';
  const toast = useToast();
  const searchParams = useSearchParams();
  const templateIdFromUrl = searchParams?.get('templateId');
  const layoutFromUrl = searchParams?.get('layout');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<import('fabric').Canvas | null>(null);
  const [tvPreviewDataUrl, setTvPreviewDataUrl] = useState<string>('');
  const updatePreviewRef = useRef<() => void>(() => {});
  const [selectedProps, setSelectedProps] = useState<{ text?: string; fontSize?: number; fill?: string; fontFamily?: string; fontWeight?: number; fontStyle?: string }>({});
  const [selectedObjectType, setSelectedObjectType] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>('templates');
  const [saved, setSaved] = useState(true);
  const [designTitle, setDesignTitle] = useState('');
  const [bgColor, setBgColor] = useState(() => {
    if (typeof window === 'undefined') return '#0f172a';
    const s = localStorage.getItem(DRAFT_BG_KEY);
    return (typeof s === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(s)) ? s : '#0f172a';
  });
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [zoomDisplay, setZoomDisplay] = useState(100);
  const [categories, setCategories] = useState<{ id: string; name: string; description: string | null; image_url_1: string | null; image_url_2: string | null }[]>([]);
  const [templates, setTemplates] = useState<{ id: string; name: string; canvas_json: unknown; preview_image: string | null; category_id: string | null }[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [uploadsList, setUploadsList] = useState<{ id: string; name: string; url: string; type?: string }[]>([]);
  const [uploadsLoading, setUploadsLoading] = useState(false);
  const [mediaLibraryList, setMediaLibraryList] = useState<{ id: string; name: string; url: string; type?: string }[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [mediaPreviewItem, setMediaPreviewItem] = useState<{ id: string; name: string; url: string; type?: string } | null>(null);
  const [templatePreviewItem, setTemplatePreviewItem] = useState<{ id: string; name: string; canvas_json: unknown; preview_image: string | null; category_id: string | null } | null>(null);
  const [recordVideos, setRecordVideos] = useState<{ id: string; name: string; url: string; type?: string }[]>([]);
  const [recordPreviewVideo, setRecordPreviewVideo] = useState<{ id: string; name: string; url: string } | null>(null);
  const videoRenderRafRef = useRef<number | null>(null);
  const videoUploadInputRef = useRef<HTMLInputElement>(null);
  const [showImageLoopModal, setShowImageLoopModal] = useState(false);
  const [showImageLoopEditModal, setShowImageLoopEditModal] = useState(false);
  const [imageLoopLibrary, setImageLoopLibrary] = useState<{ id: string; name: string; url: string; type: 'image' | 'video' }[]>([]);
  const [imageLoopSelectedIds, setImageLoopSelectedIds] = useState<Set<string>>(new Set());
  const [imageLoopEditItems, setImageLoopEditItems] = useState<{ id: string; name: string; url: string; type: 'image' | 'video'; durationSeconds: number; bgRemove: boolean; text: string; transition: string }[]>([]);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveDestinationModalOpen, setSaveDestinationModalOpen] = useState(false);
  const [saveScope, setSaveScope] = useState<'system' | 'user'>('system');
  const [saveTargetUserId, setSaveTargetUserId] = useState<string>('');
  const [usersList, setUsersList] = useState<{ id: string; email: string; role: string }[]>([]);
  const [showTvPreviewModal, setShowTvPreviewModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);
  const [overwriteConfirm, setOverwriteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [savedTemplateId, setSavedTemplateId] = useState<string | null>(null);
  const [historyTick, setHistoryTick] = useState(0);
  const [layersKey, setLayersKey] = useState(0);
  const [animStart, setAnimStart] = useState<string>('none');
  const [animEnd, setAnimEnd] = useState<string>('none');
  const refreshLayers = useCallback(() => setLayersKey((k) => k + 1), []);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const pushHistoryRef = useRef<() => void>(() => {});
  const setHistoryTickRef = useRef<((n: number | ((prev: number) => number)) => void) | null>(null);
  const saveDraftRef = useRef<() => void>(() => {});
  const bgColorRef = useRef(bgColor);
  const canvasDimsRef = useRef({ w: 1920, h: 1080 });
  useEffect(() => { bgColorRef.current = bgColor; }, [bgColor]);
  useEffect(() => { canvasDimsRef.current = { w: 1920, h: 1080 }; }, []);
  useEffect(() => {
    const links: HTMLLinkElement[] = [];
    GOOGLE_FONT_CHUNKS.forEach((chunk, i) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = getGoogleFontsUrl(chunk);
      link.dataset.fontChunk = String(i);
      document.head.appendChild(link);
      links.push(link);
    });
    return () => links.forEach((l) => l.remove());
  }, []);

  const BACKGROUND_PRESETS = ['#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF', '#4B5563', '#1F2937', '#0F172A', '#000000'];

  useEffect(() => {
    let fabricCanvas: import('fabric').Canvas | null = null;
    const init = async () => {
      const fabric = await import('fabric');
      const el = canvasRef.current;
      if (!el) return;
      fabricCanvas = new fabric.Canvas(el, { width: 1920, height: 1080, selection: true });
      fabricCanvasRef.current = fabricCanvas;
      requestAnimationFrame(() => (fabricCanvas as { calcOffset?: () => void }).calcOffset?.());

      // Layout parametresi varsa yeni şablon – taslağı yükleme, seçilen düzeni uygula
      const hasLayoutParam = layoutFromUrl && !templateIdFromUrl;
      const draftRaw = !hasLayoutParam && typeof window !== 'undefined' ? localStorage.getItem(DRAFT_KEY) : null;
      const draft = draftRaw ? (() => { try { return JSON.parse(draftRaw) as { json: object; bgColor?: string; width?: number; height?: number }; } catch { return null; } })() : null;
      const savedBgRaw = typeof window !== 'undefined' ? localStorage.getItem(DRAFT_BG_KEY) : null;
      const savedBg = (typeof savedBgRaw === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(savedBgRaw))
        ? savedBgRaw
        : (typeof draft?.bgColor === 'string' ? draft.bgColor : '#0f172a');

      if (draft?.json && !hasLayoutParam) {
        bgColorRef.current = savedBg;
        setBgColor(savedBg);
        const jsonWithBg = typeof draft.json === 'object' ? { ...draft.json, background: savedBg } : draft.json;
        fabricCanvas.loadFromJSON(jsonWithBg).then(() => {
          fabricCanvas!.backgroundColor = savedBg;
          fabricCanvas!.setDimensions({ width: 1920, height: 1080 });
          constrainAllObjects(fabricCanvas!);
          fabricCanvas!.renderAll();
          setSaved(true);
          pushHistory();
          saveDraftRef.current();
        }).catch(() => { /* draft yüklenemezse varsayılan canvas kullan */ });
      } else {
        const layout = layoutFromUrl && !templateIdFromUrl ? layoutFromUrl : '';
        const defBg = layout ? '#F9FAFB' : '#000000';
        fabricCanvas.backgroundColor = defBg;
        bgColorRef.current = defBg;
        setBgColor(defBg);
        if (typeof window !== 'undefined') localStorage.setItem(DRAFT_BG_KEY, defBg);
        // Layout param ile blok grid – sistem editöründeki gibi: açık dolgu, yuvarlatılmış, Blok N etiketi
        const cw = 1920; const ch = 1080;
        const gap = 2; const stroke = '#D1D5DB'; // gray-300
        let blockIndex = 0;
        const addBlock = (x: number, y: number, w: number, h: number) => {
          blockIndex += 1;
          const rw = w - gap; const rh = h - gap;
          const rx = x + gap / 2; const ry = y + gap / 2;
          const rect = new fabric.Rect({
            left: rx,
            top: ry,
            width: rw,
            height: rh,
            fill: '#E5E7EB',
            stroke,
            strokeWidth: 2,
            rx: 8,
            ry: 8,
            selectable: true,
            evented: true,
            originX: 'left',
            originY: 'top',
          });
          fabricCanvas!.add(rect);
          const fontSize = Math.min(64, Math.round(Math.min(rw, rh) * 0.06));
          const label = new fabric.FabricText(`Blok ${blockIndex}`, {
            fontSize,
            left: rx + rw / 2,
            top: ry + rh / 2,
            originX: 'center',
            originY: 'center',
            fill: '#4B5563',
            fontFamily: 'sans-serif',
            selectable: false,
            evented: false,
          });
          fabricCanvas!.add(label);
        };
        if (layout === '1x1') { addBlock(0, 0, cw, ch); }
        else if (layout === '1x2') { addBlock(0, 0, cw/2, ch); addBlock(cw/2, 0, cw/2, ch); }
        else if (layout === '1x3') { addBlock(0, 0, cw/3, ch); addBlock(cw/3, 0, cw/3, ch); addBlock(2*cw/3, 0, cw/3, ch); }
        else if (layout === '2x2') { addBlock(0, 0, cw/2, ch/2); addBlock(cw/2, 0, cw/2, ch/2); addBlock(0, ch/2, cw/2, ch/2); addBlock(cw/2, ch/2, cw/2, ch/2); }
        else if (layout === '2x3') { for (let row=0;row<2;row++) for (let col=0;col<3;col++) addBlock(col*(cw/3), row*(ch/2), cw/3, ch/2); }
        else if (layout === '4x2-7') {
          const bw = cw/4; addBlock(0, 0, bw, ch/2); addBlock(bw, 0, bw, ch/2); addBlock(2*bw, 0, bw, ch/2); addBlock(3*bw, 0, bw, ch/2);
          addBlock(0, ch/2, bw, ch/2); addBlock(bw, ch/2, bw, ch/2); addBlock(2*bw, ch/2, 2*bw, ch/2);
        }
        else if (layout === '4x2-8') { for (let row=0;row<2;row++) for (let col=0;col<4;col++) addBlock(col*(cw/4), row*(ch/2), cw/4, ch/2); }
        else {
          let siteName = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_NAME) || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_NAME) || 'Menümüz';
          let contactLine = '';
          try {
            const contactRes = await fetch('/api/contact-info', { cache: 'no-store' });
            const contactData = await contactRes.json().catch(() => ({}));
            const phone = contactData.phone?.trim() || '';
            const appUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ? String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
            const parts = [phone];
            if (appUrl) parts.push(appUrl.replace(/^https?:\/\//, ''));
            contactLine = parts.filter(Boolean).join('  •  ') || 'İletişim bilgileri Ayarlar\'dan ekleyebilirsiniz';
          } catch {
            contactLine = typeof window !== 'undefined' ? `${window.location.origin}` : 'İletişim';
          }
          const text = new fabric.FabricText(siteName, { fontSize: 56, left: 80, top: 60, fill: '#ffffff', fontFamily: 'sans-serif' });
          fabricCanvas.add(text);
          const sub = new fabric.FabricText('Menü', { fontSize: 28, left: 80, top: 130, fill: '#ffffff', fontStyle: 'italic' });
          fabricCanvas.add(sub);
          const contact = new fabric.FabricText(contactLine, { fontSize: 16, left: 80, top: 180, fill: '#9ca3af' });
          fabricCanvas.add(contact);
        }
        fabricCanvas.renderAll();
      }

      const saveDraft = () => {
        const c = fabricCanvasRef.current;
        if (!c) return;
        try {
          const json = (c as { toObject: (p?: string[]) => object }).toObject(['selectable', 'evented']);
          const cb = (c as { backgroundColor?: unknown }).backgroundColor;
          const bgStr = (typeof cb === 'string' ? cb : null) || bgColorRef.current || '#0f172a';
          const w = (c as { width?: number }).width ?? 1920;
          const h = (c as { height?: number }).height ?? 1080;
          localStorage.setItem(DRAFT_KEY, JSON.stringify({ json, bgColor: bgStr, width: w, height: h }));
          localStorage.setItem(DRAFT_BG_KEY, bgStr);
        } catch { /* ignore */ }
      };
      saveDraftRef.current = saveDraft;

      const lastSyncRef = { obj: null as import('fabric').FabricObject | null, str: '' };
      const syncProps = (obj: import('fabric').FabricObject | undefined) => {
        if (!obj) {
          lastSyncRef.obj = null;
          lastSyncRef.str = '';
          setSelectedProps({});
          setSelectedObjectType('');
          return;
        }
        const o = obj as { fontSize?: number; fill?: string | object; fontFamily?: string; fontWeight?: number; fontStyle?: string; getObjects?: () => import('fabric').FabricObject[] };
        let fill = typeof o.fill === 'string' ? o.fill : '#374151';
        const type = (o as { type?: string }).type ?? '';
        if ((type === 'activeSelection' || type === 'ActiveSelection') && typeof o.getObjects === 'function') {
          const children = o.getObjects();
          const firstWithFill = children.find((c) => {
            const f = (c as { fill?: string | object }).fill;
            return typeof f === 'string' && f.startsWith('#');
          });
          if (firstWithFill) fill = (firstWithFill as { fill?: string }).fill ?? fill;
        }
        const data = (o as { data?: { animStart?: string; animEnd?: string } }).data ?? {};
        const newStr = JSON.stringify({ type, fill, text: (o as { text?: string }).text ?? '', fontSize: o.fontSize ?? 32, fontFamily: o.fontFamily ?? 'sans-serif', fontWeight: o.fontWeight ?? 400, fontStyle: o.fontStyle ?? 'normal', animStart: data.animStart ?? 'none', animEnd: data.animEnd ?? 'none' });
        if (lastSyncRef.obj === obj && lastSyncRef.str === newStr) return;
        lastSyncRef.obj = obj;
        lastSyncRef.str = newStr;

        setSelectedObjectType(type);
        setAnimStart(data.animStart ?? 'none');
        setAnimEnd(data.animEnd ?? 'none');
        if (['text', 'i-text', 'textbox', 'Textbox'].includes(type)) {
          const textContent = (o as { text?: string }).text ?? '';
          setSelectedProps({
            text: textContent,
            fontSize: o.fontSize ?? 32,
            fill,
            fontFamily: o.fontFamily ?? 'sans-serif',
            fontWeight: o.fontWeight ?? 400,
            fontStyle: o.fontStyle ?? 'normal',
          });
          setTimeout(() => document.getElementById('text-edit-panel')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150);
        } else {
          setSelectedProps({ fill });
        }
      };

      // selection:updated sürükleme/ölçekleme sırasında çok sık tetiklenir – debounce ile sürekli yenilenmeyi önler
      let selectionUpdateTm: ReturnType<typeof setTimeout> | null = null;
      fabricCanvas.on('selection:created', (e) => {
        if (selectionUpdateTm) clearTimeout(selectionUpdateTm);
        selectionUpdateTm = null;
        syncProps(e.selected?.[0]);
      });
      fabricCanvas.on('selection:updated', (e) => {
        if (selectionUpdateTm) clearTimeout(selectionUpdateTm);
        const obj = e.selected?.[0];
        selectionUpdateTm = setTimeout(() => {
          selectionUpdateTm = null;
          syncProps(obj);
        }, 120);
      });
      fabricCanvas.on('selection:cleared', () => {
        if (selectionUpdateTm) clearTimeout(selectionUpdateTm);
        selectionUpdateTm = null;
        lastSyncRef.obj = null;
        lastSyncRef.str = '';
        setSelectedProps({}); setSelectedObjectType(''); setAnimStart('none'); setAnimEnd('none');
      });
      const constrain = (e: { target?: import('fabric').FabricObject }) => {
        const o = e?.target;
        const c = fabricCanvasRef.current;
        if (o && c) {
          const { w, h } = canvasDimsRef.current;
          constrainObjectToCanvas(o, w, h);
          c.renderAll();
        }
      };
      fabricCanvas.on('object:scaling', constrain);
      fabricCanvas.on('object:rotating', constrain);
      fabricCanvas.on('object:modified', (e) => {
        constrain(e);
        setSaved(false);
        pushHistory();
        saveDraft();
      });
      fabricCanvas.on('object:added', (e) => {
        constrain(e);
      });
      fabricCanvas.on('object:removed', () => {});
      if (!draft?.json) {
        pushHistory();
        saveDraft();
      }

      // Önizleme – toDataURL pahalı, 600ms debounce ile kasılmayı önle
      let previewTimeout: ReturnType<typeof setTimeout> | null = null;
      updatePreviewRef.current = () => {
        if (previewTimeout) clearTimeout(previewTimeout);
        previewTimeout = setTimeout(() => {
          previewTimeout = null;
          const c = fabricCanvasRef.current;
          if (!c) return;
          try {
            const prevZoom = c.getZoom();
            const prevVpt = (c.viewportTransform?.slice() ?? [1, 0, 0, 1, 0, 0]) as [number, number, number, number, number, number];
            const activeObj = (c as { getActiveObject?: () => unknown }).getActiveObject?.();
            (c as { discardActiveObject?: () => void }).discardActiveObject?.();
            c.setZoom(1);
            c.setViewportTransform([1, 0, 0, 1, 0, 0]);
            (c as { renderAll?: () => void }).renderAll?.();
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                const url = (c as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 1 }) ?? '';
                setTvPreviewDataUrl(url);
                c.setZoom(prevZoom);
                c.setViewportTransform(prevVpt);
                if (activeObj) (c as { setActiveObject?: (o: unknown) => void; requestRenderAll?: () => void }).setActiveObject?.(activeObj);
                c.requestRenderAll();
              });
            });
          } catch { /* ignore */ }
        }, 600);
      };
    };
    const pushHistory = () => {
      const c = fabricCanvasRef.current;
      if (!c) return;
      try {
        const json = JSON.stringify((c as { toObject: (p?: string[]) => object }).toObject(['selectable', 'evented']));
        const hist = historyRef.current;
        const idx = historyIndexRef.current;
        const newHist = hist.slice(0, idx + 1);
        newHist.push(json);
        if (newHist.length > 50) newHist.shift();
        historyIndexRef.current = newHist.length - 1;
        historyRef.current = newHist;
        setHistoryTickRef.current?.((t) => t + 1);
      } catch { /* ignore */ }
    };
    pushHistoryRef.current = pushHistory;
    init();
    return () => {
      const c = fabricCanvasRef.current;
      fabricCanvasRef.current = null;
      c?.dispose();
    };
  }, []);


  // TV önizlemede Fabric zoom=1 tutulur; ekranı CSS object-fit:cover ile doldururuz (16:9 tam alan)
  useEffect(() => {
    let lastZoom = 0;
    let resizeTm: ReturnType<typeof setTimeout> | null = null;
    const run = () => {
      const c = fabricCanvasRef.current;
      const container = canvasContainerRef.current;
      if (!c || !container) return;
      // TV önizlemede zoom=1 tutulur; ekran CSS object-fit:cover ile doldurulur (16:9 tam alan)
      const zoom = 1;
      if (Math.abs(zoom - lastZoom) < 0.001) return;
      lastZoom = zoom;
      c.setZoom(zoom);
      c.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
      (c as { calcOffset?: () => void }).calcOffset?.();
      c.requestRenderAll();
      setZoomDisplay(Math.round(zoom * 100));
    };
    const onResize = () => {
      if (resizeTm) clearTimeout(resizeTm);
      resizeTm = setTimeout(() => { resizeTm = null; run(); }, 100);
    };
    const el = canvasContainerRef.current;
    const ro = el ? new ResizeObserver(onResize) : null;
    if (el && ro) ro.observe(el);
    window.addEventListener('resize', onResize);
    requestAnimationFrame(() => { requestAnimationFrame(() => run()); });
    return () => {
      if (resizeTm) clearTimeout(resizeTm);
      if (el && ro) ro.disconnect();
      window.removeEventListener('resize', onResize);
    };
  }, [showTvPreviewModal]);

  // TV önizlemede seçim çerçevesi (kesikli kutu) ve boşluk görünmesin; kapanınca düzenleme normale dönsün
  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    if (showTvPreviewModal) {
      (c as { discardActiveObject?: () => void }).discardActiveObject?.();
      (c as { selection?: boolean }).selection = false;
    } else {
      (c as { selection?: boolean }).selection = true;
    }
    c.requestRenderAll();
  }, [showTvPreviewModal]);

  // URL'de ?templateId=xxx varsa full-editor şablonunu yükle (Sistem Şablonları sayfasından Düzenle ile gelindiğinde)
  useEffect(() => {
    if (!templateIdFromUrl) return;
    const c = fabricCanvasRef.current;
    if (!c) return;
    fetch(`/api/full-editor/templates?id=${encodeURIComponent(templateIdFromUrl)}`)
      .then((r) => r.json())
      .then((tpl: { id?: string; name?: string; canvas_json?: object }) => {
        if (!tpl?.canvas_json || typeof tpl.canvas_json !== 'object') return;
        const raw = tpl.canvas_json as Record<string, unknown>;
        const safe = sanitizeCanvasJsonForFabric(raw) as object;
        c.loadFromJSON(safe).then(() => {
          constrainAllObjects(c);
          c.renderAll();
          if (tpl.name) setDesignTitle(tpl.name);
          setSaved(false);
          pushHistoryRef.current();
          saveDraftRef.current();
          const u = new URL(window.location.href);
          u.searchParams.delete('templateId');
          window.history.replaceState({}, '', u.pathname + u.search);
        }).catch(() => {});
      })
      .catch(() => {});
  }, [templateIdFromUrl]);

  /** Fabric API ile container'a sığdır – CSS transform YOK */
  const fitCanvasToContainer = useCallback(() => {
    const c = fabricCanvasRef.current;
    const container = canvasContainerRef.current;
    if (!c || !container) return;
    const scaleX = container.clientWidth / 1920;
    const scaleY = container.clientHeight / 1080;
    const zoom = Math.min(scaleX, scaleY);
    c.setZoom(zoom);
    c.setViewportTransform([zoom, 0, 0, zoom, 0, 0]);
    (c as { calcOffset?: () => void }).calcOffset?.();
    c.requestRenderAll();
    setZoomDisplay(Math.round(zoom * 100));
  }, []);

  const zoomIn = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const z = Math.min(2, c.getZoom() * 1.2);
    c.setZoom(z);
    c.setViewportTransform([z, 0, 0, z, 0, 0]);
    c.requestRenderAll();
    setZoomDisplay(Math.round(z * 100));
  }, []);

  const zoomOut = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const z = Math.max(0.1, c.getZoom() / 1.2);
    c.setZoom(z);
    c.setViewportTransform([z, 0, 0, z, 0, 0]);
    c.requestRenderAll();
    setZoomDisplay(Math.round(z * 100));
  }, []);

  useEffect(() => {
    const c = fabricCanvasRef.current;
    if (c) {
      c.setDimensions({ width: 1920, height: 1080 });
      constrainAllObjects(c);
      c.renderAll();
      setSaved(false);
    }
  }, []);

  useEffect(() => {
    if (leftTab !== 'templates') return;
    setCategoriesLoading(true);
    fetch('/api/full-editor/categories')
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setCategoriesLoading(false));
  }, [leftTab]);

  const refreshTemplates = useCallback(() => {
    const url = selectedCategoryId
      ? `/api/full-editor/templates?category_id=${selectedCategoryId}&scope=system`
      : '/api/full-editor/templates?scope=system';
    fetch(url)
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]));
  }, [selectedCategoryId]);

  useEffect(() => {
    if (leftTab !== 'templates') return;
    refreshTemplates();
  }, [leftTab, selectedCategoryId, refreshTemplates]);

  // Admin: Kaydet hedefi modalı açıldığında kullanıcı listesini yükle
  useEffect(() => {
    if (!saveDestinationModalOpen || !isAdmin) return;
    apiClient('/users')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setUsersList(list.filter((u: { role?: string }) => u.role !== 'super_admin').map((u: { id: string; email: string; role: string }) => ({ id: u.id, email: u.email || '', role: u.role || '' })));
      })
      .catch(() => setUsersList([]));
  }, [saveDestinationModalOpen, isAdmin]);

  const refreshUploadsList = useCallback(() => {
    apiClient('/content-library/my-uploads')
      .then((data) => setUploadsList(Array.isArray(data) ? (data as { id: string; name: string; url: string; type?: string }[]).map((r) => ({ id: r.id, name: String(r.name ?? ''), url: String(r.url ?? ''), type: r.type })) : []))
      .catch(() => setUploadsList([]));
  }, []);

  useEffect(() => {
    if (leftTab !== 'uploads') return;
    setUploadsLoading(true);
    apiClient('/content-library/my-uploads')
      .then((data) => setUploadsList(Array.isArray(data) ? (data as { id: string; name: string; url: string; type?: string }[]).map((r) => ({ id: r.id, name: String(r.name ?? ''), url: String(r.url ?? ''), type: r.type })) : []))
      .catch(() => setUploadsList([]))
      .finally(() => setUploadsLoading(false));
  }, [leftTab]);

  useEffect(() => {
    if (leftTab !== 'record') return;
    apiClient('/content-library?type=video')
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setRecordVideos(arr.map((r: { id: string; name?: string; url?: string; type?: string }) => ({ id: r.id, name: String(r.name ?? ''), url: String(r.url ?? ''), type: r.type ?? 'video' })));
      })
      .catch(() => setRecordVideos([]));
  }, [leftTab]);

  useEffect(() => {
    if (leftTab !== 'media') return;
    setMediaLibraryLoading(true);
    apiClient('/content-library?type=image')
      .then((data) => {
        const arr = Array.isArray(data) ? data : [];
        setMediaLibraryList(arr.map((r: { id: string; name?: string; url?: string; type?: string }) => ({
          id: r.id,
          name: String(r.name ?? ''),
          url: String(r.url ?? ''),
          type: r.type ?? 'image',
        })));
      })
      .catch(() => setMediaLibraryList([]))
      .finally(() => setMediaLibraryLoading(false));
  }, [leftTab]);

  useEffect(() => {
    const onUpdate = () => {
      refreshUploadsList();
      if (leftTab === 'record') {
        apiClient('/content-library?type=video')
          .then((data) => {
            const arr = Array.isArray(data) ? data : [];
            setRecordVideos(arr.map((r: { id: string; name?: string; url?: string; type?: string }) => ({ id: r.id, name: String(r.name ?? ''), url: String(r.url ?? ''), type: r.type ?? 'video' })));
          })
          .catch(() => {});
      }
      if (leftTab === 'media') {
        apiClient('/content-library?type=image')
          .then((data) => {
            const arr = Array.isArray(data) ? data : [];
            setMediaLibraryList(arr.map((r: { id: string; name?: string; url?: string; type?: string }) => ({
              id: r.id,
              name: String(r.name ?? ''),
              url: String(r.url ?? ''),
              type: r.type ?? 'image',
            })));
          })
          .catch(() => setMediaLibraryList([]));
      }
    };
    window.addEventListener('content-library-updated', onUpdate);
    return () => window.removeEventListener('content-library-updated', onUpdate);
  }, [refreshUploadsList, leftTab]);

  const addText = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const fabric = await import('fabric');
    const bg = String((canvas as { backgroundColor?: string }).backgroundColor ?? '#000000');
    const m = bg.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
    const hex = m?.length === 3 ? m.split('').map((c) => c + c).join('') : m ?? '000000';
    const isDark = parseInt(hex, 16) < 0x888888;
    const defaultFill = isDark ? '#ffffff' : '#000000';
    const cw = (canvas as { width?: number }).width ?? 1920;
    const ch = (canvas as { height?: number }).height ?? 1080;
    const maxWidth = cw - CANVAS_PADDING * 2;
    const t = new fabric.Textbox('New Text', {
      left: cw / 2,
      top: ch / 2,
      originX: 'center',
      originY: 'center',
      width: Math.min(maxWidth, 400),
      fontSize: 36,
      fill: defaultFill,
      fontFamily: 'sans-serif',
      fontWeight: 400,
      fontStyle: 'normal',
      textAlign: 'center',
      padding: 0,
    });
    canvas.add(t);
    canvas.renderAll();
    t.setCoords();
    fitObjectToCanvas(t, cw, ch);
    canvas.setActiveObject(t);
    canvas.renderAll();
    pushHistoryRef.current();
    setSelectedProps({ fontSize: 36, fill: defaultFill, fontFamily: 'sans-serif', fontWeight: 400, fontStyle: 'normal' });
    setSaved(false);
    refreshLayers();
    saveDraftRef.current();
  }, [refreshLayers]);

  const SHAPE_MODELS: { id: string; label: string; type: 'rect' | 'rounded' | 'circle' | 'triangle' | 'ellipse' | 'path'; fill: string; stroke: string; path?: string; rx?: number; radius?: number; rxE?: number; ryE?: number; points?: number; scale?: number }[] = [
    { id: 'card', label: 'Modern Kart', type: 'rounded', fill: '#374151', stroke: '#6b7280', rx: 24 },
    { id: 'pill', label: 'Pill Şerit', type: 'rounded', fill: '#374151', stroke: '#6b7280', rx: 60 },
    { id: 'circle', label: 'Daire', type: 'circle', fill: '#374151', stroke: '#6b7280', radius: 60 },
    { id: 'etiket', label: 'Yuvarlak Rozet', type: 'circle', fill: '#374151', stroke: '#6b7280', radius: 70 },
    { id: 'triangle', label: 'Üçgen', type: 'triangle', fill: '#374151', stroke: '#6b7280' },
    { id: 'ellipse', label: 'Elips', type: 'ellipse', fill: '#374151', stroke: '#6b7280', rxE: 100, ryE: 60 },
    { id: 'ptag', label: 'Fiyat Etiketi', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 0,12 Q 0,0 12,0 L 88,0 Q 100,0 100,12 L 100,68 Q 100,80 88,80 L 50,100 L 12,80 Q 0,80 0,68 Z', scale: 2 },
    { id: 'splash', label: 'Boya Püskürtme', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,5 C 85,15 95,45 80,75 C 60,95 25,90 10,60 C -5,30 15,5 50,5 Z', scale: 2.5 },
    { id: 'star', label: 'Yıldız', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 L 61,35 L 98,35 L 68,57 L 79,91 L 50,70 L 21,91 L 32,57 L 2,35 L 39,35 Z', scale: 2 },
    { id: 'hex', label: 'Altıgen', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 L 93,25 L 93,75 L 50,100 L 7,75 L 7,25 Z', scale: 2 },
    { id: 'diamond', label: 'Elmas', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 L 100,50 L 50,100 L 0,50 Z', scale: 2 },
    { id: 'bubble', label: 'Konuşma Balonu', type: 'path', fill: '#FFFFFF', stroke: '#d1d5db', path: 'M 10,0 L 90,0 Q 100,0 100,10 L 100,60 Q 100,70 90,70 L 60,70 L 45,85 L 50,70 L 10,70 Q 0,70 0,60 L 0,10 Q 0,0 10,0 Z', scale: 2 },
    { id: 'ribbon', label: 'Kurdele', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 0,20 Q 0,0 20,0 L 80,0 Q 100,0 100,20 L 100,40 Q 100,50 90,50 L 10,50 Q 0,50 0,40 Z', scale: 2 },
    { id: 'arrow', label: 'Ok', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 0,40 L 60,40 L 60,10 L 100,50 L 60,90 L 60,60 L 0,60 Z', scale: 1.8 },
    { id: 'blob', label: 'Organik Blob', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 C 90,10 100,40 95,65 C 88,95 50,100 25,85 C 0,70 5,35 35,15 C 45,5 50,0 50,0 Z', scale: 2 },
    { id: 'tag-mod', label: 'Modern Etiket', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 15,0 L 85,0 Q 100,0 100,15 L 100,55 Q 100,70 85,70 L 50,85 L 15,70 Q 0,70 0,55 L 0,15 Q 0,0 15,0 Z', scale: 2 },
    { id: 'banner-skew', label: 'Eğik Banner', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 5,15 L 95,5 L 95,55 L 5,45 Z', scale: 2 },
    { id: 'octagon', label: 'Sekizgen', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 L 85,15 L 85,55 L 50,70 L 15,55 L 15,15 Z', scale: 2 },
    { id: 'ticket', label: 'Bilet', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 5,0 L 95,0 Q 100,0 100,5 L 100,45 Q 100,50 95,50 L 55,50 Q 50,55 45,50 L 5,50 Q 0,50 0,45 L 0,5 Q 0,0 5,0 Z', scale: 1.8 },
    { id: 'burst', label: 'Patlama', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 L 55,45 L 100,50 L 55,55 L 50,100 L 45,55 L 0,50 L 45,45 Z', scale: 2 },
    { id: 'wave-banner', label: 'Dalgalı Şerit', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 0,30 Q 25,0 50,30 Q 75,60 100,30 L 100,50 Q 75,80 50,50 Q 25,20 0,50 Z', scale: 2 },
    { id: 'chat-mod', label: 'Modern Konuşma', type: 'path', fill: '#FFFFFF', stroke: '#d1d5db', path: 'M 20,0 L 80,0 Q 100,0 100,20 L 100,50 Q 100,60 90,60 L 50,60 L 30,75 L 35,60 L 10,60 Q 0,60 0,50 L 0,20 Q 0,0 20,0 Z', scale: 2 },
    { id: 'label-ribbon', label: 'Etiket Kurdele', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 0,25 L 15,0 L 100,0 L 100,35 L 15,35 L 0,50 Z', scale: 1.8 },
    { id: 'blob2', label: 'Yumuşak Blob', type: 'path', fill: '#374151', stroke: '#6b7280', path: 'M 50,0 C 80,0 100,25 100,50 C 100,80 70,100 50,100 C 20,100 0,75 0,50 C 0,20 25,0 50,0 Z', scale: 2 },
  ];

  const addShape = useCallback(async (modelId: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const cfg = SHAPE_MODELS.find((s) => s.id === modelId);
    if (!cfg) return;
    const fabric = await import('fabric');
    const { Rect, Circle, Triangle, Ellipse, Path } = fabric;
    const cw = (canvas as { width?: number }).width ?? 1920;
    const ch = (canvas as { height?: number }).height ?? 1080;
    const base = { left: cw / 2 - 100, top: ch / 2 - 60, originX: 'center' as const, originY: 'center' as const };
    let obj: import('fabric').FabricObject;

    if (cfg.type === 'rect') {
      obj = new Rect({ ...base, width: 200, height: 120, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 1 });
    } else if (cfg.type === 'rounded') {
      obj = new Rect({ ...base, width: 200, height: 120, rx: cfg.rx ?? 16, ry: cfg.rx ?? 16, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 2 });
    } else if (cfg.type === 'circle') {
      obj = new Circle({ ...base, radius: cfg.radius ?? 60, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: cfg.radius && cfg.radius > 65 ? 4 : 1 });
    } else if (cfg.type === 'triangle') {
      obj = new Triangle({ ...base, width: 160, height: 140, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 1 });
    } else if (cfg.type === 'ellipse') {
      obj = new Ellipse({ ...base, rx: cfg.rxE ?? 100, ry: cfg.ryE ?? 60, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 1 });
    } else if (cfg.type === 'path' && cfg.path) {
      obj = new Path(cfg.path, { ...base, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 1, scaleX: cfg.scale ?? 2, scaleY: cfg.scale ?? 2 });
    } else {
      obj = new Rect({ ...base, width: 200, height: 120, fill: cfg.fill, stroke: cfg.stroke, strokeWidth: 1 });
    }

    canvas.add(obj);
    obj.setCoords();
    fitObjectToCanvas(obj, cw, ch);
    canvas.setActiveObject(obj);
    canvas.renderAll();
    pushHistoryRef.current();
    setSelectedProps({ fill: cfg.fill });
    setSaved(false);
    refreshLayers();
    saveDraftRef.current();
  }, [refreshLayers]);

  const addRect = useCallback(() => addShape('card'), [addShape]);

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active?.length) {
      active.forEach((o) => canvas.remove(o));
      canvas.discardActiveObject();
      canvas.renderAll();
      setSelectedProps({});
      setSaved(false);
      refreshLayers();
      saveDraftRef.current();
    }
  }, [refreshLayers]);

  type LayoutType = 'bar' | 'restoran' | 'cafe';

  const getLayoutObjects = useCallback((
    type: LayoutType,
    cw: number,
    ch: number,
    opts?: { siteName?: string; contactLine?: string }
  ): { type: string; text: string; left: number; top: number; fontSize?: number; fill?: string; originX?: 'center' }[] => {
    const cx = cw / 2;
    const siteName = opts?.siteName ?? 'Menümüz';
    const contactLine = opts?.contactLine ?? 'İletişim';
    const item = (text: string, top: number, fontSize: number, fill = '#ffffff') =>
      ({ type: 'text' as const, text, left: cx, top, fontSize, fill, originX: 'center' as const });
    const contact = { type: 'text' as const, text: contactLine, left: cx, top: ch * 0.18, fontSize: Math.round(ch * 0.015), fill: '#94a3b8', originX: 'center' as const };
    if (type === 'bar') {
      const y0 = ch * 0.22;
      const dy = ch * 0.042;
      return [
        item(siteName, ch * 0.05, Math.round(ch * 0.045), '#ffffff'),
        item('Menü', ch * 0.1, Math.round(ch * 0.022), '#ffffff'),
        contact,
        item('Margarita ......... $9', y0, Math.round(ch * 0.02)),
        item('Mojito ............. $8', y0 + dy, Math.round(ch * 0.02)),
        item('Old Fashioned .... $11', y0 + dy * 2, Math.round(ch * 0.02)),
        item('Negroni ........... $10', y0 + dy * 3, Math.round(ch * 0.02)),
        item('Cosmopolitan ..... $12', y0 + dy * 4, Math.round(ch * 0.02)),
        item('Piña Colada ....... $9', y0 + dy * 5, Math.round(ch * 0.02)),
        item('Bloody Mary ....... $10', y0 + dy * 6, Math.round(ch * 0.02)),
        item('Daiquiri ........... $8', y0 + dy * 7, Math.round(ch * 0.02)),
        item('Manhattan ......... $11', y0 + dy * 8, Math.round(ch * 0.02)),
        item('Espresso Martini .. $12', y0 + dy * 9, Math.round(ch * 0.02)),
      ];
    }
    if (type === 'restoran') {
      const y0 = ch * 0.22;
      const dy = ch * 0.042;
      return [
        item(siteName, ch * 0.05, Math.round(ch * 0.045), '#ffffff'),
        item('Menü', ch * 0.1, Math.round(ch * 0.022), '#ffffff'),
        contact,
        item('Starters', y0, Math.round(ch * 0.02), '#fbbf24'),
        item('Soup .............. $8', y0 + dy, Math.round(ch * 0.018)),
        item('Salad ............. $10', y0 + dy * 2, Math.round(ch * 0.018)),
        item('Main Courses', y0 + dy * 3, Math.round(ch * 0.02), '#fbbf24'),
        item('Grilled Sea Bass .. $24', y0 + dy * 4, Math.round(ch * 0.018)),
        item('Chicken Skewer ... $18', y0 + dy * 5, Math.round(ch * 0.018)),
        item('Desserts', y0 + dy * 6, Math.round(ch * 0.02), '#fbbf24'),
        item('Tiramisu .......... $12', y0 + dy * 7, Math.round(ch * 0.018)),
        item('Baklava ........... $9', y0 + dy * 8, Math.round(ch * 0.018)),
        item('Beverages', y0 + dy * 9, Math.round(ch * 0.02), '#fbbf24'),
        item('Yogurt Drink ...... $3', y0 + dy * 10, Math.round(ch * 0.018)),
        item('Lemonade .......... $5', y0 + dy * 11, Math.round(ch * 0.018)),
      ];
    }
    if (type === 'cafe') {
      const y0 = ch * 0.22;
      const dy = ch * 0.042;
      return [
        item(siteName, ch * 0.05, Math.round(ch * 0.045), '#ffffff'),
        item('Menü', ch * 0.1, Math.round(ch * 0.022), '#ffffff'),
        contact,
        item('Hot Drinks', y0, Math.round(ch * 0.02), '#fbbf24'),
        item('Espresso ......... $4', y0 + dy, Math.round(ch * 0.018)),
        item('Cappuccino ....... $5', y0 + dy * 2, Math.round(ch * 0.018)),
        item('Latte ............. $5', y0 + dy * 3, Math.round(ch * 0.018)),
        item('Tea ............... $3', y0 + dy * 4, Math.round(ch * 0.018)),
        item('Hot Chocolate .... $6', y0 + dy * 5, Math.round(ch * 0.018)),
        item('Snacks', y0 + dy * 6, Math.round(ch * 0.02), '#fbbf24'),
        item('Croissant ......... $5', y0 + dy * 7, Math.round(ch * 0.018)),
        item('Cheesecake ....... $8', y0 + dy * 8, Math.round(ch * 0.018)),
        item('Sandwich ......... $7', y0 + dy * 9, Math.round(ch * 0.018)),
        item('Cookie ............. $3', y0 + dy * 10, Math.round(ch * 0.018)),
        item('Muffin ............. $4', y0 + dy * 11, Math.round(ch * 0.018)),
      ];
    }
    return [item(siteName, ch * 0.1, Math.round(ch * 0.045)), contact];
  }, []);

  const generateLayout = useCallback(async (layoutType: LayoutType = 'bar') => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setGenerating(true);
    setLeftTab('ai');
    try {
      let objects: { type: string; text: string; left: number; top: number; fontSize?: number; fill?: string; originX?: 'center' }[] = [];
      try {
        const res = await fetch('/api/ai/generate-layout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: `generate a ${layoutType} menu layout for 1920x1080` }),
        });
        const data = await res.json();
        objects = Array.isArray(data?.objects) ? data.objects : [];
      } catch { /* API yok veya hata – fallback kullan */ }
      const cw = (canvas as { width?: number }).width ?? 1920;
      const ch = (canvas as { height?: number }).height ?? 1080;
      if (objects.length === 0) {
        let siteName = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SITE_NAME) || (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_NAME) || 'Menümüz';
        let contactLine = '';
        try {
          const contactRes = await fetch('/api/contact-info', { cache: 'no-store' });
          const contactData = await contactRes.json().catch(() => ({}));
          const phone = contactData.phone?.trim() || '';
          const appUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_URL) ? String(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, '') : (typeof window !== 'undefined' ? window.location.origin : '');
          const parts = [phone];
          if (appUrl) parts.push(appUrl.replace(/^https?:\/\//, ''));
          contactLine = parts.filter(Boolean).join('  •  ') || 'İletişim bilgileri Ayarlar\'dan ekleyebilirsiniz';
        } catch {
          contactLine = typeof window !== 'undefined' ? window.location.origin.replace(/^https?:\/\//, '') : 'İletişim';
        }
        objects = getLayoutObjects(layoutType, cw, ch, { siteName, contactLine });
      }
      const fabric = await import('fabric');
      const padding = 80;
      const minFontSize = 10;
      const maxFontSize = 64;
      const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

      // Mevcut içerik (resim vb.) silinmez; yazılar üzerine eklenir
      const currentBg = bgColorRef.current || '#0f172a';
      canvas.backgroundColor = currentBg;
      for (const obj of objects) {
        if (obj.type === 'text' && obj.text) {
          const isCentered = (obj as { originX?: string }).originX === 'center';
          const left = clamp(obj.left, padding, cw - padding);
          const top = clamp(obj.top, padding, ch - padding);
          const fontSize = clamp(obj.fontSize ?? 32, minFontSize, maxFontSize);

          const opts: Record<string, unknown> = {
            left: isCentered ? cw / 2 : left,
            top,
            originX: isCentered ? 'center' : 'left',
            originY: 'top',
            textAlign: isCentered ? 'center' : 'left',
            fontSize,
            fill: obj.fill ?? '#ffffff',
            padding: 0,
          };
          const t = new fabric.FabricText(obj.text, opts as object);
          canvas.add(t);
          t.setCoords();
          canvas.bringObjectToFront(t);
        }
      }
      canvas.renderAll();
      pushHistoryRef.current();
      setSaved(false);
      refreshLayers();
      saveDraftRef.current();
    } finally {
      setGenerating(false);
    }
  }, [refreshLayers, getLayoutObjects]);

  const exportPng = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const prevZoom = c.getZoom();
    const prevVpt = (c.viewportTransform?.slice() ?? [1, 0, 0, 1, 0, 0]) as [number, number, number, number, number, number];
    const activeObj = (c as { getActiveObject?: () => unknown }).getActiveObject?.();
    (c as { discardActiveObject?: () => void }).discardActiveObject?.();
    c.setZoom(1);
    c.setViewportTransform([1, 0, 0, 1, 0, 0]);
    c.renderAll();
    const url = (c as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 1 }) ?? '';
    c.setZoom(prevZoom);
    c.setViewportTransform(prevVpt);
    if (activeObj) (c as { setActiveObject?: (o: unknown) => boolean }).setActiveObject?.(activeObj);
    c.requestRenderAll();
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.png';
    a.click();
    setFileMenuOpen(false);
  }, []);

  const newCanvas = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    if (!window.confirm('Mevcut tasarım silinecek. Devam edilsin mi?')) return;
    const fabric = await import('fabric');
    canvas.clear();
    canvas.backgroundColor = bgColor;
    canvas.renderAll();
    historyRef.current = [];
    historyIndexRef.current = -1;
    const json = JSON.stringify((canvas as { toObject: (p?: string[]) => object }).toObject(['selectable', 'evented']));
    historyRef.current = [json];
    historyIndexRef.current = 0;
    setDesignTitle('');
    setSaved(false);
    setFileMenuOpen(false);
    refreshLayers();
    saveDraftRef.current();
  }, [bgColor, refreshLayers]);

  const effectiveScope = isAdmin ? saveScope : 'user' as const;
  const effectiveTargetUserId = (effectiveScope === 'user' && isAdmin && saveTargetUserId) ? saveTargetUserId : null;

  const saveDesign = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const name = (saveDialogOpen ? saveName : window.prompt('Şablon adı:', designTitle)) || designTitle;
    if (!name.trim()) return;
    setSaving(true);
    setOverwriteConfirm(null);
    try {
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
      const checkUrl = `/api/full-editor/templates?name=${encodeURIComponent(name.trim())}&scope=${effectiveScope}${effectiveTargetUserId ? `&user_id=${encodeURIComponent(effectiveTargetUserId)}` : ''}`;
      const checkRes = await fetch(checkUrl, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const existing = await checkRes.json().catch(() => null);
      const existingId = existing && typeof existing === 'object' && existing.id ? String(existing.id) : null;
      if (existingId) {
        setOverwriteConfirm({ id: existingId, name: name.trim() });
        setSaving(false);
        return;
      }
      const previewDataUrl = (canvas as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 0.6 }) ?? '';
      const body: Record<string, unknown> = {
        name: name.trim(),
        canvas_json: (canvas as { toObject: (p?: string[]) => object }).toObject(['selectable', 'evented']),
        category_id: selectedCategoryId,
        preview_image: previewDataUrl || undefined,
      };
      if (isAdmin) {
        body.scope = saveScope;
        if (saveScope === 'user' && saveTargetUserId) body.target_user_id = saveTargetUserId;
      } else {
        body.scope = 'user';
      }
      const res = await fetch('/api/full-editor/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg = err?.detail ? `${err?.error || 'Kaydetme başarısız'}: ${err.detail}` : (err?.error || 'Kaydetme başarısız');
        throw new Error(msg);
      }
      const data = await res.json().catch(() => ({}));
      setSavedTemplateId(data?.id ?? null);
      setSaved(true);
      setSaveDialogOpen(false);
      setSaveDestinationModalOpen(false);
      setOverwriteConfirm(null);
      setFileMenuOpen(false);
      refreshTemplates();
      toast.showSuccess('Tasarım kaydedildi.');
    } catch (e) {
      const errMsg = (e as Error).message || 'Kaydetme başarısız';
      if ((errMsg.includes('full_editor_templates') || errMsg.includes('schema cache')) && isAdmin) {
        try {
          const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
          const setupRes = await fetch('/api/setup/full-editor-tables', {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (setupRes.ok) {
            toast.showSuccess('Tablolar oluşturuldu. Tekrar kaydetmeyi deneyin.');
          } else {
            const setupErr = await setupRes.json().catch(() => ({}));
            const setupMsg = setupErr?.message || setupErr?.error || 'Tablolar oluşturulamadı. Supabase SQL Editor\'da migration-full-editor-categories-templates.sql çalıştırın.';
            toast.showError(setupMsg);
          }
        } catch {
          toast.showError('Veritabanı hazır değil. Yönetici /api/setup/full-editor-tables çalıştırmalı.');
        }
      } else if (errMsg.includes('full_editor_templates') || errMsg.includes('schema cache')) {
        toast.showError('Veritabanı hazır değil. Lütfen yönetici ile iletişime geçin.');
      } else {
        toast.showError(errMsg);
      }
    } finally {
      setSaving(false);
    }
  }, [designTitle, selectedCategoryId, saveName, isAdmin, saveScope, saveTargetUserId, effectiveScope, effectiveTargetUserId, toast, refreshTemplates, saveDialogOpen]);

  const saveDesignOverwrite = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !overwriteConfirm) return;
    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
      const previewDataUrl = (canvas as { toDataURL?: (o?: object) => string }).toDataURL?.({ format: 'png', multiplier: 0.6 }) ?? '';
      const res = await fetch('/api/full-editor/templates', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          id: overwriteConfirm.id,
          canvas_json: (canvas as { toObject: (p?: string[]) => object }).toObject(['selectable', 'evented']),
          preview_image: previewDataUrl || null,
          category_id: selectedCategoryId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'Güncelleme başarısız');
      }
      setSavedTemplateId(overwriteConfirm.id);
      setSaved(true);
      setSaveDialogOpen(false);
      setSaveDestinationModalOpen(false);
      setOverwriteConfirm(null);
      setFileMenuOpen(false);
      refreshTemplates();
      toast.showSuccess('Şablon güncellendi.');
    } catch (e) {
      toast.showError((e as Error).message || 'Güncelleme başarısız');
    } finally {
      setSaving(false);
    }
  }, [overwriteConfirm, selectedCategoryId, toast, refreshTemplates]);

  const undo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const json = historyRef.current[historyIndexRef.current];
    if (!json) return;
    try {
      await canvas.loadFromJSON(json);
      constrainAllObjects(canvas);
      canvas.renderAll();
      setSaved(false);
      setHistoryTickRef.current?.((t) => t + 1);
    } catch { /* ignore */ }
    setFileMenuOpen(false);
  }, []);

  const redo = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const hist = historyRef.current;
    if (!canvas || historyIndexRef.current >= hist.length - 1) return;
    historyIndexRef.current++;
    const json = hist[historyIndexRef.current];
    if (!json) return;
    try {
      await canvas.loadFromJSON(json);
      constrainAllObjects(canvas);
      canvas.renderAll();
      setSaved(false);
      setHistoryTickRef.current?.((t) => t + 1);
    } catch { /* ignore */ }
    setFileMenuOpen(false);
  }, []);

  const duplicateSelected = useCallback(async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !canvas) return;
    try {
      const cloned = await active.clone();
      cloned.set({ left: (cloned.left ?? 0) + 20, top: (cloned.top ?? 0) + 20 });
      canvas.add(cloned);
      cloned.setCoords();
      const cw = (canvas as { width?: number }).width ?? 1920;
      const ch = (canvas as { height?: number }).height ?? 1080;
      constrainObjectToCanvas(cloned, cw, ch);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
      pushHistoryRef.current();
      setSaved(false);
      refreshLayers();
      saveDraftRef.current();
    } catch (e) {
      console.error('Çoğaltma hatası:', e);
    }
  }, [refreshLayers]);

  const addImageFromUrl = useCallback(async (url: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    try {
      const fabric = await import('fabric');
      const cw = (canvas as { width?: number }).width ?? 1920;
      const ch = (canvas as { height?: number }).height ?? 1080;
      const hasImage = canvas.getObjects().some((o) => (o as { type?: string }).type === 'image');
      const hasBg = !!(canvas as { backgroundImage?: unknown }).backgroundImage;

      if (!hasImage && !hasBg) {
        const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
        img.setCoords();
        const r = img.getBoundingRect();
        if (r.width > 0 && r.height > 0) {
          const scale = Math.max(cw / r.width, ch / r.height);
          (img as { scaleX?: number; scaleY?: number }).scaleX = ((img as { scaleX?: number }).scaleX ?? 1) * scale;
          (img as { scaleX?: number; scaleY?: number }).scaleY = ((img as { scaleY?: number }).scaleY ?? 1) * scale;
          img.set({ left: cw / 2, top: ch / 2, originX: 'center', originY: 'center' });
        }
        canvas.set('backgroundImage', img);
        canvas.renderAll();
        pushHistoryRef.current();
        setSaved(false);
        refreshLayers();
        saveDraftRef.current();
        return;
      }

      const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      img.setCoords();
      const fitToBlock = () => {
        img.setCoords();
        const r = img.getBoundingRect();
        if (r.width <= 0 || r.height <= 0) {
          requestAnimationFrame(fitToBlock);
          return;
        }
        fitObjectToCanvas(img, cw, ch, { fullArea: true });
        constrainObjectToCanvas(img, cw, ch);
        canvas.sendObjectToBack(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        pushHistoryRef.current();
        setSaved(false);
        refreshLayers();
        saveDraftRef.current();
      };
      requestAnimationFrame(() => requestAnimationFrame(fitToBlock));
      setTimeout(fitToBlock, 100);
      setTimeout(fitToBlock, 300);
    } catch (e) {
      console.error('Resim yükleme hatası:', e);
      toast.showError('Resim yüklenemedi.');
    }
  }, [refreshLayers]);

  const addVideoToCanvas = useCallback(async (url: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    try {
      const fabric = await import('fabric');
      const cw = (canvas as { width?: number }).width ?? 1920;
      const ch = (canvas as { height?: number }).height ?? 1080;
      const video = document.createElement('video');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      video.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Video yüklenemedi'));
        video.src = url;
      });
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      video.width = vw;
      video.height = vh;
      const img = new fabric.FabricImage(video as unknown as HTMLImageElement, {
        left: cw / 2,
        top: ch / 2,
        originX: 'center',
        originY: 'center',
      });
      canvas.add(img);
      canvas.sendObjectToBack(img);
      img.setCoords();
      fitObjectToCanvas(img, cw, ch, { fullArea: true });
      constrainObjectToCanvas(img, cw, ch);
      canvas.sendObjectToBack(img);
      canvas.setActiveObject(img);
      canvas.requestRenderAll();
      pushHistoryRef.current();
      setSaved(false);
      refreshLayers();
      saveDraftRef.current();
      (img.getElement() as HTMLVideoElement)?.play?.();
      if (videoRenderRafRef.current == null) {
        const loop = () => {
          videoRenderRafRef.current = requestAnimationFrame(loop);
          fabricCanvasRef.current?.requestRenderAll();
        };
        loop();
      }
    } catch (e) {
      console.error('Video ekleme hatası:', e);
      toast.showError('Video eklenemedi.');
    }
  }, [refreshLayers, toast]);

  useEffect(() => {
    return () => {
      if (videoRenderRafRef.current != null) {
        cancelAnimationFrame(videoRenderRafRef.current);
        videoRenderRafRef.current = null;
      }
    };
  }, []);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const assets = data?.assets ?? data?.data ?? [];
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        if (a?.src) {
          await addImageFromUrl(a.src);
          try {
            const f = files[i];
            const baseName = f?.name ? f.name.replace(/\.[^/.]+$/, '') : '';
            await apiClient('/content-library', {
              method: 'POST',
              body: {
                name: baseName || 'Resim',
                category: 'food',
                type: 'image',
                url: a.src,
                display_order: 0,
              },
            });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
          } catch {
            // Auth yoksa veya hata olursa sessizce geç; resim canvas'a eklendi
          }
        }
      }
      refreshUploadsList();
    } catch {
      toast.showError('Yükleme başarısız.');
    }
    e.target.value = '';
  }, [addImageFromUrl, refreshUploadsList]);

  const handleVideoUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      const assets = data?.assets ?? data?.data ?? [];
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        if (a?.src) {
          try {
            const f = files[i];
            const baseName = f?.name ? f.name.replace(/\.[^/.]+$/, '') : 'Video';
            await apiClient('/content-library', {
              method: 'POST',
              body: { name: baseName || 'Video', category: 'food', type: 'video', url: a.src, display_order: 0 },
            });
            if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('content-library-updated'));
          } catch {
            toast.showError('Video kütüphaneye eklenemedi.');
          }
        }
      }
      apiClient('/content-library?type=video')
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];
          setRecordVideos(arr.map((r: { id: string; name?: string; url?: string; type?: string }) => ({ id: r.id, name: String(r.name ?? ''), url: String(r.url ?? ''), type: r.type ?? 'video' })));
        })
        .catch(() => {});
    } catch {
      toast.showError('Video yükleme başarısız.');
    }
    e.target.value = '';
  }, [toast]);

  const updateTextContent = useCallback((text: string) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !canvas) return;
    const type = (active as { type?: string }).type ?? '';
    if (!['text', 'i-text', 'textbox', 'Textbox'].includes(type)) return;
    (active as { set: (k: string, v: unknown) => void }).set('text', text);
    canvas.renderAll();
    active.setCoords();
    const cw = (canvas as { width?: number }).width ?? 1920;
    const ch = (canvas as { height?: number }).height ?? 1080;
    fitObjectToCanvas(active, cw, ch, { center: false });
    canvas.renderAll();
    setSelectedProps((p) => ({ ...p, text }));
    setSaved(false);
    saveDraftRef.current();
  }, []);

  const updateTextProp = useCallback((key: 'fontSize' | 'fill' | 'fontFamily' | 'fontWeight' | 'fontStyle', value: number | string) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !canvas) return;
    const type = (active as { type?: string }).type ?? '';
    if (!['text', 'i-text', 'textbox', 'Textbox'].includes(type)) return;
    (active as { set: (k: string, v: unknown) => void }).set(key, value);
    canvas.renderAll();
    if (key === 'fontSize' || key === 'fontFamily') {
      active.setCoords();
      const cw = (canvas as { width?: number }).width ?? 1920;
      const ch = (canvas as { height?: number }).height ?? 1080;
      fitObjectToCanvas(active, cw, ch, { center: false });
    }
    canvas.renderAll();
    setSelectedProps((p) => ({ ...p, [key]: value }));
    setSaved(false);
    saveDraftRef.current();
    // Google Fonts asenkron yüklenir; font seçildiğinde yüklenene kadar bekle, sonra canvas'ı yeniden çiz
    if (key === 'fontFamily' && typeof value === 'string' && value && typeof document?.fonts?.load === 'function') {
      const fontSize = (active as { fontSize?: number }).fontSize ?? 36;
      const fontSpec = `${fontSize}px "${value}"`;
      document.fonts.load(fontSpec).then(() => {
        fabricCanvasRef.current?.requestRenderAll();
      }).catch(() => {});
      setTimeout(() => fabricCanvasRef.current?.requestRenderAll(), 800);
    }
  }, []);

  const applyGradient = useCallback(async (cssGradient: string) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !canvas) return;
    const type = (active as { type?: string }).type ?? '';
    if (!['text', 'i-text', 'textbox', 'Textbox'].includes(type)) return;
    const fabric = await import('fabric');
    const w = (active as { width?: number }).width ?? 200;
    const h = (active as { height?: number }).height ?? 50;
    const grad = createFabricGradient(fabric as { Gradient: new (opts: object) => unknown }, cssGradient, w, h);
    (active as { set: (k: string, v: unknown) => void }).set('fill', grad);
    canvas.renderAll();
    setSelectedProps((p) => ({ ...p, fill: cssGradient }));
    setSaved(false);
    saveDraftRef.current();
  }, []);

  const setBackground = useCallback((color: string) => {
    bgColorRef.current = color;
    setBgColor(color);
    if (typeof window !== 'undefined') localStorage.setItem(DRAFT_BG_KEY, color);
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.backgroundColor = color;
      canvas.renderAll();
      setSaved(false);
      saveDraftRef.current();
    }
  }, []);

  const removeBackgroundImage = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.set('backgroundImage', null);
    canvas.renderAll();
    setSaved(false);
    saveDraftRef.current();
    pushHistoryRef.current();
  }, []);

  const updateObjectFill = useCallback((color: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objs = (canvas as { getActiveObjects?: () => import('fabric').FabricObject[] }).getActiveObjects?.() ?? [];
    const active = canvas.getActiveObject();
    const targets = objs.length > 0 ? objs : (active ? [active] : []);
    if (targets.length === 0) return;
    targets.forEach((obj) => {
      const o = obj as { set?: (k: string, v: unknown) => void };
      if (typeof o.set === 'function') o.set('fill', color);
    });
    canvas.renderAll();
    setSelectedProps((p) => ({ ...p, fill: color }));
    setSaved(false);
    saveDraftRef.current();
  }, []);

  const setBlockBackgroundImage = useCallback(async (url: string) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    const type = (active as { type?: string })?.type ?? '';
    if (!active || type !== 'rect' || !canvas) {
      toast.showError('Önce bir blok seçin.');
      return;
    }
    try {
      const fabric = await import('fabric');
      const imgEl = new window.Image();
      imgEl.crossOrigin = 'anonymous';
      imgEl.src = url;
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = () => reject(new Error('Resim yüklenemedi'));
      });
      const rect = active;
      const r = rect.getBoundingRect();
      const rectW = r.width || 1;
      const rectH = r.height || 1;
      const imgW = imgEl.naturalWidth || 1;
      const imgH = imgEl.naturalHeight || 1;
      const scale = Math.max(rectW / imgW, rectH / imgH);
      const pattern = new fabric.Pattern({
        source: imgEl,
        repeat: 'no-repeat',
        patternTransform: [scale, 0, 0, scale, 0, 0],
      });
      (rect as { set: (k: string, v: unknown) => void }).set('fill', pattern);
      canvas.renderAll();
      setSaved(false);
      saveDraftRef.current();
      pushHistoryRef.current();
      toast.showSuccess('Blok arka planına resim eklendi.');
    } catch (e) {
      toast.showError('Resim eklenemedi: ' + (e instanceof Error ? e.message : ''));
    }
  }, [toast]);

  const [removingBg, setRemovingBg] = useState(false);
  const removeImageBackgroundAi = useCallback(async (imgObj: import('fabric').FabricObject) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const img = imgObj as { getSrc?: () => string; _element?: HTMLImageElement };
    let src = img.getSrc?.() ?? img._element?.src ?? img._element?.currentSrc ?? '';
    if (!src || typeof src !== 'string') {
      toast.showError('Resim kaynağı alınamadı.');
      return;
    }
    if (typeof window !== 'undefined' && src.startsWith('/') && !src.startsWith('//')) {
      src = `${window.location.origin}${src}`;
    }
    setRemovingBg(true);
    try {
      let dataUrl: string;
      try {
        const data = await apiClient('/ai/remove-background', { method: 'POST', body: { image: src } });
        dataUrl = (data as { dataUrl?: string })?.dataUrl ?? '';
        if (!dataUrl) throw new Error('API yanıtı boş');
      } catch (e: unknown) {
        const useBrowser = (e as { status?: number })?.status === 501;
        if (!useBrowser) throw e;
        const { removeBackgroundInBrowser } = await import('@/lib/remove-background-browser');
        dataUrl = await removeBackgroundInBrowser(src);
      }
      const fabric = await import('fabric');
      const newImg = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' });
      const left = (imgObj as { left?: number }).left ?? 0;
      const top = (imgObj as { top?: number }).top ?? 0;
      const scaleX = (imgObj as { scaleX?: number }).scaleX ?? 1;
      const scaleY = (imgObj as { scaleY?: number }).scaleY ?? 1;
      const originX = (imgObj as { originX?: string }).originX ?? 'left';
      const originY = (imgObj as { originY?: string }).originY ?? 'top';
      newImg.set({ left, top, scaleX, scaleY, originX, originY });
      const idx = canvas.getObjects().indexOf(imgObj);
      canvas.remove(imgObj);
      canvas.insertAt(idx, newImg);
      canvas.setActiveObject(newImg);
      canvas.renderAll();
      setSaved(false);
      saveDraftRef.current();
      pushHistoryRef.current();
      toast.showSuccess('Resim arka planı kaldırıldı.');
    } catch (e) {
      toast.showError('Arka plan kaldırılamadı: ' + (e instanceof Error ? e.message : 'Bilinmeyen hata'));
    } finally {
      setRemovingBg(false);
    }
  }, [toast]);

  const clearBlockBackground = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    const type = (active as { type?: string })?.type ?? '';
    if (!active || !canvas) {
      toast.showError('Önce bir nesne seçin.');
      return;
    }
    if (type === 'rect') {
      (active as { set: (k: string, v: unknown) => void }).set('fill', '#E5E7EB');
      canvas.renderAll();
      setSelectedProps((p) => ({ ...p, fill: '#E5E7EB' }));
      setSaved(false);
      saveDraftRef.current();
      pushHistoryRef.current();
      toast.showSuccess('Blok arka planı kaldırıldı.');
      return;
    }
    if (type === 'image') {
      removeImageBackgroundAi(active);
      return;
    }
    toast.showError('Arka plan kaldır sadece blok veya resim için geçerlidir.');
  }, [toast, removeImageBackgroundAi]);

  /** Tüm nesneleri 16:9 canvas'a sığdır – önizleme ve TV yayını ile birebir eşleşir */
  const fitAllToCanvas = useCallback(() => {
    const c = fabricCanvasRef.current;
    if (!c) return;
    const objs = c.getObjects();
    if (objs.length === 0) return;
    objs.forEach((o) => o.setCoords());
    const rects = objs.map((o) => o.getBoundingRect());
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    rects.forEach((r) => {
      minX = Math.min(minX, r.left);
      minY = Math.min(minY, r.top);
      maxX = Math.max(maxX, r.left + r.width);
      maxY = Math.max(maxY, r.top + r.height);
    });
    const cw = (c as { width?: number }).width ?? 1920;
    const ch = (c as { height?: number }).height ?? 1080;
    const contentW = Math.max(maxX - minX, 1);
    const contentH = Math.max(maxY - minY, 1);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const scaleX = cw / contentW;
    const scaleY = ch / contentH;
    // Math.min = contain: içerik canvas içine tam sığar, TV/önizlemede birebir aynı görünür
    const s = Math.min(scaleX, scaleY);
    const newCenterX = cw / 2;
    const newCenterY = ch / 2;
    objs.forEach((obj, i) => {
      const r = rects[i];
      const objCenterX = r.left + r.width / 2;
      const objCenterY = r.top + r.height / 2;
      const oldScaleX = obj.scaleX ?? 1;
      const oldScaleY = obj.scaleY ?? 1;
      obj.set({ scaleX: oldScaleX * s, scaleY: oldScaleY * s });
      const dx = (objCenterX - centerX) * s;
      const dy = (objCenterY - centerY) * s;
      // Merkez bazlı konumlandırma – tüm nesneler için aynı, önizlemede kayma/kesilme olmasın
      obj.set({
        originX: 'center',
        originY: 'center',
        left: newCenterX + dx,
        top: newCenterY + dy,
      });
      obj.setCoords();
    });
    constrainAllObjects(c);
    c.renderAll();
    pushHistoryRef.current();
    setSaved(false);
    refreshLayers();
    saveDraftRef.current();
  }, [refreshLayers]);

  const bringToFront = useCallback(() => {
    const c = fabricCanvasRef.current;
    const o = c?.getActiveObject();
    if (!o || !c) return;
    c.bringObjectToFront(o);
    c.renderAll();
    refreshLayers();
    setSaved(false);
    saveDraftRef.current();
  }, [refreshLayers]);
  const sendToBack = useCallback(() => {
    const c = fabricCanvasRef.current;
    const o = c?.getActiveObject();
    if (!o || !c) return;
    c.sendObjectToBack(o);
    c.renderAll();
    refreshLayers();
    setSaved(false);
    saveDraftRef.current();
  }, [refreshLayers]);

  const updateAnim = useCallback((key: 'animStart' | 'animEnd', value: string) => {
    const c = fabricCanvasRef.current;
    const o = c?.getActiveObject();
    if (!o || !c) return;
    const data = ((o as { data?: object }).data ?? {}) as Record<string, string>;
    data[key] = value === 'none' ? '' : value;
    (o as { data?: object }).data = data;
    if (key === 'animStart') setAnimStart(value);
    else setAnimEnd(value);
    c.renderAll();
    setSaved(false);
  }, []);

  const leftTabs: { id: LeftTab; label: string; Icon: typeof Upload }[] = [
    { id: 'uploads', label: 'Yüklemelerim', Icon: Upload },
    { id: 'templates', label: 'Şablonlar', Icon: LayoutTemplate },
    { id: 'record', label: 'video yop', Icon: CircleDot },
    { id: 'media', label: 'Medya', Icon: Image },
    { id: 'text', label: 'Metin', Icon: Type },
    { id: 'ai', label: 'AI', Icon: Sparkles },
    { id: 'background', label: 'Arka Plan', Icon: Palette },
    { id: 'layout', label: 'Yerleşim', Icon: Grid3X3 },
    { id: 'more', label: 'Daha Fazla', Icon: MoreHorizontal },
  ];

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < Math.max(0, historyRef.current.length - 1);

  useEffect(() => {
    setHistoryTickRef.current = setHistoryTick;
    return () => { setHistoryTickRef.current = null; };
  }, []);

  useEffect(() => {
    if (!fileMenuOpen) return;
    const close = () => setFileMenuOpen(false);
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [fileMenuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey)) {
        if (e.key === 'z') { e.preventDefault(); undo(); }
        if (e.key === 'y') { e.preventDefault(); redo(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
      {/* Top bar – PosterMyWall style */}
      <header className={`flex items-center justify-between h-14 px-4 bg-background border-b border shrink-0 ${showTvPreviewModal ? 'hidden' : ''}`}>
        <div className="flex items-center gap-4">
          <Link href={localePath('/dashboard')} className="text-foreground/70 hover:text-foreground">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </Link>
          <span className="font-semibold text-foreground">MenuSlide</span>
          <div className="relative">
            <button onClick={() => setFileMenuOpen((o) => !o)} className="text-sm text-foreground/70 hover:text-foreground flex items-center gap-1">
              Dosya <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {fileMenuOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-background border rounded-lg shadow-lg z-50 min-w-[140px]">
                <button onClick={newCanvas} className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5">Yeni</button>
                <button
                  onClick={() => {
                    setSaveName(designTitle);
                    if (isAdmin) { setSaveDestinationModalOpen(true); setFileMenuOpen(false); }
                    else { setSaveDialogOpen(true); setFileMenuOpen(false); }
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5"
                >
                  Kaydet
                </button>
                <button onClick={exportPng} className="w-full text-left px-3 py-2 text-sm hover:bg-foreground/5">İndir (PNG)</button>
              </div>
            )}
          </div>
          <button onClick={() => document.getElementById('canvas-size-section')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm text-foreground/70 hover:text-foreground">Resize</button>
          <div className="flex gap-1">
            <button onClick={undo} disabled={!canUndo} className="p-1.5 rounded hover:bg-foreground/10 disabled:opacity-40" title="Geri al (Ctrl+Z)"><RotateCcw className="w-4 h-4" /></button>
            <button onClick={redo} disabled={!canRedo} className="p-1.5 rounded hover:bg-foreground/10 disabled:opacity-40" title="İleri al (Ctrl+Y)"><RotateCw className="w-4 h-4" /></button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-green-600">{saved ? 'Değişiklikler kaydedildi' : 'Kaydedilmedi'}</span>
          <button className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600">Upgrade</button>
          <button onClick={() => { navigator.clipboard?.writeText(window.location.href); toast.showSuccess('Link kopyalandı.'); }} className="text-sm text-foreground/70 hover:text-foreground">Paylaş</button>
          <button onClick={exportPng} className="text-sm text-foreground/70 hover:text-foreground">İndir</button>
          <button
            onClick={() => {
              setSaveName(designTitle);
              if (isAdmin) setSaveDestinationModalOpen(true);
              else setSaveDialogOpen(true);
            }}
            className="px-4 py-2 text-sm font-medium bg-blue-800 text-white rounded-lg hover:bg-blue-900"
          >
            {isAdmin ? 'Kaydet ▾' : 'Kaydet'}
          </button>
        </div>
      </header>

      <div className={`flex flex-1 min-h-0 ${showTvPreviewModal ? 'relative' : ''}`}>
        {/* Left sidebar – PosterMyWall style */}
        <aside className={`w-20 shrink-0 bg-background border-r border flex flex-col ${showTvPreviewModal ? 'hidden' : ''}`}>
          {leftTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setLeftTab(tab.id)}
              className={`flex flex-col items-center justify-center py-3 px-2 text-xs border-b border hover:bg-foreground/5 ${
                leftTab === tab.id ? 'bg-blue-800/30 text-blue-400' : 'text-foreground/70'
              }`}
              title={tab.label}
            >
              <tab.Icon className="w-5 h-5 mb-0.5" strokeWidth={2} />
              <span className="text-[10px] leading-tight text-center">{tab.label.split(' ')[0]}</span>
            </button>
          ))}
        </aside>

        {/* Left panel content */}
        <div className={`w-64 shrink-0 bg-background border-r border flex flex-col min-h-0 overflow-y-auto ${showTvPreviewModal ? 'hidden' : ''}`}>
          {leftTab === 'text' && (
            <div className="p-4 space-y-4">
              <button onClick={addText} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-gray-800 text-white rounded text-sm hover:bg-gray-700">
                <Type className="w-4 h-4" /> Metin Ekle
              </button>
              <div>
                <h3 className="text-xs font-semibold text-foreground mb-1">Hazır Şekiller</h3>
                <p className="text-[10px] text-muted mb-2">Tıklayarak tasarıma ekleyin</p>
                <div className="grid grid-cols-2 gap-1">
                  {SHAPE_MODELS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addShape(s.id)}
                      className="flex items-center gap-1.5 px-2 py-1.5 border border-gray-200 rounded text-[10px] hover:bg-foreground/5 hover:border-blue-400 text-left"
                      title={s.label}
                    >
                      <div className="w-5 h-5 shrink-0 rounded border" style={{ backgroundColor: s.fill, borderColor: s.stroke }} />
                      <span className="truncate flex-1">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {leftTab === 'ai' && (
            <div className="p-4 space-y-2">
              <button onClick={() => generateLayout('bar')} disabled={generating} className="w-full py-2 px-3 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50">
                {generating ? 'Üretiliyor…' : 'Bar'}
              </button>
              <button onClick={() => generateLayout('restoran')} disabled={generating} className="w-full py-2 px-3 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50">
                {generating ? 'Üretiliyor…' : 'Restoran'}
              </button>
              <button onClick={() => generateLayout('cafe')} disabled={generating} className="w-full py-2 px-3 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-50">
                {generating ? 'Üretiliyor…' : 'Cafe'}
              </button>
              <p className="text-xs text-muted mt-2">1920×1080 menü şablonu</p>
              <button
                onClick={clearBlockBackground}
                disabled={removingBg}
                className="w-full py-2 px-3 border border-amber-200 rounded text-sm font-medium text-amber-700 hover:bg-amber-50 mt-3 disabled:opacity-50"
              >
                {removingBg ? 'İşleniyor…' : 'Arka plan kaldır'}
              </button>
              <p className="text-xs text-muted">Seçili bloktan veya resimden arka planı kaldırır (AI)</p>
            </div>
          )}
          {leftTab === 'background' && (
            <div className="p-4 space-y-3">
              <button onClick={removeBackgroundImage} className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Arka plan resmini sil
              </button>
              <label className="block text-xs font-medium text-muted">Hızlı Renkler</label>
              <div className="grid grid-cols-3 gap-2">
                {BACKGROUND_PRESETS.map((color) => (
                  <button key={color} onClick={() => setBackground(color)} className={`aspect-square rounded-lg border-2 transition-all ${bgColor === color ? 'ring-2 ring-blue-700 border-blue-700' : 'border-gray-200 hover:border-gray-300'}`} style={{ backgroundColor: color }} title={color} />
                ))}
              </div>
              <label className="block text-xs font-medium text-muted">Özel Renk</label>
              <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-10 rounded border cursor-pointer" />
              <input type="text" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full px-2 py-1 text-xs font-mono border rounded" />
            </div>
          )}
          {leftTab === 'templates' && (
            <div className="p-4 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Kategoriler</h3>
              {categoriesLoading ? (
                <p className="text-xs text-muted">Yükleniyor…</p>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedCategoryId(null)}
                    className={`w-full text-left p-2 rounded-lg text-sm ${!selectedCategoryId ? 'bg-blue-800/30 text-blue-400' : 'hover:bg-gray-50 dark:hover:bg-foreground/5'}`}
                  >
                    Tümü
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`w-full text-left rounded-lg overflow-hidden border transition-colors ${
                        selectedCategoryId === cat.id ? 'ring-2 ring-blue-700 border-blue-700' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {cat.image_url_1 ? (
                        <img src={cat.image_url_1} alt={cat.name} className="w-full aspect-[16/9] object-cover" />
                      ) : (
                        <div className="w-full aspect-[16/9] bg-gray-200 flex items-center justify-center text-gray-400 text-2xl">📋</div>
                      )}
                      <div className="p-2">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        {cat.description && <p className="text-xs text-muted line-clamp-2">{cat.description}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}
              {templates.length > 0 && (
                <div className="pt-3 border-t">
                  <h3 className="text-sm font-semibold text-foreground mb-2">Şablonlar ({templates.length})</h3>
                  <div className="space-y-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        onClick={() => setTemplatePreviewItem(tpl)}
                        className="w-full text-left p-2 rounded border border-gray-200 hover:bg-gray-50 text-sm"
                      >
                        {tpl.preview_image ? (
                          <img src={tpl.preview_image} alt={tpl.name} className="w-full aspect-[16/9] object-cover rounded mb-1" />
                        ) : (
                          <div className="w-full aspect-[16/9] bg-gray-100 rounded flex items-center justify-center text-gray-400 text-lg mb-1">📄</div>
                        )}
                        <span className="font-medium">{tpl.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {leftTab === 'media' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Medya Kütüphanesi</h3>
              <p className="text-xs text-muted">Kütüphanedeki resimlere tıklayarak önizleme açın, sonra Kullan ile ekleyin.</p>
              {mediaLibraryLoading ? (
                <p className="text-xs text-muted">Yükleniyor…</p>
              ) : mediaLibraryList.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {mediaLibraryList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setMediaPreviewItem(u)}
                      className="relative aspect-video rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-blue-500 bg-gray-100"
                    >
                      <img src={u.url} alt={u.name} className="w-full h-full object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">Kütüphanede resim bulunamadı.</p>
              )}
              {mediaPreviewItem && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setMediaPreviewItem(null)}>
                  <div className="bg-background rounded-lg shadow-xl border max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                    <div className="p-3">
                      <p className="text-sm font-medium text-foreground truncate mb-2">{mediaPreviewItem.name}</p>
                      <div className="aspect-video rounded border border-gray-200 overflow-hidden bg-gray-100 mb-3">
                        <img src={mediaPreviewItem.url} alt={mediaPreviewItem.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const active = fabricCanvasRef.current?.getActiveObject();
                              const isRect = (active as { type?: string })?.type === 'rect';
                              if (isRect && mediaPreviewItem.type !== 'video') setBlockBackgroundImage(mediaPreviewItem.url);
                              else addImageFromUrl(mediaPreviewItem.url);
                              setMediaPreviewItem(null);
                            }}
                            className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                          >
                            Kullan
                          </button>
                          <button
                            onClick={() => setMediaPreviewItem(null)}
                            className="flex-1 py-2 px-3 border border-gray-300 rounded text-sm font-medium hover:bg-foreground/5"
                          >
                            Kapat
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            clearBlockBackground();
                            setMediaPreviewItem(null);
                          }}
                          className="w-full py-2 px-3 border border-amber-200 rounded text-sm font-medium text-amber-700 hover:bg-amber-50"
                        >
                          Arka plan kaldır
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          {templatePreviewItem && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setTemplatePreviewItem(null)}>
              <div className="bg-background rounded-lg shadow-xl border max-w-lg w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate mb-2">{templatePreviewItem.name}</p>
                  <div className="aspect-video rounded border border-gray-200 overflow-hidden bg-black mb-3">
                    {templatePreviewItem.preview_image ? (
                      <img src={templatePreviewItem.preview_image} alt={templatePreviewItem.name} className="w-full h-full object-contain" />
                    ) : templatePreviewItem.canvas_json && typeof templatePreviewItem.canvas_json === 'object' ? (
                      <div className="w-full h-full min-h-[200px]">
                        <FullEditorPreviewThumb canvasJson={templatePreviewItem.canvas_json as object} />
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">Önizleme yok</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={async () => {
                        const c = fabricCanvasRef.current;
                        if (!c || !templatePreviewItem.canvas_json || typeof templatePreviewItem.canvas_json !== 'object') {
                          setTemplatePreviewItem(null);
                          return;
                        }
                        try {
                          const raw = templatePreviewItem.canvas_json as Record<string, unknown>;
                          const safe = sanitizeCanvasJsonForFabricWithVideoRestore(raw);
                          const reviver = (serialized: Record<string, unknown>, instance: Record<string, unknown>) => {
                            if (serialized?.__videoSrc != null) (instance as Record<string, unknown>).__videoSrc = serialized.__videoSrc;
                          };
                          await c.loadFromJSON(safe as object, reviver as (o: Record<string, unknown>, obj: import('fabric').FabricObject) => void);
                          c.setDimensions({ width: 1920, height: 1080 });
                          constrainAllObjects(c);
                          const cw = (c as { width?: number }).width ?? 1920;
                          const ch = (c as { height?: number }).height ?? 1080;
                          await restoreVideoObjectsInCanvas(c, cw, ch, () => {
                            if (videoRenderRafRef.current == null) {
                              const loop = () => {
                                videoRenderRafRef.current = requestAnimationFrame(loop);
                                fabricCanvasRef.current?.requestRenderAll();
                              };
                              loop();
                            }
                          });
                          c.renderAll();
                          setDesignTitle(templatePreviewItem.name ?? '');
                          pushHistoryRef.current();
                          setSaved(false);
                          refreshLayers();
                          saveDraftRef.current();
                          setTemplatePreviewItem(null);
                          toast.showSuccess('Şablon uygulandı.');
                        } catch (err: unknown) {
                          console.error('Template load error:', err);
                          toast.showError('Bu şablon yüklenemedi. Videolu şablonlar şu an desteklenmiyor; lütfen videolu olmayan bir şablon seçin veya yeni tasarımda videoyu kendiniz ekleyin.');
                        }
                      }}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Kullan
                    </button>
                    <button
                      onClick={() => setTemplatePreviewItem(null)}
                      className="flex-1 py-2 px-3 border border-gray-300 rounded text-sm font-medium hover:bg-foreground/5"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showImageLoopModal && !showImageLoopEditModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowImageLoopModal(false)}>
              <div className="bg-background rounded-lg shadow-xl border max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-3 border-b flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold text-foreground">Resim / Video Seçin</h3>
                  <button onClick={() => setShowImageLoopModal(false)} className="p-1 hover:bg-foreground/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 flex overflow-hidden">
                  <div className="w-2/3 p-3 overflow-y-auto border-r space-y-4">
                    <p className="text-xs text-muted">Birden fazla resim veya video seçebilirsiniz.</p>
                    {imageLoopLibrary.filter((i) => i.type === 'image').length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2">Resimler</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {imageLoopLibrary.filter((i) => i.type === 'image').map((item) => {
                            const sel = imageLoopSelectedIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setImageLoopSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                })}
                                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
                                className={`rounded border overflow-hidden flex flex-col cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${sel ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
                              >
                                <div className="aspect-video relative bg-black">
                                  <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                                  {sel && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30">
                                      <Check className="w-8 h-8 text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted truncate px-1.5 py-1 text-center block" title={item.name}>{item.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {imageLoopLibrary.filter((i) => i.type === 'video').length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2">Videolar</h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {imageLoopLibrary.filter((i) => i.type === 'video').map((item) => {
                            const sel = imageLoopSelectedIds.has(item.id);
                            return (
                              <div
                                key={item.id}
                                role="button"
                                tabIndex={0}
                                onClick={() => setImageLoopSelectedIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                })}
                                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
                                className={`rounded border overflow-hidden flex flex-col cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 ${sel ? 'ring-2 ring-blue-500 border-blue-500' : 'border-gray-200'}`}
                              >
                                <div className="aspect-video relative bg-black">
                                  <video src={item.url} className="w-full h-full object-contain" muted playsInline preload="metadata" />
                                  {sel && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-blue-500/30">
                                      <Check className="w-8 h-8 text-white" strokeWidth={3} />
                                    </div>
                                  )}
                                </div>
                                <span className="text-[10px] text-muted truncate px-1.5 py-1 text-center block" title={item.name}>{item.name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {imageLoopLibrary.length === 0 && (
                      <p className="text-xs text-muted py-4">Kütüphanede resim veya video bulunamadı. Medya veya Video sekmesinden ekleyin.</p>
                    )}
                  </div>
                  <div className="w-1/3 p-3 flex flex-col gap-2 min-h-0">
                    <p className="text-xs text-muted shrink-0">Seçilen: {imageLoopSelectedIds.size} öğe</p>
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                      {imageLoopLibrary
                        .filter((i) => imageLoopSelectedIds.has(i.id))
                        .map((item) => (
                          <div key={item.id} className="flex gap-2 items-center rounded border p-1.5 bg-foreground/5">
                            <div className="w-12 h-9 rounded overflow-hidden bg-black shrink-0">
                              {item.type === 'image' ? (
                                <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                              ) : (
                                <video src={item.url} className="w-full h-full object-contain" muted playsInline preload="metadata" />
                              )}
                            </div>
                            <span className="text-[10px] text-foreground truncate flex-1 min-w-0" title={item.name}>{item.name}</span>
                            <button
                              onClick={() => setImageLoopSelectedIds((prev) => {
                                const next = new Set(prev);
                                next.delete(item.id);
                                return next;
                              })}
                              className="shrink-0 p-0.5 hover:bg-red-500/20 rounded text-red-500"
                              title="Seçimden kaldır"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                    <button
                      onClick={() => {
                        if (imageLoopSelectedIds.size === 0) return;
                        const items = imageLoopLibrary.filter((i) => imageLoopSelectedIds.has(i.id));
                        setImageLoopEditItems(items.map((it) => ({
                          id: it.id,
                          name: it.name,
                          url: it.url,
                          type: it.type,
                          durationSeconds: it.type === 'video' ? 10 : 5,
                          bgRemove: false,
                          text: '',
                          transition: 'fade',
                        })));
                        setShowImageLoopEditModal(true);
                      }}
                      disabled={imageLoopSelectedIds.size === 0}
                      className="w-full py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Düzenle
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showImageLoopEditModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowImageLoopEditModal(false)}>
              <div className="bg-background rounded-lg shadow-xl border max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-3 border-b flex items-center justify-between shrink-0">
                  <h3 className="text-sm font-semibold text-foreground">Döngü Ayarları</h3>
                  <button onClick={() => setShowImageLoopEditModal(false)} className="p-1 hover:bg-foreground/10 rounded">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-4">
                  {imageLoopEditItems.map((item, idx) => (
                    <div key={item.id} className="rounded border p-3 space-y-2">
                      <div className="flex gap-2 items-start">
                        <div className="w-20 h-14 rounded overflow-hidden bg-black shrink-0">
                          {item.type === 'image' ? (
                            <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                          ) : (
                            <video src={item.url} className="w-full h-full object-contain" muted playsInline preload="metadata" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{item.name}</p>
                          <p className="text-[10px] text-muted">{item.type === 'image' ? 'Resim' : 'Video'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex flex-col gap-1">
                          <span className="text-muted">Gösterim süresi (sn)</span>
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={item.durationSeconds}
                            onChange={(e) => setImageLoopEditItems((prev) => prev.map((it, i) => i === idx ? { ...it, durationSeconds: Math.max(1, Math.min(120, Number(e.target.value) || 5)) } : it))}
                            className="px-2 py-1.5 border rounded"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-muted">Geçiş efekti</span>
                          <select
                            value={item.transition}
                            onChange={(e) => setImageLoopEditItems((prev) => prev.map((it, i) => i === idx ? { ...it, transition: e.target.value } : it))}
                            className="px-2 py-1.5 border rounded"
                          >
                            <option value="none">Yok</option>
                            <option value="fade">Soluklaşma</option>
                            <option value="slide-left">Sola kayma</option>
                            <option value="slide-right">Sağa kayma</option>
                            <option value="slide-up">Yukarı kayma</option>
                            <option value="slide-down">Aşağı kayma</option>
                            <option value="zoom">Yakınlaşma</option>
                          </select>
                        </label>
                      </div>
                      {item.type === 'image' && (
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={item.bgRemove}
                            onChange={(e) => setImageLoopEditItems((prev) => prev.map((it, i) => i === idx ? { ...it, bgRemove: e.target.checked } : it))}
                            className="rounded"
                          />
                          <span>Arka plan kaldır</span>
                        </label>
                      )}
                      <label className="flex flex-col gap-1 text-xs">
                        <span className="text-muted">Üzerine yazı</span>
                        <input
                          type="text"
                          placeholder="Metin ekle…"
                          value={item.text}
                          onChange={(e) => setImageLoopEditItems((prev) => prev.map((it, i) => i === idx ? { ...it, text: e.target.value } : it))}
                          className="px-2 py-1.5 border rounded"
                        />
                      </label>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t flex gap-2 shrink-0">
                  <button
                    onClick={() => { setShowImageLoopEditModal(false); setShowImageLoopModal(false); }}
                    className="flex-1 py-2 px-3 border rounded text-sm font-medium hover:bg-foreground/5"
                  >
                    İptal
                  </button>
                  <button
                    onClick={async () => {
                      const canvas = fabricCanvasRef.current;
                      if (!canvas) return;
                      const cw = (canvas as { width?: number }).width ?? 1920;
                      const ch = (canvas as { height?: number }).height ?? 1080;
                      const fabric = await import('fabric');
                      for (let i = 0; i < imageLoopEditItems.length; i++) {
                        const it = imageLoopEditItems[i];
                        let url = it.url;
                        if (it.type === 'image' && it.bgRemove) {
                          try {
                            let src = url;
                            if (typeof window !== 'undefined' && src.startsWith('/') && !src.startsWith('//')) src = `${window.location.origin}${src}`;
                            try {
                              const data = await apiClient('/ai/remove-background', { method: 'POST', body: { image: src } });
                              url = (data as { dataUrl?: string })?.dataUrl ?? url;
                            } catch (e: unknown) {
                              const useBrowser = (e as { status?: number })?.status === 501;
                              if (useBrowser) {
                                const { removeBackgroundInBrowser } = await import('@/lib/remove-background-browser');
                                url = await removeBackgroundInBrowser(src);
                              } else throw e;
                            }
                          } catch { /* skip bg remove */ }
                        }
                        if (it.type === 'image') {
                          const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
                          img.set({ left: cw / 2 + i * 40, top: ch / 2 + i * 40, originX: 'center', originY: 'center' });
                          canvas.add(img);
                          canvas.sendObjectToBack(img);
                          img.setCoords();
                          fitObjectToCanvas(img, cw, ch, { fullArea: true });
                          constrainObjectToCanvas(img, cw, ch);
                          canvas.sendObjectToBack(img);
                          if (it.text.trim()) {
                            const t = new fabric.FabricText(it.text, { fontSize: 48, fill: '#ffffff', fontFamily: 'sans-serif', left: cw / 2 + i * 40, top: ch / 2 + i * 40 + 200, originX: 'center', originY: 'center' });
                            canvas.add(t);
                            canvas.bringObjectToFront(t);
                          }
                        } else {
                          const videoUrl = it.url;
                          const video = document.createElement('video');
                          video.muted = true;
                          video.loop = true;
                          video.playsInline = true;
                          video.setAttribute('playsinline', '');
                          video.preload = 'auto';
                          video.crossOrigin = 'anonymous';
                          await new Promise<void>((res, rej) => { video.onloadedmetadata = () => res(); video.onerror = () => rej(new Error('Video yüklenemedi')); video.src = videoUrl; });
                          const vw = video.videoWidth || 1920;
                          const vh = video.videoHeight || 1080;
                          video.width = vw;
                          video.height = vh;
                          const img = new fabric.FabricImage(video as unknown as HTMLImageElement, { left: cw / 2 + i * 40, top: ch / 2 + i * 40, originX: 'center', originY: 'center' });
                          canvas.add(img);
                          canvas.sendObjectToBack(img);
                          img.setCoords();
                          fitObjectToCanvas(img, cw, ch, { fullArea: true });
                          constrainObjectToCanvas(img, cw, ch);
                          canvas.sendObjectToBack(img);
                          (img.getElement() as HTMLVideoElement)?.play?.();
                          if (videoRenderRafRef.current == null) {
                            const loop = () => { videoRenderRafRef.current = requestAnimationFrame(loop); fabricCanvasRef.current?.requestRenderAll(); };
                            loop();
                          }
                          if (it.text.trim()) {
                            const t = new fabric.FabricText(it.text, { fontSize: 48, fill: '#ffffff', fontFamily: 'sans-serif', left: cw / 2 + i * 40, top: ch / 2 + i * 40 + 200, originX: 'center', originY: 'center' });
                            canvas.add(t);
                            canvas.bringObjectToFront(t);
                          }
                        }
                      }
                      pushHistoryRef.current();
                      setSaved(false);
                      refreshLayers();
                      saveDraftRef.current();
                      setShowImageLoopEditModal(false);
                      setShowImageLoopModal(false);
                      toast.showSuccess(`${imageLoopEditItems.length} öğe canvas'a eklendi.`);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Canvas&apos;a Ekle
                  </button>
                </div>
              </div>
            </div>
          )}
          {recordPreviewVideo && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setRecordPreviewVideo(null)}>
              <div className="bg-background rounded-lg shadow-xl border max-w-sm w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-3">
                  <p className="text-sm font-medium text-foreground truncate mb-2">{recordPreviewVideo.name}</p>
                  <div className="aspect-video rounded border border-gray-200 overflow-hidden bg-black mb-3">
                    <video
                      key={recordPreviewVideo.id}
                      src={recordPreviewVideo.url}
                      className="w-full h-full object-contain"
                      muted
                      playsInline
                      autoPlay
                      loop
                      preload="auto"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        addVideoToCanvas(recordPreviewVideo.url);
                        setRecordPreviewVideo(null);
                      }}
                      className="flex-1 py-2 px-3 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
                    >
                      Kullan
                    </button>
                    <button
                      onClick={() => setRecordPreviewVideo(null)}
                      className="flex-1 py-2 px-3 border border-gray-300 rounded text-sm font-medium hover:bg-foreground/5"
                    >
                      Kapat
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {leftTab === 'uploads' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Yüklemelerim</h3>
              <input ref={uploadInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
              <button onClick={() => uploadInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 text-white rounded-lg text-sm hover:bg-gray-700">
                <Upload className="w-5 h-5" /> Resim/Video Yükle
              </button>
              <p className="text-xs text-muted">Resim veya video yükleyip tasarıma ekleyebilirsiniz. Kayıtlı yüklemeler aşağıda görünür.</p>
              {uploadsLoading ? (
                <p className="text-xs text-muted">Yükleniyor…</p>
              ) : uploadsList.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {uploadsList.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        const active = fabricCanvasRef.current?.getActiveObject();
                        const isRect = (active as { type?: string })?.type === 'rect';
                        if (isRect && u.type !== 'video') setBlockBackgroundImage(u.url);
                        else addImageFromUrl(u.url);
                      }}
                      className="relative aspect-video rounded border border-gray-200 overflow-hidden hover:ring-2 hover:ring-blue-500 bg-gray-100"
                    >
                      {u.type === 'video' ? (
                        <span className="absolute inset-0 flex items-center justify-center text-gray-500 text-lg">▶</span>
                      ) : (
                        <img src={u.url} alt={u.name} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] px-1 py-0.5 truncate">{u.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted">Henüz kayıtlı yükleme yok. Yukarıdaki butonla yükleyin.</p>
              )}
            </div>
          )}
          {leftTab === 'layout' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Yerleşim</h3>
              <button onClick={fitAllToCanvas} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                <LayoutTemplate className="w-4 h-4" /> Alana Sığdır
              </button>
              <p className="text-xs text-muted">Tüm tasarımı 16:9 alana sığdırır. Önizleme ve TV yayını ile birebir aynı olur.</p>
              <button onClick={() => document.getElementById('canvas-size-section')?.scrollIntoView({ behavior: 'smooth' })} className="w-full py-2 px-3 text-sm border rounded hover:bg-foreground/5">Canvas Boyutuna Git</button>
              <button
                onClick={async () => {
                  setShowImageLoopModal(true);
                  try {
                    const [imgRes, vidRes] = await Promise.all([
                      apiClient('/content-library?type=image'),
                      apiClient('/content-library?type=video'),
                    ]);
                    const images = Array.isArray(imgRes) ? imgRes : (imgRes as { data?: unknown[] })?.data ?? [];
                    const videos = Array.isArray(vidRes) ? vidRes : (vidRes as { data?: unknown[] })?.data ?? [];
                    const lib = [
                      ...(Array.isArray(images) ? images : []).map((r: { id: string; name?: string; url?: string }) => ({
                        id: r.id,
                        name: String(r.name ?? ''),
                        url: String(r.url ?? ''),
                        type: 'image' as const,
                      })),
                      ...(Array.isArray(videos) ? videos : []).map((r: { id: string; name?: string; url?: string }) => ({
                        id: r.id,
                        name: String(r.name ?? ''),
                        url: String(r.url ?? ''),
                        type: 'video' as const,
                      })),
                    ];
                    setImageLoopLibrary(lib);
                    setImageLoopSelectedIds(new Set());
                  } catch {
                    setImageLoopLibrary([]);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 text-sm border rounded hover:bg-foreground/5"
              >
                <Repeat className="w-4 h-4" /> Resim Döngüsü
              </button>
            </div>
          )}
          {leftTab === 'record' && (
            <div className="flex flex-col flex-1 min-h-0 p-4">
              <div className="shrink-0 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">video yop</h3>
                <input ref={videoUploadInputRef} type="file" accept="video/*" multiple className="hidden" onChange={handleVideoUpload} />
                <button
                  onClick={() => videoUploadInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-800 text-white rounded-lg text-sm hover:bg-blue-700"
                >
                  Video yükle
                </button>
                <p className="text-xs text-muted">Sistemdeki videolar aşağıda listelenir.</p>
              </div>
              {recordVideos.length > 0 ? (
                <div className="flex-1 min-h-0 overflow-y-auto mt-3">
                  <div className="grid grid-cols-2 gap-2 pb-2">
                    {recordVideos.map((v) => (
                      <div
                        key={v.id}
                        role="button"
                        tabIndex={0}
                        className="rounded border border-gray-200 overflow-hidden bg-gray-900 flex flex-col cursor-pointer transition-all hover:ring-2 hover:ring-blue-500"
                        onClick={() => setRecordPreviewVideo({ id: v.id, name: v.name, url: v.url })}
                        onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLDivElement).click()}
                      >
                        <div className="aspect-video relative bg-black">
                          <video
                            src={v.url}
                            className="w-full h-full object-contain"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        </div>
                        <span className="text-[10px] text-muted truncate px-1.5 py-1 text-center block" title={v.name}>{v.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted mt-3 shrink-0">Sistemde henüz video yok. Video yükle ile ekleyebilirsiniz.</p>
              )}
            </div>
          )}
          {leftTab === 'more' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Daha Fazla</h3>
              <button onClick={fitAllToCanvas} className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                <LayoutTemplate className="w-4 h-4" /> Alana Sığdır (TV ile aynı)
              </button>
              <p className="text-[10px] text-muted">Tüm tasarımı 16:9 canvas&apos;a sığdırır. Önizleme ve yayın birebir eşleşir.</p>
              <button onClick={duplicateSelected} className="w-full flex items-center justify-center gap-2 py-2 px-3 border rounded text-sm hover:bg-foreground/5">
                <Copy className="w-4 h-4" /> Seçiliyi Çoğalt
              </button>
              <button onClick={deleteSelected} className="w-full flex items-center justify-center gap-2 py-2 px-3 border border-red-200 rounded text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Seçiliyi Sil
              </button>
            </div>
          )}
        </div>

        {/* Center – Fabric zoom ile sığdır, CSS transform YOK */}
        <main className={`relative flex-1 flex items-center justify-center min-w-0 min-h-0 overflow-hidden ${showTvPreviewModal ? 'bg-black p-4' : 'bg-muted/30 p-4'}`}>
          <div
            ref={canvasContainerRef}
            className="flex-1 flex items-center justify-center w-full min-w-0 min-h-0 overflow-hidden"
          >
            <div
              className={`shadow-2xl bg-white ring-2 ring-slate-300 overflow-hidden flex items-center justify-center w-full ${showTvPreviewModal ? 'h-full min-h-0 [&_[data-fabric=wrapper]]:!w-full [&_[data-fabric=wrapper]]:!h-full [&_canvas]:!w-full [&_canvas]:!h-full [&_canvas]:!object-cover' : 'aspect-video max-w-full max-h-full [&_[data-fabric=wrapper]]:!w-full [&_[data-fabric=wrapper]]:!h-full [&_[data-fabric=wrapper]]:!flex [&_[data-fabric=wrapper]]:!items-center [&_[data-fabric=wrapper]]:!justify-center [&_canvas]:!w-full [&_canvas]:!h-full'}`}
              onPointerDownCapture={() => (fabricCanvasRef.current as { calcOffset?: () => void })?.calcOffset?.()}
            >
              <canvas
                ref={canvasRef}
                width={1920}
                height={1080}
                className="block"
              />
            </div>
          </div>
          {/* TV önizleme kapat */}
          {showTvPreviewModal && (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
              <button type="button" onClick={() => setShowTvPreviewModal(false)} className="px-4 py-2 bg-white/90 hover:bg-white text-black rounded-lg font-medium shadow-lg">Kapat</button>
            </div>
          )}
          <div className={`absolute bottom-6 left-6 flex items-center gap-2 ${showTvPreviewModal ? 'hidden' : ''}`}>
            <button
              onClick={fitAllToCanvas}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 text-sm"
            >
              <LayoutTemplate className="w-4 h-4" /> Alana Sığdır
            </button>
            <button
              onClick={fitCanvasToContainer}
              className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg shadow-lg border border hover:bg-foreground/5 text-sm"
            >
              <Tv className="w-4 h-4" /> Sığdır
            </button>
            <button
              onClick={() => updatePreviewRef.current()}
              className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg shadow-lg border border hover:bg-foreground/5 text-sm"
            >
              Önizlemeyi Yenile
            </button>
          </div>
          <div className={`absolute bottom-6 right-6 flex items-center gap-1 bg-background rounded-lg shadow-lg border border px-2 py-1 ${showTvPreviewModal ? 'hidden' : ''}`}>
            <button onClick={zoomOut} className="p-1.5 hover:bg-gray-100 rounded">−</button>
            <span className="text-sm w-12 text-center">{zoomDisplay}%</span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-gray-100 rounded">+</button>
          </div>
        </main>

        {/* Right sidebar – Design properties */}
        <aside className={`w-64 shrink-0 bg-background border-l border overflow-y-auto ${showTvPreviewModal ? 'hidden' : ''}`}>
          <div className="p-4 space-y-6">
            {/* Önizleme – tıkla: TV önizlemesi aç, yazı/etiket/ikon fare ile konumlandırılabilir */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Önizleme</h3>
              <button
                type="button"
                onClick={() => {
                  const c = fabricCanvasRef.current;
                  if (c) {
                    (c as { renderAll?: () => void }).renderAll?.();
                    updatePreviewRef.current();
                  }
                  setShowTvPreviewModal(true);
                }}
                className="w-full shadow-2xl overflow-hidden rounded-md border border-gray-200 bg-black flex justify-center items-center hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer"
                style={{ aspectRatio: '16/9', minHeight: 120 }}
              >
                {tvPreviewDataUrl ? (
                  <img
                    src={tvPreviewDataUrl}
                    alt="TV Önizlemesi – tıklayın"
                    className="block w-full h-full pointer-events-none"
                    style={{ objectFit: 'contain', objectPosition: 'center' }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted text-xs">Önizlemeyi Yenile</div>
                )}
              </button>
              <p className="text-[10px] text-muted mt-1">Tıkla: TV önizlemesi aç, öğeleri fare ile sürükle</p>
            </section>
            <section id="canvas-size-section">
              <h3 className="text-sm font-semibold text-foreground mb-3">Tasarım</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-muted mb-1">Canvas Boyutu (16:9 TV)</label>
                  <p className="text-sm font-medium text-foreground">1920×1080</p>
                  <p className="text-[10px] text-green-600 mt-1">Sabit 16:9 – TV yayını birebir</p>
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Stiller</label>
                  <input type="color" id="stiller-color" value={typeof selectedProps.fill === 'string' && selectedProps.fill.startsWith('#') ? selectedProps.fill : '#374151'} onChange={(e) => updateObjectFill(e.target.value)} className="w-8 h-8 rounded border border-gray-300 cursor-pointer bg-transparent p-0" title="Seçili öğe rengi" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Canvas arka planı</label>
                  <div className="grid grid-cols-3 gap-1.5 mb-2">
                    {BACKGROUND_PRESETS.map((color) => (
                      <button key={color} onClick={() => setBackground(color)} className={`w-full h-8 rounded border-2 transition-all ${bgColor === color ? 'border-blue-700 ring-2 ring-blue-700/50' : 'border-gray-200 hover:border-gray-300'}`} style={{ backgroundColor: color }} title={color} />
                    ))}
                  </div>
                  <input type="color" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="w-full h-8 rounded border cursor-pointer" />
                  <input type="text" value={bgColor} onChange={(e) => setBackground(e.target.value)} className="mt-1 w-full px-2 py-1 text-xs font-mono border rounded" />
                </div>
                {selectedObjectType === 'rect' && (
                  <div>
                    <label className="block text-xs text-muted mb-1">Blok arka planı</label>
                    <p className="text-[10px] text-muted mb-2">Resim: Sol panel Yüklemeler sekmesinden bir resme tıklayın veya aşağıdan seçin.</p>
                    <label className="flex items-center justify-center gap-2 py-2 px-3 border border-dashed border-gray-300 rounded text-sm hover:bg-gray-50 cursor-pointer">
                      <Image className="w-4 h-4" /> Resim seç
                      <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const formData = new FormData();
                        formData.append('files', f);
                        try {
                          const res = await fetch('/api/upload', { method: 'POST', body: formData });
                          const data = await res.json();
                          const assets = data?.assets ?? data?.data ?? [];
                          const src = assets[0]?.src;
                          if (src) {
                            await setBlockBackgroundImage(src);
                            refreshUploadsList();
                          } else {
                            toast.showError('Yükleme başarısız.');
                          }
                        } catch {
                          toast.showError('Yükleme başarısız.');
                        }
                        e.target.value = '';
                      }} />
                    </label>
                  </div>
                )}
                <div>
                  <label className="block text-xs text-muted mb-1">Renk</label>
                  <input type="color" id="obj-color" value={typeof selectedProps.fill === 'string' && selectedProps.fill.startsWith('#') ? selectedProps.fill : '#374151'} onChange={(e) => updateObjectFill(e.target.value)} className="w-full h-8 rounded border border-gray-300 cursor-pointer" disabled={!fabricCanvasRef.current?.getActiveObject()} title="Seçili öğe dolgu rengi" />
                </div>
                <div>
                  <label className="block text-xs text-muted mb-1">Animasyon</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <p className="text-[10px] text-muted">Başlangıç</p>
                      <select value={animStart} onChange={(e) => updateAnim('animStart', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded" disabled={!fabricCanvasRef.current?.getActiveObject()}>
                        <option value="none">Yok</option>
                        <option value="fadeIn">fadeIn</option>
                        <option value="slideInLeft">slideInLeft</option>
                        <option value="slideInRight">slideInRight</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-muted">Bitiş</p>
                      <select value={animEnd} onChange={(e) => updateAnim('animEnd', e.target.value)} className="w-full px-2 py-1.5 text-xs border rounded" disabled={!fabricCanvasRef.current?.getActiveObject()}>
                        <option value="none">Yok</option>
                        <option value="fadeOut">fadeOut</option>
                        <option value="slideOutLeft">slideOutLeft</option>
                        <option value="slideOutRight">slideOutRight</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-3">Yerleşim</h3>
              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Izgara</span>
                  <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} className="rounded" />
                </label>
                <div className="space-y-1">
                  <span className="text-sm block mb-1">Katlar</span>
                  {(() => {
                    const objs = fabricCanvasRef.current?.getObjects() ?? [];
                    const activeObj = fabricCanvasRef.current?.getActiveObject();
                    return objs.length === 0 ? (
                      <p className="text-xs text-muted">Nesne yok</p>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {[...objs].reverse().map((obj, i) => {
                          const idx = objs.length - 1 - i;
                          const type = (obj as { type?: string }).type ?? 'object';
                          const label = (type === 'text' || type === 'i-text' || type === 'textbox' || type === 'Textbox') ? (obj as { text?: string }).text?.slice(0, 12) || 'Metin' : type === 'rect' ? 'Şekil' : type === 'image' ? 'Resim' : type;
                          const isActive = activeObj === obj;
                          return (
                            <div key={idx} className={`flex items-center justify-between gap-1 p-1 rounded text-xs ${isActive ? 'bg-blue-800/20 border border-blue-700' : ''}`}>
                              <span className="truncate flex-1" title={String((obj as { text?: string }).text ?? label)}>{label}</span>
                              <div className="flex gap-0.5">
                                <button onClick={() => { fabricCanvasRef.current?.setActiveObject(obj); fabricCanvasRef.current?.bringObjectToFront(obj); fabricCanvasRef.current?.renderAll(); refreshLayers(); setSaved(false); }} className="p-0.5 hover:bg-foreground/10 rounded" title="Öne getir">↑</button>
                                <button onClick={() => { fabricCanvasRef.current?.setActiveObject(obj); fabricCanvasRef.current?.sendObjectToBack(obj); fabricCanvasRef.current?.renderAll(); refreshLayers(); setSaved(false); }} className="p-0.5 hover:bg-foreground/10 rounded" title="Arkaya gönder">↓</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {fabricCanvasRef.current?.getObjects()?.length ? (
                    <div className="flex gap-1 mt-1">
                      <button onClick={bringToFront} disabled={!fabricCanvasRef.current?.getActiveObject()} className="flex-1 py-1 text-xs border rounded hover:bg-foreground/5 disabled:opacity-50">Öne</button>
                      <button onClick={sendToBack} disabled={!fabricCanvasRef.current?.getActiveObject()} className="flex-1 py-1 text-xs border rounded hover:bg-foreground/5 disabled:opacity-50">Arkaya</button>
                    </div>
                  ) : null}
                </div>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Bleed</span>
                  <input type="checkbox" className="rounded" />
                </label>
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Hizalama kılavuzları</span>
                  <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} className="rounded" />
                </label>
              </div>
            </section>
            {Object.keys(selectedProps).length > 0 && (
              <section id="text-edit-panel" className="pt-4 border-t scroll-mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Yazı</h3>
                <div className="space-y-3">
                  {selectedProps.text !== undefined && (
                    <div>
                      <label className="block text-xs text-muted mb-1">Metin içeriği</label>
                      <textarea value={selectedProps.text} onChange={(e) => updateTextContent(e.target.value)} rows={3} className="w-full px-3 py-2 text-sm border rounded resize-none" placeholder="Metin girin…" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-muted mb-1">Boyut</label>
                    <input type="number" min={8} max={200} value={selectedProps.fontSize ?? 32} onChange={(e) => updateTextProp('fontSize', parseInt(e.target.value, 10) || 32)} className="w-full px-3 py-2 text-sm border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Font</label>
                    <select value={selectedProps.fontFamily ?? 'sans-serif'} onChange={(e) => updateTextProp('fontFamily', e.target.value)} className="w-full px-3 py-2 text-sm border rounded">
                      {!FONT_OPTIONS.includes(selectedProps.fontFamily ?? '') && selectedProps.fontFamily && (
                        <option value={selectedProps.fontFamily ?? ''}>{selectedProps.fontFamily}</option>
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
                  <div className="flex gap-2">
                    <button onClick={() => updateTextProp('fontWeight', (selectedProps.fontWeight ?? 400) === 700 ? 400 : 700)} className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs border rounded ${(selectedProps.fontWeight ?? 400) === 700 ? 'bg-foreground/10 border-foreground/30' : ''}`}><Bold className="w-3.5 h-3.5" /> Kalın</button>
                    <button onClick={() => updateTextProp('fontStyle', (selectedProps.fontStyle ?? 'normal') === 'italic' ? 'normal' : 'italic')} className={`flex-1 flex items-center justify-center gap-1 py-2 text-xs border rounded ${(selectedProps.fontStyle ?? 'normal') === 'italic' ? 'bg-foreground/10 border-foreground/30' : ''}`}><Italic className="w-3.5 h-3.5" /> İtalik</button>
                  </div>
                  <div>
                    <label className="block text-xs text-muted mb-1">Renk / Gradient</label>
                    <input type="color" value={typeof selectedProps.fill === 'string' && selectedProps.fill.startsWith('#') ? selectedProps.fill : '#ffffff'} onChange={(e) => updateTextProp('fill', e.target.value)} className="w-full h-8 rounded border cursor-pointer" />
                    <div className="grid grid-cols-4 gap-1 mt-1">
                      {GRADIENT_PRESETS.slice(0, 8).map((g, i) => (
                        <button key={i} onClick={() => applyGradient(g)} className="aspect-square rounded border border-gray-200 hover:border-gray-400" style={{ background: g }} title="Gradient uygula" />
                      ))}
                    </div>
                  </div>
                  <button onClick={deleteSelected} className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded">Seçili Sil</button>
                </div>
              </section>
            )}
          </div>
        </aside>


        {/* Kaydet hedefi modalı (sadece admin/super_admin) */}
        {saveDestinationModalOpen && isAdmin && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => setSaveDestinationModalOpen(false)}>
            <div className="bg-background border rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Nereye kaydedilsin?</h3>
              <div className="space-y-3 mb-4">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-foreground/5">
                  <input type="radio" name="saveScope" checked={saveScope === 'system'} onChange={() => { setSaveScope('system'); setSaveTargetUserId(''); }} className="mt-1" />
                  <div>
                    <span className="font-medium">Sistem şablonlarına kaydet</span>
                    <p className="text-xs text-muted mt-0.5">Tüm kullanıcılar görebilir</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-foreground/5">
                  <input type="radio" name="saveScope" checked={saveScope === 'user'} onChange={() => setSaveScope('user')} className="mt-1" />
                  <div className="flex-1">
                    <span className="font-medium">Kullanıcının benim şablonlarıma kaydet</span>
                    <p className="text-xs text-muted mt-0.5">Seçilen kullanıcının şablonlarına eklenir</p>
                    {saveScope === 'user' && (
                      <select
                        value={saveTargetUserId}
                        onChange={(e) => setSaveTargetUserId(e.target.value)}
                        className="mt-2 w-full px-3 py-2 text-sm border rounded"
                      >
                        <option value="">Kullanıcı seçin</option>
                        {usersList.map((u) => (
                          <option key={u.id} value={u.id}>{u.email} {u.role !== 'business_user' ? `(${u.role})` : ''}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSaveDestinationModalOpen(false)} className="px-4 py-2 text-sm border rounded hover:bg-foreground/5">İptal</button>
                <button
                  onClick={() => {
                    if (saveScope === 'user' && !saveTargetUserId) {
                      toast.showWarning('Lütfen bir kullanıcı seçin.');
                      return;
                    }
                    setSaveDestinationModalOpen(false);
                    setSaveDialogOpen(true);
                  }}
                  disabled={saveScope === 'user' && !saveTargetUserId}
                  className="px-4 py-2 text-sm bg-blue-800 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Devam
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Kaydet modal */}
        {saveDialogOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={() => { if (!saving) { setSaveDialogOpen(false); setOverwriteConfirm(null); } }}>
            <div className="bg-background border rounded-lg shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Tasarımı Kaydet</h3>
              <input type="text" value={saveName} onChange={(e) => { setSaveName(e.target.value); setOverwriteConfirm(null); }} placeholder="Şablon adı" className="w-full px-3 py-2 border rounded mb-4" />
              {overwriteConfirm ? (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                  <p className="text-amber-800 mb-2">&quot;{overwriteConfirm.name}&quot; adında şablon zaten var. Üzerine kaydetmek istiyor musunuz?</p>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setOverwriteConfirm(null)} disabled={saving} className="px-3 py-1.5 text-sm border rounded hover:bg-foreground/5">Vazgeç</button>
                    <button onClick={() => saveDesignOverwrite()} disabled={saving} className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50">{saving ? 'Güncelleniyor…' : 'Üzerine Kaydet'}</button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <button onClick={() => { setSaveDialogOpen(false); setOverwriteConfirm(null); }} disabled={saving} className="px-4 py-2 text-sm border rounded hover:bg-foreground/5">İptal</button>
                  <button onClick={() => saveDesign()} disabled={saving || !saveName.trim()} className="px-4 py-2 text-sm bg-blue-800 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? 'Kaydediliyor…' : 'Kaydet'}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
