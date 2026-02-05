# Çeviri Raporu - İnternasyonalizasyon (i18n) Taraması

**Tarih:** 1 Şubat 2026  
**Diller:** EN (İngilizce), TR (Türkçe), FR (Fransızca)

## Yapılan Değişiklikler

### 1. Yeni Eklenen Çeviri Anahtarları (EN, TR, FR)

| Anahtar | Açıklama |
|---------|----------|
| `settings_title` | Ayarlar sayfası başlığı |
| `settings_pricing` | Fiyatlandırma bölümü |
| `settings_pricing_desc` | Fiyatlandırma açıklaması |
| `settings_plans_loading` | Planlar yükleniyor |
| `settings_plan` | Plan tablo başlığı |
| `settings_monthly_usd` | Aylık ($) |
| `settings_yearly_usd` | Yıllık ($) |
| `settings_max_screens` | Max Ekran |
| `settings_action` | İşlem |
| `settings_unlimited` | Sınırsız |
| `settings_unlimited_hint` | -1 = sınırsız |
| `settings_channel_*_placeholder` | Kanal form placeholder'ları |
| `settings_contact_*_placeholder` | İletişim form placeholder'ları |
| `register_email_placeholder` | E-posta placeholder |
| `register_phone_placeholder` | Telefon placeholder |
| `common_request_failed` | Talep gönderilemedi |
| `common_error_occurred` | Bir hata oluştu |
| `registration_update_failed` | Güncelleme başarısız |
| `editor_select_block_first` | Lütfen önce bir blok seçin |
| `editor_no_content_in_block` | Bu blokta içerik yok |
| `editor_icon_delete` | İkonu Sil |
| `editor_empty` | Boş |
| `editor_example_*` | Örnek placeholder'lar |
| `library_search_placeholder` | İçerik ara |
| `library_update_from_admin` | Admin kütüphanesinden güncelle |
| + diğer editor ve template çevirileri |

### 2. Güncellenen Dosyalar

| Dosya | Değişiklikler |
|-------|---------------|
| `translations.ts` | 70+ yeni çeviri anahtarı (EN, TR, FR) |
| `register/page.tsx` | placeholder, alert mesajları → t() |
| `settings/page.tsx` | Tüm hardcoded Türkçe → t() |
| `registration-requests/page.tsx` | "Update failed" → t() |
| `LoginModal.tsx` | E-posta placeholder → t() |
| `HomePage.tsx` | Varsayılan iletişim değerleri temizlendi |
| `templates/[id]/edit/page.tsx` | Alert ve placeholder'lar → t() |
| `ContentLibrary.tsx` | placeholder, title → t() |

### 3. Henüz Çevrilmemiş Alanlar (Öneri)

Aşağıdaki alanlar büyük dosyalarda veya dinamik içerikte kaldığı için bu turda çevrilmedi:

| Konum | Açıklama |
|-------|----------|
| `templates/[id]/edit` | Bazı alert mesajları (err.message ile birleşik) |
| `ContentLibrary.tsx` | Fallback `contentCategories` içindeki item isimleri (API'den geliyor, fallback sadece) |
| `ContentLibrary.tsx` | `alert(\`${file.name} bir resim dosyası değil!\`)` |
| `screens/[id]/template-editor` | Katman/animation hata mesajları |
| Font grupları | "Standart", "Tebeşir", "El Yazısı" - editor_font_group_* ile mevcut |
| `app/(admin)/pricing` | Eski admin pricing (locale dışı) - kullanılmıyor olabilir |

### 4. Çeviri Kapsamı Özeti

- **Register:** ✅ Tam çevrildi
- **Settings:** ✅ Tam çevrildi  
- **Registration Requests:** ✅ Tam çevrildi
- **Login Modal:** ✅ Placeholder çevrildi
- **HomePage:** ✅ Varsayılan değerler kaldırıldı (API'den geliyor)
- **Template Editor:** ✅ Ana placeholder ve alert'ler çevrildi
- **ContentLibrary:** ✅ Arama ve güncelle title çevrildi
- **Template Editor (detay):** ⚠️ Birçok alert ve label mevcut; kritik olanlar çevrildi

## Kullanım

Tüm çeviriler `frontend/lib/i18n/translations.ts` dosyasında tutulmaktadır. Yeni çeviri eklemek için:

1. `translations.ts` içinde `en`, `tr`, `fr` bölümlerine anahtar ekleyin
2. Bileşende `const { t } = useTranslation()` ile `t('anahtar_adi')` kullanın
