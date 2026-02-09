'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { FullEditorPreviewThumb } from '@/components/FullEditorPreviewThumb';
import { FullEditorDisplay } from '@/components/display/FullEditorDisplay';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

interface FullEditorTemplate {
  id: string;
  name: string;
  canvas_json: object;
  preview_image: string | null;
  category_id: string | null;
  created_at?: string;
}

type LayoutOption = { id: string; labelKey: string; blocks: number; icon: string };

const LAYOUT_OPTIONS: LayoutOption[] = [
  { id: 'empty', labelKey: 'full_editor_layout_empty', blocks: 0, icon: '▢' },
  { id: '1x1', labelKey: 'templates_grid_single', blocks: 1, icon: '■' },
  { id: '1x2', labelKey: 'templates_grid_1x2', blocks: 2, icon: '▭' },
  { id: '1x3', labelKey: 'templates_layout_3', blocks: 3, icon: '▬' },
  { id: '2x2', labelKey: 'templates_grid_2x2', blocks: 4, icon: '🔲' },
  { id: '2x3', labelKey: 'templates_grid_2x3', blocks: 6, icon: '▬' },
  { id: '4x2-7', labelKey: 'templates_layout_7', blocks: 7, icon: '▦' },
  { id: '4x2-8', labelKey: 'templates_layout_8', blocks: 8, icon: '▧' },
];

export default function FullEditorTemplatesPage() {
  const { t, localePath } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [templates, setTemplates] = useState<FullEditorTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<FullEditorTemplate | null>(null);
  const [newTemplateModalOpen, setNewTemplateModalOpen] = useState(false);

  const loadTemplates = useCallback(() => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch('/api/full-editor/templates?scope=system', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setTemplates(Array.isArray(data) ? data : []))
      .catch(() => setTemplates([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleDelete = async (id: string) => {
    if (!confirm(t('templates_delete_confirm_title'))) return;
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/full-editor/templates?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as { error?: string; message?: string }).error || (data as { message?: string }).message || 'Silme başarısız');
      }
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      toast.showSuccess(t('templates_deleted'));
    } catch (err: unknown) {
      toast.showError((err as Error).message || t('templates_delete_failed'));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {t('sidebar_full_editor_templates')}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {t('full_editor_templates_desc')}
            </p>
          </div>
          <button
            onClick={() => setNewTemplateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('full_editor_new_template')}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-500">{t('common_loading')}</div>
        ) : templates.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700">
            <p className="text-gray-600 dark:text-gray-400 mb-4">{t('full_editor_no_templates')}</p>
            <button
              onClick={() => setNewTemplateModalOpen(true)}
              className="inline-flex px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {t('full_editor_new_template')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-200 dark:border-slate-700 overflow-hidden"
              >
                <div
                  className="aspect-video bg-gray-900 relative cursor-pointer"
                  onClick={() => setPreviewModal(tpl)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewModal(tpl); } }}
                  aria-label={t('common_preview') || 'Önizleme'}
                >
                  {tpl.preview_image ? (
                    <img
                      src={resolveMediaUrl(tpl.preview_image)}
                      alt={tpl.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <FullEditorPreviewThumb canvasJson={tpl.canvas_json} />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                    {t('templates_system_badge')}
                  </span>
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-white text-sm font-medium">{t('common_preview') || 'Önizleme'}</span>
                  </span>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white truncate">{tpl.name}</h3>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => router.push(`${localePath('/sistem')}?templateId=${tpl.id}`)}
                      className="flex-1 px-3 py-1.5 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800/50"
                    >
                      {t('common_edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(tpl.id)}
                      disabled={deletingId === tpl.id}
                      className="flex-1 px-3 py-1.5 text-sm bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800/50 disabled:opacity-50"
                    >
                      {deletingId === tpl.id ? '...' : t('common_delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Önizleme modal */}
        {previewModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
            onClick={() => setPreviewModal(null)}
          >
            <div
              className="relative max-w-5xl w-full max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-white">{previewModal.name}</h3>
                <button
                  onClick={() => setPreviewModal(null)}
                  className="text-slate-400 hover:text-white p-1"
                  aria-label={t('common_close') || 'Kapat'}
                >
                  ✕
                </button>
              </div>
              <div className="aspect-video w-full min-h-[300px] flex items-center justify-center bg-black">
                {previewModal.preview_image ? (
                  <img
                    src={resolveMediaUrl(previewModal.preview_image)}
                    alt={previewModal.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <div className="w-full h-full min-h-[300px] [&>div]:!w-full [&>div]:!h-full [&>div]:!min-h-[300px]">
                    <FullEditorDisplay canvasJson={previewModal.canvas_json} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Yeni şablon – blok türü seçim modalı */}
        {newTemplateModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={() => setNewTemplateModalOpen(false)}
          >
            <div
              className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t('full_editor_select_layout') || 'Şablon düzeni seçin'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('full_editor_select_layout_desc') || 'Başlangıç düzenini seçin. Tüm düzenler Full Editor ile düzenlenebilir.'}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {LAYOUT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => {
                      setNewTemplateModalOpen(false);
                      const url = opt.id === 'empty'
                        ? localePath('/sistem')
                        : `${localePath('/sistem')}?layout=${opt.id}`;
                      router.push(url);
                    }}
                    className="p-4 rounded-lg border-2 border-gray-200 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
                  >
                    <div className="text-2xl mb-2">{opt.icon}</div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">
                      {t(opt.labelKey)}
                    </div>
                    {opt.blocks > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {opt.blocks} {t('templates_block')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setNewTemplateModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  {t('common_cancel') || 'İptal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
