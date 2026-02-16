'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface SnapshotSlide {
  type: string;
  url?: string;
  duration: number;
  transition_effect?: string;
  transition_duration?: number;
}

export interface SnapshotLayoutData {
  layout: {
    version: string;
    backgroundColor?: string;
    slides: SnapshotSlide[];
  };
  layoutVersion: string;
  refreshIntervalSeconds?: number;
}

interface SnapshotLayoutCarouselProps {
  data: SnapshotLayoutData;
  className?: string;
}

/** Web production: layout API'den gelen JPG slide'ları Roku ile aynı sırada ve sürede gösterir. Canlı render yok. */
export function SnapshotLayoutCarousel({ data, className = '' }: SnapshotLayoutCarouselProps) {
  const slides = data?.layout?.slides?.filter((s) => s.type === 'image' && s.url) ?? [];
  const [index, setIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (slides.length <= 1) return;
    const slide = slides[index];
    const durationMs = Math.max(1000, (slide?.duration ?? 8) * 1000);
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, durationMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [index, slides.length, slides]);

  if (slides.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-black text-white ${className}`} style={{ minHeight: 400 }}>
        Yayın hazırlanıyor…
      </div>
    );
  }

  const current = slides[index];
  if (!current?.url) return null;

  return (
    <div
      className={`absolute inset-0 bg-black ${className}`}
      style={{ backgroundColor: data?.layout?.backgroundColor ?? '#000000' }}
    >
      <img
        src={current.url}
        alt=""
        className="w-full h-full object-contain"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}
