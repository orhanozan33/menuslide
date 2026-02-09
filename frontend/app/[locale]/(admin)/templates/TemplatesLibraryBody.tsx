'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';

function LazyPreview({ template, render }: { template: any; render: (t: any) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '200px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-full h-full min-h-[100px]">
      {inView ? render(template) : (
        <div className="w-full h-full bg-gray-800/80 animate-pulse rounded" />
      )}
    </div>
  );
}

export interface TemplatesLibraryBodyProps {
  t: (key: string, vars?: Record<string, string | number>) => string;
  localePath: (path: string) => string;
  error: string;
  systemTemplates: any[];
  userTemplates: any[];
  templateBlocks: Record<string, any[]>;
  templateContents: Record<string, any[]>;
  userRole: string;
  users: { id: string; email: string; business_id?: string; business_name?: string }[];
  selectedUserId: string;
  setSelectedUserId?: (id: string) => void;
  getTemplateDisplayName: (name: string) => string;
  getTemplateDescription: (desc: string) => string;
  renderTemplatePreview: (template: any, opts?: { live?: boolean }) => React.ReactNode;
  loadBlocksAndContentsForTemplates: (templates: any[]) => void;
  setPreviewTemplate: (t: any) => void;
  setPreviewBlocksLoading: (b: boolean) => void;
  handleUseThisTemplate: (template: any) => void;
  handleDuplicateTemplate: (template: any) => void;
  handleCopyToSystem?: (template: any) => void;
  copyToSystemLoadingId?: string | null;
  openDeleteConfirm: (template: any) => void;
  useThisLoadingId: string | null;
  router: any;
  toast: any;
  createSystemBlockCounts: number[];
  setCreateSystemBlockCounts: (n: number[]) => void;
  createSystemCountPerType: number;
  setCreateSystemCountPerType: (n: number) => void;
  createSystemMergeOptions: Record<number, ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]>;
  setCreateSystemMergeOptions: (o: Record<number, ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]>) => void;
  getPreviewGrid: (n: number) => { cols: number; rows: number; special: number[] };
  getMergedBlockStyles: (blockCount: number, merges: ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]) => { gridColumn: string; gridRow: string }[];
  gridLabel: (n: number) => string;
  showCreateSystemModal: boolean;
  setShowCreateSystemModal: (b: boolean) => void;
  createSystemLoading: boolean;
  setCreateSystemLoading: (b: boolean) => void;
  ALL_BLOCK_COMBINATIONS: number[];
  deleteConfirmTemplate: any;
  setDeleteConfirmTemplate: (t: any) => void;
  confirmDeleteTemplate: () => void;
  previewTemplate: any;
  previewBlocksLoading: boolean;
  showApplyModal: boolean;
  setShowApplyModal: (b: boolean) => void;
  selectedTemplate: any;
  setSelectedTemplate: (t: any) => void;
  screens: any[];
  selectedScreenId: string;
  setSelectedScreenId: (id: string) => void;
  keepContent: boolean;
  setKeepContent: (b: boolean) => void;
  publishScreen: boolean;
  setPublishScreen: (b: boolean) => void;
  handleApplyTemplate: () => void;
  resolveMediaUrl: (url: string) => string;
  handleRenameTemplate?: (template: any) => void;
  /** 'system' = sadece sistem şablonları, 'mine' = sadece benim şablonlarım */
  mode?: 'system' | 'mine';
}

