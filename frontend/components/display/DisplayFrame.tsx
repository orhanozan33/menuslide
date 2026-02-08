'use client';

import React from 'react';

/** 10 modern frame styles - all 4 sides. hideBottomFrame=true when ticker text is used. */
const FRAME_STYLES: Record<string, React.CSSProperties & { className?: string }> = {
  none: {},
  frame_1: {
    borderTop: '4px solid rgba(251, 191, 36, 0.9)',
    borderLeft: '4px solid rgba(251, 191, 36, 0.9)',
    borderRight: '4px solid rgba(251, 191, 36, 0.9)',
    borderBottom: '4px solid rgba(251, 191, 36, 0.9)',
    boxShadow: 'inset 0 0 60px rgba(251, 191, 36, 0.05)',
  },
  frame_2: {
    borderTop: '6px double rgba(234, 179, 8, 0.8)',
    borderLeft: '6px double rgba(234, 179, 8, 0.8)',
    borderRight: '6px double rgba(234, 179, 8, 0.8)',
    borderBottom: '6px double rgba(234, 179, 8, 0.8)',
    borderRadius: '4px',
  },
  frame_3: {
    borderTop: '3px solid transparent',
    borderLeft: '3px solid transparent',
    borderRight: '3px solid transparent',
    borderBottom: '3px solid transparent',
    borderImage: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706) 1',
    boxShadow: 'inset 0 0 80px rgba(245, 158, 11, 0.03)',
  },
  frame_4: {
    borderTop: '8px solid',
    borderLeft: '8px solid',
    borderRight: '8px solid',
    borderBottom: '8px solid',
    borderColor: 'rgba(15, 23, 42, 0.95)',
    boxShadow: '0 0 0 2px rgba(251, 191, 36, 0.4), inset 0 0 40px rgba(0,0,0,0.2)',
  },
  frame_5: {
    borderTop: '2px solid rgba(251, 191, 36, 0.6)',
    borderLeft: '2px solid rgba(251, 191, 36, 0.6)',
    borderRight: '2px solid rgba(251, 191, 36, 0.6)',
    borderBottom: '2px solid rgba(251, 191, 36, 0.6)',
    boxShadow: 'inset 0 0 0 1px rgba(251, 191, 36, 0.2), 0 0 30px rgba(251, 191, 36, 0.05)',
  },
  frame_6: {
    borderTop: '5px solid #fbbf24',
    borderLeft: '5px solid #fbbf24',
    borderRight: '5px solid #fbbf24',
    borderBottom: '5px solid #fbbf24',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)',
  },
  frame_7: {
    borderTop: '4px solid rgba(255, 255, 255, 0.15)',
    borderLeft: '4px solid rgba(255, 255, 255, 0.15)',
    borderRight: '4px solid rgba(255, 255, 255, 0.15)',
    borderBottom: '4px solid rgba(255, 255, 255, 0.15)',
    boxShadow: 'inset 0 0 0 2px rgba(251, 191, 36, 0.3)',
  },
  frame_8: {
    borderTop: '6px groove rgba(251, 191, 36, 0.7)',
    borderLeft: '6px groove rgba(251, 191, 36, 0.7)',
    borderRight: '6px groove rgba(251, 191, 36, 0.7)',
    borderBottom: '6px groove rgba(251, 191, 36, 0.7)',
  },
  frame_9: {
    borderTop: '3px solid #fbbf24',
    borderLeft: '3px solid #fbbf24',
    borderRight: '3px solid #fbbf24',
    borderBottom: '3px solid #fbbf24',
    boxShadow: 'inset 0 0 100px rgba(251, 191, 36, 0.03), 0 0 20px rgba(251, 191, 36, 0.1)',
  },
  frame_10: {
    borderTop: '2px solid rgba(251, 191, 36, 0.5)',
    borderLeft: '2px solid rgba(251, 191, 36, 0.5)',
    borderRight: '2px solid rgba(251, 191, 36, 0.5)',
    borderBottom: '2px solid rgba(251, 191, 36, 0.5)',
    borderRadius: '2px',
    boxShadow: 'inset 0 0 0 1px rgba(251, 191, 36, 0.15)',
  },
  // Ahşap, desen, karlı, buzlu, sarmaşık vb.
  frame_wood: {
    borderTop: '6px solid',
    borderLeft: '6px solid',
    borderRight: '6px solid',
    borderBottom: '6px solid',
    borderImage: 'linear-gradient(180deg, #8B4513 0%, #A0522D 25%, #CD853F 50%, #A0522D 75%, #5D4037 100%) 1',
    borderRadius: '4px',
    boxShadow: 'inset 0 0 20px rgba(139, 69, 19, 0.2), 0 0 0 1px rgba(93, 64, 55, 0.4)',
  },
  frame_wood_light: {
    borderTop: '5px solid #D2691E',
    borderLeft: '5px solid #D2691E',
    borderRight: '5px solid #D2691E',
    borderBottom: '5px solid #D2691E',
    borderRadius: '6px',
    boxShadow: 'inset 0 0 0 2px rgba(160, 82, 45, 0.5), 0 0 15px rgba(210, 105, 30, 0.15)',
  },
  frame_pattern: {
    borderTop: '4px solid transparent',
    borderLeft: '4px solid transparent',
    borderRight: '4px solid transparent',
    borderBottom: '4px solid transparent',
    borderImage: 'linear-gradient(45deg, #fbbf24 25%, #92400e 25%, #92400e 50%, #fbbf24 50%, #fbbf24 75%, #92400e 75%) 1',
    borderRadius: '2px',
    boxShadow: 'inset 0 0 0 1px rgba(146, 64, 14, 0.3)',
  },
  frame_pattern_geo: {
    borderTop: '4px solid #64748b',
    borderLeft: '4px solid #64748b',
    borderRight: '4px solid #64748b',
    borderBottom: '4px solid #64748b',
    borderRadius: '0',
    boxShadow: 'inset 0 0 0 2px #94a3b8, inset 0 0 0 4px #cbd5e1, inset 0 0 0 6px #e2e8f0',
  },
  frame_snowy: {
    borderTop: '8px solid #f8fafc',
    borderLeft: '8px solid #f8fafc',
    borderRight: '8px solid #f8fafc',
    borderBottom: '8px solid #f8fafc',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 0 1px rgba(148, 163, 184, 0.3), 0 0 30px rgba(248, 250, 252, 0.4)',
  },
  frame_snowy_soft: {
    borderTop: '6px solid rgba(248, 250, 252, 0.95)',
    borderLeft: '6px solid rgba(248, 250, 252, 0.95)',
    borderRight: '6px solid rgba(248, 250, 252, 0.95)',
    borderBottom: '6px solid rgba(248, 250, 252, 0.95)',
    borderRadius: '12px',
    boxShadow: 'inset 0 0 0 2px rgba(226, 232, 240, 0.8), 0 0 20px rgba(255, 255, 255, 0.3)',
  },
  frame_icy: {
    borderTop: '6px solid transparent',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderImage: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 25%, #80deea 50%, #4dd0e1 75%, #26c6da 100%) 1',
    borderRadius: '4px',
    boxShadow: 'inset 0 0 30px rgba(178, 235, 242, 0.2), 0 0 0 1px rgba(77, 208, 225, 0.4)',
  },
  frame_icy_crystal: {
    borderTop: '5px solid #b2ebf2',
    borderLeft: '5px solid #b2ebf2',
    borderRight: '5px solid #b2ebf2',
    borderBottom: '5px solid #b2ebf2',
    borderRadius: '2px',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5), 0 0 25px rgba(178, 235, 242, 0.3)',
  },
  frame_ivy: {
    borderTop: '6px solid transparent',
    borderLeft: '6px solid transparent',
    borderRight: '6px solid transparent',
    borderBottom: '6px solid transparent',
    borderImage: 'linear-gradient(180deg, #1b5e20 0%, #2e7d32 20%, #43a047 50%, #388e3c 80%, #1b5e20 100%) 1',
    borderRadius: '6px',
    boxShadow: 'inset 0 0 0 1px rgba(27, 94, 32, 0.5), 0 0 20px rgba(46, 125, 50, 0.2)',
  },
  frame_ivy_light: {
    borderTop: '5px solid #66bb6a',
    borderLeft: '5px solid #66bb6a',
    borderRight: '5px solid #66bb6a',
    borderBottom: '5px solid #66bb6a',
    borderRadius: '8px',
    boxShadow: 'inset 0 0 0 2px rgba(46, 125, 50, 0.4), 0 0 15px rgba(102, 187, 106, 0.15)',
  },
  frame_stone: {
    borderTop: '8px solid #78909c',
    borderLeft: '8px solid #78909c',
    borderRight: '8px solid #78909c',
    borderBottom: '8px solid #78909c',
    borderRadius: '4px',
    boxShadow: 'inset 0 0 0 2px #546e7a, 0 0 0 1px #455a64',
  },
  frame_copper: {
    borderTop: '5px solid #b87333',
    borderLeft: '5px solid #b87333',
    borderRight: '5px solid #b87333',
    borderBottom: '5px solid #b87333',
    borderRadius: '4px',
    boxShadow: 'inset 0 0 0 1px #8B4513, 0 0 20px rgba(184, 115, 51, 0.25)',
  },
  frame_metallic: {
    borderTop: '6px solid #5a5d63',
    borderLeft: '6px solid #5a5d63',
    borderRight: '6px solid #5a5d63',
    borderBottom: '6px solid #5a5d63',
    borderRadius: '4px',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.2)',
  },
};

