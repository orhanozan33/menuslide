# Yerel Veriyi Supabase'e Gönderme — Adım Adım

Tek komutla yerel verinizi (tasarım, resim, video, şablon, kütüphane) Supabase'e göndermek için aşağıdaki adımları izleyin.

---

## Ne zaman hangi senaryo?

| Durum | Ne yaparsınız |
|--------|----------------|
| **Yerel PostgreSQL kapalı** | Script, zaten dolu olan `database/export-from-local-data.sql` dosyasını kullanır; yeniden export almaz. |
| **Yerel veriyi yeniden export etmek istiyorsunuz** | Önce yerel PostgreSQL'i başlatın, sonra script'i çalıştırın; script bu sefer yerelden yeni export alır. |

---

## Senaryo A: Yerel DB kapalı — Sadece mevcut export'u Supabase'e göndermek

**1.** Supabase veritabanı şifrenizi bilin (Supabase Dashboard → **Settings** → **Database** → Database password).

**2.** Terminali açın, proje klasörüne gidin:
```bash
cd /Users/admin/Desktop/Tvproje
```

**3.** Şifreyi ortam değişkeni olarak verin (bir kez; şifreyi kendi şifrenizle değiştirin):
```bash
export SUPABASE_DB_PASSWORD='sifreniz'
```

**4.** Script'i çalıştırın:
```bash
chmod +x scripts/push-to-supabase.sh
./scripts/push-to-supabase.sh
```

**5.** Script ne yapar?
- Yerel PostgreSQL'e bağlanamaz → **“Uyarı: Yerel veritabanına bağlanılamadı. Mevcut export dosyası kullanılacak.”** yazar.
- `database/export-from-local-data.sql` dosyası **doluysa** bu dosyayı kullanır.
- Supabase'de ilgili tabloları temizler (truncate).
- Bu SQL dosyasını Supabase'e import eder.
- `/uploads/` path'lerini Storage URL'lerine günceller.

**6.** Bittikten sonra canlı sitede (Vercel) verileri görmek için gerekirse **Redeploy** yapın veya sayfayı yenileyin.

---

## Senaryo B: Yerel veriyi yeniden export edip Supabase'e göndermek

Yerelde yeni şablon, menü, kütüphane eklediyseniz önce **yerel PostgreSQL'in çalışıyor** olması gerekir. Sonra script hem yeni export alır hem Supabase'e gönderir.

**1. Yerel PostgreSQL'i başlatın**

- **macOS (Homebrew):**
  ```bash
  brew services start postgresql
  ```
  veya
  ```bash
  brew services start postgresql@14
  ```
  (Kurduğunuz sürüme göre 14, 15, 16 vb. yazın.)

- **Windows:** PostgreSQL servisini “Services” üzerinden başlatın veya “pg_ctl start” kullanın.

- **Linux (systemd):**
  ```bash
  sudo systemctl start postgresql
  ```

**2. Veritabanının ve tabloların var olduğundan emin olun**

- Veritabanı adı genelde `tvproje` (veya `backend/.env` içindeki `DB_NAME`).
- Yoksa:
  ```bash
  createdb -U postgres tvproje
  ```
- Şema/tablolar yoksa:
  ```bash
  psql -U postgres -d tvproje -f database/schema-local.sql
  ```

**3. Backend .env'i kontrol edin**

`backend/.env` içinde şunlar olmalı (yerel DB bilgilerinize göre):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tvproje
DB_USER=postgres
DB_PASSWORD=yerel_postgres_sifreniz
```

**4. Proje klasörüne gidip Supabase şifresini verin**
```bash
cd /Users/admin/Desktop/Tvproje
export SUPABASE_DB_PASSWORD='supabase_veritabani_sifreniz'
```

**5. Script'i çalıştırın**
```bash
./scripts/push-to-supabase.sh
```

**6. Script bu sefer ne yapar?**
- Yerel PostgreSQL'e bağlanır.
- **Önce** yerelden yeni export alır → `database/export-from-local-data.sql` **güncellenir**.
- Sonra Supabase'de tabloları temizler, bu **güncel** export'u Supabase'e import eder, path'leri Storage URL'lerine günceller.

---

## Özet

| Adım | A (Yerel DB kapalı) | B (Yerel veriyi yeniden export et) |
|------|----------------------|-------------------------------------|
| 1 | — | Yerel PostgreSQL'i başlat |
| 2 | `cd /Users/admin/Desktop/Tvproje` | `cd /Users/admin/Desktop/Tvproje` |
| 3 | `export SUPABASE_DB_PASSWORD='sifre'` | `export SUPABASE_DB_PASSWORD='sifre'` |
| 4 | `./scripts/push-to-supabase.sh` | `./scripts/push-to-supabase.sh` |
| Sonuç | Mevcut `export-from-local-data.sql` Supabase'e gider | Yeni export alınır, sonra Supabase'e gider |

Şifreyi her yeni terminalde tekrar `export SUPABASE_DB_PASSWORD='...'` yazmanız gerekir; kalıcı kaydetmek istemezseniz `.env` dosyasına koymayın (güvenlik).
