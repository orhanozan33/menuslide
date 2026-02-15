'use client';

import React from 'react';

const TEMPLATE_ROOT_STYLE: React.CSSProperties = {
  width: 1920,
  height: 1080,
  position: 'relative',
  overflow: 'hidden',
  boxSizing: 'border-box',
};

/**
 * Sabit ölçülü template container. Admin preview ve user edit aynı ölçüyü kullanır; pixel-perfect tutarlılık.
 * CSS .template-root altında scoped; global body stilleri bu alanı etkilemez.
 */
export function TemplateRoot({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`template-root ${className}`.trim()}
      style={{ ...TEMPLATE_ROOT_STYLE, ...style }}
    >
      {children}
    </div>
  );
}

export const TEMPLATE_WIDTH = 1920;
export const TEMPLATE_HEIGHT = 1080;
