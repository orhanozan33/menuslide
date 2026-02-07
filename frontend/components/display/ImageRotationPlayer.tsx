'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

export interface ImageRotationItem {
  url: string;
  durationSeconds: number;
  /** Video URL ise <video> ile oynatılır */
  isVideo?: boolean;
  /** Bu resme geçerken kullanılacak geçiş efekti (yoksa global kullanılır) */
  transitionType?: ImageRotationTransitionType;
  /** Bu resim için geçiş süresi (ms) */
  transitionDuration?: number;
}

export type ImageRotationTransitionType =
  | 'fade'
  | 'slide-left'
  | 'slide-right'
  | 'slide-up'
  | 'slide-down'
  | 'zoom-in'
  | 'zoom-out'
  | 'blur-in'
  | 'flip-h'
  | 'flip-v'
  | 'rotate-in'
  | 'reveal-center'
  | 'dissolve'
  | 'iris-open'
  | 'iris-close'
  | 'spiral-in'
  | 'blinds-h'
  | 'blinds-v'
  | 'tiles'
  | 'puzzle-expand'
  | 'puzzle-rows'
  | 'puzzle-cols'
  | 'puzzle-diagonal'
  | 'puzzle-grid'
  | 'none';

export interface ImageRotationPlayerProps {
  /** İlk gösterilecek resim URL (bloktaki ana resim) */
  firstImageUrl: string;
  /** İlk resmin saniye cinsinden süresi; bu süre sonra döngüye geçilir */
  firstImageDurationSeconds: number;
  /** İlk resimden sonra sırayla gösterilecek resimler (her biri kendi süresi) */
  rotationItems: ImageRotationItem[];
  /** Hangi resmin gösterildiği (ilk resim / döngü indeksi) – üst bileşen yazı katmanlarını buna göre gösterebilir */
  onPhaseChange?: (phase: 'first' | 'rotation', rotationIndex: number) => void;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  imageScale?: number;
  imageBlur?: number;
  /** Resimler arası geçiş efekti (varsayılan; öğe kendi transitionType tanımlıysa o kullanılır) */
  transitionType?: ImageRotationTransitionType;
  /** Geçiş süresi (ms) (varsayılan) */
  transitionDuration?: number;
  /** İlk resme geçerken kullanılacak geçiş (döngüden dönüşte vb.; yoksa transitionType kullanılır) */
  firstImageTransitionType?: ImageRotationTransitionType;
  /** İlk resim geçiş süresi (ms) */
  firstImageTransitionDuration?: number;
  /** true ise döngü bir kez oynatılır ve son resimde kalır */
  playOnce?: boolean;
  /** Resmin üzerinde gösterilecek overlay'lar (yazı, etiket vb.) - resimle birlikte hareket eder */
  overlays?: React.ReactNode;
}

/**
 * Tek bir karede: önce firstImageUrl firstImageDurationSeconds saniye gösterilir,
 * ardından rotationItems sırayla döngüde gösterilir (her resim kendi durationSeconds süresi kadar).
 */
