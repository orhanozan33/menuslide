# Roku Layout Version & Cache Fix — Tam Çözüm Dokümantasyonu

Bu doküman, Roku Digital Signage uygulamasında "eski template görünüyor" sorununun teşhis ve çözüm stratejisini özetler.

---

## 1) CİHAZ ATAMASI DOĞRULAMA

### Kontrol Listesi
- [x] `deviceToken` doğru layout ile eşleşiyor — token `dt_{screenId}_` formatında, screenId ile layout çekiliyor
- [x] `deviceId` → layout mapping doğru — register endpoint displayCode ile screen bulup token üretiyor
- [x] Register endpoint cache'lenmiyor — `Cache-Control: no-store` header eklendi
- [x] Layout her cihaz için fresh çekiliyor — API stateless, her istek DB'den okur

### Örnek Register Response
```json
{
  "deviceToken": "dt_abc-123_def_1234567890",
  "layout": { "version": "2025-02-14T12:30:00Z", "slides": [...] },
  "layoutVersion": "2025-02-14T12:30:00Z",
  "refreshIntervalSeconds": 300
}
```

---

## 2) VERSİYON TABANLI INVALIDATION

### Strateji
```javascript
// Backend: layout version = max(screen.updated_at, max(rotations.updated_at))
const version = rotationMaxUpdated > screenUpdated ? rotationMaxUpdated : screenUpdated;
```

### Roku'da Karşılaştırma
```brightscript
function versionsDiffer(newVer as string, curVer as string) as boolean
    if newVer = invalid then newVer = ""
    if curVer = invalid then curVer = ""
    return (newVer <> "" and newVer <> curVer)
end function
```

### Her Publish'te Version Güncellemesi
- Publish sırasında `screens.updated_at` explicit olarak güncellenir
- `screen_template_rotations` INSERT ile yeni satırlar eklenir → `updated_at` otomatik
- Layout version = `max(rotations.updated_at, screen.updated_at)`

---

## 3) ATOMIC PUBLISH SİSTEMİ

### Mevcut Akış
1. DELETE screen_template_rotations WHERE screen_id = X
2. DELETE screen_blocks WHERE screen_id = X
3. UPDATE screens SET template_id, is_active, updated_at
4. INSERT screen_template_rotations (her template için)
5. Frame options (ticker vs.) varsa UPDATE screens

### Kısıtlamalar
- Partial update yok — her publish tam replace
- Draft vs Published: Admin'de "Yayınla" butonu atomic işlem tetikler
- Sadece published layout cihazlara döner (screens.is_active = true, rotations.is_active = true)

---

## 4) CDN CACHE INVALIDATION

### Strateji: Versioned Query Param
Slide URL'lerine layout version eklenir:
```
https://cdn.domain.com/slides/{screenId}/{templateId}.jpg?v=2025-02-14T12-30-00Z
```

- Version string'deki `:` ve `.` karakterleri `-` ile değiştirilir (URL uyumluluk)
- Aynı dosya içeriği değişirse → farklı `?v=` → CDN yeni URL'den çeker
- Önerilen CDN header: `Cache-Control: public, max-age=31536000, immutable` (versioned URL'ler için)
- **Asla** aynı URL'nin içeriğini üzerine yazma

### Backend Implementasyon
```typescript
const versionParam = version.replace(/[:.]/g, '-');
const url = `${SLIDE_IMAGE_BASE}/slides/${screenId}/${templateId}.jpg?v=${encodeURIComponent(versionParam)}`;
```

---

## 5) ROKU LOCAL CACHE INVALIDATION

### Registry Temizleme (Version Değişince)
```brightscript
' LayoutTask.brs içinde
if newVer <> "" and newVer <> curVer then
    sec.delete("layout")
    cntStr = sec.read("layout_slide_count")
    if cntStr <> "" then
        cnt = Int(Val(cntStr))
        for i = 0 to cnt - 1
            sec.delete("layout_slide_" + Stri(i))
        end for
    end if
end if
```

### Cache Keys
| Key | Açıklama |
|-----|----------|
| layout | Eski monolithic JSON (silinir version değişince) |
| layout_slide_count | Slide sayısı |
| layout_slide_0..N | Her slide JSON |
| layout_ver | Layout version |
| layoutVersion | Layout version (API response) |
| layout_bg | Background color |

### Fallback
- Layout fetch başarısızsa → chunked registry veya layout string kullan
- İkisi de yoksa → "Loading. Please Wait." göster, tekrar dene

---

## 6) REFRESH LOJİĞİ

### Akış
1. **Startup**: Cached layout göster, hemen `startLayoutFetch()` çalıştır
2. **Heartbeat** (her refreshIntervalSeconds): `HeartbeatTask` → sadece version çek
3. **Version değiştiyse**: `startLayoutFetch()` → LayoutTask → layout çek, registry güncelle, render
4. **Version aynıysa**: Layout fetch yapma, tekrar render yapma

### Örnek
```brightscript
sub onHeartbeatResult(msg as dynamic)
    data = msg.getData()
    if data = invalid or data.error <> invalid then return
    newVer = data.layoutVersion
    curVer = m.layoutVersion
    if newVer <> "" and newVer <> curVer then
        startLayoutFetch()
    end if
end sub
```

---

## 7) DEBUG STRATEJİSİ

### Log Örnekleri (Roku)
```brightscript
print "[LayoutTask] layoutVersion="; lv
print "[LayoutTask] version changed, clearing old cache"
print "[MainScene] layoutVersion cur="; curVer; " new="; newVer; " changed="; versionChanged
print "[MainScene] layout from registry version="; m.layoutVersion
```

### Backend Log
```typescript
console.log('[device/layout] screenId=', screenId, 'version=', version);
```

### Roku Debug Console
- `telnet <roku-ip> 8085` veya Roku Developer Application Installer
- `print` çıktıları ekranda veya `dmesg` benzeri logta görünür

---

## 8) CHECKLIST — ESKİ TEMPLATE SORUNUNU ÖNLEME

### Backend
- [x] Layout/register/version API'larda `Cache-Control: no-store`
- [x] Publish sırasında `screens.updated_at` explicit güncelleme
- [x] Slide URL'lere version query param (`?v=`)
- [x] `export const dynamic = 'force-dynamic'` (Next.js)

### Roku
- [x] Startup'ta her zaman layout fetch
- [x] Heartbeat'ta sadece version check; version değişince layout fetch
- [x] Version değişince eski registry keys temizleme
- [x] Version karşılaştırması strict string comparison

### CDN / Storage
- [ ] Slide görseller versioned path veya query ile servis edilmeli
- [ ] Aynı dosya adına üzerine yazma yapılmamalı
- [ ] `Cache-Control: public, max-age=31536000, immutable` versioned URL'ler için

### Test
- [ ] Publish sonrası 5 dk beklemeden cihaz yeniden başlat → yeni layout görünmeli
- [ ] Publish sonrası heartbeat tetikle (refreshInterval geçene kadar bekle veya kısalt) → yeni layout görünmeli
- [ ] API response header'da Cache-Control kontrol et

---

## 9) ÖZET — GARANTİLER

| Konu | Çözüm |
|------|-------|
| Device her zaman en güncel layout | Startup fetch + version-based heartbeat fetch |
| Stale template | Version değişince cache clear + layout overwrite |
| CDN cache karışıklığı | Versioned slide URL (`?v=`) |
| Local cache persistence | Version değişince registry keys delete |
| Rebuild gerekmeden yeni layout | Layout JSON sunucudan; Roku sadece fetch + render |
