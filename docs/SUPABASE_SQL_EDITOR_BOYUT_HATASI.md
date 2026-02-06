# "Query is too large" — SQL Editor Boyut Sınırı

`export-from-local-data.sql` dosyasını Supabase **SQL Editor**'e yapıştırınca **"Query is too large to be run via the SQL Editor"** hatası alıyorsanız, dosyayı **yerelden psql** ile çalıştırın.

---

## 1. Supabase şifresini ve connection bilgisini alın

1. **Supabase Dashboard** → Projeniz → **Settings** (sol menü) → **Database**
2. **Connection string** bölümünde **URI** seçin
3. **Transaction** modundaki bağlantı satırını kopyalayın; örnek:
   ```text
   postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```
   veya **Direct connection** (Session mode) ile:
   ```text
   postgresql://postgres:[YOUR-PASSWORD]@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres
   ```
4. `[YOUR-PASSWORD]` kısmı **Database password** (projeyi oluştururken verdiğiniz şifre). Unuttuysanız **Reset database password** ile yeni şifre alabilirsiniz.

---

## 2. Terminalde psql ile import

Proje kökünde (Tvproje) terminalde:

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres" -f database/export-from-local-data.sql
```

- `[YOUR-PASSWORD]` yerine **gerçek şifrenizi** yazın.
- Şifrede özel karakter varsa (örn. `#`, `@`, `%`) URL-encode edin veya şifreyi tek tırnak içinde ayrı verin; örnek (PowerShell/bash farklı olabilir):
  ```bash
  export PGPASSWORD='Sifreniz123!'
  psql "postgresql://postgres@db.ibtnyekpnjpudjfwmzyc.supabase.co:5432/postgres" -f database/export-from-local-data.sql
  ```

Bağlantı başarılıysa INSERT satırları işlenir; **duplicate key** uyarıları bazı satırların zaten var olduğu anlamına gelir, genelde devam edebilirsiniz.

---

## 3. psql yüklü değilse

- **macOS:** `brew install libpq` sonra `psql` (veya Xcode Command Line Tools ile gelebilir)
- **Windows:** [PostgreSQL installer](https://www.postgresql.org/download/windows/) ile gelen `psql` kullanın

Alternatif: SQL dosyasını **birkaç parçaya bölüp** her parçayı SQL Editor’de ayrı ayrı çalıştırabilirsiniz (daha zahmetli).

---

## 4. Import sonrası

Import bittikten sonra migration script’ini tekrar çalıştırın; bu sefer `/uploads/...` path’leri bulunup Storage URL’leriyle güncellenir:

```bash
cd frontend && node -r ./scripts/load-env.js scripts/migrate-uploads-to-supabase.js
```