export function TemplatesLibraryBody(props: TemplatesLibraryBodyProps) {
  const {
    t,
    localePath,
    error,
    systemTemplates,
    userTemplates,
    templateBlocks,
    templateContents,
    userRole,
    users,
    selectedUserId,
    setSelectedUserId,
    getTemplateDisplayName,
    getTemplateDescription,
    renderTemplatePreview,
    loadBlocksAndContentsForTemplates,
    setPreviewTemplate,
    setPreviewBlocksLoading,
    handleUseThisTemplate,
    handleDuplicateTemplate,
    handleCopyToSystem,
    copyToSystemLoadingId,
    openDeleteConfirm,
    useThisLoadingId,
    router,
    toast,
    createSystemBlockCounts,
    setCreateSystemBlockCounts,
    createSystemCountPerType,
    setCreateSystemCountPerType,
    createSystemMergeOptions,
    setCreateSystemMergeOptions,
    getPreviewGrid,
    getMergedBlockStyles,
    gridLabel,
    showCreateSystemModal,
    setShowCreateSystemModal,
    createSystemLoading,
    setCreateSystemLoading,
    ALL_BLOCK_COMBINATIONS,
    deleteConfirmTemplate,
    setDeleteConfirmTemplate,
    confirmDeleteTemplate,
    previewTemplate,
    previewBlocksLoading,
    showApplyModal,
    setShowApplyModal,
    selectedTemplate,
    setSelectedTemplate,
    screens,
    selectedScreenId,
    setSelectedScreenId,
    keepContent,
    setKeepContent,
    publishScreen,
    setPublishScreen,
    handleApplyTemplate,
    resolveMediaUrl,
    handleRenameTemplate,
    mode = 'system',
  } = props;

  const openPreview = (template: any) => {
    const blocks = templateBlocks[template.id] || [];
    const contents = templateContents[template.id] || [];
    if (blocks.length > 0) {
      setPreviewTemplate(template);
    } else {
      setPreviewBlocksLoading(true);
      setPreviewTemplate(template);
      loadBlocksAndContentsForTemplates([template]);
      setTimeout(() => setPreviewBlocksLoading(false), 500);
    }
  };

  const renderTemplateCard = (template: any, isSystem: boolean) => {
    const blocks = templateBlocks[template.id] || [];
    const blockCount = blocks.length || template.block_count || 0;
    return (
      <div
        key={template.id}
        className="bg-white rounded-xl shadow-md hover:shadow-lg border border-gray-100 overflow-hidden transition-all"
      >
        <div
          className="aspect-video bg-gray-900 cursor-pointer relative group"
          onClick={() => openPreview(template)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <LazyPreview template={template} render={renderTemplatePreview} />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          {isSystem && (
            <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
              {t('templates_system_badge')}
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 truncate">
            {getTemplateDisplayName(template.display_name || template.name || '')}
          </h3>
          <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
            {getTemplateDescription(template.description || '')}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {blockCount} {t('templates_block')}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isSystem && (userRole !== 'super_admin' && userRole !== 'admin') && (
              <button
                onClick={() => handleUseThisTemplate(template)}
                disabled={useThisLoadingId !== null}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {useThisLoadingId === template.id ? '...' : t('templates_use_this')}
              </button>
            )}
            {isSystem && (userRole !== 'super_admin' && userRole !== 'admin') && (
              <button
                onClick={() => {
                  setSelectedTemplate(template);
                  setShowApplyModal(true);
                }}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700"
              >
                {t('templates_apply')}
              </button>
            )}
            {(userRole === 'super_admin' || userRole === 'admin') && (
              <>
                {!isSystem && mode === 'system' && selectedUserId && handleCopyToSystem && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopyToSystem(template); }}
                    disabled={copyToSystemLoadingId !== null}
                    className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {copyToSystemLoadingId === template.id ? '...' : t('templates_copy_to_system')}
                  </button>
                )}
                <button
                  onClick={() => {
                    const isFullEditor = template?.is_full_editor;
                    const isCanvas = template?.canvas_design && typeof template.canvas_design === 'object';
                    if (isFullEditor) router.push(`${localePath('/sistem')}?templateId=${template.id}`);
                    else if (isCanvas) router.push(`${localePath('/editor')}?templateId=${template.id}`);
                    else router.push(localePath(`/templates/${template.id}/edit`));
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                >
                  {t('common_edit')}
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(template); }}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  {t('common_delete')}
                </button>
                {handleRenameTemplate && (
                  <button
                    onClick={() => handleRenameTemplate(template)}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    {t('common_rename')}
                  </button>
                )}
              </>
            )}
            {!isSystem && (userRole !== 'super_admin' && userRole !== 'admin') && (
              <>
                <button
                  onClick={() => {
                    const isFullEditor = template?.is_full_editor;
                    const isCanvas = template?.canvas_design && typeof template.canvas_design === 'object';
                    if (isFullEditor) router.push(`${localePath('/sistem')}?templateId=${template.id}`);
                    else if (isCanvas) router.push(`${localePath('/editor')}?templateId=${template.id}`);
                    else router.push(localePath(`/templates/${template.id}/edit`));
                  }}
                  className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200"
                >
                  {t('common_edit')}
                </button>
                {handleRenameTemplate && (
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRenameTemplate(template); }}
                    className="px-3 py-1.5 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
                  >
                    {t('common_rename')}
                  </button>
                )}
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); openDeleteConfirm(template); }}
                  className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                >
                  {t('common_delete')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            {mode === 'system' ? t('templates_system') : t('templates_mine')}
          </h2>
          {(userRole === 'business_user' || mode === 'mine') && (
            <Link
              href={localePath(mode === 'system' ? '/templates/mine' : '/templates/system')}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              → {mode === 'system' ? t('templates_mine') : t('templates_system')}
            </Link>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={localePath('/templates/new')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            {t('templates_new')}
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {(userRole === 'super_admin' || userRole === 'admin') && setSelectedUserId && (mode === 'mine' || mode === 'system') && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            👤 {t('templates_select_user')}
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="">{t('templates_all_users')}</option>
            {(users || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.business_name ? `${u.business_name} - ${u.email}` : u.email}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="space-y-8">
        {mode === 'system' && (userRole === 'super_admin' || userRole === 'admin') && selectedUserId ? (
          <section>
            <p className="text-sm text-gray-600 mb-4">
              {users.find((u) => u.id === selectedUserId)?.email || users.find((u) => u.id === selectedUserId)?.business_name || t('templates_user')} {t('templates_user_templates_desc')}
            </p>
            {userTemplates && userTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userTemplates.map((tpl) => renderTemplateCard(tpl, false))}
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600">{t('templates_no_mine')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('templates_create_hint')}</p>
              </div>
            )}
          </section>
        ) : mode === 'system' && (
          <section>
            <p className="text-sm text-gray-600 mb-4">{t('templates_system_desc')}</p>
            {systemTemplates && systemTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {systemTemplates.map((tpl) => renderTemplateCard(tpl, true))}
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600">{t('templates_no_system')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('templates_system_hint')}</p>
              </div>
            )}
          </section>
        )}

        {mode === 'mine' && (
          <section>
            {userTemplates && userTemplates.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userTemplates.map((tpl) => renderTemplateCard(tpl, false))}
              </div>
            ) : (
              <div className="py-12 text-center bg-gray-50 rounded-xl border border-gray-200">
                <p className="text-gray-600">{t('templates_no_mine')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('templates_create_hint')}</p>
              </div>
            )}
          </section>
        )}
      </div>

      {/* Apply Modal */}
      {showApplyModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('templates_apply_title')}</h3>
            <p className="text-gray-600 mb-4">
              {t('templates_apply_question', { name: selectedTemplate.display_name || selectedTemplate.name })}
            </p>
            <select
              value={selectedScreenId}
              onChange={(e) => setSelectedScreenId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 text-gray-900"
            >
              <option value="">{t('templates_select_screen')}</option>
              {(screens || []).map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={keepContent}
                onChange={(e) => setKeepContent(e.target.checked)}
              />
              <span className="text-sm text-gray-700">{t('templates_keep_content')}</span>
            </label>
            <label className="flex items-center gap-2 mb-6">
              <input
                type="checkbox"
                checked={publishScreen}
                onChange={(e) => setPublishScreen(e.target.checked)}
              />
              <span className="text-sm text-gray-700">{t('templates_publish_screen')}</span>
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedTemplate(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 font-medium"
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={handleApplyTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('templates_apply_publish')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">{t('templates_delete_confirm_title')}</h3>
            <p className="text-gray-600 mb-6">
              {t('templates_delete_confirm', {
                name: deleteConfirmTemplate.display_name || deleteConfirmTemplate.name || '',
              })}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmTemplate(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-800 font-medium"
              >
                {t('common_cancel')}
              </button>
              <button
                onClick={confirmDeleteTemplate}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('templates_delete_yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewTemplate(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewTemplate(null)}
            className="absolute top-4 right-4 z-10 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium shadow-lg"
          >
            {t('templates_close_esc')}
          </button>
          <div
            className="w-full max-w-4xl aspect-video rounded-lg overflow-hidden bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewBlocksLoading ? (
              <div className="flex items-center justify-center h-full text-white">
                {t('common_loading')}
              </div>
            ) : (
              <div className="w-full h-full">
                {renderTemplatePreview(previewTemplate, { live: true })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create System Modal - simplified placeholder */}
      {showCreateSystemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('templates_create_modal_title')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('templates_create_modal_desc')}</p>
            <p className="text-sm text-amber-600 mb-4">
              Bu özellik şablon düzenleme sayfasından veya ekran template sayfasından &quot;Sistem şablonu olarak kaydet&quot; ile kullanılabilir.
            </p>
            <button
              onClick={() => setShowCreateSystemModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              {t('common_close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