export const FRAME_OPTIONS = [
  { value: 'none', labelKey: 'frame_none' },
  { value: 'frame_1', labelKey: 'frame_1' },
  { value: 'frame_2', labelKey: 'frame_2' },
  { value: 'frame_3', labelKey: 'frame_3' },
  { value: 'frame_4', labelKey: 'frame_4' },
  { value: 'frame_5', labelKey: 'frame_5' },
  { value: 'frame_6', labelKey: 'frame_6' },
  { value: 'frame_7', labelKey: 'frame_7' },
  { value: 'frame_8', labelKey: 'frame_8' },
  { value: 'frame_9', labelKey: 'frame_9' },
  { value: 'frame_10', labelKey: 'frame_10' },
  { value: 'frame_wood', labelKey: 'frame_wood' },
  { value: 'frame_wood_light', labelKey: 'frame_wood_light' },
  { value: 'frame_pattern', labelKey: 'frame_pattern' },
  { value: 'frame_pattern_geo', labelKey: 'frame_pattern_geo' },
  { value: 'frame_snowy', labelKey: 'frame_snowy' },
  { value: 'frame_snowy_soft', labelKey: 'frame_snowy_soft' },
  { value: 'frame_icy', labelKey: 'frame_icy' },
  { value: 'frame_icy_crystal', labelKey: 'frame_icy_crystal' },
  { value: 'frame_ivy', labelKey: 'frame_ivy' },
  { value: 'frame_ivy_light', labelKey: 'frame_ivy_light' },
  { value: 'frame_stone', labelKey: 'frame_stone' },
  { value: 'frame_copper', labelKey: 'frame_copper' },
  { value: 'frame_metallic', labelKey: 'frame_metallic' },
];

interface DisplayFrameProps {
  frameType: string;
  /** Alt yazı kullanılıyorsa true - altta çerçeve olmaz */
  hideBottomFrame?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function DisplayFrame({ frameType, hideBottomFrame = false, children, className = '' }: DisplayFrameProps) {
  const baseStyle = FRAME_STYLES[frameType] || FRAME_STYLES.none;
  const style = hideBottomFrame && baseStyle
    ? { ...baseStyle, borderBottom: 'none' }
    : baseStyle;

  if (frameType === 'none' || !frameType) {
    return (
      <div className={className} style={{ position: 'relative', width: '100%', height: '100%', boxSizing: 'border-box', ...FRAME_STYLES.frame_metallic }}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        ...style,
      }}
    >
      {children}
    </div>
  );
}
