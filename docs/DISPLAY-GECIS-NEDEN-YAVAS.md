# Display geçişleri neden "fil gibi" akıcı değil?

## Nedenler

### 1. Yeni şablon geçiş anında ilk kez çiziliyor
- Overlay’da **sonraki** şablon, geçiş başladığı anda DOM’a **ilk kez** ekleniyor.
- O anda tarayıcı: canvas (Fabric) yüklüyor, `loadFromJSON` + `renderAll`, resimler yükleniyor, layout/paint yapılıyor.
- Bu işler **ana thread**’te olduğu için animasyon kareleri atlanabiliyor → takılma hissi.

### 2. Veri önceden var, ekran önceden yok
- **Veri** (sonraki şablonun JSON’u) önceden cache’leniyor (`rotationCacheRef`) → fetch gecikmesi yok.
- Ama **görüntü** önceden render edilmiyor. Yani sonraki şablon ilk kez geçişte çiziliyor; bu da geçişi ağırlaştırıyor.
- Gerçek “sinema gibi” akıcılık için: sonraki şablonu ekranda göstermeden önce arka planda (görünmez) bir kez çizip “ısıtmak” gerekir; bu büyük bir refactor.

### 3. Uzun geçiş süresi (1,4 sn)
- 1400 ms uzun bir animasyon; “yavaş” hissettirir.
- Akıcı his için genelde **400–700 ms** daha rahat; süreyi makul düşürünce “daha akıcı” algılanır.

### 4. Ağır içerik
- Full editor (canvas), büyük resimler, çok blok = geçiş sırasında daha çok iş = daha çok takılma.
- Şablonları sadeleştirirsen (daha az resim, daha basit canvas) geçişler de hafifler.

### 5. Cihaz (Roku / zayıf tarayıcı)
- Roku veya düşük güçlü cihazda CPU/GPU sınırlı; aynı kod bile daha az akıcı olur.
- `?lite=1` veya `?low=1` ile daha kısa/hafif animasyon kullanılıyor; buna rağmen cihaz yetersiz kalabilir.

---

## Yapılabilecek iyileştirmeler (güvenli)

1. **Geçiş süresini kısaltmak (örn. 700 ms)**  
   - Daha kısa animasyon = daha “çabuk ve akıcı” his.  
   - Overlay’ı çok erken kaldırırsan mavi ekran riski var; bu yüzden overlay’ı kaldırma gecikmesi (400 ms gibi) yeterli tutulmalı.

2. **Varsayılan efekt “fade”**  
   - Zaten fade; slide/zoom gibi efektler daha ağır. Fade en hafif seçenek.

3. **İleride: sonraki şablonu önceden render etmek**  
   - Sonraki şablonu görünmez bir katmanda bir kez çizip, geçişte sadece opacity ile göstermek.  
   - Büyük değişiklik; ayrı bir özellik olarak planlanabilir.

Bu dosya sadece açıklama içindir; davranış değişikliği kodda yapılır.
