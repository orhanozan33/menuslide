# Stick’te 4–5 dakika sonra donma – sebep ve çözümler

## Muhtemel sebep

- **WebView + zayıf donanım:** Menü/ekran yayını bir **web sayfası** (HTML/JS, şablonlar, animasyonlar). Stick’te WebView bu sayfayı çalıştırırken **bellek ve GPU** kullanımı zamanla artıyor; 4–5 dakika sonra cihaz **donuyor** veya uygulama kapanıyor.
- **GPU/sürücü:** Bazı stick’lerde WebView’ın GPU kullanımı sürücü hatası veya bellek birikimine yol açabiliyor.

## Yapılan uygulama tarafı değişiklikler

1. **WebView’ı periyodik tamamen yeniden oluşturma (reload yerine)**  
   Her 1,5 dakikada bir WebView **reload** edilmiyor; **eski WebView kaldırılıp yeni WebView oluşturulup** aynı sayfa yükleniyor. Böylece bellek/GPU daha iyi serbest bırakılıyor.

2. **Periyot 1,5 dakika**  
   Yenileme aralığı 2 dakikadan **1,5 dakikaya** indirildi; donma genelde 4–5. dakikada olduğu için bu süreden önce sayfa ve WebView yenilenmiş oluyor.

3. **Display sayfası (low=1) 1,5 dk yenileme**  
   Stick’te kullanılan hafif modda sayfa kendi kendini **1,5 dakikada bir** yeniliyor; uygulama tarafındaki 1,5 dk ile uyumlu.

4. **Zaten mevcut olanlar**  
   - Her zaman `?lite=1&low=1` (hafif animasyon, kısa süreler)  
   - WebView yazılım katmanı (GPU donması riskini azaltmak için)  
   - Watchdog 1 dk, bellek uyarısında cache temizleme + yenileme  
   - Render process çökünce WebView’ı yeniden oluşturma  

## Sizin yapmanız gerekenler

1. **Yeni APK’yı derleyip stick’e yükleyin** (bu değişiklikler uygulama kodunda).
2. **Frontend’i deploy edin** (display sayfası 1,5 dk yenileme için).
3. **Stick’te test edin:** Yayını en az 10–15 dakika açık bırakın; donma devam ediyor mu kontrol edin.

## Hâlâ donuyorsa

- **İçeriği sadeleştirin:** Ekranda çok fazla video, büyük resim veya ağır animasyon varsa şablonu sadeleştirin; tek şablon / daha az medya deneyin.
- **Donanım:** Bazı stick’lerde WebView kaynaklı donma yazılımla tam çözülemeyebilir; daha güçlü bir stick veya mini PC deneyin.
- **Alternatif:** Aynı yayını tarayıcıda (Chrome) açıp tam ekran yapmak; bazı cihazlarda uygulama WebView’ından daha stabil olabiliyor.

## Özet

| Önceki | Şimdi |
|--------|--------|
| Her 2 dk **reload()** | Her 1,5 dk **WebView’ı kaldırıp yeni WebView + loadUrl** |
| Sayfa low=1’de 2 dk yenileme | Sayfa low=1’de **1,5 dk** yenileme |

Bu ayarlarla 4–5. dakikadaki donmanın büyük oranda azalması veya kaybolması hedefleniyor.
