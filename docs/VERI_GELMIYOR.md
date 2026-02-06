# Frontend'de veri gelmiyor

Frontend **yerel PostgreSQL'e bağlanmaz**. Tüm veri **Supabase** üzerinden gelir. Veri görünmüyorsa aşağıdakileri kontrol edin.

## 1. Sağlık kontrolü

Tarayıcıda açın: **http://localhost:3000/api/health**

- **ok: true** → Supabase bağlantısı var, veri gelmeli.
- **ok: false** → Mesajda yazan nedeni giderin (env eksik veya Supabase hatası).

## 2. frontend/.env.local

Şu değişkenler **mutlaka** dolu olmalı:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
JWT_SECRET=en_az_32_karakter_bir_secret
```

- Değerleri almak: **Supabase Dashboard** → **Settings** → **API** (Project URL, anon key, service_role key).
- `.env.local` değiştirdikten sonra frontend’i yeniden başlatın: `npm run dev`.

## 3. Supabase’de tablolar ve veri

- **SQL Editor**’da gerekli migration’ları çalıştırdınız mı? (örn. `schema.sql`, `migration-create-templates-table.sql`, `migration-registration-requests.sql`)
- Veritabanında gerçekten veri var mı? (Dashboard → Table Editor ile kontrol edin.)

## 4. Özet

| Durum | Çözüm |
|--------|--------|
| /api/health "Supabase yapılandırması eksik" | `.env.local` içinde URL ve key’leri ekleyin |
| /api/health "Supabase bağlantı hatası" / table not found | Doğru projeyi kullanıyor musunuz? Tabloları oluşturan SQL’leri çalıştırın |
| Health ok ama sayfada veri yok | Giriş yaptınız mı? Token geçerli mi? İlgili tabloda (businesses, screens vb.) satır var mı kontrol edin |

**Not:** Uygulama “local DB” (yerel PostgreSQL) kullanmaz; her şey Supabase üzerindedir. Yerelde çalıştırdığınızda da veri Supabase’den gelir.
