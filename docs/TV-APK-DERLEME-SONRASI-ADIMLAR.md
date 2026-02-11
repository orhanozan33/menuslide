# TV uygulaması derleme sonrası – adım adım

Derleme bitti. APK dosyası: **frontend/public/downloads/Menuslide.apk** (sürüm 1.0.11).

---

## 1. APK’yı stick’e nasıl yükleyeceğinizi seçin

**A) Bilgisayardan USB ile (ADB)**  
- Stick’te “Geliştirici seçenekleri”nde **USB hata ayıklama** açık olmalı.  
- Stick’i USB ile bilgisayara bağlayın.  
- Bilgisayarda:  
  `adb install -r /Users/admin/Desktop/Tvproje/frontend/public/downloads/Menuslide.apk`  
- `-r` = varsa eski sürümün üzerine kurar.

**B) Web’den indirip stick’te açmak**  
1. Frontend’i deploy edin (Vercel vb.) ki **https://menuslide.com/downloads/Menuslide.apk** (veya kendi domain’iniz) çalışsın.  
2. Stick’te tarayıcı açıp bu linke gidin veya bilgisayarda indirip USB / SD kart / bulut ile stick’e atın.  
3. Stick’te “Dosya yöneticisi” veya “İndirilenler”den APK’ya tıklayıp kurun.  
4. “Bilinmeyen kaynaklardan yükleme” izni istenirse izin verin.

**C) Bilgisayarda indirip USB / SD ile**  
1. Bilgisayarda APK’yı kopyalayın:  
   `frontend/public/downloads/Menuslide.apk`  
2. USB bellek veya SD karta yapıştırın, stick’e takın.  
3. Stick’te dosya uygulamasından APK’yı bulup kurun.

---

## 2. Stick’te uygulamayı açın

- Uygulama adı: **Menu Slide** (veya manifest’teki `app_name`).  
- Launcher’da (Ana sayfa / Uygulamalar) ikonuna tıklayın.

---

## 3. Yayın kodunu girin

1. Açılışta **5 haneli yayın kodu** istenir (örn. 57126).  
2. Bu kodu **Admin panel → Ekranlar → ilgili TV** kartındaki “TV uygulaması yayın kodu”ndan alın.  
3. Kodu ekrana yazın (uzaktan kumanda veya klavye).  
4. **Başlat**’a basın.

---

## 4. Ne olması beklenir (bu sürümde)

- Kod ekranı kapanır, sadece **yükleme göstergesi** görünür.  
- **Pil optimizasyonu (Settings) ekranı açılmaz** (TV/stick’te atlanıyor).  
- Bir süre sonra **yayın ekranı** (menü slaytları) açılır.  
- Hata olursa kırmızı bir **hata mesajı** ve tekrar kod girişi ekranı çıkar.

---

## 5. Hata alırsanız

- **“Kod bulunamadı”:** Admin’deki 5 haneli kodla birebir aynı mı kontrol edin; başında/sonunda boşluk olmasın.  
- **“Sunucu hatası” / “Yanıt geçersiz”:** Stick internet bağlı mı, **https://menuslide.com** (veya kendi API adresiniz) açılıyor mu kontrol edin.  
- **Hiç tepki yok:** Uygulamayı kapatıp açın; 20 saniye içinde ya yayın başlar ya da hata mesajı çıkar.

---

## 6. Frontend’i deploy etmek (APK’yı siteden indirtmek için)

- APK’yı siteden indirtmek istiyorsanız projeyi deploy edin (örn. `git push` sonrası Vercel otomatik deploy eder).  
- Deploy’dan sonra **https://[site]/downloads/Menuslide.apk** çalışır.  
- İsterseniz Admin → Ayarlar’daki “TV uygulaması indirme linki”ni bu adrese göre ayarlayın.

---

## Kısa özet

| Adım | Ne yapılır |
|------|------------|
| 1 | APK’yı stick’e yükle (USB/ADB, web indirme veya USB/SD). |
| 2 | Uygulamayı aç, 5 haneli yayın kodunu gir, Başlat’a bas. |
| 3 | Yükleme sonrası yayın ekranı gelmeli; hata varsa mesajı okuyup kodu/bağlantıyı kontrol et. |
| 4 | APK’yı siteden indirtmek için frontend’i deploy edin. |
