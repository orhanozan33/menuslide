# Roku Logları Nasıl Görülür?

Yayın donduğunda veya sorun ayıklarken Roku uygulamasının loglarını görmek için:

## 1. Gereksinimler

- Roku cihazı ve bilgisayar **aynı ağda** olmalı
- Roku’da **Developer Application Installer** açık olmalı  
  - Roku → Settings → Roku Developer Settings → Install channel (veya benzeri)

## 2. Bağlanma

Terminalde:

```bash
telnet <ROKU_IP> 8085
```

- **ROKU_IP**: Roku cihazının yerel IP adresi  
  - Roku → Settings → Network → About

## 3. Çıktı

Bağlantı sonrası:

- `print` ifadeleri bu terminalde görünür
- Örnek: `[MainScene] onSlideTimerFire slideIndex=0`
- `[MainScene] finishTransition nextIndex=1`
- `[MainScene] startSlideTimer slideIndex=1 dur=8`

## 4. Yorumlama

- **slideIndex** artıyorsa: slide timer düzgün tetikleniyor
- **finishTransition** görünüyorsa: geçiş tamamlanıyor
- **startSlideTimer** görünüyorsa: yeni slide süresi başlıyor
- Loglar bir süre sonra duruyorsa: timer veya event döngüsü kesilmiş olabilir (donma)

## 5. Alternatif

- **Roku Developer Application Installer** (Windows/Mac): Cihazı seçip debug/console bölümünden loglar izlenebilir
