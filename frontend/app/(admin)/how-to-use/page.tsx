'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useToast } from '@/lib/ToastContext';

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((p, i) => (i % 2 === 1 ? <strong key={i}>{p}</strong> : p));
}

const STEP_IMAGE: Record<string, string> = {
  '1': '/images/how-to-use/step1-templates.png',
  '2': '/images/how-to-use/step2-editor.png',
  'menus': '/images/how-to-use/step-menus.png',
  '3': '/images/how-to-use/step3-screens.png',
};

const STEP_IMAGE_LABELS: Record<string, string> = {
  '1': 'Adım 1 görseli (Şablonlar)',
  '2': 'Adım 2 görseli (Editör)',
  'menus': 'Menüler görseli',
  '3': 'Adım 3 görseli (Ekranlar)',
};

/** Tüm metin anahtarları – modal düzenleme için */
const ALL_TEXT_KEYS: { section: string; keys: string[] }[] = [
  { section: 'Sayfa', keys: ['how_to_use_title', 'how_to_use_intro'] },
  { section: 'Genel etiketler', keys: ['how_to_use_screenshot_label', 'how_to_use_screenshot_placeholder', 'how_to_use_step_label', 'how_to_use_steps_title', 'how_to_use_completed_example'] },
  { section: 'Adım 1 – Şablonlar', keys: ['how_to_use_step1_title', 'how_to_use_step1_subtitle', 'how_to_use_step1_body', 'how_to_use_step1_item1', 'how_to_use_step1_item2', 'how_to_use_step1_item3', 'how_to_use_step1_item4', 'how_to_use_visual_templates', 'how_to_use_visual_layout', 'how_to_use_fallback_caption_1'] },
  { section: 'Adım 2 – Editör', keys: ['how_to_use_step2_title', 'how_to_use_step2_subtitle', 'how_to_use_step2_body', 'how_to_use_step2_item1', 'how_to_use_step2_item2', 'how_to_use_step2_item3', 'how_to_use_step2_item4', 'how_to_use_step2_item5', 'how_to_use_visual_editor', 'how_to_use_visual_content', 'how_to_use_fallback_caption_2'] },
  { section: 'Menüler', keys: ['how_to_use_step_menus_title', 'how_to_use_step_menus_subtitle', 'how_to_use_step_menus_body', 'how_to_use_step_menus_item1', 'how_to_use_step_menus_item2', 'how_to_use_step_menus_item3', 'how_to_use_step_menus_item4', 'how_to_use_step_menus_item5', 'how_to_use_visual_menus', 'how_to_use_visual_menus_sublabel', 'how_to_use_fallback_caption_menus', 'how_to_use_menus_tab_main', 'how_to_use_menus_tab_drinks', 'how_to_use_menus_tab_desserts', 'how_to_use_menus_example_1_name', 'how_to_use_menus_example_1_desc', 'how_to_use_menus_example_2_name', 'how_to_use_menus_example_2_desc', 'how_to_use_menus_example_3_name', 'how_to_use_menus_example_3_desc', 'how_to_use_menus_example_price'] },
  { section: 'Adım 3 – Ekranlar', keys: ['how_to_use_step3_title', 'how_to_use_step3_subtitle', 'how_to_use_step3_body', 'how_to_use_step3_item1', 'how_to_use_step3_item2', 'how_to_use_step3_item3', 'how_to_use_step3_item4', 'how_to_use_step3_item5', 'how_to_use_visual_screens', 'how_to_use_visual_broadcast', 'how_to_use_fallback_caption_3'] },
  { section: 'Hızlı bağlantılar', keys: ['how_to_use_links', 'how_to_use_go_templates', 'how_to_use_go_editor', 'how_to_use_go_menus', 'how_to_use_go_screens'] },
];

