# Hareketli Menü Sistemi - Kurulum ve Kullanım

## Özellik Özeti

- **Static Area (Üst Bölüm)**: Logo, firma adı, kategori resimleri – sabit, hareket yok
- **Animated Area (Alt Bölüm)**: Ürün listesi sırayla ve animasyonlu gösterilir

## Kurulum

### 1. Veritabanı Migration

Migration'ı manuel çalıştırın:

```bash
# Backend .env dosyanızdaki DB bilgileriyle:
psql -h localhost -U <DB_USER> -d <DB_NAME> -f database/migration-add-animated-zone-config.sql
```

Veya `run-migrations.sh` kullanın (migration-*.sql dosyalarını sırayla çalıştırır).

### 2. Backend Yeniden Başlatma

```bash
cd backend && npm run build && node dist/main.js
```

## Kullanım

### Admin Panel

1. **Template Düzenleme** sayfasına gidin (`/templates/[id]/edit`)
2. Bloklardan birine **Special FOOD MENU** (regional_menu) veya **product_list** ekleyin
3. **"Hareketli Menü Ayarları"** kartı görünür
4. **"Hareketli ürün gösterimini etkinleştir"** kutusunu işaretleyin
5. Ayarları yapın:
   - **Animasyon Tipi**: Slide Up, Slide Left, Fade, Marquee
   - **Gösterim Süresi**: Her ürün için saniye (2–30)
   - **Görünen Ürün Sayısı**: Aynı anda gösterilen ürün sayısı (1–8)
6. **Kaydet** butonuna basın

### Viewer (TV Ekranı)

- Static alan sabit kalır
- Ürün listesi seçilen animasyon tipine göre sırayla gösterilir
- Offline modda da animasyon devam eder
- Animasyonlar CSS ile yapılır (ek kütüphane yok)

## Template JSON Örneği

```json
{
  "animated_zone_config": {
    "enabled": true,
    "animationType": "slide-up",
    "interval": 5,
    "visibleItemCount": 3
  }
}
```

## Animasyon Tipleri

| Tip        | Açıklama                    |
|-----------|-----------------------------|
| slide-up  | Ürünler yukarıdan kayarak   |
| slide-left| Ürünler soldan kayarak      |
| fade      | Soluk geçiş                 |
| marquee   | Yatay kayan yazı benzeri    |
