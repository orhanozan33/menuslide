'use client';

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { Stage, Layer, Group, Text, Image, Transformer } from 'react-konva';
import type Konva from 'konva';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

/** Tasarım editörüyle uyumlu Konva tabanlı overlay editörü - % koordinat kullanır */
export interface BlockTextLayer {
  id: string;
  text: string;
  color: string;
  size: number;
  x: number;
  y: number;
  fontWeight?: string;
  fontStyle?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  icon?: string;
  iconPosition?: 'before' | 'after';
  isDiscountBlock?: boolean;
}

export interface BlockOverlayImageLayer {
  id: string;
  image_url: string;
  x: number;
  y: number;
  size: number;
  shape: 'round' | 'square' | 'rounded' | 'shadow';
}

const STAGE_W = 400;
const STAGE_H = 225;

function useKonvaImage(src: string | undefined) {
  const [img, setImg] = useState<HTMLImageElement | undefined>();
  useEffect(() => {
    if (!src) {
      setImg(undefined);
      return;
    }
    const url = resolveMediaUrl(src) || src;
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => setImg(image);
    image.onerror = () => setImg(undefined);
    image.src = url;
    return () => {
      image.onload = null;
      image.onerror = null;
      image.src = '';
    };
  }, [src]);
  return img;
}

interface BlockOverlayKonvaEditorProps {
  width: number;
  height: number;
  textLayers: BlockTextLayer[];
  overlayImages: BlockOverlayImageLayer[];
  onTextLayersChange: (layers: BlockTextLayer[]) => void;
  onOverlayImagesChange: (layers: BlockOverlayImageLayer[]) => void;
  selectedTextLayerId: string | null;
  selectedOverlayImageId: string | null;
  onSelectTextLayer: (id: string | null) => void;
  onSelectOverlayImage: (id: string | null) => void;
  /** Stage boş alana tıklanınca çağrılır - yazı eklemek için */
  onStageClick?: (clickX: number, clickY: number) => void;
  disabled?: boolean;
}

export function BlockOverlayKonvaEditor({
  width,
  height,
  textLayers,
  overlayImages,
  onTextLayersChange,
  onOverlayImagesChange,
  selectedTextLayerId,
  selectedOverlayImageId,
  onSelectTextLayer,
  onSelectOverlayImage,
  onStageClick,
  disabled = false,
}: BlockOverlayKonvaEditorProps) {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Transformer'ı seçili öğeye bağla
  useEffect(() => {
    const tr = trRef.current;
    if (!tr) return;
    const stage = tr.getStage();
    if (!stage) return;
    const selectedId = selectedTextLayerId || selectedOverlayImageId;
    if (!selectedId) {
      tr.nodes([]);
      return;
    }
    const node = stage.findOne(`#${selectedId}`);
    if (node) {
      tr.nodes([node]);
    } else {
      tr.nodes([]);
    }
  }, [selectedTextLayerId, selectedOverlayImageId, textLayers, overlayImages]);

  const handleStageClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (disabled) return;
      if (e.target === e.target.getStage()) {
        const stage = e.target.getStage();
        if (!stage) return;
        const pos = stage.getPointerPosition();
        if (!pos) return;
        const rect = stage.container().getBoundingClientRect();
        const scaleX = width / STAGE_W;
        const scaleY = height / STAGE_H;
        const x = (pos.x - rect.left) / scaleX;
        const y = (pos.y - rect.top) / scaleY;
        const xPct = Math.max(0, Math.min(100, (x / STAGE_W) * 100));
        const yPct = Math.max(0, Math.min(100, (y / STAGE_H) * 100));
        onSelectTextLayer(null);
        onSelectOverlayImage(null);
        onStageClick?.(xPct, yPct);
      }
    },
    [disabled, width, height, onStageClick, onSelectTextLayer, onSelectOverlayImage]
  );

  const updateTextLayer = useCallback(
    (id: string, updates: Partial<BlockTextLayer>) => {
      onTextLayersChange(
        textLayers.map((l) => (l.id === id ? { ...l, ...updates } : l))
      );
    },
    [textLayers, onTextLayersChange]
  );

  const updateOverlayImage = useCallback(
    (id: string, updates: Partial<BlockOverlayImageLayer>) => {
      onOverlayImagesChange(
        overlayImages.map((o) => (o.id === id ? { ...o, ...updates } : o))
      );
    },
    [overlayImages, onOverlayImagesChange]
  );

  return (
    <Stage
      ref={stageRef}
      width={width}
      height={height}
      onClick={handleStageClick}
      style={{ cursor: disabled ? 'default' : 'crosshair' }}
    >
      <Layer>
        {/* Scale layer to logical coords */}
        <Group
          scaleX={width / STAGE_W}
          scaleY={height / STAGE_H}
          x={0}
          y={0}
        >
          {/* Overlay images */}
          {overlayImages.map((o) => (
            <OverlayImageNode
              key={o.id}
              layer={o}
              stageW={STAGE_W}
              stageH={STAGE_H}
              isSelected={selectedOverlayImageId === o.id}
              disabled={disabled}
              onSelect={() => {
                onSelectOverlayImage(o.id);
                onSelectTextLayer(null);
              }}
              onDragEnd={(xPct, yPct) =>
                updateOverlayImage(o.id, { x: xPct, y: yPct })
              }
              onTransformEnd={(xPct, yPct, sizePct) =>
                updateOverlayImage(o.id, { x: xPct, y: yPct, size: sizePct })
              }
            />
          ))}

          {/* Text layers */}
          {textLayers.map((l) => (
            <TextLayerNode
              key={l.id}
              layer={l}
              stageW={STAGE_W}
              stageH={STAGE_H}
              isSelected={selectedTextLayerId === l.id}
              disabled={disabled}
              onSelect={() => {
                onSelectTextLayer(l.id);
                onSelectOverlayImage(null);
              }}
              onDragEnd={(xPct, yPct) =>
                updateTextLayer(l.id, { x: xPct, y: yPct })
              }
              onTransformEnd={(xPct, yPct, size) =>
                updateTextLayer(l.id, { x: xPct, y: yPct, size })
              }
            />
          ))}

          <Transformer
            ref={trRef}
            borderStroke="#3B82F6"
            borderStrokeWidth={2}
            anchorFill="#ffffff"
            anchorStroke="#3B82F6"
            anchorStrokeWidth={2}
            anchorSize={8}
            boundBoxFunc={(oldBox, newBox) => {
              const minSize = 10;
              if (Math.abs(newBox.width) < minSize || Math.abs(newBox.height) < minSize) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Group>
      </Layer>
    </Stage>
  );
}

function OverlayImageNode({
  layer,
  stageW,
  stageH,
  isSelected,
  disabled,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  layer: BlockOverlayImageLayer;
  stageW: number;
  stageH: number;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDragEnd: (xPct: number, yPct: number) => void;
  onTransformEnd: (xPct: number, yPct: number, sizePct: number) => void;
}) {
  const img = useKonvaImage(layer.image_url);
  const sizePx = (layer.size / 100) * stageW;
  const x = (layer.x / 100) * stageW;
  const y = (layer.y / 100) * stageH;
  const shapeRef = useRef<any>(null);

  const handleDragEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;
    const pos = node.position();
    const w = node.width() * (node.scaleX() ?? 1);
    const xPct = Math.max(0, Math.min(100, ((pos.x + w / 2) / stageW) * 100));
    const yPct = Math.max(0, Math.min(100, ((pos.y + w / 2) / stageH) * 100));
    onDragEnd(xPct, yPct);
  }, [stageW, stageH, onDragEnd]);

  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;
    node.scaleX(1);
    node.scaleY(1);
    const pos = node.position();
    const w = node.width();
    const xPct = Math.max(0, Math.min(100, ((pos.x + w / 2) / stageW) * 100));
    const yPct = Math.max(0, Math.min(100, ((pos.y + w / 2) / stageH) * 100));
    const sizePct = Math.max(5, Math.min(50, (w / stageW) * 100));
    onTransformEnd(xPct, yPct, sizePct);
  }, [stageW, stageH, onTransformEnd]);

  if (!img) return null;

  const cornerRadius = layer.shape === 'rounded' ? 12 : layer.shape === 'round' ? sizePx / 2 : 0;

  return (
    <Image
      ref={shapeRef}
      id={layer.id}
      image={img}
      x={x}
      y={y}
      width={sizePx}
      height={sizePx}
      offsetX={sizePx / 2}
      offsetY={sizePx / 2}
      cornerRadius={cornerRadius}
      draggable={!disabled}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      shadowColor={layer.shape === 'shadow' ? 'black' : undefined}
      shadowBlur={layer.shape === 'shadow' ? 12 : 0}
      shadowOpacity={layer.shape === 'shadow' ? 0.35 : 0}
    />
  );
}

