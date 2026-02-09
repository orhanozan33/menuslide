'use client';

import React, { useEffect, useState } from 'react';

const TRANSITION_CSS = (dur: number) => `
  .tpm-wrap { --tpm-dur: ${dur}ms; position: relative; width: 100%; aspect-ratio: 16/9; background: #111; border-radius: 8px; overflow: hidden; }
  .tpm-current, .tpm-next { position: absolute; inset: 0; }
  .tpm-current { z-index: 10; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: rgba(255,255,255,0.5); font-size: 0.9rem; }
  .tpm-next { z-index: 20; }
  .tpm-next iframe { width: 100%; height: 100%; border: none; }
  .tpm-car { position: absolute; inset: 0; z-index: 30; pointer-events: none; display: flex; align-items: center; justify-content: flex-start; }
  .tpm-car-inner { font-size: 24px; animation: tpmCarDrive var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmCarDrive { 0% { transform: translateX(-20%); } 100% { transform: translateX(120%); } }
  .tpm-wrap[data-effect="fade"] .tpm-current { animation: tpmFadeOut var(--tpm-dur) ease forwards; }
  .tpm-wrap[data-effect="fade"] .tpm-next { animation: tpmFadeIn var(--tpm-dur) ease forwards; }
  @keyframes tpmFadeOut { to { opacity: 0; } }
  @keyframes tpmFadeIn { from { opacity: 0; } to { opacity: 1; } }
  .tpm-wrap[data-effect="slide-left"] .tpm-current { animation: tpmSlideOutLeft var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="slide-left"] .tpm-next { animation: tpmSlideInFromRight var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmSlideOutLeft { to { transform: translateX(-100%); } }
  @keyframes tpmSlideInFromRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
  .tpm-wrap[data-effect="slide-right"] .tpm-current { animation: tpmSlideOutRight var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="slide-right"] .tpm-next { animation: tpmSlideInFromLeft var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmSlideOutRight { to { transform: translateX(100%); } }
  @keyframes tpmSlideInFromLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
  .tpm-wrap[data-effect="zoom"] .tpm-current { animation: tpmZoomOut var(--tpm-dur) ease forwards; }
  .tpm-wrap[data-effect="zoom"] .tpm-next { animation: tpmZoomIn var(--tpm-dur) ease forwards; }
  @keyframes tpmZoomOut { to { opacity: 0; transform: scale(0.85); } }
  @keyframes tpmZoomIn { from { opacity: 0; transform: scale(1.15); } to { opacity: 1; transform: scale(1); } }
  .tpm-wrap[data-effect="flip"] .tpm-current { animation: tpmFlipOut var(--tpm-dur) ease-in-out forwards; transform-origin: left center; }
  .tpm-wrap[data-effect="flip"] .tpm-next { animation: tpmFlipIn var(--tpm-dur) ease-in-out forwards; transform-origin: right center; }
  @keyframes tpmFlipOut { to { opacity: 0; transform: perspective(1200px) rotateY(-90deg); } }
  @keyframes tpmFlipIn { from { opacity: 0; transform: perspective(1200px) rotateY(90deg); } to { opacity: 1; transform: perspective(1200px) rotateY(0); } }
  .tpm-wrap[data-effect="car-pull"] .tpm-current { animation: tpmFadeOut var(--tpm-dur) ease forwards; }
  .tpm-wrap[data-effect="car-pull"] .tpm-next { animation: tpmSlideInFromRight var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="curtain"] .tpm-current { animation: tpmCurtainOut var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="curtain"] .tpm-next { animation: tpmCurtainIn var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmCurtainOut { to { clip-path: inset(0 50% 0 50%); opacity: 0; } }
  @keyframes tpmCurtainIn { from { clip-path: inset(0 50% 0 50%); } to { clip-path: inset(0 0 0 0); opacity: 1; } }
  .tpm-wrap[data-effect="wipe"] .tpm-current { animation: tpmWipeOut var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="wipe"] .tpm-next { animation: tpmWipeIn var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmWipeOut { to { clip-path: inset(0 0 0 100%); } }
  @keyframes tpmWipeIn { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
  .tpm-wrap[data-effect="slide-up"] .tpm-current { animation: tpmSlideOutUp var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="slide-up"] .tpm-next { animation: tpmSlideInFromDown var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmSlideOutUp { to { transform: translateY(-100%); } }
  @keyframes tpmSlideInFromDown { from { transform: translateY(100%); } to { transform: translateY(0); } }
  .tpm-wrap[data-effect="slide-down"] .tpm-current { animation: tpmSlideOutDown var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="slide-down"] .tpm-next { animation: tpmSlideInFromUp var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmSlideOutDown { to { transform: translateY(100%); } }
  @keyframes tpmSlideInFromUp { from { transform: translateY(-100%); } to { transform: translateY(0); } }
  .tpm-wrap[data-effect="bounce"] .tpm-current { animation: tpmBounceOut var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="bounce"] .tpm-next { animation: tpmBounceIn var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmBounceOut { to { opacity: 0; transform: scale(0.7); } }
  @keyframes tpmBounceIn { from { opacity: 0; transform: scale(0.3); } 60% { transform: scale(1.05); } to { opacity: 1; transform: scale(1); } }
  .tpm-wrap[data-effect="rotate"] .tpm-current { animation: tpmRotateOut var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  .tpm-wrap[data-effect="rotate"] .tpm-next { animation: tpmRotateIn var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  @keyframes tpmRotateOut { to { opacity: 0; transform: rotate(-180deg) scale(0.5); } }
  @keyframes tpmRotateIn { from { opacity: 0; transform: rotate(180deg) scale(0.5); } to { opacity: 1; transform: rotate(0) scale(1); } }
  .tpm-wrap[data-effect="blur"] .tpm-current { animation: tpmBlurOut var(--tpm-dur) ease forwards; }
  .tpm-wrap[data-effect="blur"] .tpm-next { animation: tpmBlurIn var(--tpm-dur) ease forwards; }
  @keyframes tpmBlurOut { to { opacity: 0; filter: blur(20px); } }
  @keyframes tpmBlurIn { from { opacity: 0; filter: blur(20px); } to { opacity: 1; filter: blur(0); } }
  .tpm-wrap[data-effect="cross-zoom"] .tpm-current { animation: tpmCrossZoomOut var(--tpm-dur) ease forwards; transform-origin: center center; }
  .tpm-wrap[data-effect="cross-zoom"] .tpm-next { animation: tpmCrossZoomIn var(--tpm-dur) ease forwards; transform-origin: center center; }
  @keyframes tpmCrossZoomOut { to { opacity: 0; transform: scale(2); } }
  @keyframes tpmCrossZoomIn { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: scale(1); } }
  .tpm-wrap[data-effect="cube"] .tpm-current { animation: tpmCubeOut var(--tpm-dur) ease-in-out forwards; transform-origin: right center; }
  .tpm-wrap[data-effect="cube"] .tpm-next { animation: tpmCubeIn var(--tpm-dur) ease-in-out forwards; transform-origin: left center; }
  @keyframes tpmCubeOut { to { opacity: 0; transform: perspective(1200px) rotateY(90deg); } }
  @keyframes tpmCubeIn { from { opacity: 0; transform: perspective(1200px) rotateY(-90deg); } to { opacity: 1; transform: perspective(1200px) rotateY(0); } }
  .tpm-wrap[data-effect="card-flip"] .tpm-current { animation: tpmCardFlipOut var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  .tpm-wrap[data-effect="card-flip"] .tpm-next { animation: tpmCardFlipIn var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  @keyframes tpmCardFlipOut { to { opacity: 0; transform: perspective(1200px) rotateX(-90deg); } }
  @keyframes tpmCardFlipIn { from { opacity: 0; transform: perspective(1200px) rotateX(90deg); } to { opacity: 1; transform: perspective(1200px) rotateX(0); } }
  .tpm-wrap[data-effect="split"] .tpm-current { animation: tpmSplitOut var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  .tpm-wrap[data-effect="split"] .tpm-next { animation: tpmSplitIn var(--tpm-dur) ease-in-out forwards; transform-origin: center center; }
  @keyframes tpmSplitOut { to { opacity: 0; clip-path: inset(0 50% 0 50%); transform: scale(0.95); } }
  @keyframes tpmSplitIn { from { opacity: 0; clip-path: inset(0 50% 0 50%); transform: scale(1.05); } to { opacity: 1; clip-path: inset(0 0 0 0); transform: scale(1); } }
  .tpm-wrap[data-effect="door"] .tpm-current { animation: tpmDoorOut var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="door"] .tpm-next { animation: tpmDoorIn var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmDoorOut { to { clip-path: polygon(50% 0, 50% 0, 50% 100%, 50% 100%); opacity: 0; } }
  @keyframes tpmDoorIn { from { clip-path: polygon(50% 0, 50% 0, 50% 100%, 50% 100%); opacity: 0; } to { clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%); opacity: 1; } }
  .tpm-wrap[data-effect="pixelate"] .tpm-current { animation: tpmPixelateOut var(--tpm-dur) ease forwards; }
  .tpm-wrap[data-effect="pixelate"] .tpm-next { animation: tpmPixelateIn var(--tpm-dur) ease forwards; }
  @keyframes tpmPixelateOut { to { opacity: 0; filter: blur(20px); transform: scale(0.6); } }
  @keyframes tpmPixelateIn { from { opacity: 0; filter: blur(15px); transform: scale(1.4); } to { opacity: 1; filter: blur(0); transform: scale(1); } }
  .tpm-wrap[data-effect="glitch"] .tpm-current { animation: tpmGlitchOut var(--tpm-dur) ease-in-out forwards; }
  .tpm-wrap[data-effect="glitch"] .tpm-next { animation: tpmGlitchIn var(--tpm-dur) ease-in-out forwards; }
  @keyframes tpmGlitchOut { 0% { transform: translate(0, 0); opacity: 1; } 25% { transform: translate(-8px, 2px); opacity: 0.9; } 50% { transform: translate(6px, -2px); opacity: 0.85; } 75% { transform: translate(-4px, 1px); opacity: 0.5; } 100% { transform: translate(15px, 0); opacity: 0; } }
  @keyframes tpmGlitchIn { from { opacity: 0; transform: translate(-10px, 0); } to { opacity: 1; transform: translate(0, 0); } }
  .tpm-wrap[data-effect="slide-zoom"] .tpm-current { animation: tpmSlideZoomOut var(--tpm-dur) ease-in-out forwards; transform-origin: left center; }
  .tpm-wrap[data-effect="slide-zoom"] .tpm-next { animation: tpmSlideZoomIn var(--tpm-dur) ease-in-out forwards; transform-origin: right center; }
  @keyframes tpmSlideZoomOut { to { opacity: 0; transform: translateX(-100%) scale(0.7); } }
  @keyframes tpmSlideZoomIn { from { opacity: 0; transform: translateX(100%) scale(0.7); } to { opacity: 1; transform: translateX(0) scale(1); } }
`;

