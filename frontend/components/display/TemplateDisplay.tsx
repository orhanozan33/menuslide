'use client';

import React, { useMemo, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';
import { DisplayFrame } from './DisplayFrame';
import { VideoRotationPlayer } from './VideoRotationPlayer';
import { ImageRotationPlayer, type ImageRotationItem } from './ImageRotationPlayer';

const FullEditorDisplay = dynamic(
  () => import('./FullEditorDisplay').then((m) => ({ default: m.FullEditorDisplay })),
  { ssr: false },
);

interface ScreenData {
  screen: {
    id: string;
    name: string;
    animation_type?: string;
    animation_duration?: number;
    [key: string]: unknown;
  };
  template?: { id: string; block_count?: number; [key: string]: unknown };
  screenBlocks?: Array<{
    id: string;
    template_block_id?: string;
    block_index?: number;
    position_x?: number;
    position_y?: number;
    width?: number;
    height?: number;
    style_config?: string | Record<string, unknown>;
    [key: string]: unknown;
  }>;
  blockContents?: Array<{
    id: string;
    screen_block_id?: string;
    template_block_id?: string;
    content_type?: string;
    image_url?: string | null;
    title?: string | null;
    campaign_text?: string | null;
    background_color?: string | null;
    text_color?: string | null;
    menu_item?: { name?: string; description?: string; image_url?: string; [key: string]: unknown };
    menu_items?: Array<{ name?: string; description?: string; image_url?: string; [key: string]: unknown }>;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

interface TemplateDisplayProps {
  screenData: ScreenData;
  animationType?: string;
  animationDuration?: number;
  /** true = modal/önizleme içinde (absolute), false = tam ekran TV (fixed) */
  inline?: boolean;
}

function getGridLayout(blockCount: number) {
  if (blockCount <= 0) return { cols: 2, rows: 2, gap: '4px', specialLayout: false };
  if (blockCount === 1) return { cols: 1, rows: 1, gap: '0', specialLayout: false };
  if (blockCount === 2) return { cols: 2, rows: 1, gap: '4px', specialLayout: false };
  if (blockCount === 3) return { cols: 2, rows: 2, gap: '4px', specialLayout: true };
  if (blockCount === 4) return { cols: 2, rows: 2, gap: '4px', specialLayout: false };
  if (blockCount === 5) return { cols: 3, rows: 2, gap: '4px', specialLayout: true };
  if (blockCount === 6) return { cols: 3, rows: 2, gap: '4px', specialLayout: false };
  if (blockCount === 7) return { cols: 4, rows: 2, gap: '4px', specialLayout: true };
  if (blockCount === 8) return { cols: 4, rows: 2, gap: '4px', specialLayout: false };
  if (blockCount === 9) return { cols: 3, rows: 3, gap: '4px', specialLayout: false };
  if (blockCount === 12) return { cols: 4, rows: 3, gap: '4px', specialLayout: false };
  if (blockCount === 16) return { cols: 4, rows: 4, gap: '4px', specialLayout: false };
  const cols = Math.ceil(Math.sqrt(blockCount * 16 / 9));
  const rows = Math.ceil(blockCount / cols);
  return { cols, rows, gap: '4px', specialLayout: false };
}

function getDiscountBlockProps(layer: { discountAnimation?: string; discountBlockStyle?: string; blockColor?: string }) {
  const anim = layer.discountAnimation || 'pulse';
  const style = layer.discountBlockStyle || 'rounded';
  const blockColor = layer.blockColor || 'rgba(251, 191, 36, 0.95)';
  const isOutline = style === 'outline';
  return {
    className: `discount-anim-${anim} discount-style-${style} px-3 py-1.5 shadow-lg border`,
    style: {
      backgroundColor: isOutline ? 'transparent' : blockColor,
      borderColor: blockColor,
      color: isOutline ? blockColor : '#1f2937',
      borderWidth: 2,
      borderStyle: 'solid',
    },
  };
}

/** Yayında ve önizlemede Lorem ipsum / placeholder metinleri gösterme */
function sanitizeDisplayText(s: string | undefined | null): string {
  if (s == null || typeof s !== 'string') return '';
  const t = s.trim();
  if (!t) return '';
  const lower = t.toLowerCase();
  if (/lorem\s+ipsum|amet\s+consectetuer|dolor\s+sit\s+amet|consectetuer\s+adipiscing/.test(lower)) return '';
  if (t.length < 80 && /^[a-z\s,]+$/i.test(t) && (lower.includes('amet') || lower.includes('consectetuer') || lower.includes('lorem'))) return '';
  return s;
}

/** Video döngüsü + videoya göre farklı yazı katmanları */
function VideoBlockWithRotation({
  firstVideoUrl,
  firstVideoDurationSeconds,
  rotationItems,
  videoTextLayers,
  videoOverlayImages,
  fit,
  pos,
  scale,
}: {
  firstVideoUrl: string;
  firstVideoDurationSeconds: number;
  rotationItems: Array<{ url: string; durationSeconds?: number; textLayers?: Array<Record<string, unknown>> }>;
  videoTextLayers: Array<Record<string, unknown>>;
  videoOverlayImages: Array<{ id: string; image_url: string; x: number; y: number; size: number; shape: string }>;
  fit: 'cover' | 'contain';
  pos: string;
  scale: number;
}) {
  const [phase, setPhase] = useState<'first' | 'rotation'>('first');
  const [rotationIndex, setRotationIndex] = useState(0);
  const onPhaseChange = useCallback((p: 'first' | 'rotation', i: number) => {
    setPhase(p);
    setRotationIndex(i);
  }, []);
  const activeTextLayers = phase === 'first' ? videoTextLayers : (rotationItems[rotationIndex]?.textLayers || []);
  return (
    <>
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0" style={{ transformOrigin: pos }}>
          <VideoRotationPlayer
            firstVideoUrl={firstVideoUrl}
            firstVideoDurationSeconds={firstVideoDurationSeconds}
            rotationItems={rotationItems.map((it) => ({ url: it.url, durationSeconds: it.durationSeconds ?? 10 }))}
            onPhaseChange={onPhaseChange}
            className="w-full h-full"
            objectFit={fit}
            objectPosition={pos}
            imageScale={scale}
          />
        </div>
      </div>
      {videoOverlayImages.map((o) => (
        <div
          key={o.id}
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            width: `${o.size}%`,
            aspectRatio: '1',
            transform: 'translate(-50%, -50%)',
            borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
            boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
overflow: 'hidden',
            }}
          >
          <img src={resolveMediaUrl(o.image_url)} alt="" className="w-full h-full object-cover" />
        </div>
      ))}
      {activeTextLayers.map((layer: Record<string, unknown>) => {
        const l = layer as { id: string; text?: string; color?: string; size?: number; x?: number; y?: number; fontWeight?: string; fontStyle?: string; fontFamily?: string; icon?: string; iconPosition?: string; isDiscountBlock?: boolean; discountAnimation?: string; discountBlockStyle?: string; blockColor?: string };
        const isDiscount = !!l.isDiscountBlock;
        const iconBefore = l.icon && l.iconPosition !== 'after';
        const iconAfter = l.icon && l.iconPosition === 'after';
        const discountProps = isDiscount ? getDiscountBlockProps(l) : {} as { className?: string; style?: React.CSSProperties };
        return (
          <div
            key={String(l.id)}
            className={`absolute z-30 ${isDiscount ? discountProps.className : ''}`}
            style={{
              left: `${l.x ?? 50}%`,
              top: `${l.y ?? 50}%`,
              transform: `translate(-50%, -50%) rotate(${(l as { rotation?: number }).rotation ?? 0}deg)`,
              ...(isDiscount ? discountProps.style : { color: l.color ?? '#fff' }),
              fontSize: `${l.size ?? 24}px`,
              fontWeight: l.fontWeight ?? 'bold',
              fontStyle: l.fontStyle ?? 'normal',
              fontFamily: l.fontFamily || 'Arial',
              textShadow: isDiscount ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
              whiteSpace: 'pre' as const,
              textAlign: (layer.textAlign as 'left' | 'center' | 'right') || 'center',
            }}
          >
            {iconBefore && <span className="mr-1">{l.icon}</span>}
            {sanitizeDisplayText(l.text)}
            {iconAfter && <span className="ml-1">{l.icon}</span>}
          </div>
        );
      })}
    </>
  );
}

export function TemplateDisplay({
  screenData,
  animationType = 'fade',
  animationDuration = 500,
  inline = false,
}: TemplateDisplayProps) {
  const { t } = useTranslation();
  const blocks = screenData?.screenBlocks ?? [];
  const contents = screenData?.blockContents ?? [];
  const [imageRotationPhaseByContentId, setImageRotationPhaseByContentId] = useState<Record<string, { phase: 'first' | 'rotation'; index: number }>>({});
  const sortedBlocks = useMemo(() => {
    const list = [...blocks];
    list.sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
    return list;
  }, [blocks]);

  const templateBlockCount = (screenData?.template as { block_count?: number })?.block_count;
  // Yayında şablon 5 bloklu ama ekranda 6 blok varsa (eski şablondan kalma) sadece şablon kadar blok göster; düzen editörle aynı olsun, boş 6. hücre kalmasın
  const blocksToRender = useMemo(() => {
    if (templateBlockCount != null && sortedBlocks.length > templateBlockCount)
      return sortedBlocks.slice(0, templateBlockCount);
    return sortedBlocks;
  }, [sortedBlocks, templateBlockCount]);
  const blockCount = blocksToRender.length > 0 ? blocksToRender.length : (templateBlockCount || 0);

  // Blok birleştirmede pozisyon/boyut varsa custom layout kullan — tasarımdaki gibi yayında da büyük blok doğru görünsün
  const useCustomPositions = useMemo(() => {
    if (blocksToRender.length === 0) return false;
    const hasAnyValid = blocksToRender.some((b) => {
      const x = Number((b as Record<string, unknown>).position_x);
      const y = Number((b as Record<string, unknown>).position_y);
      const w = Number((b as Record<string, unknown>).width);
      const h = Number((b as Record<string, unknown>).height);
      return Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0;
    });
    return hasAnyValid;
  }, [blocksToRender]);

  const gridLayout = getGridLayout(blockCount);
  const positionClass = inline ? 'absolute inset-0' : 'fixed inset-0';
  const frameType = (screenData?.screen?.frame_type as string) || 'none';
  const tickerText = (screenData?.screen?.ticker_text as string) || '';
  const hideBottomFrame = !!tickerText;

  // Full Editor şablonu: blok yok, canvas_json ile render et (geçiş sırasında "Şablon yükleniyor" yerine)
  const template = screenData?.template as { template_type?: string; canvas_json?: object } | undefined;
  if ((blockCount === 0 || blocksToRender.length === 0) && template?.template_type === 'full_editor' && template?.canvas_json && typeof template.canvas_json === 'object') {
    return (
      <div className={`${positionClass} w-full h-full bg-black overflow-hidden flex flex-col`}>
        <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="flex-1 min-h-0 overflow-hidden">
          <FullEditorDisplay canvasJson={template.canvas_json} />
        </DisplayFrame>
      </div>
    );
  }

  if (blockCount === 0 || blocksToRender.length === 0) {
    return (
      <div className={`${positionClass} flex items-center justify-center bg-slate-900 text-white`}>
        <span className="text-xl">{t('display_template_loading')}</span>
      </div>
    );
  }

  return (
    <div
      className={`${positionClass} w-full h-full bg-black overflow-hidden flex flex-col`}
      style={{ animationDuration: `${animationDuration}ms` }}
    >
      <DisplayFrame frameType={frameType} hideBottomFrame={hideBottomFrame} className="flex-1 min-h-0 overflow-hidden">
        <div
          className="w-full h-full min-w-0 min-h-0 relative"
          style={
            useCustomPositions
              ? { backgroundColor: '#374151' }
              : {
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                  gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                  gap: gridLayout.gap,
                  backgroundColor: '#374151',
                }
          }
        >
        {blocksToRender.map((block: (typeof blocksToRender)[0], index: number) => {
          const blockId = block.id || (block as { template_block_id?: string }).template_block_id;
          const blockContentsList = contents.filter(
            (c: (typeof contents)[0]) =>
              c.screen_block_id === blockId || c.template_block_id === blockId
          );
          const videoContent = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'video'
          );
          const imageContent = blockContentsList.find(
            (c: (typeof contents)[0]) => (c.content_type === 'image' || c.image_url) && c.content_type !== 'video'
          );
          const badgeContent = blockContentsList.find(
            (c: (typeof contents)[0]) =>
              c.content_type === 'campaign_badge' || c.campaign_text
          );
          const textContent = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'text' || c.title
          );
          const productList = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'product_list'
          );
          const singleProduct = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'single_product'
          );
          const drinkContent = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'drink'
          );
          const regionalMenuContent = blockContentsList.find(
            (c: (typeof contents)[0]) => c.content_type === 'regional_menu'
          );

          // Resim/içecek içeriği için isim/fiyat (image/drink content has title, price in DB)
          const displayTitle = (imageContent?.title as string) || (drinkContent?.title as string) || (textContent?.title as string) || '';
          const displayPrice = imageContent?.price ?? drinkContent?.price ?? textContent?.price;

          const is3Last = blockCount === 3 && index === 2;
          const is5Third = blockCount === 5 && index === 2;
          const is7Last = blockCount === 7 && index === 6;
          // 3 blok: son blok sağ sütunda 2 satır. 5 blok (sağ birleştirme): 3. blok sağ sütunda 2 satır. 7 blok: son blok 2 sütun.
          const spanRows = !useCustomPositions && gridLayout.specialLayout && (is3Last || is5Third);
          const spanCols = !useCustomPositions && is7Last;
          const tallBlockCol = spanRows ? (is3Last ? 2 : 3) : undefined; // 3 blok: col 2 (sağ), 5 blok: col 3 (sağ, birleştirme sonrası)

          // 3 ve 5 bloklu layout: sağ sütun tek dikey blok olmalı. DB'de height=50 olabilir; canlıda 2 satır span için height=100 kullan.
          const posX = Number(block.position_x ?? 0);
          const posY = Number(block.position_y ?? 0);
          const w = Number(block.width ?? 25);
          let h = Number(block.height ?? 25);
          if (useCustomPositions && gridLayout.specialLayout && (is3Last || is5Third) && posX >= 50 && h <= 55) {
            h = 100; // Sağ sütundaki blok tam yükseklik kaplasın
          }
          const blockStyle: React.CSSProperties = useCustomPositions
            ? {
                position: 'absolute',
                left: `${posX}%`,
                top: `${posY}%`,
                width: `${w}%`,
                height: `${h}%`,
              }
            : {
                gridRow: spanRows ? '1 / span 2' : 'auto',
                gridColumn: spanCols ? 'span 2' : tallBlockCol !== undefined ? tallBlockCol : 'auto',
              };

          let styleConfig: Record<string, unknown> = {};
          if (block.style_config) {
            try {
              styleConfig =
                typeof block.style_config === 'string'
                  ? JSON.parse(block.style_config as string) ?? {}
                  : (block.style_config as Record<string, unknown>) ?? {};
            } catch {
              styleConfig = {};
            }
          }
          const bgImage =
            (styleConfig.background_image as string) || (styleConfig.backgroundImage as string) || null;
          const hasVisibleContent = !!(
            (imageContent?.image_url) ||
            (videoContent?.image_url) ||
            regionalMenuContent ||
            badgeContent ||
            (textContent && (textContent.title || (textContent as { campaign_text?: string }).campaign_text)) ||
            productList ||
            singleProduct ||
            drinkContent
          );
          const defaultBlockBg = !hasVisibleContent ? '#3d4552' : '#374151';
          const bgColorRaw =
            (styleConfig.background_color as string) ||
            (styleConfig.backgroundColor as string) ||
            (imageContent?.background_color as string) ||
            (videoContent?.background_color as string) ||
            (textContent?.background_color as string) ||
            (blockContentsList[0]?.background_color as string) ||
            defaultBlockBg;
          const raw = hasVisibleContent ? bgColorRaw : defaultBlockBg;
          const isBlack = (c: string) => {
            const s = (c || '').toLowerCase().trim();
            return s === '#000' || s === '#000000' || s === 'black' || /^#0+$/.test(s.replace('#', ''));
          };
          const bgColor = isBlack(raw) ? defaultBlockBg : raw;
          const isEmptyBlock = !hasVisibleContent;

          const renderVideoBlock = (): React.ReactNode => {
            if (regionalMenuContent || !videoContent || !(videoContent as { image_url?: unknown }).image_url) return null;
            let videoTextLayers: Array<{id: string; text: string; color: string; size: number; x: number; y: number; fontWeight: string; fontStyle: string; textAlign?: 'left' | 'center' | 'right'; fontFamily?: string; icon?: string; iconPosition?: string}> = [];
            let videoOverlayImages: Array<{ id: string; image_url: string; x: number; y: number; size: number; shape: string }> = [];
            let fit: 'cover' | 'contain' = 'cover';
            let pos = 'center';
            let scale = 1;
            let videoRotation: { firstVideoDurationSeconds?: number; rotationUrls?: string[]; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: Array<Record<string, unknown>> }> } | undefined;
            if (videoContent.style_config) {
              try {
                const sc = typeof videoContent.style_config === 'string'
                  ? JSON.parse(videoContent.style_config as string) ?? {}
                  : (videoContent.style_config as Record<string, unknown>) ?? {};
                videoTextLayers = (sc.textLayers as typeof videoTextLayers) || [];
                videoOverlayImages = (sc.overlayImages as typeof videoOverlayImages) || [];
                fit = (sc.imageFit === 'contain' ? 'contain' : 'cover');
                pos = (sc.imagePosition as string) || 'center';
                scale = typeof sc.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, sc.imageScale)) : 1;
                videoRotation = sc.videoRotation as typeof videoRotation;
              } catch {
                videoTextLayers = [];
                videoOverlayImages = [];
              }
            }
            const rotationItems = (() => {
              if (!videoRotation) return [];
              if (Array.isArray(videoRotation.rotationItems) && videoRotation.rotationItems.length > 0)
                return videoRotation.rotationItems.map((it: { url: string; durationSeconds?: number; textLayers?: Array<Record<string, unknown>> }) => ({
                  url: it.url,
                  durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 10,
                  textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
                }));
              if (Array.isArray(videoRotation.rotationUrls)) return videoRotation.rotationUrls.map((url: string) => ({ url, durationSeconds: 10, textLayers: [] }));
              return [];
            })();
            const useRotation = videoRotation && (rotationItems.length > 0 || (typeof videoRotation?.firstVideoDurationSeconds === 'number' && videoRotation.firstVideoDurationSeconds > 0));
            const firstDuration = typeof videoRotation?.firstVideoDurationSeconds === 'number' ? Math.max(1, Math.min(120, videoRotation.firstVideoDurationSeconds)) : 10;
            return (
              <>
                {useRotation ? (
                  <VideoBlockWithRotation
                    firstVideoUrl={videoContent.image_url as string}
                    firstVideoDurationSeconds={firstDuration}
                    rotationItems={rotationItems}
                    videoTextLayers={videoTextLayers}
                    videoOverlayImages={videoOverlayImages}
                    fit={fit}
                    pos={pos}
                    scale={scale}
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 w-full h-full overflow-hidden">
                      <div className="absolute inset-0" style={{ transformOrigin: pos }}>
                        <video
                          src={resolveMediaUrl(videoContent.image_url as string)}
                          className="w-full h-full"
                          autoPlay
                          loop
                          muted
                          playsInline
                          style={{ transform: `scale(${scale})`, transformOrigin: pos, objectFit: fit, objectPosition: pos, imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                        />
                      </div>
                    </div>
                    {videoOverlayImages.map((o) => (
                      <div
                        key={o.id}
                        className="absolute z-20 pointer-events-none"
                        style={{
                          left: `${o.x}%`,
                          top: `${o.y}%`,
                          width: `${o.size}%`,
                          aspectRatio: '1',
                          transform: 'translate(-50%, -50%)',
                          borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                          boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                          overflow: 'hidden',
                        }}
                      >
                        <img src={resolveMediaUrl(o.image_url)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {videoTextLayers.map((layer) => {
                      const l = layer as { icon?: string; iconPosition?: 'before' | 'after'; isDiscountBlock?: boolean; discountAnimation?: string; discountBlockStyle?: string; blockColor?: string };
                      const isDiscount = !!l.isDiscountBlock;
                      const iconBefore = l.icon && l.iconPosition !== 'after';
                      const iconAfter = l.icon && l.iconPosition === 'after';
                      const discountProps = isDiscount ? getDiscountBlockProps(l) : {} as { className?: string; style?: React.CSSProperties };
                      const px = typeof layer.x === 'number' ? layer.x : 50;
                      const py = typeof layer.y === 'number' ? layer.y : 50;
                      return (
                        <div
                          key={layer.id}
                          className={`absolute z-30 ${isDiscount ? discountProps.className : ''}`}
                          style={{
                            left: `${px}%`,
                            top: `${py}%`,
                            transform: `translate(-50%, -50%) rotate(${(layer as { rotation?: number }).rotation ?? 0}deg)`,
                            ...(isDiscount ? discountProps.style : { color: layer.color }),
                            fontSize: `${layer.size}px`,
                            fontWeight: layer.fontWeight,
                            fontStyle: layer.fontStyle,
                            fontFamily: (layer as { fontFamily?: string }).fontFamily || 'Arial',
                            textShadow: isDiscount ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
                            whiteSpace: 'pre' as const,
                            textAlign: (layer.textAlign as 'left' | 'center' | 'right') || 'center',
                          }}
                        >
                          {iconBefore && <span className="mr-1">{l.icon}</span>}
                          {sanitizeDisplayText(layer.text)}
                          {iconAfter && <span className="ml-1">{l.icon}</span>}
                        </div>
                      );
                    })}
                  </>
                )}
              </>
            );
          };

          return (
            <div
              key={block.id ?? blockId ?? index}
              className="relative rounded overflow-hidden flex items-center justify-center min-w-0 min-h-0"
              style={{
                ...blockStyle,
                backgroundColor: bgColor,
                backgroundImage: bgImage ? `url(${resolveMediaUrl(bgImage)})` : undefined,
                backgroundSize: bgImage ? 'cover' : undefined,
                backgroundPosition: bgImage ? 'center' : undefined,
                minWidth: 0,
                minHeight: 0,
                ...(isEmptyBlock ? { border: '1px solid rgba(255,255,255,0.12)', boxSizing: 'border-box' as const } : {}),
              }}
            >
              {/* Yöresel Tek Menü (regional_menu) - öncelikli */}
              {regionalMenuContent && (() => {
                const sc = regionalMenuContent.style_config
                  ? (typeof regionalMenuContent.style_config === 'string'
                      ? (() => { try { return JSON.parse(regionalMenuContent.style_config as string); } catch { return {}; } })()
                      : (regionalMenuContent.style_config as Record<string, unknown>))
                  : {};
                const categories = (sc.categories as Array<{ id?: string; name?: string; image_url?: string; items?: Array<{ name?: string; description?: string; price?: number }> }>) || [];
                const menuItems = (sc.menu_items as Array<{ name?: string; description?: string; price?: number }>) || [];
                const headerTitle = (sc.header_title as string) || (regionalMenuContent.title as string) || '';
                const headerSpecial = (sc.header_special as string) || '';
                const contactInfo = (sc.contact_info as string) || '';
                if (categories.length >= 1) {
                  return (
                    <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400/50 bg-[#0d0d0d] text-white">
                      <div className="flex-shrink-0 text-center py-1 px-2 border-b border-amber-400/30">
                        {headerSpecial && <p className="text-amber-400 text-sm font-serif italic">{headerSpecial}</p>}
                        {headerTitle && <h2 className="text-white font-bold text-base uppercase">{headerTitle}</h2>}
                      </div>
                      <div className="flex-1 min-h-0 flex overflow-hidden">
                        {categories.slice(0, 3).map((cat: { id?: string; name?: string; image_url?: string; items?: Array<{ name?: string; description?: string; price?: number }> }, idx: number) => (
                          <div key={cat.id || idx} className="flex-1 flex flex-col min-w-0 border-r border-amber-400/40 last:border-r-0 overflow-hidden">
                            {cat.image_url && (
                              <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ minHeight: '22%', maxHeight: '28%' }}>
                                <img src={resolveMediaUrl(cat.image_url)} alt="" className="w-full h-full object-cover" />
                              </div>
                            )}
                            <p className="flex-shrink-0 text-center text-amber-400 font-bold text-xs py-1 uppercase border-b border-amber-400/30">{cat.name}</p>
                            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
                              {(cat.items || []).slice(0, 6).map((item: { name?: string; description?: string; price?: number }, i: number) => (
                                <div key={i} className="border-b border-amber-400/20 pb-1 last:border-0">
                                  <p className="text-white font-medium text-sm truncate">{item.name}</p>
                                  {item.description && <p className="text-gray-400 text-xs truncate">{item.description}</p>}
                                  {item.price != null && <span className="text-amber-400 font-semibold text-sm">${Number(item.price).toFixed(2)}</span>}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      {contactInfo && <p className="flex-shrink-0 text-center text-gray-400 text-xs py-1 border-t border-amber-400/30 truncate">{contactInfo}</p>}
                    </div>
                  );
                }
                return (
                  <div className="w-full h-full flex flex-col overflow-hidden rounded-lg border-2 border-amber-400/50 bg-[#1a1a1a] text-white">
                    {regionalMenuContent.image_url && (
                      <div className="flex-shrink-0 w-full overflow-hidden border-b border-amber-400/50" style={{ maxHeight: '40%', minHeight: '40%' }}>
                        <img src={resolveMediaUrl(regionalMenuContent.image_url as string)} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 min-h-0 flex flex-col p-3 overflow-auto">
                      {headerTitle && <h3 className="text-amber-400 font-bold text-lg mb-2">{headerTitle}</h3>}
                      <div className="flex-1 space-y-2">
                        {menuItems.slice(0, 8).map((item: { name?: string; description?: string; price?: number }, i: number) => (
                          <div key={i} className="flex justify-between items-start gap-2 border-b border-amber-400/20 pb-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-white font-medium truncate">{item.name}</p>
                              {item.description && <p className="text-gray-400 text-sm truncate">{item.description}</p>}
                            </div>
                            {item.price != null && <span className="text-amber-400 font-semibold flex-shrink-0">${Number(item.price).toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>
                      {contactInfo && <p className="text-gray-400 text-sm mt-2">{contactInfo}</p>}
                    </div>
                  </div>
                );
              })()}
              {renderVideoBlock() as any}
              {!regionalMenuContent && !videoContent && (imageContent?.image_url || (imageContent?.style_config && (() => {
                try {
                  const sc = typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config;
                  const ir = sc?.imageRotation;
                  return Array.isArray(ir?.rotationItems) && ir.rotationItems.length > 0;
                } catch { return false; }
              })())) && (() => {
                let imageBlur = 0;
                let imageOpacity = 1;
                let imageClipShape: 'rect' | 'circle' = 'rect';
                let textLayers: Array<{id: string; text: string; color: string; size: number; x: number; y: number; fontWeight: string; fontStyle: string; textAlign?: 'left' | 'center' | 'right'; fontFamily?: string; icon?: string; iconPosition?: string}> = [];
                let overlayImages: Array<{ id: string; image_url: string; x: number; y: number; size: number; shape: string }> = [];
                let fit: 'cover' | 'contain' = 'cover';
                let pos = 'center';
                let scaleX = 1;
                let scaleY = 1;
                let imageRotation: { firstImageDurationSeconds?: number; firstImageTransitionType?: string; firstImageTransitionDuration?: number; rotationItems?: Array<{ url: string; durationSeconds?: number; textLayers?: Array<Record<string, unknown>>; title?: string; price?: string }> } | undefined;
                let priceBadge: { enabled?: boolean; model?: string; textTop?: string; price?: string; textBottom?: string; color?: string; textColor?: string; position?: string } | null = null;
                let imageRotationTransition = 'fade';
                let imageRotationTransitionDuration = 500;
                if (imageContent.style_config) {
                  try {
                    const sc =
                      typeof imageContent.style_config === 'string'
                        ? JSON.parse(imageContent.style_config as string) ?? {}
                        : (imageContent.style_config as Record<string, unknown>) ?? {};
                    imageBlur = typeof sc.blur === 'number' ? sc.blur : 0;
                    imageOpacity = typeof sc.imageOpacity === 'number' ? Math.max(0, Math.min(1, sc.imageOpacity)) : 1;
                    imageClipShape = sc.imageClipShape === 'circle' ? 'circle' : 'rect';
                    textLayers = (sc.textLayers as typeof textLayers) || [];
                    overlayImages = (sc.overlayImages as typeof overlayImages) || [];
                    fit = (sc.imageFit === 'contain' ? 'contain' : 'cover');
                    pos = (sc.imagePosition as string) || 'center';
                    const fallbackScale = typeof sc.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, sc.imageScale)) : 1;
                    scaleX = typeof sc.imageScaleX === 'number' ? Math.max(0.5, Math.min(2.5, sc.imageScaleX)) : fallbackScale;
                    scaleY = typeof sc.imageScaleY === 'number' ? Math.max(0.5, Math.min(2.5, sc.imageScaleY)) : fallbackScale;
                    imageRotation = sc.imageRotation as typeof imageRotation;
                    imageRotationTransition = (sc.imageRotationTransition as string) || 'fade';
                    imageRotationTransitionDuration = typeof sc.imageRotationTransitionDuration === 'number' ? Math.max(200, Math.min(5000, sc.imageRotationTransitionDuration)) : 500;
                    if (sc.priceBadge && typeof sc.priceBadge === 'object') priceBadge = sc.priceBadge as typeof priceBadge;
                  } catch {
                    imageBlur = 0;
                    overlayImages = [];
                  }
                }
                const ir = imageRotation;
                const irRotationItems = (() => {
                  if (!ir) return [];
                  if (Array.isArray(ir.rotationItems) && ir.rotationItems.length > 0)
                    return ir.rotationItems.map((it: { url: string; durationSeconds?: number; textLayers?: Array<Record<string, unknown>>; title?: string; price?: string; priceBadge?: typeof priceBadge; transitionType?: string; transitionDuration?: number }) => ({
                      url: it.url,
                      durationSeconds: it.durationSeconds ?? 10,
                      textLayers: Array.isArray(it.textLayers) ? it.textLayers : [],
                      title: it.title,
                      price: it.price,
                      priceBadge: it.priceBadge,
                      transitionType: it.transitionType,
                      transitionDuration: it.transitionDuration,
                    }));
                  return [];
                })();
                const irRotationItemsForPlayer: ImageRotationItem[] = irRotationItems.map((it) => ({
                  url: it.url,
                  durationSeconds: it.durationSeconds ?? 10,
                  isVideo: (it as { isVideo?: boolean }).isVideo,
                  transitionType: it.transitionType as ImageRotationItem['transitionType'],
                  transitionDuration: it.transitionDuration,
                }));
                const effectiveFirstImageUrl = (imageContent.image_url as string) || (irRotationItems[0]?.url as string) || '';
                const effectiveRotationItemsForPlayer = imageContent.image_url ? irRotationItemsForPlayer : irRotationItemsForPlayer.slice(1);
                const useImageRotation = ir && effectiveFirstImageUrl && (effectiveRotationItemsForPlayer.length > 0 || (typeof ir.firstImageDurationSeconds === 'number' && ir.firstImageDurationSeconds > 0));
                const firstImageDuration = typeof ir?.firstImageDurationSeconds === 'number' ? Math.max(1, Math.min(120, ir.firstImageDurationSeconds)) : 10;
                const firstImageTransition = (ir?.firstImageTransitionType as string) || imageRotationTransition;
                const firstImageTransitionDur = typeof ir?.firstImageTransitionDuration === 'number' ? Math.max(200, Math.min(5000, ir.firstImageTransitionDuration)) : imageRotationTransitionDuration;
                const phaseState = (imageContent as { id?: string }).id ? imageRotationPhaseByContentId[(imageContent as { id: string }).id] : null;
                const activeTextLayers = useImageRotation && phaseState
                  ? (phaseState.phase === 'first' ? textLayers : (irRotationItems[phaseState.index]?.textLayers || []))
                  : textLayers;
                const activePriceBadge = useImageRotation && phaseState && phaseState.phase !== 'first' && typeof phaseState.index === 'number'
                  ? (irRotationItems[phaseState.index]?.priceBadge ?? null)
                  : priceBadge;
                const imageOverlays = useImageRotation ? (
                  <>
                    {overlayImages.map((o) => (
                      <div
                        key={o.id}
                        className="absolute z-20"
                        style={{
                          left: `${o.x}%`,
                          top: `${o.y}%`,
                          width: `${o.size}%`,
                          aspectRatio: '1',
                          transform: 'translate(-50%, -50%)',
                          borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                          boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                          overflow: 'hidden',
                        }}
                      >
                        <img src={resolveMediaUrl(o.image_url)} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {activeTextLayers.map((layer: Record<string, unknown>) => {
                      const l = layer as { id?: string; icon?: string; iconPosition?: 'before' | 'after'; isDiscountBlock?: boolean; discountAnimation?: string; discountBlockStyle?: string; blockColor?: string; x?: number; y?: number; color?: string; size?: number; fontWeight?: string; fontStyle?: string; fontFamily?: string; text?: string; textAlign?: 'left' | 'center' | 'right' };
                      const isDiscount = !!l.isDiscountBlock;
                      const iconBefore = l.icon && l.iconPosition !== 'after';
                      const iconAfter = l.icon && l.iconPosition === 'after';
                      const discountProps = isDiscount ? getDiscountBlockProps(l) : {} as { className?: string; style?: React.CSSProperties };
                      return (
                        <div
                          key={l.id ?? ''}
                          className={`absolute z-30 ${isDiscount ? discountProps.className : ''}`}
                          style={{
                            left: `${l.x ?? 50}%`,
                            top: `${l.y ?? 50}%`,
                            transform: 'translate(-50%, -50%)',
                            ...(isDiscount ? discountProps.style : { color: l.color }),
                            fontSize: `${l.size ?? 24}px`,
                            fontWeight: (l.fontWeight as React.CSSProperties['fontWeight']) ?? 'bold',
                            fontStyle: (l.fontStyle as React.CSSProperties['fontStyle']) ?? 'normal',
                            fontFamily: l.fontFamily || 'Arial',
                            textShadow: isDiscount ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
                            whiteSpace: 'pre' as const,
                            textAlign: (l.textAlign as 'left' | 'center' | 'right') || 'center',
                          }}
                        >
                          {iconBefore && <span className="mr-1">{l.icon}</span>}
                          {sanitizeDisplayText(l.text)}
                          {iconAfter && <span className="ml-1">{l.icon}</span>}
                        </div>
                      );
                    })}
                    {(() => {
                      const pb = activePriceBadge as { enabled?: boolean; position?: string; positionX?: number; positionY?: number; sizeScale?: number; color?: string; textColor?: string; textTop?: string; price?: string; textBottom?: string; model?: string } | null;
                      if (!pb?.enabled) return null;
                      const hasXY = typeof pb.positionX === 'number' && typeof pb.positionY === 'number';
                      const pos = pb.position || 'bottom-right';
                      const x = pb.positionX ?? (pos === 'top-left' ? 15 : pos === 'top-right' ? 85 : pos === 'bottom-left' ? 15 : 85);
                      const y = pb.positionY ?? (pos === 'top-left' ? 15 : pos === 'top-right' ? 15 : pos === 'bottom-left' ? 85 : 85);
                      const scale = typeof pb.sizeScale === 'number' ? Math.max(0.5, Math.min(2, pb.sizeScale)) : 1;
                      const origin = pos === 'bottom-right' ? '100% 100%' : pos === 'bottom-left' ? '0% 100%' : pos === 'top-right' ? '100% 0%' : '0% 0%';
                      return (
                        <div
                          className={`price-badge ${pb.model === 'price-tag' ? 'fiyat-etiketi' : pb.model || 'rounded'} ${!hasXY ? (pb.position || 'bottom-right') : ''}`}
                          style={{
                            ...(hasXY ? { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${scale})` } : { transform: `scale(${scale})`, transformOrigin: origin }),
                            backgroundColor: pb.color || '#E53935',
                            color: pb.textColor || '#ffffff',
                          }}
                        >
                          {pb.textTop && <div className="badge-top">{pb.textTop}</div>}
                          <div className="badge-price">{pb.price ?? ''}</div>
                          {pb.textBottom && <div className="badge-bottom">{pb.textBottom}</div>}
                        </div>
                      );
                    })()}
                    {(() => {
                      const rawTitle = phaseState
                        ? (phaseState.phase === 'first' ? (imageContent?.title as string) : (irRotationItems[phaseState.index]?.title as string))
                        : (displayTitle as string);
                      const activeTitle = sanitizeDisplayText(rawTitle);
                      const activePrice = phaseState
                        ? (phaseState.phase === 'first' ? imageContent?.price : irRotationItems[phaseState.index]?.price)
                        : displayPrice;
                      const showTitle = !!activeTitle;
                      const showPrice = activePrice != null && activePrice !== '';
                      if (!showTitle && !showPrice) return null;
                      return (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 z-20 flex items-end justify-between">
                          {showTitle && (
                            <div className="text-white text-base font-bold drop-shadow-lg flex items-center gap-2">
                              <span>{activeTitle}</span>
                              {drinkContent?.image_url && (
                                <img src={resolveMediaUrl(drinkContent.image_url as string)} alt="" className="w-8 h-8 object-contain rounded shadow-md bg-white/20" />
                              )}
                            </div>
                          )}
                          {showPrice && (
                            <div className="text-green-400 text-xl font-extrabold drop-shadow-lg">
                              ${Number(activePrice).toFixed(2)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                ) : null;

                return (
                  <>
                    <div
                      className="absolute inset-0 w-full h-full overflow-hidden"
                      style={{
                        opacity: imageOpacity,
                        overflow: imageClipShape === 'circle' ? 'hidden' : undefined,
                        borderRadius: imageClipShape === 'circle' ? '50%' : undefined,
                      }}
                    >
                      <div className="absolute inset-0" style={{ transform: `scale(${scaleX}, ${scaleY})`, transformOrigin: pos }}>
                        {useImageRotation ? (
                          <ImageRotationPlayer
                            firstImageUrl={effectiveFirstImageUrl}
                            firstImageDurationSeconds={firstImageDuration}
                            rotationItems={effectiveRotationItemsForPlayer}
                            onPhaseChange={(phase, idx) => {
                              const cid = (imageContent as { id?: string }).id;
                              if (cid) setImageRotationPhaseByContentId((prev) => ({ ...prev, [cid]: { phase, index: idx } }));
                            }}
                            objectFit={fit}
                            objectPosition={pos}
                            imageScale={1}
                            imageBlur={imageBlur}
                            transitionType={imageRotationTransition as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'blur-in' | 'flip-h' | 'flip-v' | 'rotate-in' | 'reveal-center' | 'dissolve' | 'iris-open' | 'iris-close' | 'spiral-in' | 'blinds-h' | 'blinds-v' | 'tiles' | 'puzzle-expand' | 'puzzle-rows' | 'puzzle-cols' | 'puzzle-diagonal' | 'puzzle-grid' | 'none'}
                            transitionDuration={imageRotationTransitionDuration}
                            firstImageTransitionType={firstImageTransition as 'fade' | 'slide-left' | 'slide-right' | 'slide-up' | 'slide-down' | 'zoom-in' | 'zoom-out' | 'blur-in' | 'flip-h' | 'flip-v' | 'rotate-in' | 'reveal-center' | 'dissolve' | 'iris-open' | 'iris-close' | 'spiral-in' | 'blinds-h' | 'blinds-v' | 'tiles' | 'puzzle-expand' | 'puzzle-rows' | 'puzzle-cols' | 'puzzle-diagonal' | 'puzzle-grid' | 'none'}
                            firstImageTransitionDuration={firstImageTransitionDur}
                            className="w-full h-full"
                            overlays={imageOverlays}
                          />
                        ) : (
                          <img
                            src={resolveMediaUrl((imageContent.image_url || effectiveFirstImageUrl) as string)}
                            alt=""
                            className="w-full h-full"
                            style={{
                              objectFit: fit,
                              objectPosition: pos,
                              imageRendering: '-webkit-optimize-contrast',
                              WebkitBackfaceVisibility: 'hidden',
                              backfaceVisibility: 'hidden',
                              ...(imageBlur > 0 ? { filter: `blur(${imageBlur}px)` } : {}),
                            }}
                          />
                        )}
                      </div>
                    </div>
                    {/* useImageRotation değilse overlay'lar blokta; useImageRotation ise ImageRotationPlayer içinde */}
                    {!useImageRotation && (
                      <>
                        {overlayImages.map((o) => (
                          <div
                            key={o.id}
                            className="absolute z-20 pointer-events-none"
                            style={{
                              left: `${o.x}%`,
                              top: `${o.y}%`,
                              width: `${o.size}%`,
                              aspectRatio: '1',
                              transform: 'translate(-50%, -50%)',
                              borderRadius: o.shape === 'round' ? '50%' : o.shape === 'rounded' ? '12px' : 0,
                              boxShadow: o.shape === 'shadow' ? '0 4px 12px rgba(0,0,0,0.35)' : undefined,
                              overflow: 'hidden',
                            }}
                          >
                            <img src={resolveMediaUrl(o.image_url)} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                        {activeTextLayers.map((layer: Record<string, unknown>) => {
                          const l = layer as { id?: string; icon?: string; iconPosition?: 'before' | 'after'; isDiscountBlock?: boolean; discountAnimation?: string; discountBlockStyle?: string; blockColor?: string; x?: number; y?: number; color?: string; size?: number; fontWeight?: string; fontStyle?: string; fontFamily?: string; text?: string; textAlign?: 'left' | 'center' | 'right' };
                          const isDiscount = !!l.isDiscountBlock;
                          const iconBefore = l.icon && l.iconPosition !== 'after';
                          const iconAfter = l.icon && l.iconPosition === 'after';
                          const discountProps = isDiscount ? getDiscountBlockProps(l) : {} as { className?: string; style?: React.CSSProperties };
                          return (
                            <div
                              key={l.id ?? ''}
                              className={`absolute z-30 ${isDiscount ? discountProps.className : ''}`}
                              style={{
                                left: `${l.x ?? 50}%`,
                                top: `${l.y ?? 50}%`,
                                transform: 'translate(-50%, -50%)',
                                ...(isDiscount ? discountProps.style : { color: l.color }),
                                fontSize: `${l.size ?? 24}px`,
                                fontWeight: (l.fontWeight as React.CSSProperties['fontWeight']) ?? 'bold',
                                fontStyle: (l.fontStyle as React.CSSProperties['fontStyle']) ?? 'normal',
                                fontFamily: l.fontFamily || 'Arial',
                                textShadow: isDiscount ? '0 1px 2px rgba(0,0,0,0.3)' : '2px 2px 4px rgba(0,0,0,0.8)',
                                whiteSpace: 'pre' as const,
                                textAlign: (l.textAlign as 'left' | 'center' | 'right') || 'center',
                              }}
                            >
                              {iconBefore && <span className="mr-1">{l.icon}</span>}
                              {sanitizeDisplayText(l.text)}
                              {iconAfter && <span className="ml-1">{l.icon}</span>}
                            </div>
                          );
                        })}
                        {((activePriceBadge as { enabled?: boolean; position?: string; positionX?: number; positionY?: number; sizeScale?: number; color?: string; textColor?: string; textTop?: string; price?: string; textBottom?: string; model?: string } | null)?.enabled) && (() => {
                          const pb = (activePriceBadge as unknown) as { enabled?: boolean; position?: string; positionX?: number; positionY?: number; sizeScale?: number; color?: string; textColor?: string; textTop?: string; price?: string; textBottom?: string; model?: string };
                          const hasXY = typeof pb.positionX === 'number' && typeof pb.positionY === 'number';
                          const pos = pb.position || 'bottom-right';
                          const x = pb.positionX ?? (pos === 'top-left' ? 15 : pos === 'top-right' ? 85 : pos === 'bottom-left' ? 15 : 85);
                          const y = pb.positionY ?? (pos === 'top-left' ? 15 : pos === 'top-right' ? 15 : pos === 'bottom-left' ? 85 : 85);
                          const scale = typeof pb.sizeScale === 'number' ? Math.max(0.5, Math.min(2, pb.sizeScale)) : 1;
                          const origin = pos === 'bottom-right' ? '100% 100%' : pos === 'bottom-left' ? '0% 100%' : pos === 'top-right' ? '100% 0%' : '0% 0%';
                          return (
                            <div
                              className={`price-badge ${pb.model === 'price-tag' ? 'fiyat-etiketi' : pb.model || 'rounded'} ${!hasXY ? (pb.position || 'bottom-right') : ''}`}
                              style={{
                                ...(hasXY ? { left: `${x}%`, top: `${y}%`, transform: `translate(-50%, -50%) scale(${scale})` } : { transform: `scale(${scale})`, transformOrigin: origin }),
                                backgroundColor: pb.color || '#E53935',
                                color: pb.textColor || '#ffffff',
                              }}
                            >
                              {pb.textTop && <div className="badge-top">{pb.textTop}</div>}
                              <div className="badge-price">{pb.price ?? ''}</div>
                              {pb.textBottom && <div className="badge-bottom">{pb.textBottom}</div>}
                            </div>
                          );
                        })()}
                        {(() => {
                          const activeTitle = sanitizeDisplayText(displayTitle as string);
                          const activePrice = displayPrice;
                          const showTitle = !!activeTitle;
                          const showPrice = activePrice != null && activePrice !== '';
                          if (!showTitle && !showPrice) return null;
                          return (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 z-20 flex items-end justify-between">
                              {showTitle && (
                                <div className="text-white text-base font-bold drop-shadow-lg flex items-center gap-2">
                                  <span>{activeTitle}</span>
                                  {drinkContent?.image_url && (
                                    <img src={resolveMediaUrl(drinkContent.image_url as string)} alt="" className="w-8 h-8 object-contain rounded shadow-md bg-white/20" />
                                  )}
                                </div>
                              )}
                              {showPrice && (
                                <div className="text-green-400 text-xl font-extrabold drop-shadow-lg">
                                  ${Number(activePrice).toFixed(2)}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </>
                );
              })()}
              {!regionalMenuContent && badgeContent?.campaign_text && (
                <div
                  className="absolute top-2 left-2 z-10 px-2 py-1 rounded text-sm font-bold shadow"
                  style={{
                    backgroundColor:
                      (badgeContent.background_color as string) || '#3B82F6',
                    color: (badgeContent.text_color as string) || '#fff',
                  }}
                >
                  {badgeContent.campaign_text as string}
                </div>
              )}
              {!regionalMenuContent && textContent?.title && !imageContent?.image_url && sanitizeDisplayText(textContent.title as string) && (
                <div
                  className="text-center p-4 text-white text-lg md:text-2xl"
                  style={{
                    color: (textContent.text_color as string) || undefined,
                  }}
                >
                  {sanitizeDisplayText(textContent.title as string)}
                </div>
              )}
              {/* Sadece içecek içeriği olan blok (örn. kola - image yok, product_list yok) */}
              {!regionalMenuContent && drinkContent?.image_url && !imageContent?.image_url && !singleProduct?.menu_item && !productList?.menu_items && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
                  <img
                    src={resolveMediaUrl(drinkContent.image_url as string)}
                    alt={sanitizeDisplayText(drinkContent.title as string) || 'İçecek'}
                    className="max-h-[60%] w-auto object-contain rounded"
                    style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                  />
                  {sanitizeDisplayText(drinkContent.title as string) && (
                    <span className="font-semibold text-lg mt-2">{sanitizeDisplayText(drinkContent.title as string)}</span>
                  )}
                  {drinkContent.price != null && (
                    <span className="font-semibold text-amber-400 mt-1">
                      ${Number(drinkContent.price).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
              {!regionalMenuContent && singleProduct?.menu_item && (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-white">
                  {(singleProduct.menu_item as { image_url?: string }).image_url && (
                    <img
                      src={resolveMediaUrl((singleProduct.menu_item as { image_url: string }).image_url)}
                      alt=""
                      className="max-h-[60%] w-auto object-contain rounded"
                      style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                    />
                  )}
                  <span className="font-semibold text-lg mt-2">
                    {(singleProduct.menu_item as { name?: string }).name}
                  </span>
                  {(singleProduct.menu_item as { price?: number }).price != null && (
                    <span className="font-semibold text-amber-400 mt-1">
                      ${Number((singleProduct.menu_item as { price: number }).price).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
              {!regionalMenuContent && productList?.menu_items && Array.isArray(productList.menu_items) && (
                <div className="w-full h-full overflow-auto p-2 text-white text-sm">
                  {(productList.menu_items as Array<{ name?: string; image_url?: string; price?: number }>).map(
                    (item: { name?: string; image_url?: string; price?: number }, i: number) => (
                      <div key={i} className="flex items-center gap-2 py-1 border-b border-white/20">
                        {item.image_url && (
                          <img
                            src={resolveMediaUrl(item.image_url)}
                            alt=""
                            className="w-12 h-12 object-cover rounded flex-shrink-0"
                            style={{ imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                          />
                        )}
                        <span className="flex-1">{item.name}</span>
                        {item.price != null && (
                          <span className="font-semibold text-amber-400 whitespace-nowrap">
                            ${Number(item.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
        </div>
      </DisplayFrame>
    </div>
  );
}

export default TemplateDisplay;
