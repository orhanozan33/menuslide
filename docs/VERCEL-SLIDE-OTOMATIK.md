# Vercel'de Otomatik Slide Oluşturma

Yayınladığınızda slide görselleri **otomatik** oluşturulup Spaces'e yüklenir. Bunun için Vercel'de aşağıdaki env değişkenlerini ekleyin.

---

## 1) Vercel Dashboard → Project → Settings → Environment Variables

| Değişken | Değer | Açıklama |
|----------|-------|----------|
| `SCREENSHOTONE_ACCESS_KEY` | `xxxxx` | ScreenshotOne API key (ücretsiz 100/ay) |
| `DO_SPACES_KEY` | `xxxxx` | DigitalOcean Spaces API key |
| `DO_SPACES_SECRET` | `xxxxx` | DigitalOcean Spaces secret |
| `DO_SPACES_BUCKET` | `menuslide-signage` | Spaces bucket adı |
| `DO_SPACES_REGION` | `tor1` | Spaces region |

---

## 2) ScreenshotOne API Key Alma

1. https://screenshotone.com adresine gidin
2. Ücretsiz kayıt olun
3. Dashboard → API Keys → Access Key kopyalayın
4. Vercel env'e `SCREENSHOTONE_ACCESS_KEY` olarak ekleyin

**Ücretsiz:** 100 screenshot/ay. 6 slide × ~17 yayın = ~100. Daha fazla için ücretli plan.

---

## 3) Akış

1. Kullanıcı admin panelden template seçip **Yayınla** der
2. Backend DB günceller
3. Arka planda `generate-slides` tetiklenir
4. Her slide için ScreenshotOne API ile display sayfası screenshot alınır
5. Görseller Spaces'e yüklenir
6. Eski (yayında olmayan) görseller silinir

---

## 4) Vercel Plan Notu

`generate-slides` 6 slide için ~30–60 sn sürebilir. Proxy route `maxDuration = 120` saniye. Vercel Hobby planında fonksiyon süresi 10 sn ile sınırlı olabilir; bu durumda Pro plan veya başka bir host gerekir. Pro plan: 60 sn (veya `vercel.json` ile 300 sn).
