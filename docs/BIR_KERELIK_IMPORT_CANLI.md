# Canlıda Bir Kerelik Veri Import’u

Backend **canlıya ilk kez** alındığında, tüm tablolar ve veriler (yerelde export ettiğiniz `export-from-local-data.sql`) otomatik olarak canlı veritabanına (Supabase) aktarılır.

## Nasıl çalışır?

1. **Backend açılışında** (NestJS `onModuleInit`): `ONE_TIME_IMPORT=1` (veya `true`) ise `OneTimeImportService` çalışır.
2. Veritabanında **`_one_time_import_done`** tablosunda kayıt **yoksa**:
   - Önce `database/supabase-ensure-columns-before-import.sql` çalıştırılır (eksik sütunlar / tablolar).
   - Sonra `database/export-from-local-data.sql` çalıştırılır (tüm INSERT’ler).
   - Ardından `_one_time_import_done` tablosuna bir satır yazılır.
3. Bir daha **aynı veritabanında** backend açıldığında, tabloda kayıt olduğu için import **tekrarlanmaz**.

## Canlıda kullanım

1. Yerelde export’u alın (zaten aldıysanız atlayın):
   ```bash
   cd /path/to/Tvproje
   ./scripts/export-local-to-supabase.sh
   ```
   Çıktı: `database/export-from-local-data.sql`

2. Bu **dosyayı repoda** tutun (commit/push). Deploy’da backend’in `database/` klasörüne erişebilmesi gerekir.
   - Repo kökünden deploy ediyorsanız: `database/` zaten vardır.
   - Sadece `backend/` deploy ediyorsanız: build aşamasında `database/` dosyalarını backend’e kopyalayın veya ortam değişkeniyle yol verin (aşağıda).

3. Canlı backend ortamında (Render / Vercel / vb.) **ortam değişkeni** ekleyin:
   ```env
   ONE_TIME_IMPORT=1
   DATABASE_URL=postgresql://postgres:XXX@db.XXXX.supabase.co:5432/postgres
   ```
   (Canlıda zaten `DATABASE_URL` Supabase’e işaret ediyor olmalı.)

4. **İlk deploy** veya **ilk restart** sonrası backend açılırken log’da şunu görürsünüz:
   - `Bir kerelik import başlatılıyor (ensure-columns + veri)...`
   - `Bir kerelik import tamamlandı.`
   Sonraki açılışlarda: `Bir kerelik import zaten yapılmış, atlanıyor.`

5. **İşlem bittikten sonra** (opsiyonel): `ONE_TIME_IMPORT=1`’i kaldırıp tekrar deploy edebilirsiniz; artık import zaten yapıldığı için bir şey çalışmaz.

## SQL klasörü yolu

Backend şu sırayla `database/` klasörünü arar:

- `ONE_TIME_IMPORT_SQL_DIR` (ortam değişkeni)
- `process.cwd()/database`
- `process.cwd()/../database`
- `backend/../../database` (derlenmiş dosyadan göre)

Deploy’da sadece `backend/` kullanıyorsanız ve `database/` orada yoksa:

```env
ONE_TIME_IMPORT_SQL_DIR=/full/path/to/database
```

veya build’de `database/*.sql` dosyalarını backend içine kopyalayıp bu yolu gösterebilirsiniz.

## Özet

| Ne zaman?        | Ne olur? |
|------------------|----------|
| İlk deploy, `ONE_TIME_IMPORT=1` | ensure-columns + export SQL çalışır, veriler canlıya yazılır. |
| Sonraki deploy’lar | `_one_time_import_done` dolu olduğu için import atlanır. |
| `ONE_TIME_IMPORT` yok veya 0 | Import hiç çalışmaz. |

Böylece canlıya aldığınızda **tek seferlik** tüm veriler otomatik aktarılır; frontend açıldığında veri canlı DB’den gelir.
