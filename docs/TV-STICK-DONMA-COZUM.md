# Stick’te hizmeti düzgün verememe – donma ve çözümler

## Sorun

Düşük donanımlı stick’lerde (Android TV / Fire Stick vb.) menü yayını bir **web sayfası** (HTML/JS, şablonlar, animasyonlar) çalıştırıyor. WebView bellek ve GPU kullanımı zamanla artıyor; 4–5 dakika sonra cihaz **donuyor** veya uygulama kapanıyor. Bu yüzden stick’te hizmeti düzgün vermek zor.

## Yapılan yazılım tarafı değişiklikler

1. **WebView’ı periyodik tamamen yeniden oluşturma (reload yerine)**  
   Eski WebView kaldırılıp yeni WebView oluşturulup aynı sayfa yükleniyor; bellek/GPU sıfırlanıyor.

2. **1 dakika periyot (ultralow)**  
   - Uygulama her **1 dakikada** WebView’ı yeniden oluşturuyor.  
   - Display sayfası `?lite=1&low=1&ultralow=1` ile **1 dakikada bir** kendini yeniliyor.  
   - Donma genelde 4–5. dakikada olduğu için 1 dk yenileme ile önlenmesi hedefleniyor.

3. **Hafif mod her zaman**  
   - URL’e otomatik `lite=1&low=1&ultralow=1` ekleniyor.  
   - Animasyon süreleri kısa (300 ms), geçişler sade.

4. **Diğer**  
   - Watchdog 1 dk, bellek uyarısında cache temizleme + yenileme.  
   - Render process çökünce WebView’ı yeniden oluşturma.

## Sizin yapmanız gerekenler

1. **Yeni APK’yı derleyip stick’e yükleyin.**
2. **Frontend’i deploy edin** (display sayfası 1 dk yenileme için).
3. **Stick’te test edin:** Yayını 10–15 dakika açık bırakın; donma devam ediyor mu kontrol edin.

## Stick’te daha stabil yayın için öneriler

- **İçeriği sadeleştirin:** Çok fazla şablon rotasyonu, büyük resim veya video kullanmayın; tek veya az sayıda şablon deneyin.
- **Donanım:** Çok zayıf stick’lerde WebView kaynaklı donma yazılımla tam çözülemeyebilir; daha güçlü stick veya mini PC düşünün.
- **Alternatif:** Yayını tarayıcıda (Chrome) açıp tam ekran yapmak; bazı cihazlarda uygulama WebView’ından daha stabil olabiliyor.

## Özet (zamanlar)

| Ne | Süre |
|----|------|
| WebView yeniden oluşturma (uygulama) | **1 dk** |
| Sayfa kendini yenileme (display, ultralow=1) | **1 dk** |
| Animasyon / geçiş (low/ultralow) | 300 ms |

Bu ayarlarla 4–5. dakikadaki donmanın büyük oranda azalması veya kaybolması hedefleniyor.
