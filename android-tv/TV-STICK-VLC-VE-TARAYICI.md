# TV Stick’te (Fire Stick / Google TV) Link Açma ve Menuslide Yayını

## Önemli: Menuslide linki video değil, web sayfası

- **Menuslide ekran linki** (örn. `https://menuslide.com/display/10012`) bir **web sayfası**dır; menü/slayt gösterir, video yayını değil.
- **VLC** video/ses yayınları (m3u8, rtsp, mp4 vb.) için uygun; web sayfası açmaz.
- Bu yüzden Menuslide’ı TV’de göstermek için **tarayıcı** veya **Menuslide Android TV uygulaması** kullanılmalı.

---

## 1) Menuslide yayınını TV’de göstermek (önerilen)

### A) Menuslide Android TV uygulaması (en uygun)

1. Menuslide APK’yı stick’e yükleyin (indirme linki: panelden veya ayarlardan).
2. Uygulamayı açın, kayıtlı kodu girin (ekran kodu veya kurulumda verilen kod).
3. Yayın otomatik açılır; tam ekran, otomatik yenileme ve TV için ayarlar uygulama içinde.

### B) Tarayıcı ile (VLC kullanmadan)

**Fire Stick:**
1. Stick’te **Silk Browser** veya **Firefox** (Amazon Appstore’dan) yükleyin.
2. Tarayıcıyı açın, adres çubuğuna yazın:  
   `https://menuslide.com/display/YAYIN_KODU`  
   (YAYIN_KODU yerine ekran kodunuzu yazın, örn. `10012`.)
3. Sayfa açılınca tam ekran yapın (genelde menüden veya uzaktan “fullscreen” seçeneği).

**Google TV / Chromecast with Google TV:**
1. **Chrome** veya **Google TV** içindeki tarayıcıyı kullanın; gerekirse “TV Bro” gibi bir tarayıcı yükleyebilirsiniz.
2. Adres çubuğuna:  
   `https://menuslide.com/display/YAYIN_KODU`  
   yazıp açın.
3. Tam ekran yapın.

Lite mod (daha hafif):  
`https://menuslide.com/display/10012?lite=1`

---

## 2) VLC ile link (gerçek video/ses yayını) açmak

VLC yalnızca **medya linki** (video/audio stream) açar. Örnek: `http://.../stream.m3u8`, `rtsp://...`, `https://.../video.mp4`.

### Fire Stick’te VLC ile link açma (adım adım)

1. **VLC’yi yükleyin**  
   Fire Stick → Ana menü → Uygulamalar → Appstore → “VLC” ara → Yükle.

2. **VLC’yi açın**  
   Uygulamalar listesinden VLC’ye girin.

3. **Sol menüden “Ağ” (Network) veya “Stream”e girin**  
   (VLC sürümüne göre: “Open Network Stream” / “Ağ Akışı Aç” benzeri bir seçenek olur.)

4. **URL alanına linki yapıştırın**  
   - Klavye çıkar; linki yapıştırın veya yazın.  
   - Örnek (gerçek bir yayın linki):  
     `http://example.com/stream.m3u8`  
   - **Menuslide display linki (menuslide.com/display/...)** burada **çalışmaz**; sayfa HTML’dir, video değil.

5. **Oynat’a basın**  
   Link gerçek bir medya adresi ise yayın başlar.

**Not:** Fire Stick’te yapıştırma zor olabilir. Alternatif:
- Telefonda “Fire TV” uygulamasını kullanıp klavye ile URL girebilirsiniz.
- VLC’de “Önce bilgisayarda/telefonda URL’i aç, sonra cast” gibi seçenek varsa onu da kullanabilirsiniz.

### Google TV (Chromecast with Google TV) stick’te VLC

1. **Google Play’den VLC** yükleyin.
2. VLC’yi açın → **Medya** (Media) → **Aç** (Open) → **Ağ akışı / URL**.
3. URL alanına **sadece medya linkini** (m3u8, rtsp, mp4 vb.) girin ve oynatın.  
   Menuslide ekran linki (menuslide.com/display/...) yine **medya linki olmadığı için** VLC’de anlamlı oynatılmaz.

---

## Özet tablo

| Ne yapmak istiyorsunuz?              | Kullanılacak                          |
|------------------------------------|----------------------------------------|
| Menuslide menü/slayt yayını       | Menuslide TV uygulaması veya tarayıcı |
| Gerçek video/radyo linki (m3u8 vb.)| VLC (Ağ / Network stream → URL yapıştır) |

---

## Kısa link özeti (Menuslide için)

- Normal: `https://menuslide.com/display/10012`
- **Lite** (5.5 dk yenileme): `https://menuslide.com/display/10012?lite=1`
- **Zayıf cihaz** (donma/kapanma; 3 dk yenileme): `https://menuslide.com/display/10012?low=1`

Bu linkleri **tarayıcıda** veya **Menuslide TV uygulamasında** açın; **VLC’de açmayın**.
