# Yerel Çalıştırma – Veri ve Yüklemeler Supabase’de

Frontend ve backend yerelde çalışırken **tüm veri ve yüklemeler doğrudan Supabase’e gider.** Yerel disk veya yerel veritabanı kullanılmaz.

## Nasıl çalışıyor?

| İşlem | Nereye gider? |
|--------|----------------|
| **Tablo verileri** (kullanıcı, ekran, şablon, menü, içerik kütüphanesi, vb.) | Supabase (PostgreSQL) |
| **Resim / video yükleme** | Supabase Storage (bucket: `menuslide`) |
| **Kayıt talepleri, raporlar, ayarlar** | Supabase |

Frontend `localhost:3000` üzerinde çalışır; istekler `/api/proxy` ve `/api/upload` ile işlenir. Bu API’ler Supabase client kullanır; veri ve dosyalar canlı Supabase projenize yazılır.

## Gereksinimler

`frontend/.env.local` içinde Supabase yapılandırması olmalı:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=your-jwt-secret
```

- **Storage:** Supabase Dashboard → Storage → `menuslide` bucket’ı oluşturulmuş ve **public** olmalı (resim/video linkleri açılsın diye).

## Yerel çalıştırma

```bash
# Sistemi başlat (frontend + backend)
./scripts/start-system.sh
```

- **Frontend:** http://localhost:3000  
- **Backend:** http://localhost:3001  

Yerelde yaptığınız her işlem (resim yükleme, şablon/ekran/menü kaydetme, vb.) aynı anda Supabase’e yansır; ek bir sync script’i gerekmez.

## Özet

- **Yerel = sadece uygulama (frontend + backend) çalışıyor.**
- **Veri ve dosyalar = her zaman Supabase (DB + Storage).**
- Resim yüklediğinizde dosya Supabase Storage’a, ilgili kayıtlar (ör. içerik kütüphanesi) Supabase tablolarına yazılır.
