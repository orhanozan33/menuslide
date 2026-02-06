'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { TemplateDisplay } from '@/components/display/TemplateDisplay';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';
import { resolveMediaUrl } from '@/lib/resolveMediaUrl';

interface User {
  id: string;
  email: string;
  role: string;
  business_name?: string;
}

function TemplatesLibraryContent() {
  const router = useRouter();
  const { t, localePath } = useTranslation();
  const toast = useToast();

  const getTemplateDisplayName = (name: string) => {
    if (!name) return '';
    // Backend'den gelen "X bloklu şablon" kalıbını algıla ve çevir
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
    // Backend'den gelen "X kare (grid) düzen. Sistem şablonu." kalıbını algıla ve çevir
    const descMatch = desc.match(/^(\d+)\s*kare\s*\(grid\)\s*düzen/i);
    if (descMatch) {
      const blockCount = descMatch[1];
      return t('template_block_desc').replace('{n}', blockCount);
    }
    return desc;
  };
  const [userTemplates, setUserTemplates] = useState<any[]>([]);
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
  /** Önizleme açıldığında bloklar henüz yoksa yüklenene kadar true */
  const [previewBlocksLoading, setPreviewBlocksLoading] = useState(false);
  /** true = önizleme tam ekran (TV gibi), false = modal içinde 16:9 kutu */
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  /** Sil onay modalı: gösterilecek şablon veya null */
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any | null>(null);
  /** Sadece tıklanan şablonun butonu yükleniyor gösterir (template id veya null) */
  const [useThisLoadingId, setUseThisLoadingId] = useState<string | null>(null);
  /** Yeni blok (sistem şablonu) oluştur modalı - sadece admin/super_admin */
  const [showCreateSystemModal, setShowCreateSystemModal] = useState(false);
  const [createSystemBlockCounts, setCreateSystemBlockCounts] = useState<number[]>([1, 2, 4]);
  const [createSystemCountPerType, setCreateSystemCountPerType] = useState(1);
  const [createSystemLoading, setCreateSystemLoading] = useState(false);
  /** Blok birleştirme seçenekleri: sol, orta, orta_sol, orta_sağ, orta_2_tek, sağ — birden fazla seçilebilir */
  const [createSystemMergeOptions, setCreateSystemMergeOptions] = useState<Record<number, ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right')[]>>({});
  /** Tüm blok kombinasyonları: 1–9, 12, 16 kare */
  const ALL_BLOCK_COMBINATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 12, 16];
  const gridLabel = (n: number) => {
    const key = `templates_grid_${n}` as const;
    const translated = t(key);
    return translated !== key ? translated : `${n} ${t('templates_grid_unit')}`;
  };

  /** Bir veya birden fazla merge seçeneğine göre blok stilleri (önizleme için) */
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

  /** Seçilen blok sayısına göre grid cols/rows (önizleme için) */
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

  const searchParams = useSearchParams();
  
  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');

      // URL'den user_id parametresini kontrol et
      const userIdFromUrl = searchParams?.get('user_id');
      const effectiveUserId = userIdFromUrl || selectedUserId;

      // Admin başka bir kullanıcının template'lerini görebilir
      const userIdParam = (userRole === 'super_admin' || userRole === 'admin') && effectiveUserId
        ? `?user_id=${effectiveUserId}`
        : '';

      // Kullanıcı (benim) template'leri
      let userData: any[] = [];
      try {
        userData = await apiClient(`/templates/scope/user${userIdParam}`) || [];
        if (!Array.isArray(userData)) userData = [];
      } catch (err: any) {
        console.warn('User scope failed, falling back:', err);
        const allTemplates = await apiClient(`/templates${userIdParam}`);
        userData = Array.isArray(allTemplates)
          ? allTemplates.filter((t: any) => t.scope === 'user' || !t.scope || t.is_system === false)
          : [];
      }

      setUserTemplates(userData);

      const allTemplates = userData;

      // Sayfa hemen açılsın; blok/içerik arka planda yüklensin (N+1 istekleri gecikmeyi önler)
      setLoading(false);

      if (allTemplates.length > 0) {
        loadBlocksAndContentsForTemplates(allTemplates);
      }
    } catch (err: any) {
      console.error('Error loading templates:', err);
      const errorMsg = err?.data?.message || err?.message || t('templates_load_failed');
      setError(`${t('common_error')}: ${errorMsg}`);
      setLoading(false);
    }
  };

  /** Şablonların blok ve içeriklerini yükler (arka planda veya önizleme açılırken). */
  const loadBlocksAndContentsForTemplates = async (templatesList: any[]) => {
    if (templatesList.length === 0) return;
    const blocksMap: { [key: string]: any[] } = {};
    const contentsMap: { [key: string]: any[] } = {};

    await Promise.all(
      templatesList.map(async (template: any) => {
        try {
          const blocks = await apiClient(`/templates/${template.id}/blocks`);
          const blocksList = blocks || [];
          blocksMap[template.id] = blocksList;
          const contentPromises = blocksList.map(async (block: any) => {
            try {
              const blockContents = await apiClient(`/template-block-contents/block/${block.id}`);
              return Array.isArray(blockContents) ? blockContents : [];
            } catch (e) {
              return [];
            }
          });
          const allContents = await Promise.all(contentPromises);
          contentsMap[template.id] = allContents.flat();
        } catch (e) {
          blocksMap[template.id] = [];
          contentsMap[template.id] = [];
        }
      })
    );

    setTemplateBlocks((prev) => ({ ...prev, ...blocksMap }));
    setTemplateContents((prev) => ({ ...prev, ...contentsMap }));
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
    // Kullanıcı rolünü kontrol et
    const userStr = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setUserRole(user.role || '');
        
        // Admin ise kullanıcı listesini yükle
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
  }, []);

  useEffect(() => {
    // Kullanıcı seçimi değiştiğinde template'leri yeniden yükle
    if (userRole) {
      loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, userRole]);

  useEffect(() => {
    if (!previewTemplate) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewFullscreen(false);
        setPreviewTemplate(null);
      }
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
      // Template'i uygula
      await apiClient('/templates/apply', {
        method: 'POST',
        body: {
          template_id: selectedTemplate.id,
          screen_id: selectedScreenId,
          keep_content: keepContent,
        },
      });

      // Eğer yayınla seçildiyse ekranı aktif hale getir
      if (publishScreen) {
        await apiClient(`/screens/${selectedScreenId}`, {
          method: 'PATCH',
          body: {
            is_active: true,
          },
        });
      }

      toast.showSuccess(publishScreen 
        ? t('templates_apply_success') 
        : t('templates_apply_success_alt'));
      setShowApplyModal(false);
      setSelectedTemplate(null);
      setPublishScreen(true); // Reset
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

  /** Kullanıcı: sistem şablonunu kopyalar ve düzenleme sayfasına gider. Sadece tıklanan kartın id'si loading olur. */
  const handleUseThisTemplate = async (template: any) => {
    if (useThisLoadingId !== null) return;
    try {
      setUseThisLoadingId(template.id);
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
        // Canvas tasarım şablonları tasarım editöründe açılır; diğerleri blok editöründe
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

  /** Sil butonuna basınca sadece onay modalını açar. Super admin/admin sistem şablonunu silebilir. */
  const openDeleteConfirm = (e: React.MouseEvent, template: any) => {
    e.preventDefault();
    e.stopPropagation();
    const scope = (template.scope || '').toString().toLowerCase();
    const isAdmin = userRole === 'super_admin' || userRole === 'admin';
    if (scope === 'system' && !isAdmin) {
      toast.showWarning(t('templates_system_no_delete'));
      return;
    }
    setDeleteConfirmTemplate(template);
  };

  /** Onay modalında Evet: API ile sil ve modalı kapat */
  const confirmDeleteTemplate = async () => {
    const template = deleteConfirmTemplate;
    if (!template) return;
    setDeleteConfirmTemplate(null);

    const templateId = String(template.id);
    const apiUrl = '/api/proxy';
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token')) : null;

    try {
      const res = await fetch(`${apiUrl}/templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
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
      toast.showSuccess(t('templates_deleted'));
    } catch (err: any) {
      toast.showError(t('templates_delete_failed') + ': ' + (err?.message || t('common_error')));
    }
  };

  const handleCreateMenuFromTemplate = async (template: any) => {
    if (!confirm(t('templates_menu_confirm', { name: template.display_name }))) {
      return;
    }

    try {
      const menuResult = await apiClient(`/templates/${template.id}/create-menu-from-products`, {
        method: 'POST',
      });

      if (menuResult && menuResult.menu) {
        toast.showSuccess(t('templates_menu_success', { count: menuResult.productsCount || 0, name: menuResult.menu.name }));
        setTimeout(() => {
          router.push(localePath('/menus'));
        }, 1000);
      } else {
        toast.showSuccess(t('templates_menu_success', { count: menuResult?.productsCount || 0, name: menuResult?.menu?.name || '' }));
      }
    } catch (err: any) {
      console.error('❌ Menü oluşturma hatası:', err);
      console.error('Hata detayları:', {
        message: err?.message,
        status: err?.status,
        data: err?.data,
      });
      const errorMsg = err?.data?.message || err?.message || t('common_error');
      toast.showError(`${t('templates_menu_failed')}: ${errorMsg}`);
    }
  };

  // Template önizlemesi için grid layout hesaplama
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

  // Template önizlemesi render fonksiyonu (kart görseli) — düzenleme sayfasındaki grid ve sıra ile uyumlu
  const renderTemplatePreview = (template: any) => {
    // Canvas tasarım veya önizleme URL varsa doğrudan göster
    if (template.preview_image_url) {
      return (
        <img
          src={resolveMediaUrl(template.preview_image_url)}
          alt=""
          className="w-full h-full object-contain"
          style={{ objectFit: 'contain', objectPosition: 'center' }}
          loading="lazy"
        />
      );
    }

    const blocks = templateBlocks[template.id] || [];
    const contents = templateContents[template.id] || [];
    const blockCount = blocks.length || template.block_count || 0;

    // Bloklar henüz yüklenmediyse veya şablon blok içermiyorsa placeholder
    if (blocks.length === 0) {
      const count = template.block_count || 0;
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-800/80 text-white/80 text-xs">
          {count > 0 ? `${count} ${t('screens_blocks')}` : t('common_loading')}
        </div>
      );
    }

    // TemplateDisplay ile aynı sıra: block_index'e göre sırala
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

          // TemplateDisplay ile aynı span mantığı: 3/5/7 blokta belirli index span alır
          const is3BlockLast = blockCount === 3 && index === 2;
          const is5BlockThird = blockCount === 5 && index === 2;
          const is7BlockLast = blockCount === 7 && index === 6;
          const shouldSpanRows = gridLayout.specialLayout && (is3BlockLast || is5BlockThird);
          const shouldSpanCols = is3BlockLast || is7BlockLast;

          const styleConfig = block.style_config
            ? (typeof block.style_config === 'string'
                ? (() => { try { return JSON.parse(block.style_config) ?? {}; } catch { return {}; } })()
                : block.style_config) ?? {}
            : {};
          const bgImage = styleConfig?.background_image ?? styleConfig?.backgroundImage ?? null;
          const bgColor =
            styleConfig?.background_color ?? styleConfig?.backgroundColor
            ?? imageContent?.background_color ?? videoContent?.background_color
            ?? blockContentsList[0]?.background_color ?? '#ffffff';
          const hasContent = !!(videoContent?.image_url || imageContent?.image_url);
          const blockBgColor = hasContent ? bgColor : '#ffffff';

          // Resim: image_rotation varsa ilk resim (rotationItems[0].url veya image_url)
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
              className="relative rounded overflow-hidden min-w-0 min-h-0"
              style={{
                gridRow: shouldSpanRows ? 'span 2' : 'auto',
                gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                backgroundColor: blockBgColor,
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="text-xl font-medium text-white mb-2">{t('common_loading')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 overflow-x-hidden">
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-4 md:p-6 min-w-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">{t('templates_title')}</h1>
            <div className="flex flex-row gap-2 w-full md:w-auto min-w-0">
              <Link
                href={localePath('/templates/new')}
                className="flex-1 md:flex-initial min-w-0 text-center px-2 md:px-4 py-2 md:py-2.5 min-h-[44px] md:min-h-0 flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 active:from-blue-700 active:to-purple-700 font-semibold gap-1 md:gap-2 touch-manipulation"
              >
                <span>✨</span>
                <span className="truncate text-xs md:text-sm">{t('templates_new')}</span>
              </Link>
            </div>
          </div>

          {/* Benim şablonlarım başlığı */}
          <div className="mb-4 pb-2 border-b border-gray-200 min-w-0">
            <span className="text-base font-semibold text-gray-800">📁 {t('templates_mine')} ({userTemplates.length})</span>
          </div>

          {/* Admin için kullanıcı seçimi */}
          {(userRole === 'super_admin' || userRole === 'admin') && (
            <div className="mb-4 p-3 md:p-4 bg-blue-50 rounded-lg border border-blue-200 min-w-0 overflow-hidden">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                👤 {t('templates_select_user')}
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-4 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 touch-manipulation"
              >
                <option value="">{t('templates_all_users')}</option>
                {users
                  .filter((user) => user.business_name)
                  .map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.business_name} - {user.email}
                    </option>
                  ))}
              </select>
              <p className="text-xs text-gray-600 mt-2">
                {selectedUserId
                  ? t('templates_showing_user')
                  : t('templates_showing_all')}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 md:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Template Grid */}
          {userTemplates.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <p className="text-gray-600 text-lg">
                {t('templates_no_mine')}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                {t('templates_create_hint')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 md:gap-10 min-w-0">
              {userTemplates.map((template) => {
                const isAdmin = userRole === 'super_admin' || userRole === 'admin';
                const isSystemForUser = false;
                return (
                  <div
                    key={template.id}
                    className="group flex flex-col items-center bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden min-w-0 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* TV çerçevesi — ana sayfa Live Channels ile aynı görünüm */}
                    <div
                      className="flex justify-center w-full cursor-pointer flex-shrink-0"
                      role="button"
                      tabIndex={0}
                      onClick={async (e) => {
                        e.stopPropagation();
                        const hasBlocks = (templateBlocks[template.id] || []).length > 0;
                        if (!hasBlocks) {
                          setPreviewTemplate(template);
                          setPreviewBlocksLoading(true);
                          await loadBlocksAndContentsForTemplates([template]);
                          setPreviewBlocksLoading(false);
                        } else {
                          setPreviewTemplate(template);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const hasBlocks = (templateBlocks[template.id] || []).length > 0;
                          if (!hasBlocks) {
                            setPreviewTemplate(template);
                            setPreviewBlocksLoading(true);
                            loadBlocksAndContentsForTemplates([template]).then(() => setPreviewBlocksLoading(false));
                          } else {
                            setPreviewTemplate(template);
                          }
                        }
                      }}
                    >
                      <div className="relative w-full max-w-sm transition-transform duration-300 group-hover:scale-[1.02]">
                        <img
                          src="https://sony.scene7.com/is/image/sonyglobalsolutions/TVFY24_UH_12_Beauty_I_M?fmt=png-alpha&wid=500"
                          alt=""
                          className="w-full h-auto block"
                        />
                        <div
                          className="absolute overflow-hidden rounded-[0.3rem] bg-black"
                          style={{ top: '8%', left: '5.5%', right: '5.5%', bottom: '18%' }}
                        >
                          <div className="absolute inset-0 w-full h-full">
                            {renderTemplatePreview(template)}
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {/* Info ve butonlar */}
                    <div className="w-full p-3 md:p-4 flex-shrink-0" style={{ pointerEvents: 'auto' }}>
                      <h3 className="font-bold text-base md:text-lg text-gray-900 mb-1 truncate">
                        {getTemplateDisplayName(template.display_name)}
                      </h3>
                      {template.description && (
                        <p className="text-xs md:text-sm text-gray-600 mb-2 line-clamp-2">
                          {getTemplateDescription(template.description)}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs md:text-sm text-gray-500 mb-3">
                        <span>{template.block_count} {t('screens_blocks')}</span>
                        {template.scope === 'user' && template.created_at && (
                          <span className="shrink-0">
                            {new Date(template.created_at).toLocaleDateString('tr-TR')}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-wrap relative z-10">
                        {isSystemForUser ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUseThisTemplate(template);
                            }}
                            disabled={useThisLoadingId !== null}
                            className="w-full px-4 py-2.5 min-h-[44px] md:min-h-0 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-700 transition-colors text-sm font-semibold disabled:opacity-50 touch-manipulation"
                            title={t('templates_use_hint')}
                          >
                            {useThisLoadingId === template.id ? t('btn_loading') : `✓ ${t('templates_use_this')}`}
                          </button>
                        ) : (
                          <>
                            <Link
                                  href={localePath(`/templates/${template.id}/edit`)}
                                  className="flex-1 min-w-[70px] px-3 py-2.5 min-h-[44px] md:min-h-0 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 active:bg-amber-200 transition-colors text-sm font-semibold flex items-center justify-center touch-manipulation"
                                  title={t('btn_edit')}
                                >
                                  ✏️ {t('btn_edit')}
                                </Link>
                                <button
                                  onClick={() => handleDuplicateTemplate(template)}
                                  className="flex-1 min-w-[70px] px-3 py-2.5 min-h-[44px] md:min-h-0 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 active:bg-gray-300 transition-colors text-sm font-semibold touch-manipulation"
                                  title={t('btn_copy')}
                                >
                                  📋 {t('btn_copy')}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => openDeleteConfirm(e, template)}
                                  className="flex-1 min-w-[70px] px-3 py-2.5 min-h-[44px] md:min-h-0 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:bg-red-200 transition-colors text-sm font-semibold touch-manipulation"
                                  title={t('btn_delete')}
                                  aria-label={t('btn_delete')}
                                >
                                  🗑️ {t('btn_delete')}
                                </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Yeni blok (sistem şablonu) oluştur modalı - solda blok tipleri, sağda önizleme */}
      {showCreateSystemModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[100] p-0 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-label={t('templates_create_modal_title')}
        >
          <div
            className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-1">{t('templates_create_modal_title')}</h3>
            <p className="text-xs sm:text-sm text-gray-600 mb-4">{t('templates_create_modal_desc')}</p>

            {/* Önizleme — seçilen blok(lar) veya boş */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">{t('templates_preview')}</label>
              <div className="bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 min-h-[200px] flex items-center justify-center aspect-video overflow-hidden">
                {createSystemBlockCounts.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center px-4">{t('templates_preview_empty')}</p>
                ) : (
                  (() => {
                    const activeBlock = createSystemBlockCounts[0];
                    const { cols, rows } = getPreviewGrid(activeBlock);
                    const styles = getMergedBlockStyles(activeBlock, createSystemMergeOptions[activeBlock] || []);
                    return (
                      <div
                        className="rounded-lg overflow-hidden border-2 border-amber-500/70 bg-slate-800 shadow flex items-center justify-center w-full h-full p-2"
                        style={{ aspectRatio: `${cols} / ${rows}`, maxWidth: '100%', maxHeight: '100%' }}
                      >
                        <div
                          className="h-full w-full"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${cols}, 1fr)`,
                            gridTemplateRows: `repeat(${rows}, 1fr)`,
                            gap: 4,
                            padding: 4,
                            minWidth: 60,
                            minHeight: 40,
                          }}
                        >
                          {styles.map((s, i) => (
                            <div key={i} className="bg-slate-600 rounded-sm" style={s} />
                          ))}
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* Blok seçimleri — önizleme altında */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">{t('templates_block_combo')}</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { n: 1, label: t('templates_block_small'), icon: '■', key: '1' },
                    { n: 2, label: t('templates_block_horizontal'), icon: '▬▬', key: '2h' },
                    { n: 2, label: t('templates_block_vertical'), icon: '▮▮', key: '2v' },
                    { n: 4, label: gridLabel(4), icon: '▦', key: '4' },
                    { n: 6, label: gridLabel(6), icon: '▧', key: '6' },
                    { n: 8, label: gridLabel(8), icon: '▨', key: '8' },
                    { n: 9, label: gridLabel(9), icon: '▩', key: '9' },
                    { n: 12, label: gridLabel(12), icon: '⬚', key: '12' },
                    { n: 16, label: gridLabel(16), icon: '⬛', key: '16' },
                  ].map((item) => {
                    const key = item.key;
                    const isSelected = createSystemBlockCounts.includes(item.n);
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          const isRemoving = createSystemBlockCounts.includes(item.n);
                          const nextCounts = isRemoving
                            ? createSystemBlockCounts.filter((x) => x !== item.n)
                            : [...createSystemBlockCounts, item.n].sort((a, b) => a - b);
                          setCreateSystemBlockCounts(nextCounts);
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors touch-manipulation ${
                          isSelected ? 'bg-amber-600 text-white ring-2 ring-amber-500 ring-offset-2' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-200'
                        }`}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const all = [1, 2, 4, 6, 8, 9, 12, 16];
                      setCreateSystemBlockCounts(createSystemBlockCounts.length === all.length ? [] : all);
                    }}
                    className="px-3 py-2 rounded-lg text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium touch-manipulation"
                  >
                    {createSystemBlockCounts.length >= 8 ? t('templates_select_none') : t('templates_select_all')}
                  </button>
                </div>
              </div>

              {/* Blok birleştir — seçili çok bloklu tipler için */}
              {createSystemBlockCounts.some((n) => getPreviewGrid(n).cols >= 2) && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">{t('templates_merge_label')}</label>
                  <div className="flex flex-wrap gap-2">
                    {createSystemBlockCounts.filter((n) => getPreviewGrid(n).cols >= 2).map((blockCount) => {
                      const { cols } = getPreviewGrid(blockCount);
                      const hasMiddle = cols >= 3;
                      const hasTwoMiddles = cols >= 4;
                      const mergeOptions: ('left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_both' | 'middle_2_as_one' | 'right')[] = ['left'];
                      if (hasTwoMiddles) {
                        mergeOptions.push('middle_left', 'middle_right', 'middle_both', 'middle_2_as_one');
                      } else if (hasMiddle) {
                        mergeOptions.push('middle');
                      }
                      mergeOptions.push('right');
                      const merges = createSystemMergeOptions[blockCount] || [];
                      const middleBothActive = hasTwoMiddles && merges.includes('middle_left') && merges.includes('middle_right');
                      const middle2AsOneActive = hasTwoMiddles && merges.includes('middle_2_as_one');
                      return (
                      <div key={blockCount} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-500">{gridLabel(blockCount)}:</span>
                        {mergeOptions.map((m) => {
                          if (m === 'middle_both') {
                            return (
                              <button
                                key={`${blockCount}-${m}`}
                                type="button"
                                onClick={() => {
                                  type MergeOpt = 'left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right';
                                  setCreateSystemMergeOptions((p) => {
                                    const cur: MergeOpt[] = p[blockCount] || [];
                                    if (middleBothActive) {
                                      return { ...p, [blockCount]: cur.filter((x): x is MergeOpt => x !== 'middle_left' && x !== 'middle_right') };
                                    }
                                    const next: MergeOpt[] = [...cur.filter((x) => x !== 'middle_left' && x !== 'middle_right' && x !== 'middle_2_as_one'), 'middle_left', 'middle_right'];
                                    return { ...p, [blockCount]: next };
                                  });
                                }}
                                className={`px-2 py-1.5 rounded text-xs font-medium ${middleBothActive ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                {t('templates_merge_middle_both')}
                              </button>
                            );
                          }
                          if (m === 'middle_2_as_one') {
                            return (
                              <button
                                key={`${blockCount}-${m}`}
                                type="button"
                                onClick={() => {
                                  type MergeOpt = 'left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right';
                                  setCreateSystemMergeOptions((p) => {
                                    const cur: MergeOpt[] = p[blockCount] || [];
                                    if (middle2AsOneActive) {
                                      return { ...p, [blockCount]: cur.filter((x): x is MergeOpt => x !== 'middle_2_as_one') };
                                    }
                                    const next: MergeOpt[] = [...cur.filter((x) => x !== 'middle_left' && x !== 'middle_right' && x !== 'middle_2_as_one'), 'middle_2_as_one'];
                                    return { ...p, [blockCount]: next };
                                  });
                                }}
                                className={`px-2 py-1.5 rounded text-xs font-medium ${middle2AsOneActive ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                              >
                                {t('templates_merge_middle_2_as_one')}
                              </button>
                            );
                          }
                          const active = merges.includes(m);
                          return (
                            <button
                              key={`${blockCount}-${m}`}
                              type="button"
                              onClick={() => {
                                setCreateSystemMergeOptions((p) => {
                                  type MergeOpt = 'left' | 'middle' | 'middle_left' | 'middle_right' | 'middle_2_as_one' | 'right';
                                  const cur: MergeOpt[] = p[blockCount] || [];
                                  const next: MergeOpt[] = active ? cur.filter((x): x is MergeOpt => x !== m) : [...cur.filter((x) => x !== 'middle_2_as_one'), m as MergeOpt];
                                  return { ...p, [blockCount]: next };
                                });
                              }}
                              className={`px-2 py-1.5 rounded text-xs font-medium ${active ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                              {m === 'left' ? t('templates_merge_left') : m === 'middle' ? t('templates_merge_middle') : m === 'middle_left' ? t('templates_merge_middle_left') : m === 'middle_right' ? t('templates_merge_middle_right') : t('templates_merge_right')}
                            </button>
                          );
                        })}
                      </div>
                    );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">{t('templates_per_type')}</label>
                  <select
                    value={createSystemCountPerType}
                    onChange={(e) => setCreateSystemCountPerType(Number(e.target.value))}
                    className="px-3 py-2 text-base border border-gray-300 rounded-lg text-sm"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} {t('templates_count')}</option>
                    ))}
                  </select>
                </div>
                {createSystemBlockCounts.length > 0 && (() => {
                  const unique = Array.from(new Set(createSystemBlockCounts));
                  return (
                    <p className="text-sm text-gray-500 self-end pb-1">
                      {t('templates_selected_info', { n: unique.length, total: unique.length * createSystemCountPerType })}
                    </p>
                  );
                })()}
              </div>
            </div>

            <div className="flex gap-3 justify-end mt-4 pt-4 border-t border-gray-200">
              <button type="button" onClick={() => setShowCreateSystemModal(false)} className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg active:bg-gray-300 font-semibold touch-manipulation">
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                disabled={createSystemBlockCounts.length === 0 || createSystemLoading}
                onClick={async () => {
                  if (createSystemBlockCounts.length === 0) return;
                  setCreateSystemLoading(true);
                  try {
                    const uniqueCounts = Array.from(new Set(createSystemBlockCounts));
                    const mergeOpts: Record<number, string[]> = {};
                    uniqueCounts.forEach((n) => {
                      const arr = createSystemMergeOptions[n];
                      if (arr && arr.length > 0) mergeOpts[n] = arr;
                    });
                    const res = await apiClient('/templates/bulk-system', {
                      method: 'POST',
                      body: { block_counts: uniqueCounts, count_per_type: createSystemCountPerType, merge_options: Object.keys(mergeOpts).length ? mergeOpts : undefined },
                    }) as { count?: number; created?: any[] };
                    await loadTemplates();
                    setShowCreateSystemModal(false);
                    setCreateSystemBlockCounts([1, 2, 4, 6]);
                    setCreateSystemCountPerType(1);
                    setCreateSystemMergeOptions({});
                    const count = res?.count ?? res?.created?.length ?? 0;
                    if (count > 0) toast.showSuccess(t('templates_created_count', { count }));
                  } catch (err: any) {
                    const msg = err?.data?.message || err?.message || t('templates_create_failed');
                    toast.showError(msg);
                  } finally {
                    setCreateSystemLoading(false);
                  }
                }}
                className="flex-1 sm:flex-initial px-5 py-2.5 min-h-[44px] bg-amber-600 text-white rounded-lg active:bg-amber-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {createSystemLoading ? t('templates_creating') : t('templates_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sil onay modalı - Sil butonuna basınca açılır */}
      {deleteConfirmTemplate && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
          role="dialog"
          aria-modal="true"
          aria-label={t('templates_delete_confirm_title')}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('templates_delete_confirm_title')}</h3>
            <p className="text-gray-600 mb-6">
              {t('templates_delete_confirm').replace('{name}', getTemplateDisplayName(deleteConfirmTemplate.display_name))}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg active:bg-gray-300 font-semibold touch-manipulation"
              >
                {t('btn_no')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="flex-1 sm:flex-initial px-4 py-2.5 min-h-[44px] bg-red-600 text-white rounded-lg active:bg-red-700 font-semibold touch-manipulation"
              >
                {t('templates_delete_yes')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Önizleme */}
      {previewTemplate && (() => {
        const blocks = templateBlocks[previewTemplate.id] || [];
        const rawContents = templateContents[previewTemplate.id] || [];
        // Önizlemede Lorem ipsum / placeholder metinleri gizle (amet consectetuer vb.)
        const isPlaceholderText = (s: string) => {
          if (!s || typeof s !== 'string') return false;
          const lower = s.toLowerCase().trim();
          return /lorem\s+ipsum|amet\s+consectetuer|dolor\s+sit\s+amet|consectetuer\s+adipiscing/.test(lower) || (lower.length < 80 && /^[a-z\s]+$/.test(lower) && (lower.includes('amet') || lower.includes('lorem')));
        };
        const sanitizeContent = (c: any): any => {
          if (!c) return c;
          const out = { ...c };
          if (Array.isArray(out.text_layers)) {
            out.text_layers = out.text_layers.map((layer: any) => {
              const l = { ...layer };
              if (l.text && isPlaceholderText(String(l.text))) l.text = '';
              return l;
            });
          }
          if (out.title && isPlaceholderText(String(out.title))) out.title = '';
          return out;
        };
        const contents = rawContents.map(sanitizeContent);
        const screenDataForPreview = {
          screen: { id: '', name: t('editor_preview'), animation_type: 'fade', animation_duration: 500 },
          template: previewTemplate,
          screenBlocks: blocks,
          blockContents: contents,
        };

        const closePreview = () => {
          setPreviewFullscreen(false);
          setPreviewTemplate(null);
          setPreviewBlocksLoading(false);
        };

        if (previewFullscreen) {
          return (
            <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center" role="dialog" aria-modal="true" aria-label={t('editor_tv_preview')}>
              {previewBlocksLoading ? (
                <div className="text-white text-lg">{t('common_loading')}</div>
              ) : previewTemplate.preview_image_url ? (
                <img
                  src={resolveMediaUrl(previewTemplate.preview_image_url)}
                  alt=""
                  className="max-w-full max-h-full object-contain"
                  style={{ aspectRatio: '16/9' }}
                />
              ) : (
                <TemplateDisplay
                  screenData={screenDataForPreview}
                  animationType="fade"
                  animationDuration={500}
                  inline={false}
                />
              )}
              <button
                type="button"
                onClick={closePreview}
                className="fixed top-4 right-4 z-[101] px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold shadow-lg flex items-center gap-2"
                aria-label={t('common_close')}
              >
                ✕ {t('common_close_esc')}
              </button>
            </div>
          );
        }

        return (
          <div
            className="fixed inset-0 bg-black/80 flex flex-col items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-label={t('editor_tv_preview')}
          >
            <div className="w-full max-w-6xl flex flex-col items-center min-h-0 relative">
              {/* Başlık çubuğu: kapatma butonu içeriğin üzerine binmeyecek şekilde sabit üstte */}
              <div className="w-full flex items-center justify-between gap-2 mb-2 px-1 min-w-0 shrink-0 bg-black/40 rounded-t-xl pt-3 pb-2 px-3">
                <h3 className="text-sm sm:text-lg font-bold text-white drop-shadow truncate min-w-0 pr-12">
                  {getTemplateDisplayName(previewTemplate.display_name)}
                  {previewTemplate.description && (
                    <span className="text-sm font-normal text-gray-300 ml-2">
                      — {getTemplateDescription(previewTemplate.description)}
                    </span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={closePreview}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 min-h-[44px] min-w-[44px] rounded-lg bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold text-xl flex items-center justify-center touch-manipulation shadow-lg"
                  aria-label={t('common_close')}
                >
                  ✕
                </button>
              </div>
              <div className="w-full relative rounded-b-lg overflow-hidden shadow-2xl border border-t-0 border-white/20 bg-black" style={{ aspectRatio: '16/9' }}>
                {previewBlocksLoading ? (
                  <div className="absolute inset-0 flex items-center justify-center text-white">{t('common_loading')}</div>
                ) : previewTemplate.preview_image_url ? (
                  <img
                    src={resolveMediaUrl(previewTemplate.preview_image_url)}
                    alt=""
                    className="w-full h-full object-contain"
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <TemplateDisplay
                    screenData={screenDataForPreview}
                    animationType="fade"
                    animationDuration={500}
                    inline
                  />
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3 w-full">
                <button
                  type="button"
                  onClick={() => setPreviewFullscreen(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  📺 {t('templates_fullscreen_tv')}
                </button>
                <p className="text-xs text-gray-400">
                  {t('templates_tv_view_blocks', { count: previewTemplate.block_count ?? blocks.length })}
                </p>
              </div>
              {previewTemplate.scope === 'system' && (userRole !== 'super_admin' && userRole !== 'admin') && (
                <div className="mt-4 w-full max-w-md">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      closePreview();
                      handleUseThisTemplate(previewTemplate);
                    }}
                    disabled={useThisLoadingId !== null}
                    className="w-full px-4 py-3 min-h-[48px] bg-blue-600 text-white rounded-lg active:bg-blue-700 font-semibold disabled:opacity-50 touch-manipulation"
                  >
                    {useThisLoadingId === previewTemplate.id ? t('btn_loading') : `✓ ${t('templates_use_this')}`}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Apply Template Modal */}
      {showApplyModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Template Uygula
            </h2>
            <p className="text-gray-600 mb-4">
              <strong>{selectedTemplate.display_name}</strong> template'ini hangi ekrana uygulamak istersiniz?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                {t('templates_select_screen')}
              </label>
              <select
                value={selectedScreenId}
                onChange={(e) => setSelectedScreenId(e.target.value)}
                className="w-full px-3 py-2.5 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 touch-manipulation"
              >
                <option value="">Ekran seçin</option>
                {screens.map((screen) => (
                  <option key={screen.id} value={screen.id}>
                    {screen.name} ({screen.business?.name || t('templates_business_none')})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepContent}
                  onChange={(e) => setKeepContent(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Mevcut içeriği koru (işaretlenmezse içerik sıfırlanır)
                </span>
              </label>
            </div>

            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border-2 border-green-200">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishScreen}
                  onChange={(e) => setPublishScreen(e.target.checked)}
                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900 block">
                    🚀 {t('templates_publish_screen')}
                  </span>
                  <span className="text-xs text-gray-600">
                    {t('templates_publish_desc')}
                  </span>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedTemplate(null);
                  setPublishScreen(true);
                }}
                className="flex-1 px-4 py-2.5 min-h-[44px] bg-gray-200 text-gray-700 rounded-lg active:bg-gray-300 transition-colors font-semibold touch-manipulation"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleApplyTemplate}
                className="flex-1 px-4 py-2.5 min-h-[44px] bg-blue-600 text-white rounded-lg active:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2 touch-manipulation"
              >
                {publishScreen ? (
                  <>
                    <span>🚀</span>
                    {t('templates_apply_publish')}
                  </>
                ) : (
                  t('templates_apply')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TemplatesFallback() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center">
        <div className="text-xl font-medium text-white mb-2">{t('common_loading')}</div>
      </div>
    </div>
  );
}

export default function TemplatesLibraryPage() {
  return (
    <Suspense fallback={<TemplatesFallback />}>
      <TemplatesLibraryContent />
    </Suspense>
  );
}
