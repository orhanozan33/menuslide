# Yerel DB = Kaynak, Supabase ile Senkron

Sistemi yerel DB üzerinde tasarlayıp, yerelde oluşan her veriyi Supabase’e yansıtmak için kullanılacak akış.

## Ne yapıyoruz?

- **Kaynak:** Yerel PostgreSQL (yerel DB).
- **Hedef:** Supabase (canlı).
- **İstediğimiz:** Yerel DB’de ne varsa Supabase’de de olsun; mümkünse aynı anda.

## 1. Periyodik sync (önerilen)

Yerel DB’de yaptığınız değişiklikleri belirli aralıklarla Supabase’e gönderir.

```bash
export SUPABASE_DB_PASSWORD='canli_db_sifreniz'
./scripts/sync-local-to-supabase-watch.sh
```

- Varsayılan: her **15 saniyede** şablon/blok/tasarım tabloları Supabase’e push edilir.
- Aralık: `SYNC_INTERVAL=10 ./scripts/sync-local-to-supabase-watch.sh` (10 sn).
- Tüm tablolar: `FULL_SYNC=1 ./scripts/sync-local-to-supabase-watch.sh`

Geliştirme sırasında:
- Bir terminal: `npm run dev` (frontend).
- Diğer terminal: `./scripts/sync-local-to-supabase-watch.sh` (yerel → Supabase sync).

Böylece yerel DB’de yaptığınız şablon/blok/tasarım değişiklikleri periyodik olarak Supabase’e gider.

## 2. Tek seferlik push

Sadece şablon, blok ve tasarım sistemi (kullanıcı/ekran verisine dokunmaz):

```bash
export SUPABASE_DB_PASSWORD='sifre'
./scripts/push-templates-design-to-supabase.sh
```

Tüm veriyi (businesses, users, screens, …) göndermek:

```bash
export SUPABASE_DB_PASSWORD='sifre'
./scripts/push-to-supabase.sh
```

## 3. Yerel DB’ye canlıdan veri almak (pull)

Yerelde test ederken canlıdaki veriyi kullanmak için:

```bash
export SUPABASE_DB_PASSWORD='sifre'
./scripts/pull-from-supabase.sh
```

Yerel tablolar temizlenir, canlıdaki veri yerel DB’ye kopyalanır.

## Özet

| İhtiyaç | Komut |
|--------|--------|
| Yerel = kaynak, değişiklikler Supabase’e periyodik gitsin | `./scripts/sync-local-to-supabase-watch.sh` |
| Sadece şablon/blok/tasarımı Supabase’e gönder | `./scripts/push-templates-design-to-supabase.sh` |
| Tüm yerel veriyi Supabase’e gönder | `./scripts/push-to-supabase.sh` |
| Canlı veriyi yerel DB’ye çek | `./scripts/pull-from-supabase.sh` |

Gereksinimler: `backend/.env` (yerel DB), `frontend/.env.local` (Supabase URL), `SUPABASE_DB_PASSWORD`.
