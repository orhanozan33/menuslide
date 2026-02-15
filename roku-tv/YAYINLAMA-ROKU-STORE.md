# MenuSlide Roku — Mağazada Yayınlama Rehberi

## 1. Paket (hazır)

- **Dosya:** `roku-tv/menuslide-roku.zip` (package.sh ile oluşturulur)
- **İçerik:** manifest, source, components, images (logo/ikonlar dahil)

## 2. Roku Developer Hesabı

1. **https://developer.roku.com** → Sign in / Create account
2. Gerekirse **Developer** hesabı oluşturun (ücretsiz; kanal yayınlamak için gerekli)

## 3. Dashboard’da Kanal Oluşturma / Güncelleme

1. **https://developer.roku.com/dev/dashboard** adresine gidin
2. **My Channels** → **Add Channel** (yeni kanal) veya mevcut **MenuSlide** kanalını seçin
3. **Upload** bölümünde **menuslide-roku.zip** dosyasını yükleyin
4. Yükleme sonrası **Static Analysis** ve **Channel Behavior** testleri otomatik çalışır; hata varsa düzeltip tekrar yükleyin

## 4. Mağaza Bilgileri (Store listing)

Dashboard’da kanalı seçip aşağıdaki alanları doldurun:

| Alan | Örnek / Not |
|------|---------------------|
| **Channel name** | MenuSlide Digital Signage |
| **Short description** | Dijital menü ve reklam ekranı. TV’de şablonlarınızı yayınlayın. |
| **Long description** | MenuSlide ile restoran, kafe veya işletmeniz için dijital menü ve içerik ekranları oluşturun. Roku TV’de yayın kodunuzla kanalı açın, güncel slaytlar otomatik gelir. |
| **Category** | Business veya Food & Drink (uygun olanı seçin) |
| **Content rating** | İçeriğe göre (örn. All Ages) |
| **Screenshots** | 1920x1080 veya Roku’nun istediği boyutlarda ekran görüntüleri (en az 1–2 adet) |
| **Support email** | Destek e-postanız |

## 5. Monetization (Para Kazanımı)

- **Monetization model:** Ücretsiz (Free) veya uygun gördüğünüz model
- Reklam / abonelik kullanmıyorsanız **Free** seçin

## 6. Yayına Alma (Publish)

1. Tüm **Preview and Publish** maddelerini tamamlayın (Properties, Channel Store Info, Screenshots, Monetization vb.)
2. **Schedule Publishing** butonu aktif olunca tıklayın
3. Yayın tarihini seçin (hemen veya ileri bir tarih)
4. Onaylayın; Roku inceleme yapar ve mağazada yayınlanır

## 7. Önemli Notlar

- **Signing key:** İlk kez cihaza yüklüyorsanız Roku cihazda **genkey** ile imza anahtarı oluşturulur. Aynı anahtarı saklayın; güncellemelerde gerekir.
- **Beta vs Public:** Mağaza için **public** kanal oluşturduğunuzdan emin olun (beta sadece test içindir).
- **Metadata:** Yayın tarihi seçildikten sonra mağaza bilgilerinde değişiklik yaparsanız yayın tarihi iptal olabilir; gerekirse tekrar **Schedule Publishing** yapın.

## Hızlı Linkler

- Dashboard: https://developer.roku.com/dev/dashboard  
- Yayınlama rehberi: https://developer.roku.com/docs/developer-program/publishing/channel-publishing-guide  
- Paketleme: https://developer.roku.com/docs/developer-program/publishing/packaging-channels  
