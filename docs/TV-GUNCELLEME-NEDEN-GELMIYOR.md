# TV/Telefon uygulamasında güncelleme neden gelmiyor?

## Kısa cevap

Güncelleme uyarısı **sadece sunucuda sürüm bilgisi kayıtlıysa** gelir. Admin panelde **"Sürümü APK'dan oku"** veya **"APK'yı depolamaya yükle"** ile sürümü kaydettikten sonra eski sürümü açan cihazlara uyarı çıkar.

---

## Nasıl çalışıyor?

1. Uygulama (TV veya telefon) açıldığında veya yayın kodu girilip **Başlat** denildiğinde şu adresi çağırır:
   - **https://menuslide.com/api/tv-app-config**
2. Bu adres, veritabanındaki **tv_app_settings** tablosundan **min_version_code**, **latest_version_code**, **latest_version_name** ve **download_url** döndürür.
3. Cihazdaki sürüm kodu (versionCode) sunucudaki **latest_version_code**’dan **küçükse** “Güncelleme var” diyalogu gösterilir.
4. **min_version_code**’dan küçükse “Güncelleme gerekli” (zorunlu) diyalogu gösterilir.

Eğer veritabanında **latest_version_code** (ve gerekirse min_version_code) **null** veya **boş** ise, API bu alanları null/0 döner; uygulama “güncelleme yok” kabul eder ve uyarı göstermez.

---

## Yapmanız gerekenler (adım adım)

### 1. Sunucuda sürümün kayıtlı olduğundan emin olun

- **menuslide.com** → giriş → **Ayarlar** → **Android TV uygulaması ayarları**.
- **İndirme linki (APK)** alanının, yüklediğiniz güncel APK’nın tam adresi olduğundan emin olun (örn. Supabase Storage linki).
- **"Sürümü APK'dan oku"** butonuna tıklayın.
- Birkaç saniye sonra **Latest versionCode** ve **Latest versionName** (örn. 8 ve 1.0.8) güncellenmiş olmalı.
- Gerekirse **Kaydet** deyin.

Böylece veritabanında **latest_version_code** ve **latest_version_name** dolar; API artık bu sürümü döndürür.

### 2. API cevabını kontrol edin

Tarayıcıda şu adresi açın:

- **https://menuslide.com/api/tv-app-config**

Cevapta şunlar **sayı** olmalı (null olmamalı):

- `latestVersionCode`: örn. 8  
- `minVersionCode`: isterseniz aynı veya daha düşük (örn. 6)

Örnek:

```json
{
  "apiBaseUrl": "https://menuslide.com/api/proxy",
  "downloadUrl": "https://...supabase.co/.../Menuslide.apk",
  "latestVersionCode": 8,
  "latestVersionName": "1.0.8",
  "minVersionCode": 6
}
```

Burada **latestVersionCode** ve **downloadUrl** dolu ise, eski sürümü açan cihazlar güncelleme uyarısı alır.

### 3. Cihazda test edin

- TV veya telefonda **eski sürüm** (örn. 1.0.6) yüklü olsun.
- Uygulamayı açın veya yayın kodunu girip **Başlat** deyin.
- Birkaç saniye içinde “Güncelleme var (v1.0.8)” benzeri diyalog çıkmalı.

Çıkmıyorsa:

- Cihazın **menuslide.com**’a erişebildiğini kontrol edin (aynı ağda tarayıcı ile açın).
- Adım 1–2’yi tekrar yapıp **latestVersionCode** ve **downloadUrl**’in gerçekten dolu olduğundan emin olun.

---

## Özet

| Durum | Sonuç |
|-------|--------|
| Veritabanında latest_version_code **null** | API 0/null döner → uygulama güncelleme göstermez. |
| Veritabanında latest_version_code **dolu** (örn. 8) | API 8 döner; cihazda 6 ise “Güncelleme var” çıkar. |
| Cihaz menuslide.com’a erişemiyor | Config alınamaz, güncelleme kontrolü atlanır (uyarı yok). |

**Pratik kural:** Güncelleme uyarısının gelmesi için admin panelde mutlaka **"Sürümü APK'dan oku"** (veya APK’yı “APK’yı depolamaya yükle” ile yükleyip sürümün otomatik yazılması) yapılmış olmalı; böylece tv_app_settings’te sürüm alanları dolar ve API doğru cevabı verir.
