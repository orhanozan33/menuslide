# DigitalOcean Spaces’e Görsel Yükleme (Basit)

Spaces S3-uyumlu. İki basit yol:

---

## 1) Web’den yükleme (en basit, ekstra program yok)

Zaten **menuslide-signage** bucket’ındasın.

1. Bucket içinde **Create Folder** → adı: **slides**
2. **slides** klasörüne gir → **Create Folder** → adı: **ekran-uuid** (Supabase sorgusundaki `screen_id`, örn. `83ebddd6-072e-40af-a65b-a2ce1218efc3`)
3. O ekran klasörüne gir → **Upload** ile JPG yükle; dosya adı: **şablon-uuid.jpg** (Supabase’deki `template_id_for_path`, örn. `abc123-def456.jpg`)

Supabase’de 3 satır çıktı varsa, 3 farklı slide demek. Her biri için:
- Aynı `screen_id` → aynı klasör (slides/{screen_id}/)
- Her satırda farklı `template_id_for_path` → dosya adı: `{template_id_for_path}.jpg`

**Özet:** `slides` → `{screen_id}` klasörü → içine `{template_id_for_path}.jpg` yükle.

---

## 2) FileZilla ile (S3 destekli sürüm gerekir)

**Normal (ücretsiz) FileZilla** FTP/SFTP içindir; **Spaces (S3) bağlantısı yok.**

Kullanabileceğin seçenekler:

### A) FileZilla Pro (ücretli)

- S3 protokolü var. Bağlantı ayarları:
  - **Host:** `ams3.digitaloceanspaces.com` (veya senin region: tor1 için `tor1.digitaloceanspaces.com`)
  - **Protocol:** Amazon S3
  - **Access Key / Secret Key:** DigitalOcean → **API** → **Spaces Keys** → Generate New Key; Key + Secret’i kopyala
  - Bucket: `menuslide-signage`
  - Klasör yapısı yine: `slides/{screen_id}/{template_id_for_path}.jpg`

### B) Cyberduck (ücretsiz, S3 destekli)

- https://cyberduck.io — indir.
- **Open Connection** → **Amazon S3** (veya “S3-compatible”).
  - **Server:** `tor1.digitaloceanspaces.com`
  - **Access Key / Secret Key:** DO Spaces key (yukarıdaki gibi)
  - Bağlan → bucket `menuslide-signage` → `slides` → `{screen_id}` → dosyayı `{template_id_for_path}.jpg` olarak yükle.

---

## Spaces erişim anahtarı nereden?

1. DigitalOcean Control Panel → **API** (sol menü) → **Spaces Keys**
2. **Generate New Key** → isim ver (örn. “signage-upload”)
3. **Key** ve **Secret**’ı bir yere kaydet (Secret sadece bir kez gösterilir)

Bu Key + Secret’ı FileZilla Pro veya Cyberduck’ta “Access Key” / “Secret Key” olarak kullanırsın.

---

## Hangi path’e ne yüklemiş olmalısın?

Supabase’de çalıştırdığın sorgudaki her satır için:

| Sütun | Kullanım |
|-------|----------|
| `screen_id` | Klasör adı: `slides/{screen_id}/` |
| `template_id_for_path` | Dosya adı: `{template_id_for_path}.jpg` |

Örnek: `screen_id = 83ebddd6-072e-40af-a65b-a2ce1218efc3`, `template_id_for_path = abc-def-123`  
→ Yükle: `slides/83ebddd6-072e-40af-a65b-a2ce1218efc3/abc-def-123.jpg`

En basit yol: **Web’den** (Create Folder + Upload) ile bu yapıyı kurmak. FileZilla kullanmak istersen S3 destekleyen **FileZilla Pro** veya **Cyberduck** gerekir.
