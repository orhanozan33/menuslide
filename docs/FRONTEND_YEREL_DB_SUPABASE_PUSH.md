# Frontend yerel DB + Supabase push

Frontend **yerel PostgreSQL** üzerinde çalışır; tüm okuma ve yazma yerel DB’ye gider. Her **yazma** işlemi aynı anda **Supabase’e de push** edilir (tablolar senkron kalır).

## Nasıl açılır?

`frontend/.env.local` içine ekleyin:

```env
USE_LOCAL_DB=true
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tvproje
DB_USER=postgres
DB_PASSWORD=yerel_postgres_sifreniz
```

Supabase değişkenleri de **dolu kalmalı** (push için):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=...
```

Değişiklikten sonra frontend’i yeniden başlatın: `npm run dev`.

## Ne olur?

| İşlem | Kaynak | Supabase |
|--------|--------|----------|
| **Tüm okuma** | Yerel DB | — |
| **Tüm yazma** | Yerel DB | Aynı işlem otomatik push edilir |

Yerel + mirror: auth, templates, template blocks & contents, crud, businesses/users/plans, screens, menus & menu-items, content library, registration requests.

Yani:

- Veri her zaman **yerel DB**’den okunur.
- Her create/update/delete önce **yerel DB**’ye yazılır, ardından **Supabase**’e de uygulanır.

## Yerel DB hazırlığı

Yerel PostgreSQL’de proje şeması ve (isteğe bağlı) başlangıç verisi olmalı:

1. Şema: `psql -U postgres -d tvproje -f database/schema-local.sql` (veya kullandığınız şema dosyası).
2. İsterseniz canlıdan veri: `./scripts/pull-from-supabase.sh` ile Supabase’den çekip yerel DB’yi doldurun.

## Özet

- **USE_LOCAL_DB=true** → Frontend yerel DB kullanır, her yazma Supabase’e push edilir.
- **USE_LOCAL_DB** yok veya false → Eski davranış: tüm veri doğrudan Supabase’den okunur/yazılır.
