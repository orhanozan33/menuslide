'use client';

import React, { useCallback } from 'react';
import dynamic from 'next/dynamic';
import grapesjs, { type Editor } from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import { useTranslation } from '@/lib/i18n/useTranslation';

function GjsEditorLoading() {
  const { t } = useTranslation();
  return <div className="flex items-center justify-center min-h-[70vh] text-slate-600">{t('editor_loading')}</div>;
}

const GjsEditor = dynamic(
  () => import('@grapesjs/react').then((mod) => mod.default),
  { ssr: false, loading: () => <GjsEditorLoading /> }
);

const STORAGE_KEY = 'gjs-tv-editor';

function addBlocks(editor: Editor, tvTemplatesLabel: string) {
  const bm = editor.BlockManager;

  // Metin blokları
  bm.add('metin-baslik', {
    label: 'Başlık',
    category: 'Metin',
    content: '<h1>Başlık</h1>',
    media: '<span style="font-size:24px">H1</span>',
  });
  bm.add('metin-alt-baslik', {
    label: 'Alt başlık',
    category: 'Metin',
    content: '<h2>Alt başlık</h2>',
    media: '<span style="font-size:18px">H2</span>',
  });
  bm.add('metin-paragraf', {
    label: 'Paragraf',
    category: 'Metin',
    content: '<p>Buraya metin yazın. Çift tıklayarak düzenleyebilirsiniz.</p>',
    media: '<span style="font-size:14px">¶</span>',
  });
  bm.add('metin-liste', {
    label: 'Liste',
    category: 'Metin',
    content: '<ul><li>Madde 1</li><li>Madde 2</li><li>Madde 3</li></ul>',
    media: '<span style="font-size:14px">≡</span>',
  });

  // Görsel & medya
  bm.add('gorsel', {
    label: 'Görsel',
    category: 'Medya',
    content: { type: 'image', activeOnRender: true },
    media: '<span style="font-size:20px">🖼</span>',
  });
  bm.add('video-yer-tutucu', {
    label: 'Video alanı',
    category: 'Medya',
    content: '<div class="video-placeholder" style="background:#1e293b;color:#94a3b8;padding:3rem;text-align:center;min-height:120px;display:flex;align-items:center;justify-content:center;border-radius:8px;">Video alanı</div>',
    media: '<span style="font-size:20px">▶</span>',
  });

  // Bölüm / grid
  bm.add('bolum-tam', {
    label: 'Tam genişlik bölüm',
    category: 'Bölüm',
    content: '<section style="padding:1.5rem;min-height:80px;"><div data-gjs-type="text">İçerik</div></section>',
    media: '<span style="font-size:18px">▬</span>',
  });
  bm.add('bolum-iki-sutun', {
    label: 'İki sütun',
    category: 'Bölüm',
    content: `<div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;padding:1rem;">
      <div>Sol sütun</div>
      <div>Sağ sütun</div>
    </div>`,
    media: '<span style="font-size:18px">▐▌</span>',
  });
  bm.add('bolum-uc-sutun', {
    label: 'Üç sütun',
    category: 'Bölüm',
    content: `<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:1rem;padding:1rem;">
      <div>1</div><div>2</div><div>3</div>
    </div>`,
    media: '<span style="font-size:18px">▐▐▌</span>',
  });

  // Buton
  bm.add('buton', {
    label: 'Buton',
    category: 'Öğeler',
    content: '<a href="#" class="btn" style="display:inline-block;padding:0.6rem 1.2rem;background:#3b82f6;color:white;text-decoration:none;border-radius:6px;">Buton</a>',
    media: '<span style="font-size:18px">◉</span>',
  });
  bm.add('ayirici', {
    label: 'Ayırıcı çizgi',
    category: 'Öğeler',
    content: '<hr style="border:0;border-top:1px solid #e2e8f0;margin:1rem 0;">',
    media: '<span style="font-size:14px">—</span>',
  });

  // TV Şablonları (bizim kullandığımız tek bloklu / 2'li / 3'lü)
  const tvBase = 'aspect-ratio:16/9;max-width:100%;background:linear-gradient(135deg,#1e293b,#0f172a);border-radius:12px;overflow:hidden;border:2px solid #334155;box-sizing:border-box;';
  const tvCell = 'display:flex;align-items:center;justify-content:center;color:#94a3b8;background:rgba(255,255,255,0.06);border-radius:8px;font-size:0.9rem;min-height:60px;';

  bm.add('tv-tek-blok', {
    label: 'Tek bloklu TV şablonu',
    category: tvTemplatesLabel,
    content: `<div class="tv-template tv-1block" style="${tvBase}display:flex;align-items:stretch;">
      <div class="tv-block" style="flex:1;${tvCell}">İçerik alanı</div>
    </div>`,
    media: '<span style="font-size:20px" title="1 blok">■</span>',
  });
  bm.add('tv-ikili', {
    label: "2'li TV şablonu",
    category: tvTemplatesLabel,
    content: `<div class="tv-template tv-2block" style="${tvBase}display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px;box-sizing:border-box;">
      <div class="tv-block" style="${tvCell}">1</div>
      <div class="tv-block" style="${tvCell}">2</div>
    </div>`,
    media: '<span style="font-size:20px" title="2 blok">▐▌</span>',
  });
  bm.add('tv-uclu', {
    label: "3'lü TV şablonu",
    category: tvTemplatesLabel,
    content: `<div class="tv-template tv-3block" style="${tvBase}display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:12px;box-sizing:border-box;">
      <div class="tv-block" style="${tvCell}">1</div>
      <div class="tv-block" style="${tvCell}">2</div>
      <div class="tv-block" style="${tvCell}">3</div>
    </div>`,
    media: '<span style="font-size:20px" title="3 blok">▐▐▌</span>',
  });
}

export default function GrapesEditorClient() {
  const { t } = useTranslation();
  const onEditor = useCallback((editor: Editor) => {
    editor.on('storage:end:store', () => {});
    addBlocks(editor, t('editor_tv_templates'));
  }, [t]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden min-h-[75vh]">
      <GjsEditor
        grapesjs={grapesjs}
        onEditor={onEditor}
        options={{
          height: '75vh',
          storageManager: {
            type: 'local',
            autosave: true,
            autoload: true,
            stepsBeforeSave: 1,
            options: {
              local: { key: STORAGE_KEY },
            },
          },
          assetManager: {
            upload: '/api/upload',
            uploadName: 'files',
            multiUpload: true,
            autoAdd: true,
          },
          deviceManager: {
            devices: [
              { name: 'Masaüstü', width: '' },
              { name: 'Tablet', width: '768px' },
              { name: 'Mobil', width: '320px' },
            ],
          },
          blockManager: {
            // Seçili blok varsa eklenen her şey onun İÇİNE eklenir; yoksa sayfa köküne eklenir
            appendOnClick: (block, editor) => {
              const selected = editor.getSelected();
              const content = block.getContent();
              if (selected && content) {
                selected.append(content);
              } else if (content) {
                const wrapper = editor.getWrapper();
                if (wrapper) wrapper.append(content);
              }
            },
          },
        }}
      />
    </div>
  );
}
