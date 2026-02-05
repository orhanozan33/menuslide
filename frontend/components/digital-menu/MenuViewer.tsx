'use client';

import React, { useMemo, useState, useEffect } from 'react';

export interface MenuViewerLayer {
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
}

export interface MenuViewerData {
  id: string;
  name: string;
  templateId: string;
  backgroundImage: string | null;
  width: number;
  height: number;
  layers: MenuViewerLayer[];
}

interface MenuViewerProps {
  data: MenuViewerData;
  scaleToFit?: boolean;
  className?: string;
}

export default function MenuViewer({ data, scaleToFit = true, className = '' }: MenuViewerProps) {
  const { width: designWidth, height: designHeight, backgroundImage, layers } = data;

  const sortedLayers = useMemo(() => {
    const list = [...(layers || [])];
    list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    return list;
  }, [layers]);

  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!scaleToFit || typeof window === 'undefined') {
      setScale(1);
      return;
    }
    const update = () => {
      setScale(Math.min(window.innerWidth / designWidth, window.innerHeight / designHeight));
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [scaleToFit, designWidth, designHeight]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: backgroundImage ? `url(${backgroundImage}) center/cover` : '#111',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: designWidth,
          height: designHeight,
          transform: scaleToFit ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
        }}
      >
        {sortedLayers.map((layer) => {
          const baseStyle: React.CSSProperties = {
            position: 'absolute',
            left: layer.x,
            top: layer.y,
            width: layer.width,
            height: layer.height,
            transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
            ...(layer.style as React.CSSProperties),
          };

          if (layer.type === 'image' && layer.imageUrl) {
            return (
              <div key={layer.id} style={baseStyle}>
                <img
                  src={layer.imageUrl}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              </div>
            );
          }

          return (
            <div
              key={layer.id}
              style={{
                ...baseStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: layer.align === 'center' ? 'center' : layer.align === 'right' ? 'flex-end' : 'flex-start',
                fontFamily: layer.fontFamily ?? 'Arial',
                fontSize: layer.fontSize ?? 24,
                fontStyle: layer.fontStyle ?? 'normal',
                color: layer.color ?? '#000000',
                textAlign: (layer.align as 'left' | 'center' | 'right') ?? 'left',
                overflow: 'hidden',
              }}
            >
              {layer.contentText ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}
