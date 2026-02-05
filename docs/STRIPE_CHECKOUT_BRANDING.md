# Stripe Checkout Marka ve Kurumsal Açıklamalar

## Kurumsal Açıklamalar (Sol Panel)

Checkout'un sol panelindeki ürün açıklaması `stripe-local.service.ts` içinde dinamik oluşturuluyor:

- **Başlık:** MenuSlide by Findpoint
- **Açıklama:** Düzenli madde işaretli liste (ekran sayısı, sınırsız menü, anlık güncelleme, destek)
- **Paket görseli:** `frontend/public/checkout-package-preview.png` — alınan paketin ekran görüntüsü (dijital menü örneği)

**Not:** Görsel yalnızca production ortamında gösterilir. Stripe görselleri sunucudan indirdiği için `localhost` URL'leri çalışmaz. Production'da `CORS_ORIGIN` veya `STRIPE_CHECKOUT_PREVIEW_IMAGE` ile tam URL belirtin (örn. `https://menuslide.com/checkout-package-preview.png`).

## Marka Renkleri

Checkout sayfasının renklerini ayarlamak için Stripe Dashboard kullanın.

## Adımlar

1. **Stripe Dashboard** → [https://dashboard.stripe.com/settings/branding](https://dashboard.stripe.com/settings/branding)
2. **Checkout** sekmesine geçin (veya **Branding** > **Checkout**)

## Menuslide Renk Paleti

| Ayar | Hex | Açıklama |
|------|-----|----------|
| **Arka plan** | `#06090f` | Koyu lacivert |
| **Buton / Accent** | `#10b981` | Yeşil (emerald) |
| **İkincil vurgu** | `#06b6d4` | Cyan |

## Dashboard'da Yapılacaklar

1. **Background color:** `#06090f` (veya en koyu ton)
2. **Button / Accent color:** `#10b981` (emerald yeşil)
3. **Font:** İsterseniz Inter veya mevcut font
4. **Logo:** menuslide logosunu yükleyebilirsiniz

Bu ayarlar tüm Checkout oturumlarına uygulanır; sol bölüm koyu arka plan ve yeşil vurgu ile sitenizle uyumlu görünür.

## Otomatik Vergi (Stripe Tax)

Checkout'ta vergi hesaplaması etkinleştirildi:

- **automatic_tax:** Müşteri adresine göre GST/HST otomatik hesaplanır
- **billing_address_collection:** Fatura adresi zorunludur (vergi için gerekli)
- **tax_behavior:** `exclusive` — fiyat vergi hariç, vergi üzerine eklenir

**Stripe Dashboard'da yapılması gerekenler:**
1. [Stripe Tax ayarları](https://dashboard.stripe.com/settings/tax) — Stripe Tax etkin mi kontrol edin
2. Merkez ofis adresini girin (Kanada için)
3. Ürün vergi kodu: `txcd_10103000` (Checkout'ta product_data içinde ayarlı)

Stripe Tax etkin değilse Checkout çalışmaya devam eder ancak vergi satırı CA$0,00 görünür.