function TextLayerNode({
  layer,
  stageW,
  stageH,
  isSelected,
  disabled,
  onSelect,
  onDragEnd,
  onTransformEnd,
}: {
  layer: BlockTextLayer;
  stageW: number;
  stageH: number;
  isSelected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onDragEnd: (xPct: number, yPct: number) => void;
  onTransformEnd: (xPct: number, yPct: number, size: number) => void;
}) {
  const shapeRef = useRef<any>(null);
  const displayText = layer.icon
    ? layer.iconPosition === 'after'
      ? `${layer.text} ${layer.icon}`
      : `${layer.icon} ${layer.text}`
    : layer.text;
  const fontSize = Math.max(12, Math.min(72, layer.size || 24));
  const x = (layer.x / 100) * stageW;
  const y = (layer.y / 100) * stageH;

  const handleDragEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;
    const pos = node.position();
    const xPct = Math.max(0, Math.min(100, (pos.x / stageW) * 100));
    const yPct = Math.max(0, Math.min(100, (pos.y / stageH) * 100));
    onDragEnd(xPct, yPct);
  }, [stageW, stageH, onDragEnd]);

  const handleTransformEnd = useCallback(() => {
    const node = shapeRef.current;
    if (!node) return;
    const scaleX = node.scaleX() ?? 1;
    node.scaleX(1);
    node.scaleY(1);
    const newSize = Math.max(12, Math.min(72, fontSize * scaleX));
    const pos = node.position();
    const xPct = Math.max(0, Math.min(100, (pos.x / stageW) * 100));
    const yPct = Math.max(0, Math.min(100, (pos.y / stageH) * 100));
    onTransformEnd(xPct, yPct, Math.round(newSize));
  }, [stageW, stageH, fontSize, onTransformEnd]);

  return (
    <Text
      ref={shapeRef}
      id={layer.id}
      x={x}
      y={y}
      offsetX={90}
      offsetY={fontSize / 2 + 2}
      text={displayText}
      fontSize={fontSize}
      fontFamily={layer.fontFamily || 'Arial'}
      fill={layer.color || '#ffffff'}
      align={layer.textAlign || 'center'}
      fontStyle={layer.fontStyle || 'normal'}
      fontWeight={layer.fontWeight || 'bold'}
      width={180}
      padding={4}
      listening={!disabled}
      draggable={!disabled}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={handleDragEnd}
      onTransformEnd={handleTransformEnd}
      shadowColor="black"
      shadowBlur={4}
      shadowOpacity={0.8}
    />
  );
}
