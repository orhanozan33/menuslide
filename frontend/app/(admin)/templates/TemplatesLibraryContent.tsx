'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';
import { FullEditorPreviewThumb } from '@/components/FullEditorPreviewThumb';
import { TemplateDisplay } from '@/components/display/TemplateDisplay';
import { TemplatesLibraryBody } from '../../[locale]/(admin)/templates/TemplatesLibraryBody';

interface User {
  id: string;
  email: string;
  role: string;
  business_name?: string;
}

/** Wrapper that provides useSearchParams - must be inside Suspense to avoid 500 */
export function TemplatesWithSearchParams({ mode }: { mode: 'system' | 'mine' }) {
  const searchParams = useSearchParams();
  return <TemplatesLibraryContent mode={mode} searchParams={searchParams} />;
}

export function TemplatesLibraryContent({
  mode = 'system',
  searchParams,
}: { mode?: 'system' | 'mine'; searchParams?: URLSearchParams | null }) {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();

  const getTemplateDisplayName = (name: string) => {
    if (!name) return '';
    const blockMatch = name.match(/^(\d+)\s*bloklu\s*şablon/i);
    if (blockMatch) {
      const blockCount = blockMatch[1];
      const suffix = name.replace(/^\d+\s*bloklu\s*şablon/i, '').trim();
      const translated = t('template_block_template').replace('{n}', blockCount);
      return suffix ? `${translated} ${suffix}` : translated;
    }
    const key = 'template_name_' + (name || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '');
    const translated = t(key);
    return translated !== key ? translated : name;
  };

  const getTemplateDescription = (desc: string) => {
    if (!desc) return '';
    const descMatch = desc.match(/^(\d+)\s*kare\s*\(grid\)\s*düzen/i);
    if (descMatch) {
      const blockCount = descMatch[1];
      return t('template_block_desc').replace('{n}', blockCount);
    }
    return desc;
  };
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [screens, setScreens] = useState<any[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [keepContent, setKeepContent] = useState(true);
  const [publishScreen, setPublishScreen] = useState(true);
  const [templateBlocks, setTemplateBlocks] = useState<{ [key: string]: any[] }>({});
  const [templateContents, setTemplateContents] = useState<{ [key: string]: any[] }>({});
  const [userRole, setUserRole] = useState<string>('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);
  const [previewBlocksLoading, setPreviewBlocksLoading] = useState(false);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any | null>(null);
  const [useThisLoadingId, setUseThisLoadingId] = useState<string | null>(null);
  const [copyToSystemLoadingId, setCopyToSystemLoadingId] = useState<string | null>(null);
  const [showCreateSystemModal, setShowCreateSystemModal] = useState(false);
  const [createSystemBlockCounts, setCreateSystemBlockCounts] = useState<number[]>([1, 2, 4]);
  const [createSystemCountPerType, setCreateSystemCountPerType] = useState(1);
  const [createSystemLoading, setCreateSystemLoading] = useState(false);
  const [createSystemMergeOptions, setCreateSystemMergeOptions] = useState<Record<number, ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]>>({});
  const ALL_BLOCK_COMBINATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16];
  const gridLabel = (n: number) => {
    const key = `templates_grid_${n}` as const;
    const translated = t(key);
    return translated !== key ? translated : `${n} ${t('templates_grid_unit')}`;
  };

  const getMergedBlockStyles = (blockCount: number, merges: ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]) => {
    const { cols, rows } = getPreviewGrid(blockCount);
    const baseStyles = Array.from({ length: blockCount }, (_, i) => {
      const spanCols = (blockCount === 3 && i === 2) || (blockCount === 7 && i === 6);
      const spanRows = blockCount === 5 && i === 2;
      return { gridColumn: spanCols ? 'span 2' : 'auto', gridRow: spanRows ? 'span 2' : 'auto' };
    });
    if (!merges.length || cols < 2) return baseStyles;
    const midCol = cols >= 3 ? Math.floor(cols / 2) : -1;
    const midColLeft = cols >= 4 ? Math.floor(cols / 2) - 1 : -1;
    const middle2AsOne = cols >= 4 && merges.includes('middle_2_as_one');
    const isMergeCol = (col: number) =>
      (merges.includes('left') && col === 0) ||
      (merges.includes('right') && col === cols - 1) ||
      (!middle2AsOne && merges.includes('middle') && col === midCol) ||
      (!middle2AsOne && merges.includes('middle_left') && col === midColLeft) ||
      (!middle2AsOne && merges.includes('middle_right') && col === midCol);
    const styles: { gridColumn: string; gridRow: string }[] = [];
    for (let col = 0; col < cols; col++) {
      if (middle2AsOne && col === midColLeft) {
        styles.push({ gridColumn: `${col + 1} / span 2`, gridRow: `1 / span ${rows}` });
      } else if (middle2AsOne && col === midCol) {
        continue;
      } else if (isMergeCol(col)) {
        styles.push({ gridColumn: `${col + 1}`, gridRow: `1 / span ${rows}` });
      } else {
        for (let row = 0; row < rows; row++) {
          styles.push({ gridColumn: `${col + 1}`, gridRow: `${row + 1}` });
        }
      }
    }
    return styles;
  };

  const getPreviewGrid = (blockCount: number) => {
    if (blockCount <= 0) return { cols: 1, rows: 1, special: [] as number[] };
    if (blockCount === 1) return { cols: 1, rows: 1, special: [] };
    if (blockCount === 2) return { cols: 2, rows: 1, special: [] };
    if (blockCount === 3) return { cols: 2, rows: 2, special: [2] };
    if (blockCount === 4) return { cols: 2, rows: 2, special: [] };
    if (blockCount === 5) return { cols: 3, rows: 2, special: [2] };
    if (blockCount === 6) return { cols: 3, rows: 2, special: [] };
    if (blockCount === 7) return { cols: 4, rows: 2, special: [6] };
    if (blockCount === 8) return { cols: 4, rows: 2, special: [] };
    if (blockCount === 9) return { cols: 3, rows: 3, special: [] };
    if (blockCount === 12) return { cols: 4, rows: 3, special: [] };
    if (blockCount === 16) return { cols: 4, rows: 4, special: [] };
    const c = Math.ceil(Math.sqrt(blockCount));
    return { cols: c, rows: Math.ceil(blockCount / c), special: [] };
  };

  const loadUsers = async () => {
    try {
      const data = await apiClient('/users');
      setUsers(data || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const loadTemplates = async (showLoading = true) => {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
    if (!token) {
      setLoading(false);
      setError(t('templates_load_failed') + '. Lütfen giriş yapın.');
      return;
    }
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    const timeoutMs = 20000;
    const fetchWithTimeout = async (url: string) => {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const r = await fetch(`/api/proxy${url}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: ctrl.signal,
        });
        clearTimeout(id);
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error((j as { message?: string }).message || `HTTP ${r.status}`);
        }
        return r.json();
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    };
    try {
      const userIdFromUrl = searchParams?.get('user_id');
      const effectiveUserId = userIdFromUrl || selectedUserId;
      const userIdParam = (userRole === 'super_admin' || userRole === 'admin') && effectiveUserId
        ? `?user_id=${effectiveUserId}`
        : '';

      let systemData: any[] = [];
      if (mode === 'system') {
        try {
          systemData = await fetchWithTimeout('/templates/scope/system') || [];
          if (!Array.isArray(systemData)) systemData = [];
        } catch (err: any) {
          console.warn('System scope failed:', err);
        }
        try {
          const fullEditorRes = await fetch('/api/full-editor/templates?scope=system');
          const fullEditorData = (await fullEditorRes.json()) || [];
          const fullEditorList = Array.isArray(fullEditorData) ? fullEditorData : [];
          const mapped = fullEditorList.map((t: any) => ({
            id: t.id,
            name: t.name,
            display_name: t.name,
            description: 'Full Editor tasarımı',
            block_count: 1,
            preview_image_url: t.preview_image || null,
            is_full_editor: true,
            canvas_json: t.canvas_json,
          }));
          systemData = [...systemData, ...mapped];
        } catch (err: any) {
          console.warn('Full editor templates failed:', err);
        }
        setSystemTemplates([...systemData].sort((a, b) => (Number(a.block_count) || 999) - (Number(b.block_count) || 999)));
      }

      let userData: any[] = [];
      if (mode === 'mine' || (mode === 'system' && (userRole === 'super_admin' || userRole === 'admin') && effectiveUserId)) {
        try {
          userData = await fetchWithTimeout(`/templates/scope/user${userIdParam}`) || [];
          if (!Array.isArray(userData)) userData = [];
        } catch (err: any) {
          console.warn('User scope failed, falling back:', err);
          try {
            const allTemplates = await fetchWithTimeout(`/templates${userIdParam}`);
            userData = Array.isArray(allTemplates)
              ? allTemplates.filter((t: any) => t.scope === 'user' || !t.scope || t.is_system === false)
              : [];
          } catch {
            userData = [];
          }
        }
        try {
          const feUserParam = (userRole === 'super_admin' || userRole === 'admin') && effectiveUserId ? `&user_id=${effectiveUserId}` : '';
          const fullEditorUserRes = await fetch(`/api/full-editor/templates?scope=user${feUserParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fullEditorUserData = (await fullEditorUserRes.json()) || [];
          const fullEditorUserList = Array.isArray(fullEditorUserData) ? fullEditorUserData : [];
          const mapped = fullEditorUserList.map((t: any) => ({
            id: t.id,
            name: t.name,
            display_name: t.name,
            description: 'Full Editor tasarımı',
            block_count: 1,
            preview_image_url: t.preview_image || null,
            is_full_editor: true,
            canvas_json: t.canvas_json,
          }));
          userData = [...userData, ...mapped];
        } catch (err: any) {
          console.warn('Full editor user templates failed:', err);
        }
        setUserTemplates([...userData].sort((a, b) => (Number(a.block_count) || 999) - (Number(b.block_count) || 999)));
      }

      const allTemplates = [...systemData, ...userData];

      if (allTemplates.length > 0) {
        const needsBlocks = allTemplates.filter((t: any) => !t.preview_image_url);
        if (needsBlocks.length > 0) {
          loadBlocksAndContentsForTemplates(needsBlocks);
        }
      }
    } catch (err: any) {
      console.error('Error loading templates:', err);
      const errorMsg = err?.message || err?.data?.message || t('templates_load_failed');
      setError(`${t('common_error')}: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocksAndContentsForTemplates = async (templatesList: any[]) => {
    if (templatesList.length === 0) return;
    const BATCH_SIZE = 3;
    const blocksMap: { [key: string]: any[] } = {};
    const contentsMap: { [key: string]: any[] } = {};

    for (let i = 0; i < templatesList.length; i += BATCH_SIZE) {
      const batch = templatesList.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (template: any) => {
          try {
            const blocks = await apiClient(`/templates/${template.id}/blocks`);
            const blocksList = blocks || [];
            blocksMap[template.id] = blocksList;
            const contentPromises = blocksList.slice(0, 16).map(async (block: any) => {
              try {
                const blockContents = await apiClient(`/template-block-contents/block/${block.id}`);
                return Array.isArray(blockContents) ? blockContents : [];
              } catch {
                return [];
              }
            });
            const allContents = await Promise.all(contentPromises);
            contentsMap[template.id] = allContents.flat();
          } catch {
            blocksMap[template.id] = [];
            contentsMap[template.id] = [];
          }
        })
      );
      setTemplateBlocks((prev) => ({ ...prev, ...blocksMap }));
      setTemplateContents((prev) => ({ ...prev, ...contentsMap }));
    }
  };

  const loadScreens = async () => {
    try {
      const data = await apiClient('/screens');
      setScreens(data || []);
    } catch (err) {
      console.error('Error loading screens:', err);
    }
  };

  useEffect(() => {
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        if (user.role === 'super_admin' || user.role === 'admin') {
          loadUsers();
        }
      } catch (e) {
        console.error('Error parsing user:', e);
      }
    }
    loadTemplates();
    loadScreens();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (userRole) {
      loadTemplates(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, userRole, mode]);

  useEffect(() => {
    if (!previewTemplate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewTemplate(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewTemplate]);

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !selectedScreenId) {
      toast.showWarning(t('templates_apply_select_screen'));
      return;
    }

    try {
      await apiClient('/templates/apply', {
        method: 'POST',
        body: {
          template_id: selectedTemplate.id,
          screen_id: selectedScreenId,
          keep_content: keepContent,
        },
      });

      if (publishScreen) {
        await apiClient(`/screens/${selectedScreenId}`, {
          method: 'PATCH',
          body: { is_active: true },
        });
      }

      toast.showSuccess(publishScreen ? t('templates_apply_success') : t('templates_apply_success_alt'));
      setShowApplyModal(false);
      setSelectedTemplate(null);
      setPublishScreen(true);
      router.push(localePath(`/screens/${selectedScreenId}/template`));
    } catch (err: any) {
      console.error('Error applying template:', err);
      toast.showError(t('templates_apply_failed') + ': ' + err.message);
    }
  };

  const handleDuplicateTemplate = async (template: any) => {
    const newName = prompt(t('templates_duplicate_prompt', { name: template.display_name }), `${template.display_name} ${t('templates_duplicate_copy')}`);
    if (!newName) return;

    try {
      await apiClient(`/templates/${template.id}/duplicate`, {
        method: 'POST',
        body: {
          name: `template_${Date.now()}`,
          display_name: newName,
          description: template.description || '',
        },
      });
      toast.showSuccess(t('templates_duplicate_success'));
      loadTemplates();
    } catch (err: any) {
      console.error('Error duplicating template:', err);
      toast.showError(t('templates_duplicate_failed') + ': ' + err.message);
    }
  };

  const handleUseThisTemplate = async (template: any) => {
    if (useThisLoadingId !== null) return;
    try {
      setUseThisLoadingId(template.id);
      if (template.is_full_editor) {
        const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
        const res = await fetch('/api/full-editor/templates/duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            id: template.id,
            name: `${template.display_name || template.name} ${t('editor_copy_suffix')}`,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { message?: string; error?: string }).message || (j as { error?: string }).error || 'Template not found');
        }
        const newTemplate = await res.json();
        const newId = newTemplate?.id;
        if (newId) {
          router.push(`${localePath('/sistem')}?templateId=${newId}`);
        } else {
          toast.showSuccess(t('templates_use_success'));
          loadTemplates();
        }
        return;
      }
      const newTemplate = await apiClient(`/templates/${template.id}/duplicate`, {
        method: 'POST',
        body: {
          name: `template_${Date.now()}`,
          display_name: `${template.display_name} ${t('editor_copy_suffix')}`,
          description: template.description || '',
        },
      });
      const newId = newTemplate?.id;
      if (newId) {
        if (newTemplate?.canvas_design) {
          router.push(`${localePath('/editor')}?templateId=${newId}`);
        } else {
          router.push(localePath(`/templates/${newId}/edit`));
        }
      } else {
        toast.showSuccess(t('templates_use_success'));
        loadTemplates();
      }
    } catch (err: any) {
      console.error('Error using template:', err);
      toast.showError(t('templates_use_failed') + ': ' + (err?.message || t('common_error')));
    } finally {
      setUseThisLoadingId(null);
    }
  };

  const handleCopyToSystem = async (template: any) => {
    const newName = prompt(t('templates_copy_to_system_prompt', { name: template.display_name }), template.display_name);
    if (newName == null || !newName.trim()) return;

    try {
      setCopyToSystemLoadingId(template.id);
      await apiClient(`/templates/${template.id}/copy-to-system`, {
        method: 'POST',
        body: { name: newName.trim() },
      });
      toast.showSuccess(t('templates_copy_to_system_success'));
      loadTemplates();
    } catch (err: any) {
      console.error('Error copying to system:', err);
      toast.showError(t('templates_copy_to_system_failed') + ': ' + (err?.message || t('common_error')));
    } finally {
      setCopyToSystemLoadingId(null);
    }
  };

  const openDeleteConfirm = (template: any) => {
    const scope = (template.scope || '').toString().toLowerCase();
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    if (scope === 'system' && !isAdmin) {
      toast.showWarning(t('templates_system_no_delete'));
      return;
    }
    setDeleteConfirmTemplate(template);
  };

  const confirmDeleteTemplate = async () => {
    const template = deleteConfirmTemplate;
    if (!template) return;
    setDeleteConfirmTemplate(null);

    const templateId = String(template.id);
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    try {
      const isFullEditor = !!template.is_full_editor;
      const res = isFullEditor
        ? await fetch(`/api/full-editor/templates?id=${encodeURIComponent(templateId)}`, { method: 'DELETE', headers })
        : await fetch(`/api/proxy/templates/${templateId}`, { method: 'DELETE', headers });
      const text = await res.text();
      let data: { message?: string; error?: string } = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (text) data = { message: text };
      }

      if (!res.ok) {
        const msg = data?.message || data?.error || res.statusText || t('templates_delete_failed');
        toast.showError(`${t('templates_delete_failed')} (${res.status}): ${msg}`);
        return;
      }

      setUserTemplates((prev) => prev.filter((t) => String(t.id).toLowerCase() !== templateId.toLowerCase()));
      setSystemTemplates((prev) => prev.filter((t) => String(t.id).toLowerCase() !== templateId.toLowerCase()));
      toast.showSuccess(t('templates_deleted'));
    } catch (err: any) {
      toast.showError(t('templates_delete_failed') + ': ' + (err?.message || t('common_error')));
    }
  };

  const handleRenameTemplate = async (template: any) => {
    const newName = prompt(t('templates_rename_prompt'), template.display_name || template.name || '');
    if (newName == null || String(newName).trim() === '') return;
    const trimmed = String(newName).trim();
    try {
      if (template.is_full_editor) {
        const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;
        const res = await fetch('/api/full-editor/templates', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ id: template.id, name: trimmed }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error((j as { error?: string; detail?: string }).error || (j as { message?: string }).message || res.statusText);
        }
      } else {
        await apiClient(`/templates/${template.id}`, {
          method: 'PATCH',
          body: { display_name: trimmed },
        });
      }
      toast.showSuccess(t('templates_rename_success'));
      loadTemplates();
    } catch (err: any) {
      toast.showError(t('templates_rename_failed') + ': ' + (err?.message || t('common_error')));
    }
  };

  const getProfessionalGridLayout = (blockCount: number) => {
    if (blockCount <= 0) return { cols: 2, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 1) return { cols: 1, rows: 1, gap: '0px', specialLayout: false };
    if (blockCount === 2) return { cols: 2, rows: 1, gap: '2px', specialLayout: false };
    if (blockCount === 3) return { cols: 2, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 4) return { cols: 2, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 5) return { cols: 3, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 6) return { cols: 3, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 7) return { cols: 4, rows: 2, gap: '2px', specialLayout: true };
    if (blockCount === 8) return { cols: 4, rows: 2, gap: '2px', specialLayout: false };
    if (blockCount === 9) return { cols: 3, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 12) return { cols: 4, rows: 3, gap: '2px', specialLayout: false };
    if (blockCount === 16) return { cols: 4, rows: 4, gap: '2px', specialLayout: false };
    const cols = Math.ceil(Math.sqrt(blockCount * 16 / 9));
    const rows = Math.ceil(blockCount / cols);
    return { cols, rows, gap: '2px', specialLayout: false };
  };

  const renderTemplatePreview = (template: any, opts?: { live?: boolean }) => {
    const blocks = templateBlocks[template.id] || [];
    const contents = templateContents[template.id] || [];
    const blockCount = blocks.length || template.block_count || 0;

    if (opts?.live && blocks.length > 0) {
      const sortedBlocks = [...blocks].sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
      const screenBlocks = sortedBlocks.map((tb: any) => ({
        id: tb.id,
        template_block_id: tb.id,
        block_index: tb.block_index ?? 0,
        position_x: tb.position_x ?? 0,
        position_y: tb.position_y ?? 0,
        width: tb.width ?? 100,
        height: tb.height ?? 100,
        z_index: tb.z_index ?? 0,
        animation_type: tb.animation_type ?? 'fade',
        animation_duration: tb.animation_duration ?? 500,
        animation_delay: tb.animation_delay ?? 0,
      }));
      const blockContents = contents.map((c: any) => ({
        ...c,
        screen_block_id: c.template_block_id,
      }));
      const screenData = {
        screen: {
          id: 'preview',
          animation_type: 'fade',
          animation_duration: 500,
          frame_type: 'none',
          ticker_text: '',
        },
        template,
        screenBlocks,
        blockContents,
      };
      return (
        <TemplateDisplay
          screenData={screenData as any}
          animationType="fade"
          animationDuration={500}
          inline
        />
      );
    }

    if (template.preview_image_url) {
      return (
        <img
          src={resolveMediaUrl(template.preview_image_url)}
          alt=""
          className="w-full h-full object-contain"
          style={{ objectFit: 'contain', objectPosition: 'center' }}
          loading="lazy"
          decoding="async"
        />
      );
    }

    if (template.is_full_editor && template.canvas_json && typeof template.canvas_json === 'object') {
      return (
        <div className="w-full h-full flex items-center justify-center">
          <FullEditorPreviewThumb canvasJson={template.canvas_json} />
        </div>
      );
    }

    if (blocks.length === 0) {
      const count = template.block_count || 0;
      if (count <= 0) {
        return (
          <div className="w-full h-full flex items-center justify-center bg-gray-800/80 text-white/80 text-xs">
            {t('common_loading')}
          </div>
        );
      }
      const gridLayout = getProfessionalGridLayout(count);
      return (
        <div
          className="w-full h-full bg-black p-1"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
            gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            gap: gridLayout.gap,
          }}
        >
          {Array.from({ length: count }, (_, index) => {
            const shouldSpanRows = gridLayout.specialLayout && ((count === 3 && index === 2) || (count === 5 && index === 2));
            const shouldSpanCols = (count === 3 && index === 2) || (count === 7 && index === 6);
            return (
              <div
                key={index}
                className="bg-gray-700 rounded-sm border border-gray-600"
                style={{
                  gridRow: shouldSpanRows ? 'span 2' : 'auto',
                  gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                }}
              />
            );
          })}
        </div>
      );
    }

    const sortedBlocks = [...blocks].sort((a, b) => (a.block_index ?? 0) - (b.block_index ?? 0));
    const gridLayout = getProfessionalGridLayout(blockCount);

    return (
      <div
        className="w-full h-full bg-black p-1"
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
          gap: gridLayout.gap,
        }}
      >
        {sortedBlocks.map((block: any, index: number) => {
          const blockId = block.id || block.template_block_id;
          const blockContentsList = contents.filter(
            (c: any) => c.template_block_id === blockId || c.screen_block_id === blockId
          );
          const videoContent = blockContentsList.find((c: any) => c.content_type === 'video');
          const imageContent = blockContentsList.find((c: any) => (c.content_type === 'image' || c.image_url) && c.content_type !== 'video');
          const badgeContent = blockContentsList.find((c: any) => c.content_type === 'campaign_badge' || c.campaign_text);

          const is3BlockLast = blockCount === 3 && index === 2;
          const is5BlockThird = blockCount === 5 && index === 2;
          const is7BlockLast = blockCount === 7 && index === 6;
          const shouldSpanRows = gridLayout.specialLayout && (is3BlockLast || is5BlockThird);
          const shouldSpanCols = is7BlockLast;

          const bgImage = block.style_config
            ? (typeof block.style_config === 'string'
                ? (() => { try { return JSON.parse(block.style_config)?.background_image; } catch { return null; } })()
                : block.style_config?.background_image)
            : null;

          let previewImageUrl: string | null = null;
          if (imageContent?.image_url) {
            try {
              const sc = imageContent.style_config
                ? (typeof imageContent.style_config === 'string'
                    ? JSON.parse(imageContent.style_config)
                    : imageContent.style_config)
                : {};
              const ir = sc?.imageRotation;
              if (ir?.rotationItems?.length > 0 && ir.rotationItems[0]?.url) {
                previewImageUrl = ir.rotationItems[0].url;
              } else {
                previewImageUrl = imageContent.image_url;
              }
            } catch {
              previewImageUrl = imageContent.image_url;
            }
          }

          return (
            <div
              key={block.id || blockId || index}
              className="relative bg-gray-800 rounded overflow-hidden"
              style={{
                gridRow: shouldSpanRows ? 'span 2' : 'auto',
                gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                backgroundImage: bgImage ? `url(${resolveMediaUrl(bgImage)})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {videoContent?.image_url && (
                <video
                  src={resolveMediaUrl(videoContent.image_url)}
                  className="w-full h-full object-cover"
                  muted
                  playsInline
                  preload="metadata"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    imageRendering: 'auto',
                    backfaceVisibility: 'hidden',
                  }}
                  onLoadedData={(e) => {
                    const v = e.target as HTMLVideoElement;
                    if (v.duration > 0) v.currentTime = Math.min(0.5, v.duration * 0.1);
                  }}
                />
              )}
              {!videoContent && previewImageUrl && (
                <img
                  src={resolveMediaUrl(previewImageUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center',
                    imageRendering: 'auto',
                    backfaceVisibility: 'hidden',
                  }}
                  loading="lazy"
                  decoding="async"
                />
              )}
              {badgeContent && badgeContent.campaign_text && (
                <div className="absolute top-1 left-1 z-10">
                  <span
                    className="px-2 py-1 rounded text-xs font-bold shadow-lg badge-pulse"
                    style={{
                      backgroundColor: badgeContent.background_color || '#3B82F6',
                      color: badgeContent.text_color || '#FFFFFF',
                    }}
                  >
                    {badgeContent.campaign_text}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const LoadingScreen = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="text-xl font-medium text-white mb-2">{t('common_loading')}</div>
      </div>
    </div>
  );

  if (loading) return React.createElement(LoadingScreen);
  return React.createElement(TemplatesLibraryBody, {
    t,
    localePath,
    error,
    mode,
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
  });
}