/** Modal alan etiketleri – okunabilir isimler */
const FIELD_LABELS: Record<string, string> = {
  how_to_use_title: 'Sayfa başlığı',
  how_to_use_intro: 'Giriş metni',
  how_to_use_screenshot_label: 'Ekran görüntüsü etiketi',
  how_to_use_screenshot_placeholder: 'Görsel placeholder metni',
  how_to_use_step_label: '"Adım" etiketi',
  how_to_use_steps_title: 'Adım adım başlığı',
  how_to_use_completed_example: 'Tamamlanmış örnek etiketi',
  how_to_use_step1_title: 'Adım 1 başlık',
  how_to_use_step1_subtitle: 'Adım 1 alt başlık',
  how_to_use_step1_body: 'Adım 1 açıklama',
  how_to_use_step1_item1: 'Adım 1 – Madde 1',
  how_to_use_step1_item2: 'Adım 1 – Madde 2',
  how_to_use_step1_item3: 'Adım 1 – Madde 3',
  how_to_use_step1_item4: 'Adım 1 – Madde 4',
  how_to_use_visual_templates: 'Sol menü: Şablonlar etiketi',
  how_to_use_visual_layout: 'Sol menü: Yerleşim alt etiketi',
  how_to_use_fallback_caption_1: 'Şablonlar fallback açıklaması',
  how_to_use_step2_title: 'Adım 2 başlık',
  how_to_use_step2_subtitle: 'Adım 2 alt başlık',
  how_to_use_step2_body: 'Adım 2 açıklama',
  how_to_use_step2_item1: 'Adım 2 – Madde 1',
  how_to_use_step2_item2: 'Adım 2 – Madde 2',
  how_to_use_step2_item3: 'Adım 2 – Madde 3',
  how_to_use_step2_item4: 'Adım 2 – Madde 4',
  how_to_use_step2_item5: 'Adım 2 – Madde 5',
  how_to_use_visual_editor: 'Sol menü: Editör etiketi',
  how_to_use_visual_content: 'Sol menü: İçerik alt etiketi',
  how_to_use_fallback_caption_2: 'Editör fallback açıklaması',
  how_to_use_step_menus_title: 'Menüler başlık',
  how_to_use_step_menus_subtitle: 'Menüler alt başlık',
  how_to_use_step_menus_body: 'Menüler açıklama',
  how_to_use_step_menus_item1: 'Menüler – Madde 1',
  how_to_use_step_menus_item2: 'Menüler – Madde 2',
  how_to_use_step_menus_item3: 'Menüler – Madde 3',
  how_to_use_step_menus_item4: 'Menüler – Madde 4',
  how_to_use_step_menus_item5: 'Menüler – Madde 5',
  how_to_use_visual_menus: 'Sol menü: Menüler etiketi',
  how_to_use_visual_menus_sublabel: 'Sol menü: Menüler alt etiketi',
  how_to_use_fallback_caption_menus: 'Menüler fallback açıklaması',
  how_to_use_menus_tab_main: 'Sekme: Ana menü',
  how_to_use_menus_tab_drinks: 'Sekme: İçecekler',
  how_to_use_menus_tab_desserts: 'Sekme: Tatlılar',
  how_to_use_menus_example_1_name: 'Örnek ürün 1 adı',
  how_to_use_menus_example_1_desc: 'Örnek ürün 1 açıklama',
  how_to_use_menus_example_2_name: 'Örnek ürün 2 adı',
  how_to_use_menus_example_2_desc: 'Örnek ürün 2 açıklama',
  how_to_use_menus_example_3_name: 'Örnek ürün 3 adı',
  how_to_use_menus_example_3_desc: 'Örnek ürün 3 açıklama',
  how_to_use_menus_example_price: 'Örnek fiyat',
  how_to_use_step3_title: 'Adım 3 başlık',
  how_to_use_step3_subtitle: 'Adım 3 alt başlık',
  how_to_use_step3_body: 'Adım 3 açıklama',
  how_to_use_step3_item1: 'Adım 3 – Madde 1',
  how_to_use_step3_item2: 'Adım 3 – Madde 2',
  how_to_use_step3_item3: 'Adım 3 – Madde 3',
  how_to_use_step3_item4: 'Adım 3 – Madde 4',
  how_to_use_step3_item5: 'Adım 3 – Madde 5',
  how_to_use_visual_screens: 'Sol menü: Ekranlar etiketi',
  how_to_use_visual_broadcast: 'Sol menü: Yayın alt etiketi',
  how_to_use_fallback_caption_3: 'Ekranlar fallback açıklaması',
  how_to_use_links: 'Hızlı bağlantılar başlığı',
  how_to_use_go_templates: 'Link: Şablonlar',
  how_to_use_go_editor: 'Link: Editör',
  how_to_use_go_menus: 'Link: Menüler',
  how_to_use_go_screens: 'Link: Ekranlar',
};

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/^how_to_use_/, '').replace(/_/g, ' ');
}

