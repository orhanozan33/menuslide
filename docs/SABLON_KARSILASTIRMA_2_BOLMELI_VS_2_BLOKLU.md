# Sistem şablonları karşılaştırması: 2 Bölmeli Düzen vs 2 Bloklu Şablon

## Kaynak

| Özellik | 2 Bölmeli Düzen | 2 Bloklu Şablon |
|--------|------------------|------------------|
| **Kaynak** | Veritabanı şeması (`templates-schema.sql`) | Admin panelinden oluşturulan sistem şablonu (backend `createSystemTemplates`) |
| **Template name (DB)** | `split_2` | `system-2-block-{uniq}-0` |
| **display_name (DB)** | `2 Split Layout` | `2 bloklu şablon` |
| **Frontend’de görünen ad** | 2 Bölmeli Düzen (`template_name_2_split_layout`) | 2 Bloklu Şablon (`template_block_template` {n}=2) |

## Blok düzeni (template_blocks)

### 2 Bölmeli Düzen (split_2)
- **Blok 0:** position_x=0, position_y=0, **width=50, height=100** (%50 genişlik, **%100 yükseklik**)
- **Blok 1:** position_x=50, position_y=0, **width=50, height=100** (%50 genişlik, **%100 yükseklik**)
- Sonuç: İki blok yan yana, **tüm ekran yüksekliği dolu**.

### 2 Bloklu Şablon (backend ile oluşturulan)
- Backend `createTemplateBlocks(2)` içinde `gridSize = Math.ceil(Math.sqrt(2)) = 2` kullanılıyor; yükseklik de 100/2 = **50** alınıyordu.
- **Blok 0:** position_x=0, position_y=0, width=50, **height=50**
- **Blok 1:** position_x=50, position_y=0, width=50, **height=50**
- Sonuç: İki blok yan yana ama **sadece üst yarı dolu**, **alt yarı boş**.

## Yayın sırasında fark

- **2 Bölmeli Düzen:** Yayında ekran tam dolu; iki bölme tam yükseklikte.
- **2 Bloklu Şablon:** Yayında bloklar sadece üst yarıda; **sayfa altında büyük boşluk** (tam ekran değil).

## Düzeltme

1. **Backend (uygulandı):** `createTemplateBlocks` içinde grid boyutu artık `getGridLayout(blockCount)` ile alınıyor. 2 blok için cols=2, rows=1; blok yüksekliği %100. Bundan sonra oluşturulan “2 Bloklu Şablon” yayında tam yükseklikte görünecek.
2. **Mevcut veritabanı:** Daha önce oluşturulmuş “2 bloklu şablon” kayıtlarında bloklar hâlâ height=50 olabilir. Bunları düzeltmek için `migration-fix-2-block-template-height.sql` çalıştırılabilir.
