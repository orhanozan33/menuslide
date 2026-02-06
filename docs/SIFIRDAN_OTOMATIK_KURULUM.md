# Sıfırdan Otomatik Kurulum (Vercel + Supabase)

Vercel environment variable'ları sıfırlayıp Supabase tablolarını silerek baştan kuracaksanız bu rehberi takip edin. Bağlantı kurulunca **tablolar tek tıkla (API ile) otomatik oluşturulur.**

---

## 1. Supabase’i sıfırlama

- **Seçenek A:** Yeni bir Supabase projesi oluşturun (Dashboard → New project).  
- **Seçenek B:** Mevcut projede **SQL Editor** → aşağıdaki SQL’i çalıştırarak tüm uygulama tablolarını silin:

```sql
-- Tüm uygulama tablolarını siler (dikkat: veri gider)
DROP TABLE IF EXISTS screen_edit_history CASCADE;
DROP TABLE IF EXISTS admin_activity_log CASCADE;
DROP TABLE IF EXISTS admin_permissions CASCADE;
DROP TABLE IF EXISTS display_viewers CASCADE;
DROP TABLE IF EXISTS payment_failures CASCADE;
DROP TABLE IF EXISTS screen_template_rotations CASCADE;
DROP TABLE IF EXISTS home_channels CASCADE;
DROP TABLE IF EXISTS contact_info CASCADE;
DROP TABLE IF EXISTS content_library_categories CASCADE;
DROP TABLE IF EXISTS content_library CASCADE;
DROP TABLE IF EXISTS screen_block_contents CASCADE;
DROP TABLE IF EXISTS template_block_contents CASCADE;
DROP TABLE IF EXISTS screen_blocks CASCADE;
DROP TABLE IF EXISTS template_blocks CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS plans CASCADE;
DROP TABLE IF EXISTS menu_item_translations CASCADE;
DROP TABLE IF EXISTS menu_schedules CASCADE;
DROP TABLE IF EXISTS screen_menu CASCADE;
DROP TABLE IF EXISTS screens CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS menus CASCADE;
DROP TABLE IF EXISTS languages CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
```

---

## 2. Vercel environment variable’larını ayarlama

**Vercel** → Projeniz → **Settings** → **Environment Variables**. Aşağıdakileri ekleyin (Production + Preview):

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL (örn. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (gizli) |
| `JWT_SECRET` | Uygulama JWT imzası için güçlü rastgele string |
| `SUPABASE_DB_PASSWORD` | Supabase **Database password** (Settings → Database) — bootstrap için gerekli |
| `BOOTSTRAP_SECRET` | İsteğe bağlı; tabloları oluşturan API’yi korumak için (örn. rastgele 32 karakter) |

- **Canlıda** `NEXT_PUBLIC_API_URL` **boş bırakın** (veya silin); uygulama `/api/proxy` kullanır.
- Kaydettikten sonra **Redeploy** yapın.

---

## 3. Tabloları otomatik oluşturma (tek sefer)

Deploy bittikten sonra tarayıcıdan veya curl ile **bir kez** şu adresi çağırın:

```
https://SITENIZ.vercel.app/api/setup/bootstrap-db?secret=BOOTSTRAP_SECRET
```

Örnek (curl):

```bash
curl "https://SITENIZ.vercel.app/api/setup/bootstrap-db?secret=BURAYA_BOOTSTRAP_SECRET_YAZIN"
```

- Başarılı cevap: `{"ok":true,"message":"Tablolar oluşturuldu."}`
- Hata: `401` → secret yanlış veya `BOOTSTRAP_SECRET` tanımlı değil.  
- Hata: `500` → `SUPABASE_DB_PASSWORD` veya `NEXT_PUBLIC_SUPABASE_URL` eksik/yanlış; Supabase **Database password**’ü kontrol edin.

Bu adım **şema + tüm migration’ları** tek seferde Supabase’e uygular; tekrar çalıştırmak güvenlidir (`IF NOT EXISTS` kullanılıyor).

---

## 4. İlk süper admin kullanıcısı (isteğe bağlı)

Tablolar oluştuktan sonra ilk giriş için bir süper admin gerekir. Supabase **SQL Editor**’de:

```sql
-- Örnek: email = admin@example.com, şifre = Admin123!
-- Şifreyi bcrypt ile hash'leyin (örn. https://bcrypt-generator.com/)
INSERT INTO businesses (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'Admin', 'admin', true)
ON CONFLICT DO NOTHING;

INSERT INTO users (id, email, password_hash, role, business_id)
VALUES (
  uuid_generate_v4(),
  'admin@example.com',
  '$2a$10$...',  -- bcrypt hash (Admin123! için üretin)
  'super_admin',
  NULL
)
ON CONFLICT (email) DO NOTHING;
```

Şifre hash’i için: `bcrypt.hashSync('Admin123!', 10)` veya bir bcrypt aracı kullanın.

---

## Özet sıra

1. Supabase’de tabloları sil (veya yeni proje aç).  
2. Vercel’de 6 env (Supabase URL, anon, service role, JWT_SECRET, SUPABASE_DB_PASSWORD, BOOTSTRAP_SECRET) ekle → Redeploy.  
3. `GET /api/setup/bootstrap-db?secret=BOOTSTRAP_SECRET` çağır → tablolar oluşur.  
4. İstersen SQL ile süper admin ekle → canlıda giriş yap.

Bootstrap SQL’i projede **database/supabase-bootstrap-full.sql** (ve API için **frontend/lib/supabase-bootstrap.sql**) olarak tutulur. Şema değişince:

```bash
./scripts/build-supabase-bootstrap.sh
```

çalıştırıp yeniden deploy edin; sonra bootstrap API’yi tekrar çağırabilirsiniz.
