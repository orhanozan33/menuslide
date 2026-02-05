'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const MenuViewer = dynamic(
  () => import('@/components/digital-menu/MenuViewer'),
  { ssr: false },
);

import { TemplateDisplay } from '@/components/display/TemplateDisplay';
import CanvasDisplay from '@/components/display/CanvasDisplay';
import { DisplayFrame } from '@/components/display/DisplayFrame';
import { TickerTape } from '@/components/display/TickerTape';
import { formatPrice } from '@/lib/formatPrice';
import { useTranslation } from '@/lib/i18n/useTranslation';

const EMBED_WIDTH = 1920;
const EMBED_HEIGHT = 1080;

function useInIframe() {
  const [inIframe, setInIframe] = useState(false);
  useEffect(() => {
    setInIframe(typeof window !== 'undefined' && window.self !== window.top);
  }, []);
  return inIframe;
}

function EmbedFitWrapper({ children }: { children: React.ReactNode }) {
  const inIframe = useInIframe();
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setScale(Math.min(w / EMBED_WIDTH, h / EMBED_HEIGHT));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Her zaman scale uygula — iframe veya normal sekme fark etmez; içerik ekranı doldurur
  return (
    <div
      style={{
        width: EMBED_WIDTH,
        height: EMBED_HEIGHT,
        transform: `scale(${scale})`,
        transformOrigin: inIframe ? '0 0' : 'center center',
        position: 'fixed' as const,
        top: inIframe ? 0 : '50%',
        left: inIframe ? 0 : '50%',
        margin: inIframe ? 0 : `-${EMBED_HEIGHT / 2}px 0 0 -${EMBED_WIDTH / 2}px`,
        overflow: 'hidden',
      }}
    >
      {children}
    </div>
  );
}

const EXIT_BUTTON_HIDE_AFTER_MS = 4000; // Tam ekranda buton göründükten sonra tekrar gizleme süresi

