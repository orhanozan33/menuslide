'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'terms' | 'privacy';
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isTerms = type === 'terms';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-800 border border-white/10 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {isTerms ? t('terms_title') : t('privacy_title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={t('common_close')}
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-white/80 text-sm leading-relaxed">
          {isTerms ? (
            <>
              <p className="text-white/50">{t('terms_last_updated')}: {t('terms_date')}</p>
              <p>{t('terms_p1')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h1')}</h3>
              <p>{t('terms_p2')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h2')}</h3>
              <p>{t('terms_p3')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h3')}</h3>
              <p>{t('terms_p4')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h4')}</h3>
              <p>{t('terms_p5')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h5')}</h3>
              <p>{t('terms_p6')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h6')}</h3>
              <p>{t('terms_p7')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h7')}</h3>
              <p>{t('terms_p8')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h8')}</h3>
              <p>{t('terms_p9')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h9')}</h3>
              <p>{t('terms_p10')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('terms_h10')}</h3>
              <p>{t('terms_p11')}</p>
            </>
          ) : (
            <>
              <p className="text-white/50">{t('privacy_last_updated')}: {t('privacy_date')}</p>
              <p>{t('privacy_p1')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h1')}</h3>
              <p>{t('privacy_p2')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h2')}</h3>
              <p>{t('privacy_p3')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h3')}</h3>
              <p>{t('privacy_p4')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h4')}</h3>
              <p>{t('privacy_p5')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h5')}</h3>
              <p>{t('privacy_p6')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h6')}</h3>
              <p>{t('privacy_p7')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h7')}</h3>
              <p>{t('privacy_p8')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h8')}</h3>
              <p>{t('privacy_p9')}</p>
              <h3 className="text-base font-semibold text-white pt-2">{t('privacy_h9')}</h3>
              <p>{t('privacy_p10')}</p>
            </>
          )}
        </div>
        <div className="p-4 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-medium transition-colors"
          >
            {t('common_close')}
          </button>
        </div>
      </div>
    </div>
  );
}