export function TransitionPreviewModal({
  isOpen,
  onClose,
  previewUrl,
  effect,
  durationMs,
  templateName,
  titleLabel = 'Geçiş önizlemesi',
  previousLabel = 'Önceki şablon',
  closeLabel = 'Kapat',
}: {
  isOpen: boolean;
  onClose: () => void;
  previewUrl: string;
  effect: string;
  durationMs: number;
  templateName?: string;
  titleLabel?: string;
  previousLabel?: string;
  closeLabel?: string;
}) {
  const [startTransition, setStartTransition] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setStartTransition(false);
      return;
    }
    const t = setTimeout(() => setStartTransition(true), 400);
    return () => clearTimeout(t);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: TRANSITION_CSS(durationMs) }} />
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-xl shadow-2xl max-w-[90vw] w-full max-w-[640px] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 truncate">
              {templateName ? `${titleLabel}: ${templateName}` : titleLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
              aria-label={closeLabel}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3">
            <div className="tpm-wrap" data-effect={startTransition ? effect : undefined}>
              <div className="tpm-current">{previousLabel}</div>
              <div className="tpm-next">
                <iframe src={previewUrl} title={templateName || 'Önizleme'} />
              </div>
              {effect === 'car-pull' && startTransition && (
                <div className="tpm-car">
                  <span className="tpm-car-inner" role="img" aria-hidden>🚗</span>
                </div>
              )}
            </div>
          </div>
          <div className="p-3 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