function FullScreenButton() {
  const inIframe = useInIframe();
  const { t } = useTranslation();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showExitButton, setShowExitButton] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (fullscreen) {
        setShowExitButton(false);
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Tam ekrandayken tıklama veya kumanda (tuş) ile butonu tekrar göster
  useEffect(() => {
    if (!isFullscreen) return;

    const showAndMaybeHideAgain = () => {
      setShowExitButton(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        setShowExitButton(false);
      }, EXIT_BUTTON_HIDE_AFTER_MS);
    };

    const onInteraction = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target?.closest?.('button') && target.closest('button')?.getAttribute('data-fullscreen-toggle') === 'true') return;
      showAndMaybeHideAgain();
    };

    document.addEventListener('click', onInteraction, true);
    document.addEventListener('keydown', onInteraction, true);
    return () => {
      document.removeEventListener('click', onInteraction, true);
      document.removeEventListener('keydown', onInteraction, true);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };
  }, [isFullscreen]);

  if (inIframe) return null;

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Tam ekranda ve buton gizliyse hiç gösterme
  if (isFullscreen && !showExitButton) return null;

  return (
    <button
      type="button"
      data-fullscreen-toggle="true"
      onClick={toggle}
      className="fixed bottom-4 right-4 z-[100] px-4 py-2 rounded-lg bg-black/70 hover:bg-black/90 text-white text-sm font-medium border border-white/20 shadow-lg flex items-center gap-2"
      title={isFullscreen ? t('display_exit_fullscreen_hint') : t('display_fullscreen_hint')}
    >
      {isFullscreen ? (
        <>⛶ {t('display_exit_fullscreen')}</>
      ) : (
        <>⛶ {t('display_fullscreen')}</>
      )}
    </button>
  );
}

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
  const token = (params?.token ?? '') as string;
  const { t, localePath } = useTranslation();

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
  const [templateRenewKey, setTemplateRenewKey] = useState(0); // Tek şablonda süre bitince yenilemek için
  const [businessName, setBusinessName] = useState<string>('');
  const [viewAllowed, setViewAllowed] = useState<boolean | null>(null);
  const loadInProgressRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const POLL_INTERVAL_MS = 60_000; // 60s - tek interval, 1000 TV için ölçeklenebilir
  const MAX_BACKOFF_MS = 60_000;
  const HEARTBEAT_INTERVAL_MS = 45_000;

  useEffect(() => {
    loadScreenData();
    const pollInterval = setInterval(loadScreenData, POLL_INTERVAL_MS);
    return () => {
      clearInterval(pollInterval);
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    };
  }, [token]);

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

  const loadScreenData = async () => {
    if (loadInProgressRef.current) return;
    loadInProgressRef.current = true;
    try {
      const rotationIdx =
        screenData?.templateRotations?.length &&
        screenData.templateRotations.length > 0
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
        const idx = Math.min(currentTemplateIndexRef.current, data.templateRotations.length - 1);
        setCurrentTemplateData(data);
        currentTemplateIndexRef.current = idx;
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

  // Template rotation: tek şablon ise display_duration sonunda yenile; 2+ şablon ise süreyle dönüş
  useEffect(() => {
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
        const durationMs = (screenData.templateRotations[0].display_duration || 90) * 1000;
        const timer = setTimeout(() => {
          setTemplateRenewKey((k) => k + 1);
          loadTemplateForRotation(screenData, 0);
        }, durationMs);
        return () => clearTimeout(timer);
      }
      return;
    }
    // 2 veya daha fazla şablon: her birinin display_duration süresiyle sırayla göster
    const currentRotation = screenData.templateRotations[currentTemplateIndex];
    if (!currentRotation) {
      setCurrentTemplateData(screenData);
      return;
    }
    const durationMs = (currentRotation.display_duration || 5) * 1000;
    const transitionDuration = 1400;
    const timer = setTimeout(async () => {
      const nextIndex = (currentTemplateIndex + 1) % screenData.templateRotations!.length;
      try {
        const res = await fetch(`/api/public-screen/${encodeURIComponent(token)}?rotationIndex=${nextIndex}`, { cache: 'no-store' });
        const raw = res.ok ? await res.json() : null;
        const nextData = raw && !(raw as any).notFound && (raw as any).screen ? raw : null;
        if (!nextData) return;
        setNextTemplateData(nextData);
        setNextTemplateIndex(nextIndex);
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentTemplateData(nextData);
          setCurrentTemplateIndex(nextIndex);
          currentTemplateIndexRef.current = nextIndex;
          setNextTemplateData(null);
          setIsTransitioning(false);
        }, transitionDuration);
      } catch (e) {
        loadTemplateForRotation(screenData, nextIndex);
      }
    }, durationMs);
    return () => clearTimeout(timer);
  }, [currentTemplateIndex, currentTemplateData, screenData, token]);

  if (viewAllowed === false) {
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-6 text-center">
          <h2 className="text-xl md:text-3xl font-bold mb-3">{t('display_blocked_multiple_devices_title')}</h2>
          <p className="text-white/80 mb-6 max-w-lg">{t('display_blocked_multiple_devices_message')}</p>
          <Link
            href={localePath('/pricing')}
            className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-400 transition-colors"
          >
            {t('display_blocked_upgrade_plan')}
          </Link>
        </div>
      </EmbedFitWrapper>
    );
  }

  if (loading || (screenData && viewAllowed === null)) {
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-6xl font-light animate-pulse">
            {businessName || t('display_loading')}
          </div>
        </div>
      </EmbedFitWrapper>
    );
  }

  if (error || !screenData) {
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-2xl md:text-5xl font-light text-center px-4">{error || t('display_screen_not_found')}</div>
        </div>
      </EmbedFitWrapper>
    );
  }

  // If template is set, render template layout (veya geçiş animasyonu); dijital menü slotu ise MenuViewer
  const displayData = currentTemplateData || screenData;
  const rotationEffect = screenData.templateRotations?.[nextTemplateIndex]?.transition_effect;
  const transitionEffect = rotationEffect || (screenData.screen as any).template_transition_effect || 'fade';

  // Dijital menü slotu (rotasyonda template_type=digital_menu)
  if (displayData?.digitalMenuData) {
    const frameType = (displayData.screen as any)?.frame_type || 'none';
    const tickerText = (displayData.screen as any)?.ticker_text || '';
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 w-full h-full overflow-hidden bg-black flex flex-col">
          <DisplayFrame frameType={frameType} hideBottomFrame={!!tickerText} className="flex-1 min-h-0 overflow-hidden">
            <MenuViewer
            key={templateRenewKey}
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
          <TickerTape text={tickerText} style={(displayData.screen as any)?.ticker_style || 'default'} />
        </div>
        <FullScreenButton />
      </EmbedFitWrapper>
    );
  }

  // Canvas tasarım şablonu: canvas_design ile render et
  if (displayData?.template?.canvas_design) {
    const tickerText = (screenData.screen as any)?.ticker_text || '';
    const tickerStyle = (screenData.screen as any)?.ticker_style || 'default';
    const frameType = (displayData.screen as any)?.frame_type || 'none';
    const hideBottomFrame = !!tickerText;
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 min-h-0 w-full overflow-hidden relative">
            <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="absolute inset-0 w-full h-full">
              <CanvasDisplay
                key={templateRenewKey}
                canvasDesign={displayData.template.canvas_design}
                className="w-full h-full"
              />
            </DisplayFrame>
          </div>
          <div className="flex-shrink-0">
            <TickerTape key="ticker" text={tickerText} style={tickerStyle} />
          </div>
        </div>
        <FullScreenButton />
      </EmbedFitWrapper>
    );
  }

  if (displayData?.template && displayData.screenBlocks && displayData.screenBlocks.length > 0) {
    const tickerText = (screenData.screen as any)?.ticker_text || '';
    const tickerStyle = (screenData.screen as any)?.ticker_style || 'default';
    return (
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex flex-col bg-black overflow-hidden">
          <div className="flex-1 min-h-0 relative overflow-hidden">
            {isTransitioning && nextTemplateData && currentTemplateData && !nextTemplateData.digitalMenuData ? (
              <TemplateTransition
                inline
                effect={transitionEffect}
                currentData={currentTemplateData}
                nextData={nextTemplateData}
                duration={1400}
                animationType={displayData.screen.animation_type || 'fade'}
                animationDuration={displayData.screen.animation_duration || 500}
              />
            ) : (
              <TemplateDisplay
                key={templateRenewKey}
                inline
                screenData={displayData as any}
                animationType={displayData.screen.animation_type || 'fade'}
                animationDuration={displayData.screen.animation_duration || 500}
              />
            )}
          </div>
          {tickerText && String(tickerText).trim() ? (
            <div className="flex-shrink-0">
              <TickerTape key="ticker" text={tickerText} style={tickerStyle} />
            </div>
          ) : null}
        </div>
        <FullScreenButton />
      </EmbedFitWrapper>
    );
  }

  if (!screenData.menus || screenData.menus.length === 0) {
    return (
      <EmbedFitWrapper>
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
      <EmbedFitWrapper>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
          <div className="text-5xl font-light">{t('display_no_items')}</div>
        </div>
      </EmbedFitWrapper>
    );
  }

  const animationType = screenData.screen.animation_type || 'fade';
  const animationDuration = screenData.screen.animation_duration || 500;

  return (
    <EmbedFitWrapper>
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
            ? `url(${(screenData.screen as any).background_image_url}) center/cover`
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
                        src={currentItem.image_url}
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
        <FullScreenButton />
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
}: {
  inline?: boolean;
  effect: string;
  currentData: ScreenData;
  nextData: ScreenData;
  duration: number;
  animationType: string;
  animationDuration: number;
}) {
  const wrapClass = inline ? 'transition-wrap absolute inset-0 overflow-hidden' : 'transition-wrap fixed inset-0 overflow-hidden';
  return (
    <>
      <style jsx global>{`
        .transition-wrap { --dur: ${duration}ms; }
        .transition-current { position: absolute; inset: 0; z-index: 10; }
        .transition-next { position: absolute; inset: 0; z-index: 20; }
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
      `}</style>
      <div className={wrapClass} data-effect={effect}>
        <div className="transition-current">
          <TemplateDisplay inline screenData={currentData as any} animationType={animationType} animationDuration={animationDuration} />
        </div>
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

