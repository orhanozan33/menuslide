'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

export interface VideoRotationItem {
  url: string;
  durationSeconds: number;
}

export interface VideoRotationPlayerProps {
  /** İlk oynatılacak video URL (bloktaki ana video) */
  firstVideoUrl: string;
  /** İlk videonun saniye cinsinden süresi; bu süre sonra döngüye geçilir */
  firstVideoDurationSeconds: number;
  /** İlk videodan sonra sırayla oynatılacak videolar (her biri kendi süresi) */
  rotationItems: VideoRotationItem[];
  /** Hangi videonun oynadığı (ilk video / döngü indeksi) – üst bileşen yazı katmanlarını buna göre gösterebilir */
  onPhaseChange?: (phase: 'first' | 'rotation', rotationIndex: number) => void;
  /** true ise döngü bir kez oynatılır ve son videoda kalır */
  playOnce?: boolean;
  /** Screenshot modu: ilk karede sabit kal, timer/rotation yok */
  snapshotMode?: boolean;
  className?: string;
  style?: React.CSSProperties;
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  imageScale?: number;
}

/**
 * Tek bir karede: önce firstVideoUrl firstVideoDurationSeconds saniye oynar,
 * ardından rotationItems sırayla döngüde oynatılır (her video kendi durationSeconds süresi kadar).
 */
export function VideoRotationPlayer({
  firstVideoUrl,
  firstVideoDurationSeconds,
  rotationItems,
  onPhaseChange,
  playOnce = false,
  snapshotMode = false,
  className = '',
  style = {},
  objectFit = 'cover',
  objectPosition = 'center',
  imageScale = 1,
}: VideoRotationPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentUrl, setCurrentUrl] = useState<string>(firstVideoUrl);
  const [phase, setPhase] = useState<'first' | 'rotation'>('first');
  const [rotationIndex, setRotationIndex] = useState(0);
  const [stopped, setStopped] = useState(false);
  const firstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rotationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last reported values to avoid infinite loops
  const lastReportedRef = useRef<{ phase: 'first' | 'rotation'; index: number } | null>(null);
  // Keep stable reference to callback
  const onPhaseChangeRef = useRef(onPhaseChange);
  onPhaseChangeRef.current = onPhaseChange;

  const items = Array.isArray(rotationItems) ? rotationItems : [];
  const hasRotation = items.length > 0;

  // Üst bileşene hangi videonun oynadığını bildir (yazı katmanları için)
  useEffect(() => {
    const callback = onPhaseChangeRef.current;
    if (typeof callback !== 'function') return;
    // Only call if values actually changed
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

  const scheduleNextInRotation = useCallback(() => {
    if (items.length === 0) return;
    const item = items[rotationIndex];
    const duration = Math.max(1, Math.min(120, item.durationSeconds || 10));
    rotationTimerRef.current = setTimeout(() => {
      rotationTimerRef.current = null;
      setRotationIndex((prev) => {
        const next = (prev + 1) % items.length;
        if (playOnce && next === 0) {
          setStopped(true);
          return prev;
        }
        setCurrentUrl(items[next].url);
        return next;
      });
    }, duration * 1000);
  }, [items, rotationIndex, playOnce]);

  // İlk video süresi dolunca döngüye geç (snapshot modunda timer yok)
  useEffect(() => {
    if (snapshotMode || !firstVideoUrl) return;
    setCurrentUrl(firstVideoUrl);
    setPhase('first');
    setRotationIndex(0);
    clearRotationTimer();
    if (firstTimerRef.current) {
      clearTimeout(firstTimerRef.current);
      firstTimerRef.current = null;
    }
    if (hasRotation && firstVideoDurationSeconds > 0) {
      firstTimerRef.current = setTimeout(() => {
        firstTimerRef.current = null;
        setPhase('rotation');
        setCurrentUrl(items[0].url);
        setRotationIndex(0);
      }, firstVideoDurationSeconds * 1000);
    }
    return () => {
      if (firstTimerRef.current) {
        clearTimeout(firstTimerRef.current);
        firstTimerRef.current = null;
      }
      clearRotationTimer();
    };
  }, [snapshotMode, firstVideoUrl, firstVideoDurationSeconds, hasRotation, items.length]);

  // Rotation fazında: her video kendi süresi kadar oynatılır (zamanlayıcı ile)
  useEffect(() => {
    if (snapshotMode || phase !== 'rotation' || items.length === 0 || stopped) return;
    const item = items[rotationIndex];
    if (!item) return;
    const duration = Math.max(1, Math.min(120, item.durationSeconds || 10));
    clearRotationTimer();
    rotationTimerRef.current = setTimeout(() => {
      rotationTimerRef.current = null;
      setRotationIndex((prev) => {
        const next = (prev + 1) % items.length;
        if (playOnce && next === 0) {
          setStopped(true);
          return prev;
        }
        setCurrentUrl(items[next].url);
        return next;
      });
    }, duration * 1000);
    return clearRotationTimer;
  }, [phase, rotationIndex, items, playOnce, stopped]);

  // URL değişince video src güncelle ve oynat
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentUrl) return;
    video.src = resolveMediaUrl(currentUrl);
    video.load();
    video.play().catch(() => {});
  }, [currentUrl]);

  const handleEnded = useCallback(() => {
    if (phase === 'first') {
      if (hasRotation) {
        setPhase('rotation');
        setCurrentUrl(items[0].url);
        setRotationIndex(0);
      }
      return;
    }
    if (phase === 'rotation' && hasRotation) {
      setRotationIndex((prev) => {
        const next = (prev + 1) % items.length;
        setCurrentUrl(items[next].url);
        return next;
      });
    }
  }, [phase, hasRotation, items]);

  // playOnce: reset stopped when props change
  useEffect(() => {
    if (!playOnce) setStopped(false);
  }, [playOnce, firstVideoUrl, firstVideoDurationSeconds, items.length]);

  if (!firstVideoUrl) return null;

  return (
    <div
      className={className}
      style={{ ...style, transform: `scale(${imageScale})`, transformOrigin: objectPosition, overflow: 'hidden' }}
    >
      <video
        ref={videoRef}
        src={resolveMediaUrl(currentUrl)}
        className="w-full h-full"
        autoPlay={!stopped}
        muted
        playsInline
        loop={phase === 'first' && !hasRotation ? true : false}
        onEnded={stopped ? undefined : handleEnded}
        style={{
          objectFit,
          objectPosition,
          imageRendering: 'auto',
          backfaceVisibility: 'hidden',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
}
