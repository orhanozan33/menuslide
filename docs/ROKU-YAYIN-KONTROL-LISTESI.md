# Roku Yayın Kontrol Listesi – Adım Adım

Bu rehber, Roku'da 6 şablonun dönmesi ve ekranın kararmaması için Admin ve Vercel ayarlarını kontrol etmenizi sağlar.

---

## Adım 1: Admin – Ekran Şablon Rotasyonları

1. **Admin panele giriş yapın**  
   `https://menuslide.com` (veya kendi domain) → Login

2. **Ekranlar sayfasına gidin**  
   Sol menüden **Ekranlar** (veya **Screens**) tıklayın

3. **Doğru ekranı seçin**  
   Roku’da kullandığınız yayın koduna ait ekranı bulun ve tıklayın

4. **Şablon Rotasyonları bölümünü açın**  
   - Ekran detay sayfasında **“Şablon Rotasyonu”** veya **“Template Rotation”** bölümünü bulun  
   - Burada ekrana eklenmiş şablonlar listelenir

5. **En az 6 şablon olduğunu kontrol edin**  
   - Listede **en az 6 şablon** olmalı  
   - Eksikse **“Şablon Ekle”** / **“Add Template”** ile yeni şablonlar ekleyin  
   - Her şablon için **süre (saniye)** ayarlayın (örn. 8 sn)

6. **Kaydedin**  
   Değişiklik yaptıysanız **Kaydet** veya **Publish** ile kaydedin

---

## Adım 2: Vercel – CDN Ortam Değişkeni

1. **Vercel Dashboard’a gidin**  
   [vercel.com](https://vercel.com) → projenizi seçin

2. **Settings → Environment Variables**  
   Sol menüden **Settings** → **Environment Variables**

3. **`NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` değişkenini kontrol edin**  
   - Bu değişken tanımlı mı? Arama kutusuna yazabilirsiniz  
   - **Yoksa ekleyin**, varsa değerini kontrol edin

4. **Doğru değer**  
   ```
   https://menuslide-signage.tor1.cdn.digitaloceanspaces.com
   ```
   - Sonunda `/` olmamalı

5. **Environment seçimi**  
   - Production, Preview, Development için işaretleyin (en azından Production)

6. **Kaydedin**  
   **Save** tıklayın

7. **Redeploy yapın**  
   - **Deployments** sekmesine gidin  
   - Son deployment’ın yanındaki **⋯** (üç nokta) → **Redeploy**  
   - Redeploy bitene kadar bekleyin (env değişince mutlaka gerekir)

---

## Adım 3: Roku Build

1. **Proje klasörüne gidin**
   ```bash
   cd /Users/admin/Desktop/Tvproje/roku-tv
   ```

2. **Paketi oluşturun**
   ```bash
   ./package.sh
   ```

3. **Çıktı**
   - `menuslide-roku.zip` oluşur (~1.1 MB)

4. **Roku’ya yükleyin**
   - **Roku Developer:** My Channels → ilgili kanal → Upload → `menuslide-roku.zip` seçin
   - **Veya** Roku Developer Application Installer ile cihaz IP’sini girip sideload yapın

---

## Adım 4: Roku’da Test

1. Kanalı açın
2. Yayın kodunu girin (Admin’de gördüğünüz 5 haneli kod)
3. 6 şablonun sırayla dönmesini kontrol edin
4. Ekranın kararmadığını ve sürekli döndüğünü doğrulayın

---

## Sorun Giderme

| Sorun | Kontrol |
|-------|---------|
| Tek şablon görünüyor | Admin’de ekrana 6 şablon eklendi mi? |
| Görseller yüklenmiyor | `NEXT_PUBLIC_SLIDE_IMAGE_BASE_URL` doğru mu? Görseller CDN’de `/slides/{screenId}/{templateId}.jpg` yolunda mı? |
| Ekran kararıyor | Build 21+ yüklü mü? Kod tekrar girildi mi? |
| Eski layout görünüyor | Vercel Redeploy yapıldı mı? Roku’da kodu silip tekrar girin |
