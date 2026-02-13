# Slide görselleri nereden gelir?

Slide görselleri **otomatik oluşmaz**. İki yol var:

---

## 1) Kendin yüklersin (manuel)

- Her slide için bir JPG hazırlarsın (tasarım, fotoğraf, vb.).
- DigitalOcean Spaces’te `slides/{screen_id}/{template_id}.jpg` path’ine yüklersin.
- Supabase’deki sorgudan `screen_id` ve `template_id_for_path` değerlerini alırsın.

---

## 2) Display’den otomatik üret (script)

Projede **display sayfasının her şablon için screenshot’ını alıp Spaces’e yükleyen** bir script var. Böylece “slide görselleri” mevcut ekran içeriğinden üretilir.

### Gereksinimler

- **frontend** klasöründe: `puppeteer` zaten var; **@aws-sdk/client-s3** ekle:
  ```bash
  cd frontend && npm install @aws-sdk/client-s3
  ```
- **DigitalOcean Spaces API anahtarı:** Control Panel → **API** → **Spaces Keys** → Generate New Key. Key + Secret’ı al.

### Ortam değişkenleri (frontend/.env.local)

Aşağıdakileri ekle (Supabase zaten varsa sadece DO satırları):

```env
# Zaten varsa dokunma
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=https://menuslide.com

# Spaces (slide yükleme için)
DO_SPACES_KEY=DO00xxxxxxxxxx
DO_SPACES_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
DO_SPACES_BUCKET=menuslide-signage
DO_SPACES_REGION=tor1
```

### Çalıştırma

**Tüm aktif ekranlar için:**

```bash
cd frontend
node -r ./scripts/load-env.js scripts/export-slides-to-spaces.js
```

**Sadece bir ekran için (screen_id ile):**

```bash
node -r ./scripts/load-env.js scripts/export-slides-to-spaces.js 83ebddd6-072e-40af-a65b-a2ce1218efc3
```

Script:

1. Supabase’den aktif ekranları ve her ekranın şablon rotasyonlarını alır.
2. Her şablon için display sayfasını açar (`/display/{slug}?lite=1&rotationIndex=i`).
3. Puppeteer ile 1920x1080 JPEG screenshot alır.
4. Dosyayı Spaces’e `slides/{screen_id}/{template_id}.jpg` olarak yükler.

Böylece “slide görselleri” display’de gördüğün içerikten üretilir; Roku da API’nin döndüğü CDN URL’leriyle bu görselleri kullanır.

---

## Özet

| Kaynak | Ne yaparsın |
|--------|-------------|
| **Manuel** | Kendin JPG hazırlayıp Spaces’e `slides/{screen_id}/{template_id}.jpg` yüklersin. |
| **Script** | `frontend/scripts/export-slides-to-spaces.js` çalıştırırsın; display’den screenshot alınıp Spaces’e yüklenir. |

Script ilk kez çalıştırmadan önce DO_SPACES_KEY ve DO_SPACES_SECRET’ı .env.local’e eklemeyi unutma.
