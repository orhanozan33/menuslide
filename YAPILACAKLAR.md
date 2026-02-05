# Yapılacaklar – Sistem Taraması

Bu doküman 5 kategoride taranan maddeleri listeler.

---

## 1. Gereksiz / Kullanılmayan Dosya ve Kod Kalıntıları

### Frontend
- **`frontend/pages/_app.js` ve `frontend/pages/_document.js`**: Next.js App Router kullanılıyor; `app/` altı route'lar aktif. `pages/` klasörü muhtemelen eski Pages Router kalıntısı – kullanılmıyorsa kaldırılabilir veya dokümante edilmeli.
- **Duplicate sayfalar**: `app/(admin)/*` ve `app/[locale]/(admin)/*` – bazı sayfalar hem locale'siz hem locale'li (ör. reports, templates). [locale] altındakiler bazen sadece `export { default } from '@/app/(admin)/...'` yapıyor; tutarlılık için tek kaynak tercih edilebilir.
- **console.error**: Hata yakalama için kullanılan `console.error` çağrıları geliştirme için uygun; canlıda isteğe bağlı olarak log servisine yönlendirilebilir (şimdilik kalabilir).

### Backend
- **Gereksiz console.log**: Aşağıdaki dosyalarda debug amaçlı `console.log` var; canlıya almadan önce kaldırılmalı veya `NODE_ENV === 'development'` ile sarılmalı:
  - `backend/src/users/users.service.ts` (plan update, assignPlan, removeExcessScreens)
  - `backend/src/menu-items/menu-items-local.service.ts`, `menu-items.service.ts`, `menu-items.controller.ts`
  - `backend/src/templates/templates-local.service.ts` (createMenuFromProducts)
  - `backend/src/templates/templates.service.ts`, `templates.controller.ts`
  - `backend/src/subscriptions/stripe-local.service.ts`, `subscriptions.controller.ts`
  - `backend/src/plans/plans.service.ts`
  - `backend/src/main.ts` (middleware log'ları)
  - `backend/src/ai-templates/*`, `screen-block-contents.controller.ts`, `template-block-contents.controller.ts`, `users.controller.ts`

---

## 2. Eksik Çeviriler

- **Sabit Türkçe metinler**: Birçok sayfada `t('key')` yerine doğrudan Türkçe string kullanılmış (ör. "Bu yüklemeyi silmek istediğinize emin misiniz?", "Kullanıcı başarıyla güncellendi", "Yetkiler kaydedildi.", "Düzenle", "Sil", "Kategori", "Seçilen kategoride kütüphanede görünür"). Bunlar `translations.ts` içine key olarak eklenip ilgili sayfalarda `t('key')` ile değiştirilmeli.
- **user-uploads**: "Bu yüklemeyi silmek istediğinize emin misiniz?", "Kategori güncellendi...", "İsim veya e-posta ile ara...", "Bu sayfayı görüntüleme yetkiniz yok.", "Template düzenleyicide Özel Kütüphane..." vb.
- **users/[id]**: "Kullanıcı başarıyla güncellendi", "Kullanıcı adına giriş yapılamadı", "Pencere açılamadı...", "Kullanıcı başarıyla silindi", "Yetkiler kaydedildi."
- **subscription/page**: "Are you sure you want to cancel your subscription?..." → çeviri key’i olmalı.
- **screens/[id]**: "Remove this menu from the screen?" → çeviri key’i.
- **screens/[id]/template**: "Bu içeriği silmek istediğinize emin misiniz?" → çeviri key’i.
- **template-editor**: Birçok "Hata:", "İlk resmi kaldırmak...", "Bu blokta içerik yok" vb. sabit metin.
- **Editor ve diğer sayfalardaki sabit Türkçe/İngilizce metinler** tek tek taranıp `translations.ts` (en, tr, fr) ile eşleştirilmeli.

---

## 3. Sayfa İyileştirmeleri ve Performans

- **Lazy load / dynamic import**: Ağır bileşenler (TemplateEditorPage, CanvasDesignEditor, PenpotEditor vb.) `next/dynamic` ile lazy yüklenebilir; ilk sayfa yükü azalır.
- **Görsel optimizasyonu**: `next/image` kullanımı yaygınlaştırılabilir; büyük listelerde (kütüphane, yüklemeler) gerekirse virtualization (örn. react-window) düşünülebilir.
- **API çağrıları**: Bazı sayfalarda ardışık çağrılar paralel `Promise.all` ile birleştirilebilir (zaten yapılan yerler var; diğer sayfalar gözden geçirilebilir).
- **useEffect bağımlılıkları**: Eksik veya fazla bağımlılık uyarıları (eslint) temizlenmeli.
- **Raporlar / büyük listeler**: Çok büyük tablolarda sayfalama veya sanal liste ile performans iyileştirilebilir.

---

## 4. Canlıya Almak İçin Ön Hazırlık

- **Ortam değişkenleri**: `.env.example` güncel olmalı; `NEXT_PUBLIC_*`, `JWT_SECRET`, veritabanı URL’leri, Stripe key’leri dokümante edilmeli. Canlıda `NODE_ENV=production` kullanılmalı.
- **API URL**: Frontend’de backend adresi env’den okunmalı (localhost sabit kalmamalı).
- **Hata yönetimi**: Genel hata sınırı (error boundary) ve API hata sayfaları kontrol edilmeli.
- **Güvenlik**: CORS, rate limiting, auth token süresi ve HTTPS zorunluluğu gözden geçirilmeli.
- **Loglama**: Backend’de production’da anlamlı log seviyesi (örn. sadece hata veya uyarı); hassas veri loglanmamalı.
- **Veritabanı**: Migration’lar dokümante; yedekleme ve geri yükleme prosedürü yazılmalı.

---

## 5. Site İçi Tüm Alert Bildirimlerinin Modern Yapılması

### Tespit edilen kullanımlar

| Konum | Tip | Metin / Açıklama |
|-------|-----|------------------|
| **users/[id]/page.tsx** | alert | Kullanıcı güncellendi, silindi, yetkiler kaydedildi, impersonate hataları |
| **registration-requests/page.tsx** | alert, confirm | Kaydet hata, "Silmek istediğinize emin misiniz?" |
| **user-uploads/page.tsx** | confirm | "Bu yüklemeyi silmek istediğinize emin misiniz?" |
| **templates/[id]/edit/TemplateEditorPage.tsx** | alert, confirm | Çok sayıda hata/uyarı ve silme onayı |
| **[locale]/(admin)/templates/.../TemplateEditorPage.tsx** | alert, confirm | Aynı kullanımlar |
| **screens/[id]/page.tsx** | confirm | "Remove this menu from the screen?" |
| **screens/page.tsx** | confirm | Silme, yayını durdurma, düzeltme onayları |
| **menus/page.tsx**, **menus/[id]/page.tsx** | confirm | Menü / öğe silme onayı |
| **subscription/page.tsx** | confirm | Abonelik iptal onayı |
| **templates/page.tsx** | confirm | Şablon silme onayı |
| **screens/[id]/template/page.tsx** | alert, confirm | Hata mesajı, içerik silme onayı |
| **screens/[id]/template-editor/page.tsx** | alert | Katman/animasyon hataları, AI template sonucu |

### Yapılacaklar

1. **Ortak ConfirmModal bileşeni**: Başlık, mesaj, İptal / Onay butonları, tehlikeli işlemler için kırmızı vurgu. Tüm `confirm()` çağrıları bu modal ile değiştirilecek.
2. **Toast kullanımı**: Bilgi / başarı / hata mesajları için mevcut `ToastContext` (showSuccess, showError, showWarning) kullanılacak; tüm `alert()` bildirimleri toast veya (gerekirse) modal ile değiştirilecek.
3. **Adım adım**: Önce user-uploads ve users/[id] (en hızlı kazanım), sonra registration-requests, screens, menus, templates, subscription ve editor sayfaları güncellenecek.

---

## Özet Checklist

- [ ] **1** Gereksiz dosyalar (pages/, duplicate route’lar) ve backend console.log temizliği
- [ ] **2** Eksik çevirilerin translations.ts’e eklenmesi ve sayfalarda t() kullanımı
- [ ] **3** Lazy load, görsel/API optimizasyonu, büyük listeler
- [ ] **4** Env, CORS, loglama, güvenlik ve veritabanı dokümantasyonu
- [ ] **5** ConfirmModal + Toast ile tüm alert/confirm modernize
