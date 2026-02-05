# Supabase'de Kullanıcı Oluşturma (Giriş Yapabilmek İçin)

Backend veritabanı olarak **Supabase** kullanıyor. Kullanıcılar `users` tablosunda tutulur. Bağlantı kurulunca tablolar boş olur; kullanıcılar **kayıt formu**, **admin paneli** veya **SQL seed** ile eklenir.

---

## Super Admin ile İlk Giriş

1. **Supabase Dashboard** → Projeniz → **SQL Editor**.
2. `database/seed-super-admin.sql` dosyasını açıp içeriğini yapıştırın veya aşağıdaki SQL'i çalıştırın:

```sql
-- Super Admin: orhanozan33@hotmail.com / şifre: 33333333
INSERT INTO users (email, password_hash, role, business_id)
VALUES (
  'orhanozan33@hotmail.com',
  '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou',
  'super_admin',
  NULL
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  role = 'super_admin';
```

3. Frontend'de **Giriş** → E-posta: `orhanozan33@hotmail.com`, Şifre: `33333333` ile giriş yapın.

---

## Yeni Kullanıcı Nasıl Oluşur?

- **Kayıt:** Sitede **Register** ile kayıt (backend `auth/register` veya kayıt onay akışına göre `users` tablosuna ekler).
- **Admin:** Super admin panelden kullanıcı ekleyebilir.
- **Seed:** `database/seed-super-admin.sql` dosyası sadece bu tek super admin'i ekler; diğer kullanıcılar register/admin ile gelir.

`users` tablosu boşsa önce yukarıdaki SQL ile super admin oluşturun, sonra giriş yapıp diğer kullanıcıları yönetin.

---

## 401 Unauthorized – “Kullanıcı giriş yapamadım”

Backend (ör. `https://tvproje-backend.onrender.com`) **Supabase**’e bağlıdır. 401 alıyorsanız:

1. **Giriş yapan kullanıcı Supabase’de olmalı**  
   Render’daki backend, `.env` içindeki `DATABASE_URL` ile **Supabase Postgres**’e bağlanır. Kullanıcılar **sadece** Supabase’deki `users` tablosunda olanlardır. Lokal veritabanındaki kullanıcılar burada yoktur.

2. **Ne yapmalı?**  
   - **Supabase Dashboard** → **SQL Editor**’da yukarıdaki “Super Admin ile İlk Giriş” SQL’ini çalıştırın.  
   - Giriş: **orhanozan33@hotmail.com** / **33333333**

3. **Kendi e‑postanızla giriş**  
   E‑posta zaten `users`’da varsa şifreyi aşağıdaki “Şifre sıfırlama” ile güncelleyin. Yoksa önce bu e‑posta ile super admin ekleyin (SQL’de e‑posta ve hash’i değiştirin) veya panelden kullanıcı ekleyin.

---

## Şifre sıfırlama (belirli e‑posta için)

Aşağıdaki SQL, verdiğiniz e‑postanın şifresini **33333333** yapar. Başka şifre isterseniz backend’de `bcrypt.hash('yeni_sifre', 10)` ile yeni hash üretip `password_hash` yerine yazın.

```sql
-- Şifre: 33333333 (bcrypt hash)
UPDATE users
SET password_hash = '$2b$10$3cWu7mcoMdWtHyQnQoEelu/NAuwEpXgiBUtn0BEEJgxM./se.rjou'
WHERE email = 'orhanozan33@hotmail.com';
```

Giriş: bu e‑posta + şifre **33333333**.

---

## Super admin giriş yaptı ama “tüm veriler yok”

Giriş çalışıyor ama panelde işletme, menü, ekran görünmüyorsa Supabase’de **sadece kullanıcı** var, **iş verisi** yok demektir. ### Otomatik veri oluşumu (önerilen)

**Backend** (Render veya yerel) ilk çalıştığında veritabanında **hiç dil kaydı yoksa** başlangıç verisini **kendisi oluşturur**: diller, planlar, contact_info, **Demo İşletme**, **Demo Menü**, **TV 1** ekranı. Supabase'i yeni kurduysanız backend'i bir kez deploy edip çalıştırmanız yeterli; tablolar boşsa veri otomatik oluşur (log'da "Başlangıç verisi oluşturuldu" mesajı görünür).

### A) Elle seed (isteğe bağlı)

**Supabase** → **SQL Editor** → `database/seed-supabase-minimal-data.sql` dosyasını çalıştırarak aynı veriyi elle de ekleyebilirsiniz.

### B) Yereldeki tüm veriyi taşımak

Yerel PostgreSQL’deki işletmeler, menüler, ekranlar, şablonlar vb. hepsini Supabase’e taşımak için:

- **Rehber:** `docs/YERELDEN_SUPABASE_VERI_TASIMA.md`
- Yerelde `pg_dump --data-only` ile export alıp çıkan SQL’i Supabase SQL Editor’da çalıştırın.
