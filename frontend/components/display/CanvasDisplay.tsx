'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Group, Text, Image, Rect } from 'react-konva';
import Konva from 'konva';

const CANVAS_W = 1920;
const CANVAS_H = 1080;

import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

function mediaUrl(url: string): string {
  return resolveMediaUrl(url) || '';
}

function useImage(src: string | undefined): HTMLImageElement | undefined {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.onerror = () => setImg(undefined);
    image.src = src;
    return () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [src]);
  return img;
}

interface CanvasDesign {
  shapes?: Array<Record<string, unknown>>;
  backgroundColor?: string;
  layoutType?: string;
}

interface CanvasDisplayProps {
  canvasDesign: CanvasDesign;
  className?: string;
}

function DisplayTextNode({ shape }: { shape: Record<string, unknown> }) {
  const text = String(shape.text ?? '');
  const displayText = shape.icon
    ? shape.iconPosition === 'after'
      ? `${text} ${shape.icon}`
      : `${shape.icon} ${text}`
    : text;
  return (
    <Text
      x={Number(shape.x ?? 0)}
      y={Number(shape.y ?? 0)}
      width={Number(shape.width ?? 100)}
      height={Number(shape.height ?? 40)}
      text={displayText}
      fontSize={Number(shape.fontSize ?? 24)}
      fontFamily={String(shape.fontFamily ?? 'Arial')}
      fill={String(shape.fill ?? '#ffffff')}
      align={String(shape.align ?? 'left')}
      fontStyle={String(shape.fontStyle ?? 'normal')}
      textDecoration={String(shape.textDecoration ?? '')}
      listening={false}
    />
  );
}

function DisplayImageNode({ shape }: { shape: Record<string, unknown> }) {
  const src = String(shape.src ?? '');
  const img = useImage(mediaUrl(src));
  const clipShape = shape.clipShape ?? 'rect';
  const w = Number(shape.width ?? 100);
  const h = Number(shape.height ?? 100);

  if (!img) return null;

  if (clipShape === 'circle') {
    return (
      <Group
        x={Number(shape.x ?? 0)}
        y={Number(shape.y ?? 0)}
        width={w}
        height={h}
        rotation={Number(shape.rotation ?? 0)}
        opacity={Number(shape.opacity ?? 1)}
        clipFunc={(ctx) => {
          const cx = w / 2;
          const cy = h / 2;
          const r = Math.min(w, h) / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2, false);
        }}
      >
        <Image image={img} x={0} y={0} width={w} height={h} listening={false} />
      </Group>
    );
  }

  return (
    <Image
      image={img}
      x={Number(shape.x ?? 0)}
      y={Number(shape.y ?? 0)}
      width={w}
      height={h}
      rotation={Number(shape.rotation ?? 0)}
      opacity={Number(shape.opacity ?? 1)}
      listening={false}
    />
  );
}

function DisplayVideoNode({ shape, layerRef }: { shape: Record<string, unknown>; layerRef: React.RefObject<Konva.Layer> }) {
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const src = mediaUrl(String(shape.src ?? ''));

  useEffect(() => {
    if (!src) return;
    const v = document.createElement('video');
    v.src = src;
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.crossOrigin = 'anonymous';
    const onReady = () => {
      setVideoEl(v);
      v.play().catch(() => {});
    };
    v.onloadeddata = onReady;
    v.oncanplay = onReady;
    v.load();
    return () => {
      v.pause();
      v.src = '';
      setVideoEl(null);
    };
  }, [src]);

  // Video animasyonu için layer'ı sürekli yeniden çiz
  useEffect(() => {
    if (!videoEl || !layerRef.current) return undefined;
    const layer = layerRef.current;
    let rafId: number;
    const tick = () => {
      layer.batchDraw();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [videoEl, layerRef]);

  if (!videoEl) return null;

  return (
    <Image
      image={videoEl as unknown as CanvasImageSource}
      x={Number(shape.x ?? 0)}
      y={Number(shape.y ?? 0)}
      width={Number(shape.width ?? 200)}
      height={Number(shape.height ?? 150)}
      rotation={Number(shape.rotation ?? 0)}
      opacity={Number(shape.opacity ?? 1)}
      listening={false}
    />
  );
}

function DisplayImageRotationNode({ shape }: { shape: Record<string, unknown> }) {
  const urls = Array.isArray(shape.urls) ? shape.urls as string[] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const durationMs = Math.max(1000, Number(shape.durationSeconds ?? 5) * 1000);
  const currentUrl = urls[currentIndex % urls.length] ?? '';
  const img = useImage(mediaUrl(currentUrl));

  useEffect(() => {
    if (urls.length <= 1) return;
    const t = setInterval(() => setCurrentIndex((i) => i + 1), durationMs);
    return () => clearInterval(t);
  }, [urls.length, durationMs]);

  if (!img || urls.length === 0) return null;

  return (
    <Image
      image={img}
      x={Number(shape.x ?? 0)}
      y={Number(shape.y ?? 0)}
      width={Number(shape.width ?? 200)}
      height={Number(shape.height ?? 150)}
      rotation={Number(shape.rotation ?? 0)}
      opacity={Number(shape.opacity ?? 1)}
      listening={false}
    />
  );
}

function CanvasDisplayInner({ canvasDesign, className }: CanvasDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      if (w > 0 && h > 0) {
        const s = Math.min(w / CANVAS_W, h / CANVAS_H);
        setScale(s);
      }
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  const shapes = Array.isArray(canvasDesign.shapes) ? canvasDesign.shapes : [];
  const backgroundColor = canvasDesign.backgroundColor ?? '#1e293b';

  return (
    <div
      ref={containerRef}
      className={`${className ?? ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          flexShrink: 0,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <Stage width={CANVAS_W} height={CANVAS_H} style={{ display: 'block' }}>
          <Layer ref={layerRef}>
          <Rect x={0} y={0} width={CANVAS_W} height={CANVAS_H} fill={backgroundColor} listening={false} />
          {shapes.map((s) => {
            const type = String(s.type ?? '');
            const key = String(s.id ?? Math.random());
            if (type === 'text') {
              return <DisplayTextNode key={key} shape={s} />;
            }
            if (type === 'image') {
              return <DisplayImageNode key={key} shape={s} />;
            }
            if (type === 'video') {
              return <DisplayVideoNode key={key} shape={s} layerRef={layerRef} />;
            }
            if (type === 'imageRotation') {
              return <DisplayImageRotationNode key={key} shape={s} />;
            }
            return null;
          })}
        </Layer>
        </Stage>
      </div>
    </div>
  );
}

export default function CanvasDisplay(props: CanvasDisplayProps) {
  return <CanvasDisplayInner {...props} />;
}