export function ImageRotationPlayer({
  firstImageUrl,
  firstImageDurationSeconds,
  rotationItems,
  onPhaseChange,
  className = '',
  style = {},
  objectFit = 'cover',
  objectPosition = 'center',
  imageScale = 1,
  imageBlur = 0,
  transitionType = 'fade',
  transitionDuration = 500,
  firstImageTransitionType,
  firstImageTransitionDuration,
  playOnce = false,
  overlays,
}: ImageRotationPlayerProps) {
  const [currentUrl, setCurrentUrl] = useState<string>(firstImageUrl);
  const [phase, setPhase] = useState<'first' | 'rotation'>('first');
  const [rotationIndex, setRotationIndex] = useState(0);
  const firstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastReportedRef = useRef<{ phase: 'first' | 'rotation'; index: number } | null>(null);
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const items = Array.isArray(rotationItems)
    ? rotationItems.map((it: any) => ({
        url: it.url || it.image_url,
        durationSeconds: typeof it.durationSeconds === 'number' ? Math.max(1, Math.min(120, it.durationSeconds)) : 5,
        isVideo: !!it.isVideo,
        transitionType: it.transitionType,
        transitionDuration: typeof it.transitionDuration === 'number' ? Math.max(0, Math.min(5000, it.transitionDuration)) : undefined,
      }))
    : [];
  const hasRotation = items.length > 0;
  const currentItem = phase === 'rotation' ? items[rotationIndex] : null;
  const isVideoByExtension = /\.(mp4|webm|ogg)(\?|$)/i.test(currentUrl || '');
  const currentIsVideo = !!currentItem?.isVideo || isVideoByExtension;

  useEffect(() => {
    const callback = onPhaseChangeRef.current;
    if (typeof callback !== 'function') return;
    const last = lastReportedRef.current;
    if (last && last.phase === phase && last.index === rotationIndex) return;
    lastReportedRef.current = { phase, index: rotationIndex };
    callback(phase, rotationIndex);
  }, [phase, rotationIndex]);

  const clearRotationTimer = useCallback(() => {
    if (rotationTimerRef.current) {
      clearTimeout(rotationTimerRef.current);
      rotationTimerRef.current = null;
    }
  }, []);

  // İlk resim süresi dolunca döngüye geç
  useEffect(() => {
    if (!firstImageUrl) return;
    setCurrentUrl(firstImageUrl);
    setPhase('first');
    setRotationIndex(0);
    clearRotationTimer();
    if (firstTimerRef.current) {
      clearTimeout(firstTimerRef.current);
      firstTimerRef.current = null;
    }
    const firstDuration = Math.max(1, Math.min(120, firstImageDurationSeconds || 10));
    if (hasRotation && firstDuration > 0) {
      firstTimerRef.current = setTimeout(() => {
        firstTimerRef.current = null;
        setPhase('rotation');
        setCurrentUrl(items[0].url);
        setRotationIndex(0);
      }, firstDuration * 1000);
    }
    return () => {
      if (firstTimerRef.current) {
        clearTimeout(firstTimerRef.current);
        firstTimerRef.current = null;
      }
      clearRotationTimer();
    };
  }, [firstImageUrl, firstImageDurationSeconds, hasRotation, items.length]);

  // Rotation fazında: her resim kendi süresi kadar gösterilir (playOnce ise son resimde dur)
  useEffect(() => {
    if (phase !== 'rotation' || items.length === 0) return;
    const item = items[rotationIndex];
    if (!item) return;
    const duration = item.durationSeconds;
    const isLast = rotationIndex === items.length - 1;
    if (playOnce && isLast) {
      clearRotationTimer();
      return;
    }
    clearRotationTimer();
    rotationTimerRef.current = setTimeout(() => {
      rotationTimerRef.current = null;
      setRotationIndex((prev) => {
        const next = (prev + 1) % items.length;
        setCurrentUrl(items[next].url);
        return next;
      });
    }, duration * 1000);
    return clearRotationTimer;
  }, [phase, rotationIndex, items, playOnce]);

  if (!firstImageUrl) return null;

  const isVideoUrl = currentIsVideo;
  const effectiveTransitionType = phase === 'rotation'
    ? (currentItem?.transitionType ?? transitionType)
    : (firstImageTransitionType ?? transitionType);
  const effectiveTransitionDuration = phase === 'rotation'
    ? (currentItem?.transitionDuration ?? transitionDuration ?? 500)
    : (firstImageTransitionDuration ?? transitionDuration ?? 500);
  const transitionClass = effectiveTransitionType === 'none' ? 'image-rotation-transition-none' : `image-rotation-transition-${effectiveTransitionType}`;
  const durationMs = Math.max(0, Math.min(5000, effectiveTransitionDuration ?? transitionDuration ?? 500));

  return (
    <div
      className={className}
      style={{
        ...style,
        transform: `scale(${imageScale})`,
        transformOrigin: objectPosition,
        overflow: 'hidden',
      }}
    >
      <div key={currentUrl} className={`image-rotation-transition-wrap ${transitionClass}`} style={{ animationDuration: `${durationMs}ms` }}>
        {isVideoUrl ? (
          <video
            key={currentUrl}
            src={resolveMediaUrl(currentUrl)}
            className="image-rot-media w-full h-full"
            style={{
              display: 'block',
              minHeight: '100%',
              objectFit,
              objectPosition,
              width: '100%',
              height: '100%',
              animationDuration: `${durationMs}ms`,
              animationFillMode: 'both',
              animationTimingFunction: 'ease-out',
              ...(imageBlur > 0 ? { filter: `blur(${imageBlur}px)` } : {}),
            }}
            autoPlay
            muted
            loop
            playsInline
          />
        ) : (
          <img
            key={currentUrl}
            src={resolveMediaUrl(currentUrl)}
            alt=""
            className="image-rot-media w-full h-full"
            style={{
              display: 'block',
              minHeight: '100%',
              objectFit,
              objectPosition,
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              width: '100%',
              height: '100%',
              animationDuration: `${durationMs}ms`,
              animationFillMode: 'both',
              animationTimingFunction: 'ease-out',
              ...(imageBlur > 0 ? { filter: `blur(${imageBlur}px)` } : {}),
            }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
        {overlays && (
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
            {overlays}
          </div>
        )}
      </div>
    </div>
  );
}
