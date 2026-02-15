'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useSearchParams } from 'next/navigation';
const MenuViewer = dynamic(
  () => import('@/components/digital-menu/MenuViewer'),
  { ssr: false },
);

// react-konva uses React internals (ReactCurrentOwner) — load only on client to avoid React 19 SSR issues
const CanvasDisplay = dynamic(
  () => import('@/components/display/CanvasDisplay'),
  { ssr: false },
);

const FullEditorDisplay = dynamic(
  () => import('@/components/display/FullEditorDisplay').then((m) => ({ default: m.FullEditorDisplay })),
  { ssr: false },
);

import { TemplateDisplay } from '@/components/display/TemplateDisplay';
import { DisplayFrame } from '@/components/display/DisplayFrame';
import { TickerTape } from '@/components/display/TickerTape';
import { formatPrice } from '@/lib/formatPrice';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

const EMBED_WIDTH = 1920;
const EMBED_HEIGHT = 1080;

function useInIframe() {
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    setInIframe(typeof window !== 'undefined' && window.self !== window.top);
  }, []);
  return inIframe;
}

const EmbedFitWrapper = React.forwardRef<HTMLDivElement, { children: React.ReactNode; fadeIn?: boolean }>(function EmbedFitWrapper({ children, fadeIn }, ref) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const el = document.fullscreenElement;
      const w = el ? el.clientWidth : window.innerWidth;
      const h = el ? el.clientHeight : window.innerHeight;
      const s = Math.min(w / EMBED_WIDTH, h / EMBED_HEIGHT);
      setScale(s);
    };
    update();
    window.addEventListener('resize', update);
    document.addEventListener('fullscreenchange', update);
    return () => {
      window.removeEventListener('resize', update);
      document.removeEventListener('fullscreenchange', update);
    };
  }, []);

  return (
    <div
      ref={(el) => {
        (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
        if (typeof ref === 'object' && ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = el;
        else if (typeof ref === 'function') ref(el);
      }}
      role="presentation"
      style={{
        position: 'fixed' as const,
        inset: 0,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000',
      }}
    >
      <style jsx global>{`
        .display-fade-in { animation: displayFadeIn 120ms ease-out forwards; }
        @keyframes displayFadeIn { from { opacity: 0; } to { opacity: 1; } }
        [data-display-exit], .display-exit-button,
        [aria-label*="xit" i], [aria-label*="çık" i], [aria-label*="lose" i],
        [title*="Tam ekrandan" i], [title*="exit" i] { display: none !important; }
      `}</style>
      <div
        className={fadeIn ? 'display-fade-in' : undefined}
        style={{
          width: EMBED_WIDTH,
          height: EMBED_HEIGHT,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'absolute' as const,
          top: '50%',
          left: '50%',
          margin: `-${EMBED_HEIGHT / 2}px 0 0 -${EMBED_WIDTH / 2}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
});

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  display_order: number;
}

interface Menu {
  id: string;
  name: string;
  description: string;
  slide_duration: number;
  items: MenuItem[];
}

interface TemplateRotation {
  template_id: string;
  display_duration: number;
  display_order: number;
  transition_effect?: string;
  transition_duration?: number;
  template_name: string;
  block_count: number;
}

interface ScreenData {
  screen: {
    id: string;
    name: string;
    location: string;
    animation_type: string;
    animation_duration: number;
    template_transition_effect?: string;
    language_code: string;
    template_id?: string;
    business_name?: string;
  };
  menus: Menu[];
  schedules?: any[];
  template?: any;
  screenBlocks?: any[];
  blockContents?: any[];
  templateRotations?: TemplateRotation[];
  /** Dijital menü slotu (ekran rotasyonunda template_type=digital_menu) */
  digitalMenuData?: {
    id: string;
    name: string;
    templateId: string;
    backgroundImage: string | null;
    width: number;
    height: number;
    layers: Array<{
      id: string;
      type: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation?: number;
      displayOrder?: number;
      contentText?: string;
      fontSize?: number;
      fontFamily?: string;
      fontStyle?: string;
      color?: string;
      align?: string;
      imageUrl?: string | null;
      style?: Record<string, unknown>;
    }>;
  };
}

export default function DisplayPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const token = (params?.token ?? '') as string;
  const { t, localePath } = useTranslation();
  const previewIndexParam = searchParams?.get('previewIndex');
  const previewIndex = previewIndexParam != null && /^\d+$/.test(previewIndexParam) ? parseInt(previewIndexParam, 10) : null;
  const rotationIndexParam = searchParams?.get('rotationIndex');
  const rotationIndexFromUrl = rotationIndexParam != null && /^\d+$/.test(rotationIndexParam) ? parseInt(rotationIndexParam, 10) : null;
  const liteParam = searchParams?.get('lite');
  const lowParam = searchParams?.get('low');
  const ultralowParam = searchParams?.get('ultralow');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  const isLiteMode = liteParam === '1' || lowParam === '1' || ultralowParam === '1' || prefersReducedMotion;
  /** Düşük güçlü cihazlar: daha sık sayfa yenileme (bellek sıfırlanır, kapanma azalır) */
  const isLowDeviceMode = lowParam === '1' || ultralowParam === '1';
  /** Çok zayıf stick: 1 dk sayfa yenileme (ultralow=1) */
  const isUltralowMode = ultralowParam === '1';

  const [screenData, setScreenData] = useState<ScreenData | null>(null);
  const [currentMenuIndex, setCurrentMenuIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const itemRef = useRef<HTMLDivElement>(null);
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const currentTemplateIndexRef = useRef(0); // Polling rotasyonu sıfırlamasın diye
  const [currentTemplateData, setCurrentTemplateData] = useState<ScreenData | null>(null);
  const [nextTemplateData, setNextTemplateData] = useState<ScreenData | null>(null);
  const [nextTemplateIndex, setNextTemplateIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [justFinishedTransition, setJustFinishedTransition] = useState(false); // Geçiş sonrası kısa fade-in (blink azaltma)
  const [businessName, setBusinessName] = useState<string>('');
  const [viewAllowed, setViewAllowed] = useState<boolean | null>(null);
  const loadInProgressRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayContainerRef = useRef<HTMLDivElement>(null);
  /** Çoklu şablon rotasyonu: tüm slotlar önceden yüklenir, yayın internetsiz önbellekten döner; güncellemede yenilenir */
  const rotationCacheRef = useRef<(ScreenData | null)[]>([]);
  const screenDataRef = useRef<ScreenData | null>(null);
  screenDataRef.current = screenData;
  /** Geçiş animasyonu bittikten sonra base layer hazır olunca overlay kaldırılır */
  const displayReadyRef = useRef<() => void>(() => {});
  /** 24/7 yayında unmount sonrası setState engellemek için */
  const mountedRef = useRef(true);

  const POLL_INTERVAL_MS = 60_000; // 60s - tek interval, 1000 TV için ölçeklenebilir
  const MAX_BACKOFF_MS = 60_000;
  const HEARTBEAT_INTERVAL_MS = 20_000; // 20 sn – sunucu 30 sn’de eski oturumu sildiği için buna göre at (aktif cihaz silinmesin)
  const HEARTBEAT_RETRY_WHEN_BLOCKED_MS = 15_000; // Bloklu iken 15 sn’de bir tara; diğer cihaz kapanınca ~30 sn içinde bu açılsın

  // Tüm rotasyon slotlarını önbelleğe al (veya güncelleme gelince yenile)
  const preloadRotationCache = useCallback(async (baseData: ScreenData) => {
    const N = baseData.templateRotations?.length ?? 0;
    if (N <= 0) return;
    try {
      const results = await Promise.all(
        Array.from({ length: N }, (_, i) =>
          fetch(`/api/public-screen/${encodeURIComponent(token)}?rotationIndex=${i}`, { cache: 'no-store' })
            .then((r) => r.ok ? r.json() : null)
            .then((raw: any) => (raw && !raw.notFound && raw.screen ? raw : null))
        )
      );
      rotationCacheRef.current = results;
    } catch (e) {
      console.warn('Rotation cache preload failed:', e);
    }
  }, [token]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Lite/low/ultralow mod: periyodik sayfa yenile — bellek birikimi ve donma önlenir (cok kisa olursa yayin "duruyor" hissi verir)
  const LITE_RELOAD_MS = 10 * 60 * 1000;   // 10 dk
  const LOW_DEVICE_RELOAD_MS = 5 * 60 * 1000;  // 5 dk (önceden 1.5 dk – 3 template 3’er kez sonra reload oluyordu)
  const ULTRALOW_RELOAD_MS = 3 * 60 * 1000;    // 3 dk (önceden 1 dk)
  const reloadMs = isUltralowMode ? ULTRALOW_RELOAD_MS : (isLowDeviceMode ? LOW_DEVICE_RELOAD_MS : LITE_RELOAD_MS);
  useEffect(() => {
    if (!isLiteMode || typeof window === 'undefined') return;
    const t = setTimeout(() => {
      window.location.reload();
    }, reloadMs);
    return () => clearTimeout(t);
  }, [isLiteMode, isLowDeviceMode, isUltralowMode, reloadMs]);

  useEffect(() => {
    const initialRotation =
      previewIndex != null && previewIndex >= 0
        ? previewIndex
        : rotationIndexFromUrl != null && rotationIndexFromUrl >= 0
          ? rotationIndexFromUrl
          : undefined;
    loadScreenData(initialRotation);
    if (previewIndex != null) return;
    const pollInterval = setInterval(() => {
      const current = screenDataRef.current;
      if (current?.templateRotations && current.templateRotations.length > 1) {
        // Sadece önbelleği güncelle; mevcut ekranı yenileme (ziplama/göz kırpma olmasın)
        preloadRotationCache(current).catch(() => {});
      } else {
        loadScreenData();
      }
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(pollInterval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [token, previewIndex, rotationIndexFromUrl, preloadRotationCache]);

  // Heartbeat: ilk yayınlayan izinli, diğer cihazlar blok (allowed: false)
  useEffect(() => {
    if (!token || typeof window === 'undefined') return;
    let sessionId = sessionStorage.getItem('display_heartbeat_session');
    if (!sessionId) {
      sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
      sessionStorage.setItem('display_heartbeat_session', sessionId);
    }
    const sendHeartbeat = () => {
      fetch(`/api/proxy/public/screen/${encodeURIComponent(token)}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data: { ok?: boolean; allowed?: boolean }) => {
          if (data && typeof data.allowed === 'boolean') setViewAllowed(data.allowed);
        })
        .catch(() => {});
    };
    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token]);

  // Bloklu iken (viewAllowed === false) daha sık heartbeat at – diğer cihaz kapanınca tekrar izin alınsın
  useEffect(() => {
    if (!token || viewAllowed !== false || typeof window === 'undefined') return;
    let sessionId = sessionStorage.getItem('display_heartbeat_session');
    if (!sessionId) return;
    const retry = () => {
      fetch(`/api/proxy/public/screen/${encodeURIComponent(token)}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
        .then((r) => r.json())
        .then((data: { ok?: boolean; allowed?: boolean }) => {
          if (data?.allowed === true) setViewAllowed(true);
        })
        .catch(() => {});
    };
    const t = setInterval(retry, HEARTBEAT_RETRY_WHEN_BLOCKED_MS);
    return () => clearInterval(t);
  }, [token, viewAllowed]);

  const loadScreenData = async (initialRotationIndex?: number) => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    try {
      const rotationIdx =
        initialRotationIndex !== undefined && initialRotationIndex >= 0
          ? initialRotationIndex
          : screenData?.templateRotations?.length && screenData.templateRotations.length > 0
            ? Math.min(currentTemplateIndexRef.current, screenData.templateRotations.length - 1)
            : undefined;
      const query = rotationIdx !== undefined ? `?rotationIndex=${rotationIdx}` : '';
      const url = `/api/public-screen/${encodeURIComponent(token)}${query}`;
      const res = await fetch(url, { cache: 'no-store' });
      const data = res.ok ? await res.json() : null;
      if (!res.ok && res.status !== 404) {
        throw new Error(res.statusText || t('common_request_failed'));
      }
      retryCountRef.current = 0;
      if ((data as any)?.notFound || !(data as any)?.screen) {
        setScreenData(null);
        setError(t('display_screen_not_found'));
        return;
      }
      setScreenData(data);
      setError('');

      if (data.screen?.business_name) {
        setBusinessName(data.screen.business_name);
      }
      setCurrentMenuIndex(0);
      setCurrentItemIndex(0);

      if (data.templateRotations && data.templateRotations.length > 0) {
        const idx =
          initialRotationIndex !== undefined && initialRotationIndex >= 0
            ? Math.min(initialRotationIndex, data.templateRotations.length - 1)
            : Math.min(currentTemplateIndexRef.current, data.templateRotations.length - 1);
        setCurrentTemplateData(data);
        currentTemplateIndexRef.current = idx;
        setCurrentTemplateIndex(idx);
        if (data.templateRotations.length > 1) {
          preloadRotationCache(data).catch(() => {});
        }
      } else {
        setCurrentTemplateData(data);
      }
    } catch (err: any) {
      setError(err?.message || t('display_screen_load_failed'));
      const backoff = Math.min(
        2000 * Math.pow(2, retryCountRef.current),
        MAX_BACKOFF_MS,
      );
      retryCountRef.current += 1;
      retryTimeoutRef.current = setTimeout(() => {
        retryTimeoutRef.current = null;
        loadInProgressRef.current = false;
        loadScreenData();
      }, backoff);
      return;
    } finally {
      loadInProgressRef.current = false;
      setLoading(false);
    }
  };

  const loadTemplateForRotation = async (baseData: ScreenData, templateIndex: number) => {
    if (!baseData.templateRotations || baseData.templateRotations.length === 0) {
      setCurrentTemplateData(baseData);
      if (baseData.screen?.business_name) {
        setBusinessName(baseData.screen.business_name);
      }
      return;
    }

    const rotation = baseData.templateRotations[templateIndex];
    if (!rotation) {
      setCurrentTemplateData(baseData);
      if (baseData.screen?.business_name) {
        setBusinessName(baseData.screen.business_name);
      }
      return;
    }

    try {
      // Load template data for this rotation index from backend
      const res = await fetch(`/api/public-screen/${encodeURIComponent(token)}?rotationIndex=${templateIndex}`, { cache: 'no-store' });
      const raw = res.ok ? await res.json() : null;
      const templateData = raw && !(raw as any).notFound && (raw as any).screen ? raw : null;
      
      if (templateData) {
        setCurrentTemplateData(templateData);
        setCurrentTemplateIndex(templateIndex);
        currentTemplateIndexRef.current = templateIndex;
        // Update business name if available
        if (templateData.screen?.business_name) {
          setBusinessName(templateData.screen.business_name);
        } else if (baseData.screen?.business_name) {
          setBusinessName(baseData.screen.business_name);
        }
      } else {
        setCurrentTemplateData(baseData);
        setCurrentTemplateIndex(templateIndex);
        currentTemplateIndexRef.current = templateIndex;
        if (baseData.screen?.business_name) {
          setBusinessName(baseData.screen.business_name);
        }
      }
    } catch (err) {
      console.error('Error loading template for rotation:', err);
      setCurrentTemplateData(baseData);
      setCurrentTemplateIndex(templateIndex);
      currentTemplateIndexRef.current = templateIndex;
      if (baseData.screen?.business_name) {
        setBusinessName(baseData.screen.business_name);
      }
    }
  };

  // Apply animation when item changes
  useEffect(() => {
    if (!screenData || !itemRef.current) return;

    setIsAnimating(true);
    const duration = screenData.screen.animation_duration || 500;

    setTimeout(() => {
      setIsAnimating(false);
    }, duration);
  }, [currentMenuIndex, currentItemIndex, screenData]);

  // Auto-rotate items
  useEffect(() => {
    if (!screenData || screenData.menus.length === 0) return;

    const currentMenu = screenData.menus[currentMenuIndex];
    if (!currentMenu || currentMenu.items.length === 0) return;

    const slideDuration = currentMenu.slide_duration * 1000;

    const timer = setInterval(() => {
      setCurrentItemIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= currentMenu.items.length) {
          setCurrentMenuIndex((menuIdx) => {
            const nextMenuIdx = (menuIdx + 1) % screenData.menus.length;
            setCurrentItemIndex(0);
            return nextMenuIdx;
          });
          return 0;
        }
        return nextIndex;
      });
    }, slideDuration);

    return () => clearInterval(timer);
  }, [screenData, currentMenuIndex, currentItemIndex]);

  // Template rotation: tek şablon ise display_duration sonunda yenile; 2+ şablon ise süreyle dönüş (önizleme/screenshot modunda dönme)
  useEffect(() => {
    if (previewIndex != null) return;
    if (rotationIndexFromUrl != null) return;
    if (!screenData?.templateRotations || screenData.templateRotations.length === 0) {
      if (screenData && !currentTemplateData) {
        setCurrentTemplateData(screenData);
        if (screenData.screen?.business_name) {
          setBusinessName(screenData.screen.business_name);
        }
      }
      return;
    }
    // Tek şablon: display_duration (örn. 90 sn) bitince her zaman yenile (aynı şablon baştan)
    if (screenData.templateRotations.length <= 1) {
      if (screenData && !currentTemplateData) {
        loadTemplateForRotation(screenData, 0);
      }
      if (screenData && currentTemplateData && screenData.templateRotations.length === 1) {
        const durationSec = Math.max(1, screenData.templateRotations[0].display_duration || 90);
        const durationMs = durationSec * 1000;
        const timer = setTimeout(() => {
          if (mountedRef.current) loadTemplateForRotation(screenData, 0);
        }, durationMs);
        return () => clearTimeout(timer);
      }
      return;
    }
    // 2 veya daha fazla şablon: her birinin display_duration (saniye) süresiyle sırayla göster; 24/7 kesintisiz döngü
    const currentRotation = screenData.templateRotations[currentTemplateIndex];
    if (!currentRotation) {
      setCurrentTemplateData(screenData);
      return;
    }
    const durationSec = Math.max(1, currentRotation.display_duration || 5);
    const durationMs = durationSec * 1000;
    const nextIndex = (currentTemplateIndex + 1) % screenData.templateRotations!.length;
    const nextRot = screenData.templateRotations![nextIndex] as { transition_duration?: number } | undefined;
    const transitionDuration = nextRot?.transition_duration ?? 1400;
    const N = screenData.templateRotations!.length;
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;
      const cached = rotationCacheRef.current.length === N ? rotationCacheRef.current[nextIndex] : null;
      const applyNextTemplate = (nextData: ScreenData) => {
        if (!mountedRef.current) return;
        requestAnimationFrame(() => {
          if (!mountedRef.current) return;
          setNextTemplateData(nextData);
          setNextTemplateIndex(nextIndex);
          setIsTransitioning(true);
        });
        setTimeout(() => {
          if (!mountedRef.current) return;
          requestAnimationFrame(() => {
            if (!mountedRef.current) return;
            setCurrentTemplateData(nextData);
            setCurrentTemplateIndex(nextIndex);
            currentTemplateIndexRef.current = nextIndex;
            displayReadyRef.current = () => {
              requestAnimationFrame(() => {
                if (!mountedRef.current) return;
                setNextTemplateData(null);
                setIsTransitioning(false);
                setJustFinishedTransition(true);
              });
            };
          });
        }, transitionDuration);
      };
      if (cached) {
        applyNextTemplate(cached);
        return;
      }
      (async () => {
        try {
          const res = await fetch(`/api/public-screen/${encodeURIComponent(token)}?rotationIndex=${nextIndex}`, { cache: 'no-store' });
          const raw = res.ok ? await res.json() : null;
          const nextData = raw && !(raw as any).notFound && (raw as any).screen ? raw : null;
          if (nextData) applyNextTemplate(nextData);
          else if (mountedRef.current) loadTemplateForRotation(screenData, nextIndex);
        } catch (e) {
          if (mountedRef.current) loadTemplateForRotation(screenData, nextIndex);
        }
      })();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [currentTemplateIndex, currentTemplateData, screenData, token, previewIndex, rotationIndexFromUrl]);

  // Geçiş sonrası kısa fade-in süresi bitince bayrağı kaldır
  useEffect(() => {
    if (!justFinishedTransition) return;
    const t = setTimeout(() => setJustFinishedTransition(false), 120);
    return () => clearTimeout(t);
  }, [justFinishedTransition]);

  // Base layer hazır olunca overlay kaldır (film gibi akıcı geçiş)
  const handleDisplayReady = useCallback(() => {
    if (typeof document !== 'undefined') document.body.dataset.displayReady = 'true';
    displayReadyRef.current?.();
    displayReadyRef.current = () => {};
  }, []);

  // Full editor dışı tiplerde (canvas, block) overlay'ı kısa gecikmeyle kaldır; sadece geçiş bittikten sonra (current=next)
  useEffect(() => {
    if (!nextTemplateData || currentTemplateIndex !== nextTemplateIndex) return;
    const isFullEditor = currentTemplateData?.template?.template_type === 'full_editor' && currentTemplateData?.template?.canvas_json;
    if (isFullEditor) return;
    const t = setTimeout(handleDisplayReady, 280);
    return () => clearTimeout(t);
  }, [currentTemplateIndex, nextTemplateIndex, currentTemplateData?.template?.id, nextTemplateData, handleDisplayReady]);

  if (viewAllowed === false) {
    return (
      <EmbedFitWrapper ref={displayContainerRef}>
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center text-white px-4">
          <p className="text-xl md:text-2xl text-center text-slate-300 max-w-lg">
            Bu yayın şu an başka bir cihazda açık. Aynı anda yalnızca bir cihaz izleyebilir.
          </p>
          <p className="mt-4 text-base text-slate-500">Diğer cihazı kapatırsanız birkaç saniye içinde burada açılır.</p>
        </div>
      </EmbedFitWrapper>
    );
  }

  if (loading || (screenData && viewAllowed === null)) {
    return (
      <EmbedFitWrapper ref={displayContainerRef}>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-6xl font-light animate-pulse">
            {businessName || t('display_loading')}
          </div>
        </div>
      </EmbedFitWrapper>
    );
  }

  if (error || !screenData) {
    const isPlaceholderToken = /^TOKEN$/i.test((token || '').trim());
    const message = isPlaceholderToken
      ? 'TOKEN örnek bir kelimedir. Admin panel → Ekranlar → ilgili ekranın "Halka Açık URL" linkini kullanın (zayıf cihaz için …/display/10011?lite=1 veya ?low=1).'
      : (error || t('display_screen_not_found'));
    return (
      <EmbedFitWrapper ref={displayContainerRef}>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-4">
          <div className="text-xl md:text-3xl font-light text-center max-w-2xl">{message}</div>
        </div>
      </EmbedFitWrapper>
    );
  }

  // If template is set, render template layout (veya geçiş animasyonu); dijital menü slotu ise MenuViewer
  const displayData = currentTemplateData || screenData;
  const nextRotation = screenData.templateRotations?.[nextTemplateIndex];
  const rotationEffect = nextRotation?.transition_effect;
  const transitionEffect = isLiteMode ? 'slide-left' : (rotationEffect || (screenData.screen as any).template_transition_effect || 'fade');
  const transitionDurationMs = isLowDeviceMode ? 300 : (isLiteMode ? 5000 : (nextRotation?.transition_duration ?? 1400));

  const tickerText = (screenData.screen as any)?.ticker_text || '';
  const tickerStyle = (screenData.screen as any)?.ticker_style || 'default';
  const showTransitionOverlay = isTransitioning && nextTemplateData && currentTemplateData && !nextTemplateData.digitalMenuData;
  const displayTypeKey = displayData?.digitalMenuData ? 'digital-menu' : displayData?.template?.template_type === 'full_editor' ? 'full-editor' : displayData?.template?.canvas_design ? 'canvas' : 'block';

  // Tek layout: base layer her zaman render, geçişte sadece üstte overlay (unmount yok, video gibi akıcı)
  if (displayData?.digitalMenuData || displayData?.template?.template_type === 'full_editor' || displayData?.template?.canvas_design || (displayData?.template && displayData?.screenBlocks && displayData.screenBlocks.length > 0)) {
    const frameType = (displayData.screen as any)?.frame_type || 'none';
    const hideBottomFrame = !!tickerText;
    return (
      <EmbedFitWrapper ref={displayContainerRef}>
        <div className="fixed inset-0 flex flex-col overflow-hidden bg-black">
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {/* Ustteki overlay arka plansiz; gecis sırasında altta onceki template gorunur, yeni onun uzerine biner */}
            {/* Base layer - aynı tip şablonlar arasında remount yok (key=displayTypeKey) */}
            {displayData?.digitalMenuData ? (
              <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="absolute inset-0 w-full h-full">
                <MenuViewer
                  key={displayTypeKey}
                  data={{
                    id: displayData.digitalMenuData.id,
                    name: displayData.digitalMenuData.name,
                    templateId: displayData.digitalMenuData.templateId,
                    backgroundImage: displayData.digitalMenuData.backgroundImage ?? null,
                    width: displayData.digitalMenuData.width ?? 1920,
                    height: displayData.digitalMenuData.height ?? 1080,
                    layers: (displayData.digitalMenuData.layers || []).map((l: any) => ({
                      id: l.id,
                      type: l.type,
                      x: l.x,
                      y: l.y,
                      width: l.width,
                      height: l.height,
                      rotation: l.rotation ?? 0,
                      displayOrder: l.displayOrder,
                      contentText: l.contentText,
                      fontSize: l.fontSize ?? 24,
                      fontFamily: l.fontFamily ?? 'Arial',
                      fontStyle: l.fontStyle ?? 'normal',
                      color: l.color ?? '#000000',
                      align: l.align ?? 'left',
                      imageUrl: l.imageUrl,
                      style: l.style ?? {},
                    })),
                  }}
                  scaleToFit
                  className="w-full h-full"
                />
              </DisplayFrame>
            ) : displayData?.template?.template_type === 'full_editor' && displayData?.template?.canvas_json ? (
              <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="absolute inset-0 w-full h-full">
                <FullEditorDisplay
                  key={displayTypeKey}
                  canvasJson={displayData.template.canvas_json as object}
                  onReady={handleDisplayReady}
                />
              </DisplayFrame>
            ) : displayData?.template?.canvas_design ? (
              <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="absolute inset-0 w-full h-full">
                <CanvasDisplay
                  key={displayTypeKey}
                  canvasDesign={displayData.template.canvas_design}
                  className="w-full h-full"
                />
              </DisplayFrame>
            ) : displayData?.template && displayData.screenBlocks && displayData.screenBlocks.length > 0 ? (
              <TemplateDisplay
                key={displayTypeKey}
                inline
                screenData={displayData as any}
                animationType={isLiteMode ? 'fade' : (displayData.screen?.animation_type || 'fade')}
                animationDuration={isLowDeviceMode ? 300 : (isLiteMode ? 400 : (displayData.screen?.animation_duration || 500))}
              />
            ) : null}
            {/* Geçiş overlay: animasyon bitene kadar üstte kalır, base layer onReady verince kaldırılır */}
            {showTransitionOverlay && (
              <div className="absolute inset-0 z-[100] pointer-events-none" style={{ background: 'transparent' }}>
                <TemplateTransition
                  inline
                  nextOnly
                  effect={transitionEffect}
                  currentData={currentTemplateData}
                  nextData={nextTemplateData}
                  duration={transitionDurationMs}
                  animationType={isLiteMode ? 'fade' : (currentTemplateData.screen?.animation_type || 'fade')}
                  animationDuration={isLowDeviceMode ? 300 : (isLiteMode ? 400 : (currentTemplateData.screen?.animation_duration || 500))}
                />
              </div>
            )}
          </div>
          {tickerText && String(tickerText).trim() ? (
            <div className="flex-shrink-0">
              <TickerTape key="ticker" text={tickerText} style={tickerStyle} />
            </div>
          ) : null}
        </div>
      </EmbedFitWrapper>
    );
  }

  if (!screenData.menus || screenData.menus.length === 0) {
    return (
      <EmbedFitWrapper ref={displayContainerRef} fadeIn={justFinishedTransition}>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-5xl font-light">{t('display_no_menus')}</div>
        </div>
      </EmbedFitWrapper>
    );
  }

  const currentMenu = screenData.menus[currentMenuIndex];
  const currentItem = currentMenu?.items[currentItemIndex];

  if (!currentItem) {
    return (
      <EmbedFitWrapper ref={displayContainerRef} fadeIn={justFinishedTransition}>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-5xl font-light">{t('display_no_items')}</div>
        </div>
      </EmbedFitWrapper>
    );
  }

  const animationType = isLiteMode ? 'fade' : (screenData.screen.animation_type || 'fade');
  const animationDuration = isLowDeviceMode ? 300 : (isLiteMode ? 400 : (screenData.screen.animation_duration || 500));

  return (
    <EmbedFitWrapper ref={displayContainerRef} fadeIn={justFinishedTransition}>
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade {
          animation: fadeIn ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-slide {
          animation: slideIn ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .animate-zoom {
          animation: zoomIn ${animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>
      
      {/* Premium TV Display - Restaurant Quality Design */}
      <div 
        className="fixed inset-0 text-white overflow-hidden flex flex-col"
        style={{
          fontFamily: (screenData.screen as any).font_family || 'system-ui',
          background: (screenData.screen as any).background_style === 'image' && (screenData.screen as any).background_image_url
            ? `url(${resolveMediaUrl((screenData.screen as any).background_image_url)}) center/cover`
            : (screenData.screen as any).background_style === 'solid'
            ? (screenData.screen as any).background_color || '#0f172a'
            : `linear-gradient(to bottom right, ${(screenData.screen as any).background_color || '#0f172a'}, ${(screenData.screen as any).background_color || '#1e293b'})`,
        }}
      >
        <DisplayFrame frameType={(screenData.screen as any)?.frame_type || 'none'} hideBottomFrame={!!String((screenData.screen as any)?.ticker_text || '').trim()} className="flex-1 min-h-0 overflow-hidden">
        {/* TV Safe Area - 5% margins */}
        <div className="h-full w-full p-[5%] flex flex-col">
          
          {/* Header Section - Menu Name */}
          <header className="mb-8 text-center">
            <h1 className="text-7xl font-bold mb-3 tracking-tight text-white drop-shadow-lg">
              {currentMenu.name}
            </h1>
            {currentMenu.description && (
              <p className="text-3xl font-light text-slate-300 max-w-4xl mx-auto">
                {currentMenu.description}
              </p>
            )}
          </header>

          {/* Main Content Area - Menu Item Display */}
          <main className="flex-1 flex items-center justify-center">
            <div
              ref={itemRef}
              className={`w-full max-w-7xl mx-auto ${isAnimating ? `animate-${animationType}` : ''}`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                
                {/* Item Image - Premium Styling */}
                {currentItem.image_url && (
                  <div className="flex justify-center lg:justify-end">
                    <div className="relative">
                      <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-orange-500/20 rounded-3xl blur-2xl"></div>
                      <img
                        src={resolveMediaUrl(currentItem.image_url)}
                        alt={currentItem.name}
                        className="relative w-full max-w-lg h-auto object-cover rounded-3xl shadow-2xl border-4 border-white/10"
                        style={{ maxHeight: '600px' }}
                      />
                    </div>
                  </div>
                )}

                {/* Item Details - Premium Typography */}
                <div className="text-center lg:text-left space-y-6">
                  <div>
                    <h2 className="text-6xl lg:text-7xl font-bold mb-4 text-white leading-tight tracking-tight">
                      {currentItem.name}
                    </h2>
                    {currentItem.description && (
                      <p className="text-2xl lg:text-3xl font-light text-slate-300 leading-relaxed max-w-2xl">
                        {currentItem.description}
                      </p>
                    )}
                  </div>
                  
                  {/* Price - Highlighted with Custom Color */}
                  {currentItem.price && (
                    <div className="mt-8">
                      <div className="inline-flex items-baseline gap-2">
                        <span 
                          className="text-5xl lg:text-6xl font-bold drop-shadow-lg"
                          style={{ color: (screenData.screen as any).primary_color || '#fbbf24' }}
                        >
                          {formatPrice(currentItem.price)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Footer - Progress Indicator */}
          <footer className="mt-8">
            <div className="max-w-6xl mx-auto">
              {/* Progress Dots */}
              <div className="flex justify-center items-center gap-3 mb-4">
                {currentMenu.items.map((_, idx) => (
                  <div
                    key={idx}
                    className={`transition-all duration-500 rounded-full ${
                      idx === currentItemIndex
                        ? 'w-12 h-3 bg-white shadow-lg'
                        : 'w-3 h-3 bg-white/30'
                    }`}
                  />
                ))}
              </div>
              
              {/* Item Counter */}
              <div className="text-center">
                <span className="text-xl font-light text-slate-400">
                  {currentItemIndex + 1} / {currentMenu.items.length}
                </span>
              </div>
            </div>
          </footer>
        </div>
        </DisplayFrame>
        <TickerTape text={(screenData.screen as any)?.ticker_text || ''} style={(screenData.screen as any)?.ticker_style || 'default'} />

        {/* Decorative Elements - Subtle Background Pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        </div>
      </div>
    </EmbedFitWrapper>
  );
}

// Beyaz / çok açık renk mi kontrol et (display arka planı template önizlemesi gibi koyu olsun)
// Template geçiş efektleri: current çıkış, next giriş
const TRANSITION_DURATION_MS = 1400;

function TemplateTransition({
  inline,
  effect,
  currentData,
  nextData,
  duration,
  animationType,
  animationDuration,
  nextOnly,
}: {
  inline?: boolean;
  effect: string;
  currentData: ScreenData;
  nextData: ScreenData;
  duration: number;
  animationType: string;
  animationDuration: number;
  /** true = sadece next katmanı (current = base layer, yeniden yükleme yok) */
  nextOnly?: boolean;
}) {
  const wrapClass = inline ? 'transition-wrap absolute inset-0 overflow-hidden' : 'transition-wrap fixed inset-0 overflow-hidden';
  return (
    <>
      <style jsx global>{`
        .transition-wrap { --dur: ${duration}ms; contain: layout style paint; background: transparent !important; }
        .transition-current { position: absolute; inset: 0; z-index: 10; will-change: transform, opacity; transform: translateZ(0); backface-visibility: hidden; background: transparent !important; }
        .transition-next { position: absolute; inset: 0; z-index: 20; will-change: transform, opacity; transform: translateZ(0); backface-visibility: hidden; background: transparent !important; }
        .transition-car { position: absolute; inset: 0; z-index: 30; pointer-events: none; display: flex; align-items: center; justify-content: flex-start; }
        .transition-car-inner { font-size: min(12vw, 120px); filter: drop-shadow(0 4px 20px rgba(0,0,0,0.5)); animation: carDrive var(--dur) ease-in-out forwards; }
        @keyframes carDrive { 0% { transform: translateX(-20%); } 100% { transform: translateX(120%); } }
        [data-effect="fade"] .transition-current { animation: fadeOut var(--dur) ease forwards; }
        [data-effect="fade"] .transition-next { animation: fadeIn var(--dur) ease forwards; }
        @keyframes fadeOut { to { opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        [data-effect="slide-left"] .transition-current { animation: slideOutLeft var(--dur) ease-in-out forwards; }
        [data-effect="slide-left"] .transition-next { animation: slideInFromRight var(--dur) ease-in-out forwards; }
        @keyframes slideOutLeft { to { transform: translateX(-100%); } }
        @keyframes slideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        [data-effect="slide-right"] .transition-current { animation: slideOutRight var(--dur) ease-in-out forwards; }
        [data-effect="slide-right"] .transition-next { animation: slideInFromLeft var(--dur) ease-in-out forwards; }
        @keyframes slideOutRight { to { transform: translateX(100%); } }
        @keyframes slideInFromLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        [data-effect="zoom"] .transition-current { animation: zoomOut var(--dur) ease forwards; }
        [data-effect="zoom"] .transition-next { animation: zoomIn var(--dur) ease forwards; }
        @keyframes zoomOut { to { opacity: 0; transform: scale(0.85); } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: scale(1); } }
        [data-effect="flip"] .transition-current { animation: flipOut var(--dur) ease-in-out forwards; transform-origin: left center; }
        [data-effect="flip"] .transition-next { animation: flipIn var(--dur) ease-in-out forwards; transform-origin: right center; }
        @keyframes flipOut { to { opacity: 0; transform: perspective(1200px) rotateY(-90deg); } }
        @keyframes flipIn { from { opacity: 0; transform: perspective(1200px) rotateY(90deg); } to { opacity: 1; transform: perspective(1200px) rotateY(0); } }
        [data-effect="car-pull"] .transition-current { animation: fadeOut var(--dur) ease forwards; }
        [data-effect="car-pull"] .transition-next { animation: slideInFromRight var(--dur) ease-in-out forwards; }
        [data-effect="curtain"] .transition-current { animation: curtainOut var(--dur) ease-in-out forwards; }
        [data-effect="curtain"] .transition-next { animation: curtainIn var(--dur) ease-in-out forwards; }
        @keyframes curtainOut { to { clip-path: inset(0 50% 0 50%); opacity: 0; } }
        @keyframes curtainIn { from { clip-path: inset(0 50% 0 50%); } to { clip-path: inset(0 0 0 0); opacity: 1; } }
        [data-effect="wipe"] .transition-current { animation: wipeOut var(--dur) ease-in-out forwards; }
        [data-effect="wipe"] .transition-next { animation: wipeIn var(--dur) ease-in-out forwards; }
        @keyframes wipeOut { to { clip-path: inset(0 0 0 100%); } }
        @keyframes wipeIn { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
        [data-effect="slide-up"] .transition-current { animation: slideOutUp var(--dur) ease-in-out forwards; }
        [data-effect="slide-up"] .transition-next { animation: slideInFromDown var(--dur) ease-in-out forwards; }
        @keyframes slideOutUp { to { transform: translateY(-100%); } }
        @keyframes slideInFromDown { from { transform: translateY(100%); } to { transform: translateY(0); } }
        [data-effect="slide-down"] .transition-current { animation: slideOutDown var(--dur) ease-in-out forwards; }
        [data-effect="slide-down"] .transition-next { animation: slideInFromUp var(--dur) ease-in-out forwards; }
        @keyframes slideOutDown { to { transform: translateY(100%); } }
        @keyframes slideInFromUp { from { transform: translateY(-100%); } to { transform: translateY(0); } }
        [data-effect="bounce"] .transition-current { animation: bounceOut var(--dur) ease-in-out forwards; }
        [data-effect="bounce"] .transition-next { animation: bounceIn var(--dur) ease-in-out forwards; }
        @keyframes bounceOut { to { opacity: 0; transform: scale(0.7); } }
        @keyframes bounceIn { from { opacity: 0; transform: scale(0.3); } 60% { transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
        [data-effect="rotate"] .transition-current { animation: rotateOut var(--dur) ease-in-out forwards; transform-origin: center center; }
        [data-effect="rotate"] .transition-next { animation: rotateIn var(--dur) ease-in-out forwards; transform-origin: center center; }
        @keyframes rotateOut { to { opacity: 0; transform: rotate(-180deg) scale(0.5); } }
        @keyframes rotateIn { from { opacity: 0; transform: rotate(180deg) scale(0.5); } to { opacity: 1; transform: rotate(0) scale(1); } }
        [data-effect="blur"] .transition-current { animation: blurOut var(--dur) ease forwards; }
        [data-effect="blur"] .transition-next { animation: blurIn var(--dur) ease forwards; }
        @keyframes blurOut { to { opacity: 0; filter: blur(20px); } }
        @keyframes blurIn { from { opacity: 0; filter: blur(20px); } to { opacity: 1; filter: blur(0); } }
        [data-effect="cross-zoom"] .transition-current { animation: crossZoomOut var(--dur) ease forwards; transform-origin: center center; }
        [data-effect="cross-zoom"] .transition-next { animation: crossZoomIn var(--dur) ease forwards; transform-origin: center center; }
        @keyframes crossZoomOut { to { opacity: 0; transform: scale(2); } }
        @keyframes crossZoomIn { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }
        [data-effect="cube"] .transition-current { animation: cubeOut var(--dur) ease-in-out forwards; transform-origin: right center; }
        [data-effect="cube"] .transition-next { animation: cubeIn var(--dur) ease-in-out forwards; transform-origin: left center; }
        @keyframes cubeOut { to { opacity: 0; transform: perspective(1200px) rotateY(90deg); } }
        @keyframes cubeIn { from { opacity: 0; transform: perspective(1200px) rotateY(-90deg); } to { opacity: 1; transform: perspective(1200px) rotateY(0); } }
        [data-effect="card-flip"] .transition-current { animation: cardFlipOut var(--dur) ease-in-out forwards; transform-origin: center center; }
        [data-effect="card-flip"] .transition-next { animation: cardFlipIn var(--dur) ease-in-out forwards; transform-origin: center center; }
        @keyframes cardFlipOut { to { opacity: 0; transform: perspective(1200px) rotateX(-90deg); } }
        @keyframes cardFlipIn { from { opacity: 0; transform: perspective(1200px) rotateX(90deg); } to { opacity: 1; transform: perspective(1200px) rotateX(0); } }
        [data-effect="split"] .transition-current { animation: splitOut var(--dur) ease-in-out forwards; transform-origin: center center; }
        [data-effect="split"] .transition-next { animation: splitIn var(--dur) ease-in-out forwards; transform-origin: center center; }
        @keyframes splitOut { to { opacity: 0; clip-path: inset(0 50% 0 50%); transform: scale(0.95); } }
        @keyframes splitIn { from { opacity: 0; clip-path: inset(0 50% 0 50%); transform: scale(1.05); } to { opacity: 1; clip-path: inset(0 0 0 0); transform: scale(1); } }
        [data-effect="door"] .transition-current { animation: doorOut var(--dur) ease-in-out forwards; }
        [data-effect="door"] .transition-next { animation: doorIn var(--dur) ease-in-out forwards; }
        @keyframes doorOut { to { clip-path: polygon(50% 0, 50% 0, 50% 100%, 50% 100%); opacity: 0; } }
        @keyframes doorIn { from { clip-path: polygon(50% 0, 50% 0, 50% 100%, 50% 100%); opacity: 0; } to { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); opacity: 1; } }
        [data-effect="pixelate"] .transition-current { animation: pixelateOut var(--dur) ease forwards; }
        [data-effect="pixelate"] .transition-next { animation: pixelateIn var(--dur) ease forwards; }
        @keyframes pixelateOut { to { opacity: 0; filter: blur(20px); transform: scale(0.6); } }
        @keyframes pixelateIn { from { opacity: 0; filter: blur(15px); transform: scale(1.4); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
        [data-effect="glitch"] .transition-current { animation: glitchOut var(--dur) ease-in-out forwards; }
        [data-effect="glitch"] .transition-next { animation: glitchIn var(--dur) ease-in-out forwards; }
        @keyframes glitchOut { 0% { transform: translate(0, 0); opacity: 1; } 25% { transform: translate(-8px, 2px); opacity: 0.9; } 50% { transform: translate(6px, -2px); opacity: 0.85; } 75% { transform: translate(-4px, 1px); opacity: 0.5; } 100% { transform: translate(15px, 0); opacity: 0; } }
        @keyframes glitchIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        [data-effect="slide-zoom"] .transition-current { animation: slideZoomOut var(--dur) ease-in-out forwards; transform-origin: left center; }
        [data-effect="slide-zoom"] .transition-next { animation: slideZoomIn var(--dur) ease-in-out forwards; transform-origin: right center; }
        @keyframes slideZoomOut { to { opacity: 0; transform: translateX(-100%) scale(0.7); } }
        @keyframes slideZoomIn { from { opacity: 0; transform: translateX(100%) scale(0.7); } to { opacity: 1; transform: translateX(0) scale(1); } }
      `}</style>
      <div className={wrapClass} data-effect={effect}>
        {!nextOnly && (
          <div className="transition-current">
            <TemplateDisplay inline screenData={currentData as any} animationType={animationType} animationDuration={animationDuration} />
          </div>
        )}
        <div className="transition-next">
          <TemplateDisplay inline screenData={nextData as any} animationType={animationType} animationDuration={animationDuration} />
        </div>
        {effect === 'car-pull' && (
          <div className="transition-car">
            <span className="transition-car-inner" role="img" aria-hidden>🚗</span>
          </div>
        )}
      </div>
    </>
  );
}

