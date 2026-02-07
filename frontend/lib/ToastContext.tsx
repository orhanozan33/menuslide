'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration = 5000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast]
  );

  const showSuccess = useCallback((msg: string, d?: number) => showToast(msg, 'success', d ?? 4000), [showToast]);
  const showError = useCallback((msg: string, d?: number) => showToast(msg, 'error', d ?? 6000), [showToast]);
  const showInfo = useCallback((msg: string, d?: number) => showToast(msg, 'info', d), [showToast]);
  const showWarning = useCallback((msg: string, d?: number) => showToast(msg, 'warning', d), [showToast]);

  const value: ToastContextValue = {
    toasts,
    showToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
    removeToast,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (m: string) => console.log('[Toast fallback]', m),
      showSuccess: (m: string) => console.log('[Toast success]', m),
      showError: (m: string) => console.error('[Toast error]', m),
      showInfo: (m: string) => console.log('[Toast info]', m),
      showWarning: (m: string) => console.warn('[Toast warning]', m),
      removeToast: () => {},
    };
  }
  return ctx;
}

function ToastContainer({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: string) => void }) {
  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[380px]"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} item={t} onClose={() => onClose(t.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const [exiting, setExiting] = React.useState(false);

  const handleClose = () => {
    setExiting(true);
    setTimeout(onClose, 200);
  };

  const styles = {
    success: {
      bg: 'bg-green-100 backdrop-blur-md',
      border: 'border-green-300/50',
      ring: 'ring-1 ring-green-200/50',
      text: 'text-black',
      iconColor: 'text-black',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-rose-100 backdrop-blur-md',
      border: 'border-rose-300/50',
      ring: 'ring-1 ring-rose-200/50',
      text: 'text-black',
      iconColor: 'text-rose-800',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-amber-100 backdrop-blur-md',
      border: 'border-amber-300/50',
      ring: 'ring-1 ring-amber-200/50',
      text: 'text-black',
      iconColor: 'text-amber-800',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-sky-100 backdrop-blur-md',
      border: 'border-sky-300/50',
      ring: 'ring-1 ring-sky-200/50',
      text: 'text-black',
      iconColor: 'text-sky-800',
      icon: (
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };

  const s = styles[item.type];

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border shadow-lg px-4 py-3 ${s.text} ${s.bg} ${s.border} ${s.ring} transition-all duration-300 ease-out ${
        exiting ? 'opacity-0 translate-x-8 scale-95' : 'opacity-100 translate-x-0 scale-100'
      }`}
    >
      <span className={`flex-shrink-0 mt-0.5 ${s.iconColor}`}>{s.icon}</span>
      <p className="flex-1 text-sm font-medium leading-snug min-w-0 pt-0.5 line-clamp-3">{item.message}</p>
      <button
        type="button"
        onClick={handleClose}
        className="flex-shrink-0 p-1 -m-1 rounded-lg transition-colors focus:outline-none focus:ring-2 hover:bg-black/10 focus:ring-black/20 text-black"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