/** Tek katmanlı, sade açıklama görselleri */
function StepVisualFallback({ stepKey, caption, getText }: { stepKey: string; caption: string; getText: (k: string) => string }) {
  if (stepKey === '1') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-2xl">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-14 rounded-lg bg-slate-50 border border-slate-200 p-1.5 space-y-1">
            <div className="h-7 rounded bg-blue-500 text-white flex items-center justify-center text-xs">🎨</div>
            <div className="h-6 rounded border border-slate-200 bg-white flex items-center justify-center text-[10px]">✏️</div>
            <div className="h-6 rounded border border-slate-200 bg-white flex items-center justify-center text-[10px]">🍽️</div>
            <div className="h-6 rounded border border-slate-200 bg-white flex items-center justify-center text-[10px]">📺</div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="aspect-[4/3] grid grid-cols-2 gap-0.5 p-0.5 bg-slate-50">
                  <div className="rounded bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm">🖼️</div>
                  <div className="rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-500">Metin</div>
                  <div className="col-span-2 rounded bg-emerald-100 flex items-center justify-center text-[8px] text-emerald-700">Menü</div>
                </div>
                <div className="px-2 py-1 text-[10px] font-medium text-slate-700">2 Blok + Menü</div>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="aspect-[4/3] grid grid-cols-2 gap-0.5 p-0.5 bg-slate-50">
                  <div className="rounded bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-sm">📷</div>
                  <div className="rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-500">Metin</div>
                  <div className="rounded bg-slate-100 flex items-center justify-center text-[8px] text-slate-500">Metin</div>
                  <div className="rounded bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-sm">🖼️</div>
                </div>
                <div className="px-2 py-1 text-[10px] font-medium text-slate-700">2×2 (2 resim)</div>
              </div>
              <div className="rounded-lg border border-slate-200 overflow-hidden">
                <div className="aspect-[4/3] flex gap-0.5 p-0.5 bg-slate-50">
                  <div className="flex-1 rounded bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-base">🍕</div>
                  <div className="w-2/5 rounded bg-emerald-100 flex flex-col justify-center px-1 text-[8px] text-emerald-700">Menü 12.99 $</div>
                </div>
                <div className="px-2 py-1 text-[10px] font-medium text-slate-700">Resim + Menü</div>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{caption}</p>
          </div>
        </div>
      </div>
    );
  }
  if (stepKey === '2') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-2xl">
        <div className="flex gap-4">
          <div className="flex-1 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3 min-h-[180px]">
            <div className="flex gap-2 mb-2">
              <div className="w-14 h-14 rounded-lg bg-amber-200 border border-amber-400 flex items-center justify-center text-sm font-bold text-amber-800">LOGO</div>
              <div className="flex-1">
                <div className="h-3 w-4/5 rounded bg-slate-600 mb-1.5" />
                <div className="h-2.5 w-full rounded bg-slate-200 mb-1" />
                <div className="h-2.5 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
            <div className="rounded border border-slate-200 bg-white p-2 grid grid-cols-2 gap-1">
              {['Margherita 12.99 $', 'Pepperoni 12.99 $', 'Karışık 12.99 $', 'Sucuklu 12.99 $'].map((item, i) => (
                <div key={i} className="rounded border border-slate-100 bg-slate-50 px-2 py-1 text-[10px] text-slate-700">{item}</div>
              ))}
            </div>
          </div>
          <div className="w-40 flex-shrink-0 rounded-lg border border-slate-200 bg-white p-2 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-600">Özellikler</div>
            <div className="text-[9px] text-slate-600">Görsel, metin, menü düzenlenir</div>
            <div className="h-7 rounded bg-blue-500 text-white flex items-center justify-center text-[10px] font-medium">Kaydet</div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{caption}</p>
      </div>
    );
  }
  if (stepKey === 'menus') {
    const tabLabels = [getText('how_to_use_menus_tab_main'), getText('how_to_use_menus_tab_drinks'), getText('how_to_use_menus_tab_desserts')];
    const items = [
      { name: getText('how_to_use_menus_example_1_name'), desc: getText('how_to_use_menus_example_1_desc'), price: getText('how_to_use_menus_example_price') },
      { name: getText('how_to_use_menus_example_2_name'), desc: getText('how_to_use_menus_example_2_desc'), price: getText('how_to_use_menus_example_price') },
      { name: getText('how_to_use_menus_example_3_name'), desc: getText('how_to_use_menus_example_3_desc'), price: getText('how_to_use_menus_example_price') },
    ];
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-2xl">
        <div className="flex gap-2 mb-3">
          {tabLabels.map((tab, i) => (
            <span key={i} className={`px-2.5 py-1 rounded text-sm font-medium ${i === 0 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>{tab}</span>
          ))}
        </div>
        <div className="space-y-2">
          {items.map((row, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-2">
              <div className="w-12 h-12 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-base">🍕</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-800">{row.name}</div>
                <div className="text-xs text-slate-500">{row.desc}</div>
              </div>
              <div className="text-sm font-bold text-emerald-600">{row.price}</div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">{caption}</p>
      </div>
    );
  }
  if (stepKey === '3') {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 max-w-2xl">
        <div className="rounded-lg border-2 border-slate-700 bg-slate-900 aspect-video flex flex-col overflow-hidden">
          <div className="flex-1 grid grid-cols-3 gap-1 p-1.5 min-h-0">
            <div className="col-span-2 rounded bg-gradient-to-br from-amber-600 to-orange-500 flex items-center justify-center text-2xl">🍕</div>
            <div className="rounded bg-gradient-to-br from-emerald-700 to-teal-800 flex items-center justify-center text-xl">🖼️</div>
          </div>
          <div className="flex flex-1 gap-1 p-1.5 min-h-0">
            <div className="flex-1 rounded bg-slate-800 p-2">
              <div className="text-[10px] font-bold text-emerald-300 mb-1">Menü</div>
              {['Margherita 12.99 $', 'Pepperoni 12.99 $', 'Karışık 12.99 $'].map((item, i) => (
                <div key={i} className="text-[9px] text-white/90">{item}</div>
              ))}
            </div>
            <div className="w-1/3 rounded bg-gradient-to-br from-violet-600 to-purple-800 flex items-center justify-center text-xl">📷</div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{caption}</p>
      </div>
    );
  }
  return null;
}

export default function HowToUsePage() {
  const { t, localePath } = useTranslation();
  const toast = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});
  const [user, setUser] = useState<{ role?: string } | null>(null);
  const [contentOverride, setContentOverride] = useState<{ texts: Record<string, string>; images: Record<string, string> }>({ texts: {}, images: {} });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModalTab, setEditModalTab] = useState<'images' | 'text'>('images');
  const [editTexts, setEditTexts] = useState<Record<string, string>>({});
  const [editImages, setEditImages] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('impersonation_user') || localStorage.getItem('user');
      if (raw) setUser(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    fetch('/api/how-to-use-content', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data: { texts?: Record<string, string>; images?: Record<string, string> }) =>
        setContentOverride({
          texts: data.texts && typeof data.texts === 'object' ? data.texts : {},
          images: data.images && typeof data.images === 'object' ? data.images : {},
        })
      )
      .catch(() => {});
  }, []);

  const getText = (key: string) => (contentOverride.texts && contentOverride.texts[key] !== undefined && contentOverride.texts[key] !== '' ? contentOverride.texts[key] : t(key));
  const getImage = (stepKey: string) => (contentOverride.images && contentOverride.images[stepKey]?.trim() ? contentOverride.images[stepKey] : STEP_IMAGE[stepKey] || '');

  const openEditModal = () => {
    const texts: Record<string, string> = {};
    ALL_TEXT_KEYS.forEach(({ keys }) => keys.forEach((key) => { texts[key] = contentOverride.texts?.[key] ?? t(key); }));
    const images: Record<string, string> = {};
    (['1', '2', 'menus', '3'] as const).forEach((k) => { images[k] = contentOverride.images?.[k] ?? STEP_IMAGE[k] ?? ''; });
    setEditTexts(texts);
    setEditImages(images);
    setEditModalTab('images');
    setShowEditModal(true);
  };

  const saveEditModal = async () => {
    setSaving(true);
    try {
      const token = sessionStorage.getItem('impersonation_token') || localStorage.getItem('auth_token');
      const res = await fetch('/api/how-to-use-content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ texts: editTexts, images: editImages }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || t('settings_save_failed'));
      setContentOverride({ texts: data.texts || editTexts, images: data.images || editImages });
      setShowEditModal(false);
      toast.showSuccess(t('how_to_use_save_success'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isBackendError = /backend|bağlantı|connection|sunucu|serveur/i.test(msg);
      toast.showError(isBackendError ? t('common_backend_error') : (msg || t('settings_save_failed')));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    { key: '1' as const, icon: '🎨', titleKey: 'how_to_use_step1_title' as const, subtitleKey: 'how_to_use_step1_subtitle' as const, bodyKey: 'how_to_use_step1_body' as const, itemKeys: ['how_to_use_step1_item1', 'how_to_use_step1_item2', 'how_to_use_step1_item3', 'how_to_use_step1_item4'] as const, visualLabel: 'how_to_use_visual_templates' as const, visualSublabel: 'how_to_use_visual_layout' as const },
    { key: '2' as const, icon: '✏️', titleKey: 'how_to_use_step2_title' as const, subtitleKey: 'how_to_use_step2_subtitle' as const, bodyKey: 'how_to_use_step2_body' as const, itemKeys: ['how_to_use_step2_item1', 'how_to_use_step2_item2', 'how_to_use_step2_item3', 'how_to_use_step2_item4', 'how_to_use_step2_item5'] as const, visualLabel: 'how_to_use_visual_editor' as const, visualSublabel: 'how_to_use_visual_content' as const },
    { key: 'menus' as const, icon: '🍽️', titleKey: 'how_to_use_step_menus_title' as const, subtitleKey: 'how_to_use_step_menus_subtitle' as const, bodyKey: 'how_to_use_step_menus_body' as const, itemKeys: ['how_to_use_step_menus_item1', 'how_to_use_step_menus_item2', 'how_to_use_step_menus_item3', 'how_to_use_step_menus_item4', 'how_to_use_step_menus_item5'] as const, visualLabel: 'how_to_use_visual_menus' as const, visualSublabel: 'how_to_use_visual_menus_sublabel' as const },
    { key: '3' as const, icon: '📺', titleKey: 'how_to_use_step3_title' as const, subtitleKey: 'how_to_use_step3_subtitle' as const, bodyKey: 'how_to_use_step3_body' as const, itemKeys: ['how_to_use_step3_item1', 'how_to_use_step3_item2', 'how_to_use_step3_item3', 'how_to_use_step3_item4', 'how_to_use_step3_item5'] as const, visualLabel: 'how_to_use_visual_screens' as const, visualSublabel: 'how_to_use_visual_broadcast' as const },
  ];

  const quickLinks = [
    { href: 'templates', labelKey: 'how_to_use_go_templates' as const, icon: '🎨' },
    { href: 'editor', labelKey: 'how_to_use_go_editor' as const, icon: '✏️' },
    { href: 'menus', labelKey: 'how_to_use_go_menus' as const, icon: '🍽️' },
    { href: 'screens', labelKey: 'how_to_use_go_screens' as const, icon: '📺' },
  ];

  const selectedStep = steps[selectedIndex];
  const stepImageUrl = getImage(selectedStep.key);
  const showImage = stepImageUrl && !imageError[selectedStep.key];
  const canEdit = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* Başlık – modern, canlı */}
        <header className="mb-8 md:mb-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium mb-4">
              <span>📖</span>
              <span>{getText('how_to_use_title')}</span>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openEditModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-md"
              >
                {t('btn_edit')}
              </button>
            )}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2 tracking-tight">
            {getText('how_to_use_title')}
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl">
            {getText('how_to_use_intro')}
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-6 md:gap-8">
          {/* Sol: Adım seçici – tamamlanmış kartlar */}
          <aside className="md:w-80 flex-shrink-0">
            <nav className="space-y-2" aria-label={getText('how_to_use_title')}>
              {steps.map((step, index) => {
                const isActive = selectedIndex === index;
                return (
                  <button
                    key={step.key}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`w-full text-left rounded-2xl border-2 p-4 transition-all duration-200 ${
                      isActive
                        ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-white shadow-lg shadow-blue-500/10 scale-[1.02]'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md hover:scale-[1.01]'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                        isActive ? 'bg-blue-500 text-white shadow-md' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {step.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold uppercase tracking-wide ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                            {getText('how_to_use_step_label')} {index + 1}
                          </span>
                        </div>
                        <div className={`font-semibold truncate ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                          {getText(step.visualLabel)}
                        </div>
                        <div className="text-sm text-slate-500 truncate">
                          {getText(step.visualSublabel)}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">{getText('how_to_use_links')}</h3>
              <div className="grid grid-cols-2 gap-2">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={localePath(`/${link.href}`)}
                    className="flex items-center gap-2 p-3 rounded-xl bg-white border-2 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-sm font-medium text-slate-800 transition-colors"
                  >
                    <span className="text-lg">{link.icon}</span>
                    <span className="truncate">{getText(link.labelKey)}</span>
                  </Link>
                ))}
              </div>
            </div>
          </aside>

          {/* Sağ: Tam anlatımlı adım içeriği + sistem ekran görüntüsü */}
          <main className="flex-1 min-w-0">
            <article className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-100/50">
              {/* Üst: Başlık ve özet */}
              <div className="p-6 md:p-8 pb-4 border-b border-slate-100 bg-gradient-to-br from-slate-50/80 to-white">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500 text-white text-lg font-bold shadow-md">
                    {selectedIndex + 1}
                  </span>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                    {getText(selectedStep.titleKey)}
                  </h2>
                </div>
                <p className="text-blue-600 font-medium mb-3">
                  {getText(selectedStep.subtitleKey)}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {renderBold(getText(selectedStep.bodyKey))}
                </p>
              </div>

              {/* Sistem ekran görüntüsü – tamamlanmış örnek / canlı görsel */}
              <div className="p-6 md:p-8 pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-0.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    {getText('how_to_use_screenshot_label')}
                  </span>
                  {!showImage && (
                    <span className="ml-2 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      {getText('how_to_use_completed_example')}
                    </span>
                  )}
                </div>
                {showImage ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 max-w-2xl">
                    <img
                      src={stepImageUrl}
                      alt=""
                      className="w-full h-auto max-h-[440px] object-contain object-top"
                      onError={() => setImageError((prev) => ({ ...prev, [selectedStep.key]: true }))}
                    />
                  </div>
                ) : (
                  <div className="transition-opacity duration-300" key={selectedStep.key}>
                    <StepVisualFallback
                      stepKey={selectedStep.key}
                      caption={selectedStep.key === '1' ? getText('how_to_use_fallback_caption_1') : selectedStep.key === '2' ? getText('how_to_use_fallback_caption_2') : selectedStep.key === 'menus' ? getText('how_to_use_fallback_caption_menus') : getText('how_to_use_fallback_caption_3')}
                      getText={getText}
                    />
                  </div>
                )}
              </div>

              {/* Adım adım tam anlatım – vurgulu, okunaklı */}
              <div className="px-6 md:px-8 pb-8 bg-gradient-to-b from-white to-slate-50/50 rounded-b-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-8 h-0.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    {getText('how_to_use_steps_title')}
                  </span>
                </div>
                <ol className="space-y-4">
                  {selectedStep.itemKeys.map((itemKey, i) => (
                    <li key={itemKey} className="flex gap-4 group">
                      <span className="flex-shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-slate-50 border-2 border-blue-200 flex items-center justify-center text-sm font-bold text-blue-700 shadow-sm group-hover:border-blue-300 transition-colors">
                        {i + 1}
                      </span>
                      <div className="text-slate-700 leading-relaxed pt-1 pr-2 border-l-2 border-slate-100 pl-1 -ml-1">
                        {renderBold(getText(itemKey))}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </article>
          </main>
        </div>
      </div>

      {/* Düzenleme modalı – modern sayfa düzeni */}
      {showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => !saving && setShowEditModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="text-lg">✏️</span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl font-bold text-slate-900 truncate">{t('how_to_use_edit_modal_title')}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{t('how_to_use_edit_modal_desc')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !saving && setShowEditModal(false)}
                  className="flex-shrink-0 p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                  aria-label={t('common_close')}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex-shrink-0 flex border-b border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => setEditModalTab('images')}
                className={`flex-1 px-5 py-3 text-sm font-medium transition-colors ${editModalTab === 'images' ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                🖼️ Görseller
              </button>
              <button
                type="button"
                onClick={() => setEditModalTab('text')}
                className={`flex-1 px-5 py-3 text-sm font-medium transition-colors ${editModalTab === 'text' ? 'text-blue-600 bg-white border-b-2 border-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
              >
                📝 Metinler
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {editModalTab === 'images' && (
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-slate-800">Adım görselleri</h3>
                  <p className="text-xs text-slate-500 -mt-2">Görsel URL veya site içi yol (örn. /images/how-to-use/step1-templates.png). Boş bırakırsanız varsayılan görsel kullanılır.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {(['1', '2', 'menus', '3'] as const).map((key) => (
                      <div key={key} className="bg-white rounded-lg border border-slate-200 p-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">{STEP_IMAGE_LABELS[key]}</label>
                        <input
                          type="text"
                          value={editImages[key] ?? ''}
                          onChange={(e) => setEditImages((prev) => ({ ...prev, [key]: e.target.value }))}
                          className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow"
                          placeholder={STEP_IMAGE[key]}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editModalTab === 'text' && (
                <div className="space-y-6">
                  {ALL_TEXT_KEYS.map(({ section, keys }) => (
                    <div key={section} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                      <div className="px-4 py-3 bg-white border-b border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-800">{section}</h3>
                      </div>
                      <div className="p-4 space-y-4">
                        {keys.map((key) => (
                          <div key={key}>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">{getFieldLabel(key)}</label>
                            <textarea
                              value={editTexts[key] ?? ''}
                              onChange={(e) => setEditTexts((prev) => ({ ...prev, [key]: e.target.value }))}
                              rows={key.includes('body') || key.includes('item') ? 3 : 2}
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm resize-y focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-shadow bg-white"
                              placeholder={t(key)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => !saving && setShowEditModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 font-medium text-sm transition-colors"
              >
                {t('btn_cancel')}
              </button>
              <button
                type="button"
                onClick={saveEditModal}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 font-medium text-sm shadow-lg shadow-blue-600/20 transition-all"
              >
                {saving ? t('common_saving') : t('btn_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
