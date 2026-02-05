# Supabase: Heartbeat 500 ve 401 İçin Ek SQL

Heartbeat 500 hatası: `display_viewers` tablosu Supabase'de yok.  
401: Backend Supabase'e bağlanıyor ama giriş reddediliyor (env veya kullanıcı kontrolü).

---

## 1) display_viewers tablosu (heartbeat 500’ü düzeltir)

Supabase → **SQL Editor** → **New query** → aşağıdakini yapıştır → **Run**.

```sql
-- Heartbeat için gerekli tablo
CREATE TABLE IF NOT EXISTS display_viewers (
  screen_id UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
  session_id VARCHAR(64) NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (screen_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_display_viewers_last_seen ON display_viewers(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_display_viewers_screen_id ON display_viewers(screen_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'display_viewers' AND column_name = 'first_seen_at') THEN
    ALTER TABLE display_viewers ADD COLUMN first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    UPDATE display_viewers SET first_seen_at = last_seen_at;
  END IF;
END $$;
```

Bundan sonra heartbeat isteği 500 vermemeli (ekran token’ı yoksa yine 200 + ok: false dönebilir, o normal).

---

## 2) 401 (Giriş yapılamıyor) kontrol listesi

- **Render** → **Environment** → `DATABASE_URL` değeri tam şu mu?
  - `postgresql://postgres:orhanozan33@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres`
- **Render** → **Logs**: Giriş denemesinde “Invalid credentials” veya veritabanı hatası var mı bak.
- Girişte **tam** yaz: **orhanozan33@hotmail.com** / **33333333** (8 tane 3).
- Supabase **Table Editor** → **users**: Bu e‑posta ile satır var mı, `role` = `super_admin` ve `password_hash` dolu mu kontrol et.

Şifreyi yenilemek istersen Supabase SQL Editor’de:

```sql
UPDATE users
SET password_hash = '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou'
WHERE email = 'orhanozan33@hotmail.com';
```

(Şifre tekrar **33333333** olur.)

---

## 3) Nerede test ediyorsun?

- **localhost:3000** üzerinden test ediyorsan: Giriş isteği doğrudan `https://tvproje-backend.onrender.com/auth/login`’e gidiyor olmalı (frontend’in `NEXT_PUBLIC_API_URL` canlı backend). Heartbeat ise `localhost:3000/api/proxy/...` üzerinden yine canlı backend’e gider. Yani canlı backend + canlı Supabase kullanılıyor; yukarıdaki 1 ve 2’yi yaptıktan sonra hem heartbeat hem giriş düzelir.
- **menuslide.com** üzerinden test ediyorsan: Aynı mantık; 1 ve 2 yeterli.

Özet: Önce Supabase’de `display_viewers` SQL’ini çalıştır, sonra 401 için Render env ve kullanıcıyı kontrol et (gerekirse şifre güncelleme SQL’ini çalıştır).
