# Tek Kaynak, Çok Kanal — Sistemsel Otomatik ve Maliyet Odaklı Model

Kullanıcı tek yerde template oluşturur, yayına alır. Sistem **web**, **Android APK** ve **Roku** için aynı içeriği otomatik sunar. Maliyet her zaman düşük tutulur.

---

## 1) Tek kaynak (Single source of truth)

| Katman | Açıklama |
|--------|----------|
| **Veri** | Template’ler ve yayın verisi tek yerde: **Supabase (DB)**. |
| **Yayın** | Tek aksiyon: **Yayınla** → `screen_template_rotations` + ekran ayarları güncellenir. |
| **Görseller** | Yayın anında **bir kez** oluşturulur → Spaces’e yüklenir. Tekrarda üretim yok. |

Kullanıcı ne yaparsa yapsın (web’de, Android’de veya Roku’da izlesin) **aynı layout** kullanılır. Platforma göre ayrı template/layout tutulmaz.

---

## 2) Kanal bazlı davranış (Platform-aware)

### Web

- **Kullanım:** Tarayıcıda `/display/{slug}` veya `?lite=1`.
- **Veri:** Aynı API: `GET /api/public/screen/{token}` (veya benzeri). Layout + rotasyonlar DB’den.
- **Maliyet:** Sayfa CDN/edge ile cache’lenebilir; gereksiz API çağrısı yok.

### Android (APK)

- **Kullanım:** Cihaz kodu girer → `POST /api/device/register` → layout yanıtta gelir.
- **Veri:** Register cevabındaki `layout` (ve gerekiyorsa periyodik `GET /api/device/layout`).
- **Güncelleme:** İsteğe bağlı: Roku’daki gibi **version** ile periyodik kontrol; sadece version değişince tam layout çekilir → trafik ve maliyet azalır.

### Roku

- **Kullanım:** Cihaz kodu girer → register → layout + periyodik yenileme.
- **Veri:** `POST /api/device/register`, `GET /api/device/layout`, `GET /api/device/version`.
- **Maliyet:** Önce **version** çekilir; version aynıysa layout isteği yapılmaz. Slide görselleri CDN’den (Spaces), API sadece JSON.

Hepsi **aynı backend, aynı layout modeli**; fark sadece istemcinin (web/Android/Roku) bu JSON’u nasıl render ettiğinde.

---

## 3) Otomatik akış (Sistemsel otomatik)

```
Kullanıcı template seçer → Yayınla
    ↓
DB güncellenir (screen_template_rotations, screens.updated_at)
    ↓
Arka planda generate-slides tetiklenir (fire-and-forget)
    ↓
Her slide için: display sayfası screenshot → Spaces’e yükle (slides/{screenId}/{templateId}.jpg)
    ↓
Web / Android / Roku aynı layout + aynı CDN URL’leri kullanır
```

- **Kullanıcı:** Sadece “Yayınla” der; görsel oluşturma ve yükleme **otomatik**.
- **Platform:** Cihaz türüne göre ayrı “mod” yok; tek yayın, tüm kanallarda geçerli.

---

## 4) Maliyeti düşüren kurallar

| Kural | Uygulama |
|-------|----------|
| **Görsel bir kez üretilir** | Yayın anında Puppeteer ile screenshot, Spaces’e bir kez yaz. Sonraki isteklerde sadece CDN’den servis. |
| **Version ile gereksiz veri taşınmaz** | Roku: Önce `GET /api/device/version`; version aynıysa `GET /api/device/layout` yok. Android’de de aynı pattern uygulanabilir. |
| **API cache’lenmez, görsel cache’lenir** | Layout/version API: `Cache-Control: no-store`. Görseller: versioned URL (`?v=...`) ile uzun süre cache (CDN). |
| **Ağır iş sadece yayında** | Screenshot + upload sadece publish sonrası; normal izleme sırasında sadece hafif JSON + CDN. |
| **Stateless API** | Cihaz/oturum state’i API’de tutulmaz; scale ve maliyet öngörülebilir. |

---

## 5) Özet tablo

| Konu | Web | Android APK | Roku |
|------|-----|-------------|------|
| Veri kaynağı | Aynı DB, aynı layout | Aynı DB, aynı layout | Aynı DB, aynı layout |
| İlk yükleme | /display veya public API | register → layout | register → layout |
| Güncelleme | Sayfa yenileme / poll | Cache + isteğe bağlı version/layout poll | Version poll → gerekirse layout |
| Görsel kaynağı | CDN (Spaces) | CDN (Spaces) | CDN (Spaces) |
| Maliyet | Edge/CDN + hafif API | Az istek (version first) | Az istek (version first) |

---

## 6) Geliştirme notları

- **Android:** Şu an layout sadece register’da geliyor; 15 sn’de bir cache’ten okuyor. Roku’daki gibi periyodik `GET /api/device/version` + gerekirse `GET /api/device/layout` eklenirse, “her zaman güncel layout” ve “gereksiz tam layout çekmeme” hem sistemsel hem maliyet açısından hizalanır.
- **Roku:** Version-first refresh ve startup’ta layout fetch zaten uygulandı.
- **Web:** Display sayfası public; görseller zaten versioned URL ile CDN’den.

Bu doküman, “kullanıcı template oluşturdu, web/Android/Roku buna göre hareket etmeli; her şey sistemsel otomatik ve maliyet düşük olsun” hedefinin referansıdır.
