'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import { useTranslation } from '@/lib/i18n/useTranslation';
import GridLayout, { Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import Toast from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import ContentLibrary from '@/components/ContentLibrary';
import { TemplateDisplay } from '@/components/display/TemplateDisplay';

interface Block {
  id: string;
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  position_x: number;
  position_y: number;
  width: number;
  height: number;
  z_index: number;
  animation_type: string;
  animation_duration: number;
  animation_delay: number;
  block_index: number;
  is_locked: boolean;
  style_config?: any;
  contents?: any[];
}

function getDiscountBlockClasses(layer: { discountAnimation?: string; discountBlockStyle?: string }) {
  const anim = (layer.discountAnimation || 'pulse') as string;
  const style = (layer.discountBlockStyle || 'rounded') as string;
  return `discount-anim-${anim} discount-style-${style}`;
}
function getDiscountBlockStyles(layer: { blockColor?: string; discountBlockStyle?: string }) {
  const blockColor = layer.blockColor || 'rgba(251, 191, 36, 0.95)';
  const isOutline = layer.discountBlockStyle === 'outline';
  return {
    backgroundColor: isOutline ? 'transparent' : blockColor,
    borderColor: blockColor,
    color: isOutline ? blockColor : '#1f2937',
    borderWidth: 2,
    borderStyle: 'solid',
  };
}

export default function TemplatePage() {
  const router = useRouter();
  const params = useParams();
  const { t, localePath } = useTranslation();
  const screenId = (params?.id ?? '') as string;
  const { toast, showSuccess, showError, showWarning, hideToast } = useToast();

  const [screen, setScreen] = useState<any>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [selectedBlockContent, setSelectedBlockContent] = useState<any>(null);
  const [layout, setLayout] = useState<Layout[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [previewBlocks, setPreviewBlocks] = useState<Block[]>([]);
  const [previewLayout, setPreviewLayout] = useState<Layout[]>([]);
  const [aiParams, setAiParams] = useState({
    business_type: 'pizza',
    screen_count: '1',
    preferred_style: 'modern',
    content_type: 'menu-heavy',
    menu_purpose: 'display',
    price_level: 'medium',
  });
  const [templateName, setTemplateName] = useState('');
  const [saveAsSystemTemplate, setSaveAsSystemTemplate] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const [containerWidth, setContainerWidth] = useState(1400);
  const [showContentLibrary, setShowContentLibrary] = useState(true);
  const [showFullScreenPreview, setShowFullScreenPreview] = useState(false);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [showIconPositionModal, setShowIconPositionModal] = useState(false);
  const [pendingIconContent, setPendingIconContent] = useState<any>(null);
  const [showBadgeEditModal, setShowBadgeEditModal] = useState(false);
  const [pendingBadgeContent, setPendingBadgeContent] = useState<any>(null);
  const [editingBadgeText, setEditingBadgeText] = useState<string>('');
  const [editingBadgeBgColor, setEditingBadgeBgColor] = useState<string>('#3B82F6');
  const [editingBadgeTextColor, setEditingBadgeTextColor] = useState<string>('#FFFFFF');
  const isUserDraggingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Önizlemede yazı sürükleme (fullscreen preview)
  const [previewEditingTextLayers, setPreviewEditingTextLayers] = useState<Record<string, any[]>>({});
  const [previewDragState, setPreviewDragState] = useState<{ contentId: string; layerId: string; containerEl: HTMLElement } | null>(null);
  const previewDragLayersRef = useRef<any[] | null>(null);

  const cols = 100;
  const rows = 100;
  const [rowHeight, setRowHeight] = useState(6);

  useEffect(() => {
    loadData();
  }, [screenId]);

  useEffect(() => {
    const updateContainerDimensions = () => {
      if (previewContainerRef.current) {
        const rect = previewContainerRef.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height || (rect.width * 9 / 16); // 16:9 aspect ratio fallback
        setContainerWidth(width);
        setRowHeight(Math.max(4, Math.round(height / rows)));
      } else {
        // Fallback
        setContainerWidth(1000);
        setRowHeight(6);
      }
    };
    
    // İlk hesaplama
    setTimeout(updateContainerDimensions, 100);
    
    // Resize observer
    const resizeObserver = new ResizeObserver(updateContainerDimensions);
    if (previewContainerRef.current) {
      resizeObserver.observe(previewContainerRef.current);
    }
    
    window.addEventListener('resize', updateContainerDimensions);
    return () => {
      window.removeEventListener('resize', updateContainerDimensions);
      resizeObserver.disconnect();
    };
  }, [previewTemplate, blocks]);

  // Profesyonel grid yapısını hesapla (resim 2'deki gibi)
  const getProfessionalGridLayout = (blockCount: number) => {
    if (blockCount <= 0) return { cols: 2, rows: 2, gap: '12px', specialLayout: false };
    
    // Profesyonel düzenler (resim 2'deki gibi düzenli grid)
    if (blockCount === 1) return { cols: 1, rows: 1, gap: '0px', specialLayout: false };
    if (blockCount === 2) return { cols: 2, rows: 1, gap: '12px', specialLayout: false };
    if (blockCount === 3) return { cols: 2, rows: 2, gap: '12px', specialLayout: true }; // 2x2 grid, son blok 2 satır kaplıyor
    if (blockCount === 4) return { cols: 2, rows: 2, gap: '12px', specialLayout: false };
    if (blockCount === 5) return { cols: 3, rows: 2, gap: '12px', specialLayout: true }; // 3x2 grid, 3. blok 2 satır kaplıyor
    if (blockCount === 6) return { cols: 3, rows: 2, gap: '12px', specialLayout: false };
    if (blockCount === 7) return { cols: 4, rows: 2, gap: '12px', specialLayout: true }; // 4x2 grid, son blok 2 sütun kaplıyor
    if (blockCount === 8) return { cols: 4, rows: 2, gap: '12px', specialLayout: false }; // Resim 2'deki gibi
    if (blockCount === 9) return { cols: 3, rows: 3, gap: '12px', specialLayout: false };
    if (blockCount === 12) return { cols: 4, rows: 3, gap: '12px', specialLayout: false };
    if (blockCount === 16) return { cols: 4, rows: 4, gap: '12px', specialLayout: false };
    
    // Genel hesaplama
    const cols = Math.ceil(Math.sqrt(blockCount * 16 / 9));
    const rows = Math.ceil(blockCount / cols);
    return { cols, rows, gap: '12px', specialLayout: false };
  };

  // ESC tuşu ile tam ekran önizlemeyi kapat
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showFullScreenPreview) {
        setShowFullScreenPreview(false);
      }
    };

    if (showFullScreenPreview) {
      window.addEventListener('keydown', handleEsc);
      return () => {
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [showFullScreenPreview]);

  // Önizlemede yazı sürükleme: mousemove / mouseup
  useEffect(() => {
    if (!previewDragState || !showFullScreenPreview) return;
    const { contentId, layerId, containerEl } = previewDragState;
    const currentBlocks = previewTemplate ? previewBlocks : blocks;
    const onMove = (e: MouseEvent) => {
      const rect = containerEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setPreviewEditingTextLayers((prev) => {
        const layers = prev[contentId] || previewDragLayersRef.current || [];
        const updated = layers.map((l: any) => (l.id === layerId ? { ...l, x, y } : l));
        previewDragLayersRef.current = updated;
        return { ...prev, [contentId]: updated };
      });
    };
    const onUp = async () => {
      const layers = previewDragLayersRef.current;
      previewDragLayersRef.current = null;
      setPreviewDragState(null);
      if (layers && layers.length > 0) {
        try {
          const visualContent = currentBlocks.flatMap((b: any) => b.contents || []).find((c: any) => String(c.id) === contentId);
          if (visualContent?.id) {
            const existingStyle = visualContent.style_config
              ? (typeof visualContent.style_config === 'string' ? JSON.parse(visualContent.style_config || '{}') : visualContent.style_config)
              : {};
            await apiClient(`/screen-block-contents/${visualContent.id}`, {
              method: 'PATCH',
              body: { style_config: JSON.stringify({ ...existingStyle, textLayers: layers }) },
            });
            showSuccess('✅ Yazı konumu güncellendi');
            await loadData();
          }
        } catch (err: any) {
          alert(`❌ ${err?.message || t('common_error')}`);
        }
        setPreviewEditingTextLayers((prev) => {
          const next = { ...prev };
          delete next[contentId];
          return next;
        });
      }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [previewDragState, showFullScreenPreview, blocks, previewBlocks, previewTemplate]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const screenData = await apiClient(`/screens/${screenId}`).catch((err) => {
        console.error('Error loading screen:', err);
        return null;
      });

      // Sadece kullanıcı template'lerini yükle (sistem template'leri gizli)
      let templatesData;
      try {
        templatesData = await apiClient('/templates/scope/user');
      } catch (err: any) {
        // Eğer scope/user endpoint'i çalışmazsa, tüm template'leri yükle ve filtrele
        console.warn('Scope endpoint failed, falling back to all templates:', err);
        const allTemplates = await apiClient('/templates').catch(() => []);
        templatesData = Array.isArray(allTemplates) 
          ? allTemplates.filter((t: any) => t.scope === 'user' || !t.scope || t.is_system === false)
          : [];
      }

      const blocksData = await apiClient(`/screen-blocks/screen/${screenId}`).catch((err) => {
        console.error('Error loading blocks:', err);
        return [];
      });

      if (screenData) setScreen(screenData);
      if (templatesData) setTemplates(Array.isArray(templatesData) ? templatesData : []);
      
      if (blocksData && Array.isArray(blocksData) && blocksData.length > 0) {
        // Load contents for each block
        const blocksWithContents = await Promise.all(
          blocksData.map(async (block: any) => {
            try {
              const contents = await apiClient(`/screen-block-contents/screen-block/${block.id}`).catch(() => []);
              return {
                ...block,
                contents: contents || [],
              };
            } catch (err) {
              console.error('Error loading block contents:', err);
              return {
                ...block,
                contents: [],
              };
            }
          })
        );

        // Blokları sırala (block_index'e göre)
        const sortedBlocks = [...blocksWithContents].sort((a, b) => (a.block_index || 0) - (b.block_index || 0));
        
        const gridLayout = sortedBlocks.map((block: any, index: number) => {
          // Yüzde değerlerini grid birimlerine çevir
          let x = Math.round((Number(block.position_x || 0) / 100) * cols);
          let y = Math.round((Number(block.position_y || 0) / 100) * rows);
          let w = Math.max(10, Math.round((Number(block.width || 20) / 100) * cols));
          let h = Math.max(10, Math.round((Number(block.height || 20) / 100) * rows));
          
          // Eğer pozisyon 0,0 ise ve birden fazla blok varsa, otomatik yerleştir
          if (sortedBlocks.length > 1 && x === 0 && y === 0) {
            // Grid düzenine göre yerleştir
            const gridCols = Math.ceil(Math.sqrt(sortedBlocks.length));
            const col = index % gridCols;
            const row = Math.floor(index / gridCols);
            const blockWidth = Math.floor(cols / gridCols);
            const blockHeight = Math.floor(rows / gridCols);
            
            x = col * blockWidth;
            y = row * blockHeight;
            w = blockWidth;
            h = blockHeight;
          }
          
          // Sınırları kontrol et
          x = Math.max(0, Math.min(cols - w, x));
          y = Math.max(0, Math.min(rows - h, y));
          w = Math.max(10, Math.min(cols - x, w));
          h = Math.max(10, Math.min(rows - y, h));
          
          return {
            i: block.id,
            x,
            y,
            w,
            h,
            minW: 5,
            minH: 5,
            maxW: cols,
            maxH: rows,
            isResizable: !block.is_locked,
            isDraggable: !block.is_locked,
          };
        });

        setLayout(gridLayout as any);
        setBlocks(blocksWithContents);
      }
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || t('editor_data_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Layout zaten loadData'da hesaplanıyor, bu useEffect'i kaldırdık

  useEffect(() => {
    if (selectedBlock) {
      loadBlockContent();
    }
  }, [selectedBlock]);

  const loadBlockContent = async () => {
    if (!selectedBlock) return;
    try {
      const content = await apiClient(`/screen-block-contents/block/${selectedBlock}`);
      setSelectedBlockContent(content && content.length > 0 ? content[0] : null);
    } catch (err) {
      console.error('Error loading block content:', err);
      setSelectedBlockContent(null);
    }
  };

  const handleContentSelect = async (content: any) => {
    if (!selectedBlock) {
      showWarning(t('editor_select_block_first'));
      return;
    }

    try {
      setSaving(true);
      
      // İçerik türüne göre blok içeriği oluştur
      let contentData: any = {
        screen_block_id: selectedBlock,
      };

      if (content.type === 'image') {
        contentData = {
          ...contentData,
          content_type: 'image',
          image_url: content.url,
          title: content.name,
          background_color: '#FFFFFF',
        };
      } else if (content.type === 'icon') {
        // İkon seçildiğinde konum seçim modal'ını aç
        setPendingIconContent({
          ...contentData,
          content_type: 'icon',
          icon_name: content.content,
          text_color: content.color,
          background_color: '#FFFFFF',
        });
        setShowIconPositionModal(true);
        setSaving(false);
        return;
      } else if (content.type === 'badge') {
        contentData = {
          ...contentData,
          content_type: 'campaign_badge',
          campaign_text: content.text,
          background_color: content.bg,
          text_color: content.color,
        };
      } else if (content.type === 'background') {
        // Arka plan seçildiğinde blokun style_config'ini güncelle
        const selectedBlockObj = blocks.find(b => b.id === selectedBlock);
        if (selectedBlockObj) {
          const currentStyleConfig = selectedBlockObj.style_config 
            ? (typeof selectedBlockObj.style_config === 'string' 
                ? JSON.parse(selectedBlockObj.style_config) 
                : selectedBlockObj.style_config)
            : {};
          
          // Arka plan bilgilerini ekle
          const updatedStyleConfig = {
            ...currentStyleConfig,
            background_image: content.url || null,
            background_gradient: content.gradient || null,
            background_color: content.color || currentStyleConfig.background_color || '#FFFFFF',
          };

          // Blokun style_config'ini güncelle
          await apiClient(`/screen-blocks/${selectedBlock}`, {
            method: 'PATCH',
            body: JSON.stringify({
              style_config: JSON.stringify(updatedStyleConfig),
            }),
          });
          
          showSuccess(`✅ ${content.name} arka planı eklendi!`);
          await loadData();
          setSaving(false);
          return;
        }
      } else if (content.type === 'text') {
        contentData = {
          ...contentData,
          content_type: 'text',
          title: content.sample,
          background_color: '#FFFFFF',
          text_color: '#000000',
        };
      } else if (content.type === 'video') {
        contentData = {
          ...contentData,
          content_type: 'video',
          image_url: content.url,
          title: content.name,
          background_color: '#000000',
        };
      }

      // screen_block_id kontrolü
      if (!contentData.screen_block_id) {
        throw new Error('Blok seçilmedi. Lütfen bir blok seçin.');
      }

      // İkon veya rozet seçildiğinde, mevcut resim içeriğini koru ve yeni içeriği ekle
      if (content.type === 'icon' || content.type === 'badge') {
        // Yeni içerik olarak ekle (mevcut içeriği silme)
        await apiClient('/screen-block-contents', {
          method: 'POST',
          body: JSON.stringify(contentData),
        });
        showSuccess(`✅ ${content.name} ürün resmi üzerine eklendi!`);
      } else if (content.type === 'image' || content.type === 'video') {
        // Resim veya video seçildiğinde, bloktaki mevcut içeriği bul ve güncelle
        const block = blocks.find(b => b.id === selectedBlock);
        const existingImageContent = block?.contents?.find((c: any) => 
          c.content_type === 'image' || c.content_type === 'video' || c.image_url
        );
        
        if (existingImageContent && existingImageContent.id) {
          await apiClient(`/screen-block-contents/${existingImageContent.id}`, {
            method: 'PATCH',
            body: JSON.stringify(contentData),
          });
          showSuccess(`✅ ${content.name} güncellendi!`);
        } else {
          await apiClient('/screen-block-contents', {
            method: 'POST',
            body: JSON.stringify(contentData),
          });
          showSuccess(`✅ ${content.name} eklendi!`);
        }
      } else {
        // Diğer içerikler için mevcut içeriği güncelle veya yeni oluştur
        if (selectedBlockContent && selectedBlockContent.id) {
          await apiClient(`/screen-block-contents/${selectedBlockContent.id}`, {
            method: 'PATCH',
            body: JSON.stringify(contentData),
          });
          showSuccess(`✅ ${content.name} güncellendi!`);
        } else {
          await apiClient('/screen-block-contents', {
            method: 'POST',
            body: JSON.stringify(contentData),
          });
          showSuccess(`✅ ${content.name} eklendi!`);
        }
      }

      // İçeriği yeniden yükle
      await loadBlockContent();
      await loadData();
    } catch (err: any) {
      console.error('Error adding content:', err);
      console.error('Error details:', {
        message: err?.message,
        data: err?.data,
        response: err?.response,
        status: err?.status,
      });
      
      let errorMsg = t('editor_content_add_error');
      
      if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.data?.message) {
        errorMsg = err.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      showError(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Yazı ve fiyat güncelleme fonksiyonu
  const handleUpdateTitleAndPrice = async () => {
    if (!selectedBlock) {
      showWarning(t('editor_select_block_first'));
      return;
    }

    try {
      setSaving(true);
      
      // Seçili bloğun içeriklerini al
      const block = blocks.find(b => b.id === selectedBlock);
      if (!block || !block.contents || block.contents.length === 0) {
        showWarning(t('editor_content_no_block'));
        return;
      }

      // Resim veya video içeriğini bul ve güncelle
      const imageContent = block.contents.find((c: any) => c.content_type === 'image');
      const videoContent = block.contents.find((c: any) => c.content_type === 'video');
      const visualContent = imageContent || videoContent;
      if (visualContent && visualContent.id) {
        await apiClient(`/screen-block-contents/${visualContent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            title: editingTitle || visualContent.title,
            price: editingPrice ? parseFloat(editingPrice) : visualContent.price,
          }),
        });
        showSuccess('✅ Yazı ve fiyat güncellendi!');
        await loadBlockContent();
        await loadData();
        setIsEditingContent(false);
        setEditingTitle('');
        setEditingPrice('');
      } else {
        // Resim yoksa text içeriği oluştur veya güncelle
        const textContent = block.contents.find((c: any) => c.content_type === 'text');
        if (textContent && textContent.id) {
          await apiClient(`/screen-block-contents/${textContent.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              title: editingTitle || textContent.title,
              price: editingPrice ? parseFloat(editingPrice) : textContent.price,
            }),
          });
        } else {
          await apiClient('/screen-block-contents', {
            method: 'POST',
            body: JSON.stringify({
              screen_block_id: selectedBlock,
              content_type: 'text',
              title: editingTitle,
              price: editingPrice ? parseFloat(editingPrice) : null,
            }),
          });
        }
        showSuccess('✅ Yazı ve fiyat güncellendi!');
        await loadBlockContent();
        await loadData();
        setIsEditingContent(false);
        setEditingTitle('');
        setEditingPrice('');
      }
    } catch (err: any) {
      console.error('Error updating title and price:', err);
      const errorMsg = err?.data?.message || err?.message || t('editor_update_error');
      showError(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // İkon konumlandırma fonksiyonu
  const handleIconPositionSelect = async (position: string) => {
    if (!pendingIconContent || !selectedBlock) {
      return;
    }

    try {
      setSaving(true);
      
      // Konum bilgisini ekle
      const positionMap: { [key: string]: React.CSSProperties } = {
        'top-left': { top: '4px', left: '4px', right: 'auto', bottom: 'auto' },
        'top-right': { top: '4px', right: '4px', left: 'auto', bottom: 'auto' },
        'bottom-left': { bottom: '4px', left: '4px', right: 'auto', top: 'auto' },
        'bottom-right': { bottom: '4px', right: '4px', left: 'auto', top: 'auto' },
        'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
      };

      const positionStyle = positionMap[position] || positionMap['top-right'];
      
      const styleConfig = {
        position: position,
        ...positionStyle,
      };

      // Eğer mevcut bir içerik düzenleniyorsa (id varsa), PATCH yap
      if (pendingIconContent.id) {
        await apiClient(`/screen-block-contents/${pendingIconContent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            style_config: JSON.stringify(styleConfig),
          }),
        });
        showSuccess('✅ İkon konumu güncellendi!');
      } else {
        // Yeni ikon ekleniyorsa
        const iconData = {
          ...pendingIconContent,
          style_config: JSON.stringify(styleConfig),
        };

        await apiClient('/screen-block-contents', {
          method: 'POST',
          body: JSON.stringify(iconData),
        });
        showSuccess('✅ İkon eklendi!');
      }
      
      await loadBlockContent();
      await loadData();
      setShowIconPositionModal(false);
      setPendingIconContent(null);
    } catch (err: any) {
      console.error('Error updating icon position:', err);
      const errorMsg = err?.data?.message || err?.message || t('editor_icon_position_error');
      showError(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // İçerik silme fonksiyonu
  const handleDeleteContent = async (contentId: string) => {
    if (!contentId) {
      showWarning(t('editor_content_id_not_found'));
      return;
    }

    if (!confirm('Bu içeriği silmek istediğinize emin misiniz?')) {
      return;
    }

    try {
      setSaving(true);
      await apiClient(`/screen-block-contents/${contentId}`, {
        method: 'DELETE',
      });
      
      showSuccess('✅ ' + t('editor_content_deleted'));
      await loadBlockContent();
      await loadData();
    } catch (err: any) {
      console.error('Error deleting content:', err);
      const errorMsg = err?.data?.message || err?.message || t('editor_content_delete_error');
      showError(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // İçerik düzenleme fonksiyonu (ikon konumu, rozet metni vb.)
  const handleEditContent = (content: any) => {
    if (content.content_type === 'icon') {
      // İkon için konum modalını aç
      setPendingIconContent(content);
      setShowIconPositionModal(true);
    } else if (content.content_type === 'badge' || content.content_type === 'campaign_badge' || content.campaign_text) {
      // Rozet için düzenleme modalını aç
      setPendingBadgeContent(content);
      setEditingBadgeText(content.campaign_text || '');
      setEditingBadgeBgColor(content.background_color || '#3B82F6');
      setEditingBadgeTextColor(content.text_color || '#FFFFFF');
      setShowBadgeEditModal(true);
    } else if (content.content_type === 'image' || content.content_type === 'video' || content.image_url) {
      // Resim/video için içerik kütüphanesini aç
      setShowContentLibrary(true);
      showWarning(t('editor_replace_image_hint'));
    }
  };

  // Rozet güncelleme fonksiyonu
  const handleUpdateBadge = async () => {
    if (!pendingBadgeContent || !pendingBadgeContent.id) {
      showWarning(t('editor_badge_not_found'));
      return;
    }

    try {
      setSaving(true);
      await apiClient(`/screen-block-contents/${pendingBadgeContent.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          campaign_text: editingBadgeText,
          background_color: editingBadgeBgColor,
          text_color: editingBadgeTextColor,
        }),
      });
      
      showSuccess('✅ Rozet güncellendi!');
      await loadBlockContent();
      await loadData();
      setShowBadgeEditModal(false);
      setPendingBadgeContent(null);
      setEditingBadgeText('');
      setEditingBadgeBgColor('#3B82F6');
      setEditingBadgeTextColor('#FFFFFF');
    } catch (err: any) {
      console.error('Error updating badge:', err);
      const errorMsg = err?.data?.message || err?.message || t('editor_badge_update_error');
      showError(`❌ ${errorMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const saveBlockPositions = useCallback(async (newLayout: Layout[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updates = newLayout.map((item) => {
          const layoutItem = item as any;
          return {
            id: layoutItem.i,
            updates: {
              position_x: Math.max(0, Math.min(100, Number(layoutItem.x))),
              position_y: Math.max(0, Math.min(100, Number(layoutItem.y))),
              width: Math.max(5, Math.min(100, Number(layoutItem.w))),
              height: Math.max(5, Math.min(100, Number(layoutItem.h))),
            },
          };
        });

        await apiClient('/screen-blocks/batch-update', {
          method: 'POST',
          body: JSON.stringify({ updates }),
        });

        setBlocks((prev) =>
          prev.map((block) => {
            const update = updates.find((u) => u.id === block.id);
            if (update) {
              return {
                ...block,
                position_x: update.updates.position_x,
                position_y: update.updates.position_y,
                width: update.updates.width,
                height: update.updates.height,
              };
            }
            return block;
          })
        );
      } catch (err: any) {
        console.error('Error saving positions:', err);
        setError(err.message || t('editor_positions_failed'));
      } finally {
        setSaving(false);
      }
    }, 500);
  }, []);

  const onLayoutChange = (newLayout: Layout) => {
    const layoutArray = Array.isArray(newLayout) ? (newLayout as any) : [newLayout];
    if (isUserDraggingRef.current) {
      setLayout(layoutArray);
      return;
    }
    setLayout(layoutArray);
    saveBlockPositions(layoutArray);
  };

  const onDragStart = () => {
    isUserDraggingRef.current = true;
  };

  const onDragStop = () => {
    isUserDraggingRef.current = false;
    if (layout.length > 0) {
      saveBlockPositions(layout);
    }
  };

  const onResizeStart = () => {
    isUserDraggingRef.current = true;
  };

  const onResizeStop = () => {
    isUserDraggingRef.current = false;
    if (layout.length > 0) {
      saveBlockPositions(layout);
    }
  };

  const handleTemplateSelect = async (templateId: string) => {
    if (!templateId) return;
    
    try {
      setSaving(true);
      setError('');
      setSelectedTemplate(templateId); // Seçili template'i kaydet
      
      const result = await apiClient('/templates/apply', {
        method: 'POST',
        body: JSON.stringify({
          template_id: templateId,
          screen_id: screenId,
          keep_content: false,
        }),
      });
      
      // Wait a bit for database to be ready
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Reload data to get all blocks
      await loadData();
      showSuccess('Template başarıyla uygulandı!');
    } catch (err: any) {
      console.error('Error applying template:', err);
      setError('Template uygulanamadı: ' + err.message);
      showError('Template uygulanamadı: ' + err.message);
      setSelectedTemplate(''); // Hata durumunda sıfırla
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      showWarning(t('editor_template_name_required'));
      return;
    }
    try {
      setSaving(true);
      const isAdmin = userRole === 'super_admin' || userRole === 'admin';
      await apiClient('/templates/save-from-screen', {
        method: 'POST',
        body: JSON.stringify({
          screen_id: screenId,
          name: trimmedName.toLowerCase().replace(/\s+/g, '-'),
          display_name: trimmedName,
          description: `Template from ${screen?.name || 'screen'}`,
          ...(isAdmin && saveAsSystemTemplate ? { scope: 'system' } : {}),
        }),
      });
      showSuccess(saveAsSystemTemplate && isAdmin ? 'Sistem şablonu olarak kaydedildi! Tüm kullanıcılar erişebilir.' : 'Template başarıyla kaydedildi!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
      setSaveAsSystemTemplate(false);
      setTimeout(() => {
        router.push(localePath('/templates'));
      }, 1000);
    } catch (err: any) {
      const errorMsg = err?.data?.message || err?.message || t('editor_unknown_error');
      showError('Template kaydedilemedi: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleAIGenerate = () => {
    setShowAIModal(true);
  };

  const handleAIGenerateSubmit = async () => {
    try {
      setSaving(true);
      const result = await apiClient('/ai-templates/generate', {
        method: 'POST',
        body: JSON.stringify({
          ...aiParams,
          business_id: screen?.business_id,
          screen_id: screenId,
        }),
      });

      // Load template blocks for preview
      const templateBlocks = await apiClient(`/templates/${result.template.id}/blocks`);
      
      // If screen_id was provided, load screen blocks (they have content)
      let screenBlocksData: any[] = [];
      let blockContentsMap: Record<string, any[]> = {};
      
      if (result.menu && screenId) {
        try {
          screenBlocksData = await apiClient(`/screen-blocks/screen/${screenId}`);
          
          // Load contents for each screen block
          for (const screenBlock of screenBlocksData) {
            try {
              const contents = await apiClient(`/screen-block-contents/screen-block/${screenBlock.id}`);
              blockContentsMap[screenBlock.id] = contents || [];
            } catch (err) {
              console.error('Error loading block contents:', err);
              blockContentsMap[screenBlock.id] = [];
            }
          }
        } catch (err) {
          console.error('Error loading screen blocks:', err);
        }
      }
      
      // Convert to preview format - use screen blocks if available, otherwise template blocks
      const blocksToUse = screenBlocksData.length > 0 ? screenBlocksData : templateBlocks;
      const previewBlocksData: Block[] = blocksToUse.map((block: any) => ({
        id: block.id,
        i: block.id,
        x: block.position_x || 0,
        y: block.position_y || 0,
        w: block.width || 20,
        h: block.height || 20,
        position_x: block.position_x || 0,
        position_y: block.position_y || 0,
        width: block.width || 20,
        height: block.height || 20,
        z_index: block.z_index || 0,
        animation_type: block.animation_type || 'fade',
        animation_duration: block.animation_duration || 500,
        animation_delay: block.animation_delay || 0,
        block_index: block.block_index || block.display_order || 0,
        is_locked: false,
        style_config: block.style_config || (templateBlocks.find((tb: any) => tb.id === block.template_block_id)?.style_config),
        contents: blockContentsMap[block.id] || [],
      }));

      const previewLayoutData = previewBlocksData.map((block: any) => ({
        i: block.id,
        x: Math.max(0, Math.min(100, Math.round(Number(block.position_x || 0)))),
        y: Math.max(0, Math.min(100, Math.round(Number(block.position_y || 0)))),
        w: Math.max(5, Math.min(100, Math.round(Number(block.width || 20)))),
        h: Math.max(5, Math.min(100, Math.round(Number(block.height || 20)))),
        minW: 5,
        minH: 5,
        maxW: 100,
        maxH: 100,
        isResizable: false,
        isDraggable: false,
      }));

      // If screen_id was provided, AI already created screen blocks - load them directly
      if (screenId && screenBlocksData.length > 0) {
        // Wait a bit for database to be ready
        await new Promise(resolve => setTimeout(resolve, 500));
        // Reload all data to get the actual screen blocks
        await loadData();
        setPreviewTemplate(null);
        setPreviewBlocks([]);
        setPreviewLayout([]);
        setShowAIModal(false);
        showSuccess('AI template başarıyla oluşturuldu ve ekrana uygulandı! Artık düzenleyebilirsiniz.');
      } else if (screenId) {
        // Screen ID var ama blocks henüz yüklenmedi - tekrar dene
        await new Promise(resolve => setTimeout(resolve, 1000));
        await loadData();
        setPreviewTemplate(null);
        setPreviewBlocks([]);
        setPreviewLayout([]);
        setShowAIModal(false);
        showSuccess('AI template başarıyla oluşturuldu ve ekrana uygulandı!');
      } else {
        // No screen_id - show preview
        setPreviewTemplate(result.template);
        setPreviewBlocks(previewBlocksData);
        setPreviewLayout(previewLayoutData as any);
        setShowAIModal(false);
        showSuccess(t('editor_ai_success'));
      }
    } catch (err: any) {
      console.error('Error generating AI template:', err);
      const errorMessage = err?.data?.message || err?.message || err?.data?.error || t('common_error');
      showError('AI template oluşturulamadı: ' + errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreviewTemplate = async () => {
    if (!previewTemplate) return;
    
    try {
      setSaving(true);
      await apiClient('/templates/apply', {
        method: 'POST',
        body: JSON.stringify({
          template_id: previewTemplate.id,
          screen_id: screenId,
          keep_content: false,
        }),
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      await loadData();
      
      setPreviewTemplate(null);
      setPreviewBlocks([]);
      setPreviewLayout([]);
      showSuccess('Template başarıyla ekrana uygulandı!');
    } catch (err: any) {
      showError('Template uygulanamadı: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewTemplate(null);
    setPreviewBlocks([]);
    setPreviewLayout([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-xl font-medium text-white">{t('common_loading')}</div>
      </div>
    );
  }

  const selectedBlockData = blocks.find((b) => b.id === selectedBlock);

  return (
    <div className="min-h-screen bg-slate-900">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                {t('login_title')}
              </Link>
              <span className="text-gray-500">/</span>
              <Link href={localePath(`/screens/${screenId}`)} className="text-gray-700 hover:text-gray-900">
                {screen?.name || 'Screen'}
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 font-semibold">Template Yapılandır</span>
            </div>
            <div className="flex items-center space-x-2">
              {screen?.public_token && (
                <Link
                  href={localePath(`/display/${screen.public_token}`)}
                  target="_blank"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm flex items-center gap-2"
                >
                  <span>📺</span>
                  {t('editor_tv_preview')}
                </Link>
              )}
              <button
                onClick={handleAIGenerate}
                disabled={saving}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <span>✨</span>
                {t('editor_ai_create')}
              </button>
              <button
                onClick={() => setShowSaveTemplateModal(true)}
                disabled={saving || blocks.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50"
              >
                {t('editor_save_as_template')}
              </button>
              {saving && <span className="text-sm text-gray-600">{t('editor_saving')}</span>}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Main Layout: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Content Library */}
          {showContentLibrary && (
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 100px)' }}>
                {/* Template Selection - Compact Dropdown at Top */}
                <div className="p-3 border-b bg-gray-50">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => handleTemplateSelect(e.target.value)}
                    disabled={saving}
                    className="w-full px-3 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    <option value="">📋 Template Seç...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.display_name || template.name} ({template.block_count} {t('editor_block')})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Content Library Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>🎨</span>
                    {t('editor_content_library')}
                  </h3>
                  <button
                    onClick={() => setShowContentLibrary(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <ContentLibrary onSelectContent={handleContentSelect} />
              </div>
            </div>
          )}

          {/* Right Column: Preview with Info Cards on Top */}
          <div className={`${showContentLibrary ? 'lg:col-span-9' : 'lg:col-span-11'} space-y-6`}>
            {/* Toggle Content Library Button */}
            {!showContentLibrary && (
              <button
                onClick={() => setShowContentLibrary(true)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all font-semibold flex items-center justify-center gap-2 shadow-lg"
              >
                <span>🎨</span>
                {t('editor_content_library_open')}
              </button>
            )}

            {/* Info Cards Row - Above Preview */}
            <div className="grid grid-cols-1 gap-4">
              {/* Help Card - Nasıl Kullanılır */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-4 rounded-xl shadow-lg border-2 border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-base font-bold text-gray-900">{t('editor_how_to_use')}</h3>
                </div>
                <ol className="space-y-1.5 text-xs text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 min-w-[16px]">1.</span>
                    <span>{t('editor_step1')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 min-w-[16px]">2.</span>
                    <span>{t('editor_step2')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 min-w-[16px]">3.</span>
                    <span>{t('editor_step3')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 min-w-[16px]">4.</span>
                    <span>{t('editor_step4')}</span>
                  </li>
                </ol>
              </div>
              
              {/* Seçili {t('editor_block_contents')} Listesi */}
              {selectedBlockData && (
                <div className="bg-gradient-to-br from-indigo-50 to-pink-50 p-4 rounded-xl shadow-lg border-2 border-indigo-200 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">📦</span>
                    <h3 className="text-base font-bold text-gray-900">{t('editor_block_contents')}</h3>
                  </div>
                  
                  {(() => {
                    const block = blocks.find(b => b.id === selectedBlock);
                    const contents = block?.contents || [];
                    
                    if (contents.length === 0) {
                      return (
                        <div className="text-sm text-gray-500 italic py-2">
                          {t('editor_block_empty')}
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {contents.map((content: any, idx: number) => {
                          const contentType = content.content_type || 
                            (content.image_url ? 'image' : 
                             content.icon_name ? 'icon' : 
                             (content.campaign_text || content.content_type === 'campaign_badge' || content.content_type === 'badge') ? 'badge' : 'unknown');
                          
                          const getContentLabel = () => {
                            if (contentType === 'image') return '🖼️ ' + t('editor_image');
                            if (contentType === 'icon') return '🎯 ' + t('editor_icon');
                            if (contentType === 'badge' || content.content_type === 'campaign_badge' || content.campaign_text) return '🏷️ ' + t('editor_badge');
                            return '📄 ' + t('editor_content');
                          };

                          const getContentInfo = () => {
                            if (contentType === 'image') {
                              return content.title || content.name || t('editor_image');
                            }
                            if (contentType === 'icon') {
                              return content.icon_name || t('editor_icon');
                            }
                            if (contentType === 'badge' || content.content_type === 'campaign_badge' || content.campaign_text) {
                              return content.campaign_text || t('editor_badge');
                            }
                            return content.title || t('editor_content');
                          };

                          return (
                            <div 
                              key={content.id || idx} 
                              className="bg-white p-3 rounded-lg border border-gray-200 flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <span className="text-lg flex-shrink-0">{getContentLabel()}</span>
                                <span className="text-sm text-gray-700 truncate flex-1">
                                  {getContentInfo()}
                                </span>
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleEditContent(content)}
                                  className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                                  title={t('btn_edit')}
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteContent(content.id)}
                                  disabled={saving}
                                  className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                                  title={t('btn_delete')}
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Seçili Blok Düzenleme Paneli */}
              {selectedBlockData && (
                <div className="bg-gradient-to-br from-blue-50 to-purple-50 p-4 rounded-xl shadow-lg border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-2xl">✏️</span>
                    <h3 className="text-base font-bold text-gray-900">{t('editor_content_edit')}</h3>
                  </div>
                  
                  {!isEditingContent ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_product_name')}</label>
                        <div className="bg-white p-2 rounded-lg text-sm text-gray-900">
                          {(() => {
                            const block = blocks.find(b => b.id === selectedBlock);
                            const contents = block?.contents || [];
                            const imageContent = contents.find((c: any) => c.content_type === 'image');
                            const videoContent = contents.find((c: any) => c.content_type === 'video');
                            const textContent = contents.find((c: any) => c.content_type === 'text');
                            const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                            return textContent?.title || productContent?.title || productContent?.name || imageContent?.title || videoContent?.title || t('editor_none');
                          })()}
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_price')}</label>
                        <div className="bg-white p-2 rounded-lg text-sm text-gray-900">
                          {(() => {
                            const block = blocks.find(b => b.id === selectedBlock);
                            const contents = block?.contents || [];
                            const imageContent = contents.find((c: any) => c.content_type === 'image');
                            const videoContent = contents.find((c: any) => c.content_type === 'video');
                            const textContent = contents.find((c: any) => c.content_type === 'text');
                            const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                            const price = textContent?.price || productContent?.price || imageContent?.price || videoContent?.price;
                            return price ? `$${Number(price).toFixed(2)}` : t('editor_none');
                          })()}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const block = blocks.find(b => b.id === selectedBlock);
                          const contents = block?.contents || [];
                          const imageContent = contents.find((c: any) => c.content_type === 'image');
                          const videoContent = contents.find((c: any) => c.content_type === 'video');
                          const textContent = contents.find((c: any) => c.content_type === 'text');
                          const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                          setEditingTitle(textContent?.title || productContent?.title || productContent?.name || imageContent?.title || videoContent?.title || '');
                          setEditingPrice(textContent?.price || productContent?.price || imageContent?.price || videoContent?.price ? String(textContent?.price || productContent?.price || imageContent?.price || videoContent?.price) : '');
                          setIsEditingContent(true);
                        }}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                      >
                        ✏️ {t('btn_edit')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">{t('editor_product_name')}</label>
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          placeholder={t('editor_enter_product_name')}
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Fiyat ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={editingPrice}
                          onChange={(e) => setEditingPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateTitleAndPrice}
                          disabled={saving}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50"
                        >
                          {saving ? t('editor_saving') : '✅ ' + t('btn_save')}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingContent(false);
                            setEditingTitle('');
                            setEditingPrice('');
                          }}
                          className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-semibold text-sm"
                        >
                          {t('btn_cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Preview Section */}
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {previewTemplate ? '✨ ' + t('editor_ai_preview') : t('editor_preview')}
                </h2>
                {previewTemplate && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelPreview}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-semibold text-sm"
                    >
                      {t('btn_cancel')}
                    </button>
                    <button
                      onClick={handleApplyPreviewTemplate}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50"
                    >
                      {saving ? t('editor_applying') : '✅ ' + t('templates_apply_publish')}
                    </button>
                  </div>
                )}
              </div>
              
              {previewTemplate && previewBlocks.length > 0 ? (
                <div className="mb-4 p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
                  <p className="text-sm text-purple-800">
                    <strong>✨ {t('editor_ai_created')}</strong> {previewTemplate.display_name || previewTemplate.name}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    {t('editor_ai_apply_hint')}
                  </p>
                </div>
              ) : null}

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                    <span className="text-2xl">📺</span>
                    {t('editor_tv_preview_16_9')}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {t('editor_preview_tv_desc')}
                  </p>
                </div>
                <button
                  onClick={() => setShowFullScreenPreview(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2 hover:scale-105"
                >
                  <span className="text-xl">🖥️</span>
                  <span>Tam Ekran TV Görünümü</span>
                </button>
              </div>

              {(previewTemplate ? previewBlocks : blocks).length > 0 ? (() => {
                const currentBlocks = previewTemplate ? previewBlocks : blocks;
                const gridLayout = getProfessionalGridLayout(currentBlocks.length);
                
                return (
                  <div
                    ref={previewContainerRef}
                    className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border-4 border-gray-700 rounded-xl shadow-2xl mx-auto overflow-hidden"
                    style={{ 
                      aspectRatio: '16/9',
                      width: '100%',
                      maxWidth: '1920px',
                      height: 'auto',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
                      boxSizing: 'border-box'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
                        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                        gap: '2px',
                        padding: '20px',
                        boxSizing: 'border-box',
                        overflow: 'hidden'
                      }}
                    >
                    {currentBlocks.map((block, index) => {
                      const styleConfig = block.style_config ? (typeof block.style_config === 'string' ? JSON.parse(block.style_config) : block.style_config) : {};
                      const bgColor = styleConfig.background_color || '#1a1a1a';
                      const bgGradient = styleConfig.background_gradient;
                      const bgImage = styleConfig.background_image;
                      
                      // Tüm içerikleri al ve kategorize et (overlay sistemi için)
                      const contents = block.contents || [];
                      const imageContent = contents.find((c: any) => c.content_type === 'image');
                      const videoContent = contents.find((c: any) => c.content_type === 'video');
                      const iconContent = contents.find((c: any) => c.content_type === 'icon');
                      const badgeContent = contents.find((c: any) => c.content_type === 'campaign_badge');
                      const textContent = contents.find((c: any) => c.content_type === 'text');
                      const productContent = contents.find((c: any) => !c.content_type && (c.title || c.name));
                      
                      // Yazı ve fiyat için: textContent veya productContent'ten al
                      const displayTitle = textContent?.title || productContent?.title || productContent?.name || imageContent?.title || videoContent?.title || '';
                      const displayPrice = textContent?.price || productContent?.price || imageContent?.price || videoContent?.price || null;
                      
                      // 3 ve 5 blok: son/3. blok sağ sütunda 2 satır kaplar (spanRows)
                      // 7 blok: son blok 2 sütun kaplar (spanCols)
                      const is3BlockLast = currentBlocks.length === 3 && index === 2;
                      const is5BlockThird = currentBlocks.length === 5 && index === 2;
                      const is7BlockLast = currentBlocks.length === 7 && index === 6;
                      const shouldSpanRows = gridLayout.specialLayout && (is3BlockLast || is5BlockThird);
                      const shouldSpanCols = is7BlockLast;
                      
                      // Arka plan varsa border'ı kaldır
                      const hasBackground = bgImage || bgGradient || (bgColor && bgColor !== '#1a1a1a');
                      
                      return (
                        <div
                          key={block.id}
                          className={`relative overflow-hidden shadow-xl transition-all duration-200 ${
                            hasBackground ? '' : 'rounded-lg'
                          } ${
                            previewTemplate 
                              ? 'cursor-default' 
                              : selectedBlock === block.id && !hasBackground
                              ? 'ring-4 ring-blue-500 scale-105 z-10 rounded-lg'
                              : selectedBlock === block.id && hasBackground
                              ? 'z-10'
                              : 'cursor-pointer hover:scale-102 hover:shadow-2xl'
                          } ${block.is_locked ? 'opacity-60' : ''}`}
                          onClick={() => {
                            if (!previewTemplate) {
                              setSelectedBlock(block.id);
                            }
                          }}
                          style={{
                            background: bgImage 
                              ? `url(${bgImage}) center/cover no-repeat, ${bgGradient || bgColor}`
                              : bgGradient || bgColor,
                            backgroundImage: bgImage ? `url(${bgImage})` : undefined,
                            backgroundSize: bgImage ? 'cover' : undefined,
                            backgroundPosition: bgImage ? 'center' : undefined,
                            backgroundRepeat: bgImage ? 'no-repeat' : undefined,
                            minHeight: '0',
                            gridRow: shouldSpanRows ? 'span 2' : 'auto',
                            gridColumn: shouldSpanCols ? 'span 2' : 'auto',
                            border: hasBackground ? 'none' : undefined,
                          }}
                        >
                          {/* Blok numarası badge (resim 2'deki gibi küçük, sol alt köşede) */}
                          {!previewTemplate && (
                            <div className="absolute bottom-2 left-2 z-20 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded">
                              {block.block_index + 1}
                            </div>
                          )}
                          
                          {/* İçerik Alanı - Overlay Sistemi */}
                          <div className="w-full h-full relative">
                            {/* 1. Video İçeriği - üzerine yazı katmanları */}
                            {videoContent?.image_url && (() => {
                              const videoStyleConfig = videoContent.style_config
                                ? (typeof videoContent.style_config === 'string' ? JSON.parse(videoContent.style_config || '{}') : videoContent.style_config)
                                : {};
                              const savedTextLayers = videoStyleConfig.textLayers || [];
                              const fit = videoStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                              const pos = (videoStyleConfig.imagePosition as string) || 'center';
                              const scale = typeof videoStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, videoStyleConfig.imageScale)) : 1;
                              return (
                                <div className="absolute inset-0 w-full h-full overflow-hidden">
                                  <div className="absolute inset-0" style={{ transform: `scale(${scale})`, transformOrigin: pos }}>
                                    <video
                                      src={videoContent.image_url}
                                      className="w-full h-full"
                                      style={{ objectFit: fit, objectPosition: pos, imageRendering: 'auto', backfaceVisibility: 'hidden' }}
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                  />
                                  </div>
                                  {savedTextLayers.map((layer: any) => {
                                    const isDisc = !!layer.isDiscountBlock;
                                    const iconB = layer.icon && layer.iconPosition !== 'after';
                                    const iconA = layer.icon && layer.iconPosition === 'after';
                                    const px = typeof layer.x === 'number' ? layer.x : 50;
                                    const py = typeof layer.y === 'number' ? layer.y : 50;
                                    return (
                                      <div
                                        key={layer.id}
                                        className={`absolute z-30 ${isDisc ? getDiscountBlockClasses(layer) + ' px-2 py-1 shadow border' : ''}`}
                                        style={{
                                          left: `${px}%`,
                                          top: `${py}%`,
                                          transform: 'translate(-50%, -50%)',
                                          ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                          fontSize: `${layer.size * 0.4}px`,
                                          fontWeight: layer.fontWeight,
                                          fontStyle: layer.fontStyle,
                                          fontFamily: layer.fontFamily || 'Arial',
                                          textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.8)',
                                          whiteSpace: 'pre' as const,
                                          textAlign: 'center',
                                        }}
                                      >
                                        {iconB && <span className="mr-0.5">{layer.icon}</span>}
                                        {layer.text}
                                        {iconA && <span className="ml-0.5">{layer.icon}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                            {/* 2. Arka Plan: Resim İçeriği (video yoksa) */}
                            {!videoContent && imageContent && imageContent.image_url && (() => {
                              const imageStyleConfig = imageContent.style_config
                                ? (typeof imageContent.style_config === 'string' ? JSON.parse(imageContent.style_config || '{}') : imageContent.style_config)
                                : {};
                              const blurPx = typeof imageStyleConfig.blur === 'number' ? imageStyleConfig.blur : 0;
                              const savedTextLayers = imageStyleConfig.textLayers || [];
                              const fit = imageStyleConfig.imageFit === 'cover' ? 'cover' : 'contain';
                              const pos = (imageStyleConfig.imagePosition as string) || 'center';
                              const scale = typeof imageStyleConfig.imageScale === 'number' ? Math.max(0.5, Math.min(2.5, imageStyleConfig.imageScale)) : 1;
                              
                              return (
                                <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}>
                                  <div className="absolute inset-0" style={{ transform: `scale(${scale})`, transformOrigin: pos }}>
                                    <img
                                      src={imageContent.image_url}
                                    alt={imageContent.title || 'Image'}
                                    className="w-full h-full"
                                    style={{ 
                                      display: 'block',
                                      minHeight: '100%',
                                      objectFit: fit,
                                      objectPosition: pos,
                                      imageRendering: '-webkit-optimize-contrast',
                                      WebkitBackfaceVisibility: 'hidden',
                                      backfaceVisibility: 'hidden',
                                      ...(blurPx > 0 ? { filter: `blur(${blurPx}px)` } : {}),
                                    }}
                                    loading="lazy"
                                    decoding="async"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                  </div>
                                  {/* Çoklu yazı katmanları (ikon + indirim bloğu) */}
                                  {savedTextLayers.map((layer: any) => {
                                    const isDisc = !!layer.isDiscountBlock;
                                    const iconB = layer.icon && layer.iconPosition !== 'after';
                                    const iconA = layer.icon && layer.iconPosition === 'after';
                                    const px = typeof layer.x === 'number' ? layer.x : 50;
                                    const py = typeof layer.y === 'number' ? layer.y : 50;
                                    return (
                                      <div
                                        key={layer.id}
                                        className={`absolute z-30 ${isDisc ? getDiscountBlockClasses(layer) + ' px-2 py-1 shadow border' : ''}`}
                                        style={{
                                          left: `${px}%`,
                                          top: `${py}%`,
                                          transform: 'translate(-50%, -50%)',
                                          ...(isDisc ? getDiscountBlockStyles(layer) : { color: layer.color }),
                                          fontSize: `${layer.size * 0.4}px`,
                                          fontWeight: layer.fontWeight,
                                          fontStyle: layer.fontStyle,
                                          fontFamily: layer.fontFamily || 'Arial',
                                          textShadow: isDisc ? '0 1px 2px rgba(0,0,0,0.3)' : '1px 1px 2px rgba(0,0,0,0.8)',
                                          whiteSpace: 'pre' as const,
                                          textAlign: 'center',
                                        }}
                                      >
                                        {iconB && <span className="mr-0.5">{layer.icon}</span>}
                                        {layer.text}
                                        {iconA && <span className="ml-0.5">{layer.icon}</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })()}
                            
                            {/* 2. Üst Overlay: İkon (konumlandırılabilir) */}
                            {iconContent && iconContent.icon_name && (() => {
                              const iconStyleConfig = iconContent.style_config 
                                ? (typeof iconContent.style_config === 'string' 
                                    ? JSON.parse(iconContent.style_config) 
                                    : iconContent.style_config)
                                : {};
                              
                              // Konum bilgisini al (varsayılan: sağ üst)
                              const iconPosition = iconStyleConfig.position || 'top-right';
                              const positionStyles: { [key: string]: any } = {
                                'top-left': { top: '4px', left: '4px', right: 'auto', bottom: 'auto' },
                                'top-right': { top: '4px', right: '4px', left: 'auto', bottom: 'auto' },
                                'bottom-left': { bottom: '4px', left: '4px', right: 'auto', top: 'auto' },
                                'bottom-right': { bottom: '4px', right: '4px', left: 'auto', top: 'auto' },
                                'center': { top: '50%', left: '50%', right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' },
                              };
                              
                              return (
                                <div 
                                  className="absolute z-20 flex items-center justify-center" 
                                  style={{ 
                                    color: iconContent.text_color || '#ffffff', 
                                    fontSize: '3rem',
                                    ...(positionStyles[iconPosition] || positionStyles['top-right']),
                                    ...iconStyleConfig,
                                  }}
                                >
                                  {iconContent.icon_name}
                                </div>
                              );
                            })()}
                            
                            {/* 3. Üst Overlay: Rozet (sol üst köşe) - Animasyonlu */}
                            {badgeContent && badgeContent.campaign_text && (
                              <div className="absolute top-4 left-4 z-20">
                                <span 
                                  className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg badge-pulse"
                                  style={{ 
                                    backgroundColor: badgeContent.background_color || '#3B82F6', 
                                    color: badgeContent.text_color || '#FFFFFF',
                                  }}
                                >
                                  {badgeContent.campaign_text}
                                </span>
                              </div>
                            )}
                            
                            {/* 4. Alt Overlay: Yazı (solda) ve Fiyat (sağda) */}
                            {(displayTitle || displayPrice) && (
                              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-4 z-10 flex items-end justify-between">
                                {displayTitle && (
                                  <div className="text-white text-xl font-bold drop-shadow-lg">
                                    {displayTitle}
                                  </div>
                                )}
                                {displayPrice && (
                                  <div className="text-green-400 text-2xl font-extrabold drop-shadow-lg">
                                    ${Number(displayPrice || 0).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Boş Blok Göstergesi */}
                            {!videoContent && !imageContent && !iconContent && !badgeContent && !textContent && !productContent && (
                              <div className="w-full h-full flex items-center justify-center bg-gray-800/50">
                                <div className="text-gray-500 text-lg font-medium">
                                  Boş
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                );
              })() : (
                <div className="text-center py-12 text-gray-600">
                  <p className="mb-4">
                    {previewTemplate 
                      ? t('editor_preview_loading') 
                      : t('editor_no_blocks_hint')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* AI Generation Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              ✨ AI ile Template Oluştur (Ücretsiz)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  İşletme Tipi
                </label>
                <select
                  value={aiParams.business_type}
                  onChange={(e) => setAiParams({ ...aiParams, business_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="pizza">Pizza</option>
                  <option value="cafe">Cafe</option>
                  <option value="burger">Burger</option>
                  <option value="bakery">{t('editor_bakery')}</option>
                  <option value="restaurant">{t('editor_restaurant')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_screen_count')}
                </label>
                <select
                  value={aiParams.screen_count}
                  onChange={(e) => setAiParams({ ...aiParams, screen_count: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_style')}
                </label>
                <select
                  value={aiParams.preferred_style}
                  onChange={(e) => setAiParams({ ...aiParams, preferred_style: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                >
                  <option value="modern">Modern</option>
                  <option value="classic">{t('editor_classic')}</option>
                  <option value="minimal">{t('editor_minimal')}</option>
                  <option value="colorful">{t('editor_colorful')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_content_type')}
                </label>
                <select
                  value={aiParams.content_type}
                  onChange={(e) => setAiParams({ ...aiParams, content_type: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="menu-heavy">{t('editor_menu_heavy')}</option>
                  <option value="image-heavy">{t('editor_image_heavy')}</option>
                  <option value="campaign-focused">{t('editor_campaign_focused')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_menu_purpose')}
                </label>
                <select
                  value={aiParams.menu_purpose}
                  onChange={(e) => setAiParams({ ...aiParams, menu_purpose: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="main-menu">{t('editor_main_menu')}</option>
                  <option value="campaign">{t('editor_campaign')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_price_level')}
                </label>
                <select
                  value={aiParams.price_level}
                  onChange={(e) => setAiParams({ ...aiParams, price_level: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">{t('editor_low')}</option>
                  <option value="medium">{t('editor_medium')}</option>
                  <option value="premium">{t('editor_premium')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAIModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleAIGenerateSubmit}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50"
              >
                {saving ? t('editor_saving') : '✨ ' + t('editor_create_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('editor_save_as_template')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  {t('editor_template_name')}
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg"
                  placeholder={t('editor_template_name_placeholder')}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                  setSaveAsSystemTemplate(false);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={saving || !templateName.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? t('editor_saving') : t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen TV Preview Modal - TemplateDisplay ile önizleme/düzenleme tutarlılığı (indirim etiketi aynı konumda) */}
      {showFullScreenPreview && (() => {
        const rawBlocks = previewTemplate ? previewBlocks : blocks;
        const currentBlocks = rawBlocks.length === 0 ? [] : rawBlocks
          .slice()
          .sort((a: Block, b: Block) => (a.block_index ?? 0) - (b.block_index ?? 0));
        const screenBlocks = currentBlocks.map((b: Block) => ({
          id: b.id,
          template_block_id: b.id,
          block_index: b.block_index ?? 0,
          position_x: b.position_x ?? 0,
          position_y: b.position_y ?? 0,
          width: b.width ?? 100,
          height: b.height ?? 100,
          style_config: b.style_config,
        }));
        const blockContents = currentBlocks.flatMap((b: Block) =>
          (b.contents || []).map((c: any) => {
            const sc = c.style_config ? (typeof c.style_config === 'string' ? JSON.parse(c.style_config || '{}') : c.style_config) : {};
            const mergedTextLayers = previewEditingTextLayers[c.id] ?? sc.textLayers ?? [];
            const mergedStyle = { ...sc, textLayers: mergedTextLayers };
            return {
              ...c,
              screen_block_id: b.id,
              template_block_id: b.id,
              style_config: mergedStyle,
            };
          })
        );
        const screenData = {
          screen: { id: screen?.id || 'preview', animation_type: 'fade', animation_duration: 500, frame_type: screen?.frame_type || 'none', ticker_text: screen?.ticker_text || '' },
          template: { id: selectedTemplate || '', block_count: currentBlocks.length },
          screenBlocks,
          blockContents,
        };
        return (
        <div 
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setShowFullScreenPreview(false)}
        >
          <div 
            className="relative w-full h-full min-w-0 min-h-0 bg-black"
            style={{ aspectRatio: '16/9', maxWidth: '100vw', maxHeight: '100vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setShowFullScreenPreview(false)}
              className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg transition-all duration-200 flex items-center gap-2"
            >
              <span>✕</span>
              <span>Kapat (ESC)</span>
            </button>

            {/* TV Preview - TemplateDisplay (ön izleme ile aynı render, indirim etiketi doğru konumda) */}
            <div className="absolute inset-0">
              <TemplateDisplay screenData={screenData as any} animationType="fade" animationDuration={500} inline />
            </div>
          </div>
        </div>
        );
      })()}

      {showIconPositionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">İkon Konumu Seçin</h2>
            <p className="text-sm text-gray-600 mb-6">
              İkonun bloğunuzda nerede görünmesini istersiniz?
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-6">
              {/* Sol Üst */}
              <button
                onClick={() => handleIconPositionSelect('top-left')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↖️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_top_left')}</div>
              </button>
              
              {/* Üst Merkez */}
              <button
                onClick={() => handleIconPositionSelect('center')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">⬆️</div>
                <div className="text-xs font-semibold text-gray-700">Merkez</div>
              </button>
              
              {/* Sağ Üst */}
              <button
                onClick={() => handleIconPositionSelect('top-right')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↗️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_top_right')}</div>
              </button>
              
              {/* Sol Alt */}
              <button
                onClick={() => handleIconPositionSelect('bottom-left')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↙️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_bottom_left')}</div>
              </button>
              
              {/* Alt Merkez - Boş */}
              <div className="p-4"></div>
              
              {/* Sağ Alt */}
              <button
                onClick={() => handleIconPositionSelect('bottom-right')}
                disabled={saving}
                className="p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <div className="text-2xl mb-2">↘️</div>
                <div className="text-xs font-semibold text-gray-700">{t('editor_bottom_right')}</div>
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowIconPositionModal(false);
                  setPendingIconContent(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rozet Düzenleme Modalı */}
      {showBadgeEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('editor_badge_edit')}</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rozet Metni
                </label>
                <input
                  type="text"
                  value={editingBadgeText}
                  onChange={(e) => setEditingBadgeText(e.target.value)}
                  placeholder={t('editor_badge_text_placeholder')}
                  className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Arka Plan Rengi
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingBadgeBgColor}
                    onChange={(e) => setEditingBadgeBgColor(e.target.value)}
                    className="w-16 h-10 border-2 border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingBadgeBgColor}
                    onChange={(e) => setEditingBadgeBgColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {t('editor_text_color')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={editingBadgeTextColor}
                    onChange={(e) => setEditingBadgeTextColor(e.target.value)}
                    className="w-16 h-10 border-2 border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editingBadgeTextColor}
                    onChange={(e) => setEditingBadgeTextColor(e.target.value)}
                    placeholder="#FFFFFF"
                    className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  />
                </div>
              </div>
              
              {/* Önizleme */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Önizleme
                </label>
                <div className="p-4 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span 
                    className="px-4 py-2 rounded-lg text-sm font-bold shadow-lg"
                    style={{ 
                      backgroundColor: editingBadgeBgColor, 
                      color: editingBadgeTextColor,
                    }}
                  >
                    {editingBadgeText || t('editor_badge_text')}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleUpdateBadge}
                disabled={saving || !editingBadgeText.trim()}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? t('editor_saving') : '✅ ' + t('btn_save')}
              </button>
              <button
                onClick={() => {
                  setShowBadgeEditModal(false);
                  setPendingBadgeContent(null);
                  setEditingBadgeText('');
                  setEditingBadgeBgColor('#3B82F6');
                  setEditingBadgeTextColor('#FFFFFF');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
              >
                {t('btn_cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}
