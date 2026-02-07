'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  /** Ek uyarı metni (örn. silme işlemleri için kırmızı) */
  warningText?: string;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    open: boolean;
    resolve: (value: boolean) => void;
    options: ConfirmOptions;
  } | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        resolve,
        options: {
          confirmLabel: options.variant === 'danger' ? 'Sil' : 'Tamam',
          cancelLabel: 'İptal',
          variant: 'danger',
          ...options,
        },
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const value: ConfirmContextValue = { confirm };
  const opts = state?.options;

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state?.open && opts && (
        <div
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onClick={handleClose}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-600 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 id="confirm-modal-title" className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
                {opts.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-2">{opts.message}</p>
              {opts.warningText && (
                <p className="text-red-600 dark:text-red-400 text-sm flex items-start gap-2 mb-4">
                  <span className="flex-shrink-0 mt-0.5">⚠</span>
                  {opts.warningText}
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-end px-6 pb-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-500 text-sm font-medium transition-colors"
              >
                {opts.cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={
                  opts.variant === 'danger'
                    ? 'px-4 py-2.5 rounded-xl bg-red-600 text-white hover:bg-red-700 text-sm font-medium transition-colors'
                    : 'px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 text-sm font-medium transition-colors'
                }
              >
                {opts.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return {
      confirm: (opts: ConfirmOptions) => {
        const ok = typeof window !== 'undefined' ? window.confirm(`${opts.title}\n\n${opts.message}`) : false;
        return Promise.resolve(ok);
      },
    };
  }
  return ctx;
}
