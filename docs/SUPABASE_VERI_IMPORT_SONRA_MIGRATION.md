# "0 satır güncellendi" Sonrası: Veriyi Supabase'e Alıp Migration'ı Tekrarlama

Migration script 7 dosyayı Storage'a yükledi ama **Supabase'de `/uploads/...` içeren satır yok** diye 0 satır güncellendi. Aşağıdaki sırayla ilerleyin.

---

## Seçenek A: Yerel PostgreSQL’de veri varsa

### 1. Export al

Proje kökünde (Tvproje):

```bash
chmod +x scripts/export-local-to-supabase.sh
./scripts/export-local-to-supabase.sh
```

Çıktı: `database/export-from-local-data.sql`

### 2. Bu dosyayı Supabase’e yükle

- **Supabase Dashboard** → Projeniz → **SQL Editor** → **New query**
- `database/export-from-local-data.sql` dosyasını açıp **tamamını** kopyalayıp yapıştırın
- **Run** ile çalıştırın

**"Query is too large"** hatası alırsanız SQL Editor sınırına takılmışsınızdır; dosyayı **psql** ile yerelden Supabase’e verin. Adımlar: **[SUPABASE_SQL_EDITOR_BOYUT_HATASI.md](SUPABASE_SQL_EDITOR_BOYUT_HATASI.md)**

**Duplicate key** alırsanız: Supabase’de zaten aynı id’ler var demektir. Ya sadece **şablon/kütüphane** tablolarını import etmek için SQL’i sadeleştirin, ya da (dikkat: mevcut veriyi siler) önce ilgili tabloları TRUNCATE edip sonra tekrar import edin (detay: [YERELDEN_SUPABASE_VERI_TASIMA.md](YERELDEN_SUPABASE_VERI_TASIMA.md)).

### 3. Migration’ı tekrar çalıştır

```bash
cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
```

Bu sefer “X satır güncellendi” görmelisiniz; resim/video path’leri Storage URL’leriyle güncellenir.

---

## Seçenek B: Yerel DB yok; sadece `export-from-local-data.sql` dosyası var

Zaten elinizde `database/export-from-local-data.sql` varsa:

1. **Supabase** → **SQL Editor** → **New query**
2. Bu dosyanın **tamamını** yapıştırıp **Run** ile çalıştırın (duplicate key’leri yönetmek için yukarıdaki not geçerli).
3. Sonra aynı migration komutunu çalıştırın:

   ```bash
   cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
   ```

---

## Özet

| Durum | Yapılacak |
|--------|------------|
| Yerel PostgreSQL dolu | Export script → SQL’i Supabase’de çalıştır → migration script |
| Sadece SQL dosyası var | SQL’i Supabase’de çalıştır → migration script |
| Hep 0 satır | Supabase’e gerçekten `/uploads/...` içeren veri gelmiş mi Table Editor’dan kontrol edin |

Migration script’in “Veritabanı eşleşme kontrolü” çıktısında ilgili tablolarda **0’dan büyük** satır sayısı görünene kadar import adımını tekrarlayın.
