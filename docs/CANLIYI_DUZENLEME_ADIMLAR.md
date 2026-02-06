# Canlıyı Tasarladığınız Gibi Düzgün Hale Getirme

Canlı (Vercel) her şey karmaşık/bozuk görünüyorsa, aşağıdaki adımları **sırayla** uygulayın. Amaç: yerelde gördüğünüz veri ve davranışın canlıda da aynı olması.

---

## Önce: Yerel “doğru” durum

- Yerelde (local) backend + PostgreSQL veya Supabase ile sistem **istediğiniz gibi** çalışıyor.
- Canlıda **sadece** Vercel + Supabase kullanıyorsunuz (harici backend yok).

Bu doküman canlıyı bu modele göre düzeltmek içindir.

---

## Adım 1: Vercel ortam değişkenleri (tek sefer)

**Vercel** → Proje → **Settings** → **Environment Variables**

Şunlar **mutlaka** olsun:

| Değişken | Değer | Yoksa ne olur |
|----------|--------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://PROJE_REF.supabase.co` | 500, veri gelmez |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Auth/veri sorunu |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | 500, API çalışmaz |
| `JWT_SECRET` | En az 32 karakter rastgele string | 401, giriş sonrası istekler red |

Şunlar **olmasın** (silin veya boş bırakın):

- `NEXT_PUBLIC_API_URL` → **Silin** veya değeri boş. Dolu olursa istekler harici backend’e gider, canlı veri/akış karışır.

Environment: **Production** (ve kullandığınız Preview varsa onu da) seçili olsun.

---

## Adım 2: Veriyi canlıya taşıma (yerel = kaynak)

Canlıda gördüğünüz veri (şablonlar, kullanıcılar, ekranlar, menüler) **Supabase**’te olmalı. Veri orada yoksa veya eskiyse her şey “karmaşık/bozuk” görünür.

**Yerelde** (terminal):

```bash
cd /Users/admin/Desktop/Tvproje
export SUPABASE_DB_PASSWORD='Supabase_veritabani_sifreniz'
./scripts/push-to-supabase.sh
```

- Şifre: Supabase Dashboard → **Settings** → **Database** → Database password.
- Script: yerelden export alır → Supabase’e import eder → resim/video path’lerini Storage’a göre günceller.

Bunu **yerel veriyi güncelledikçe** (yeni şablon, kullanıcı, menü ekledikçe) tekrarlayabilirsiniz.

---

## Adım 3: Redeploy

Vercel’de:

- **Deployments** → son deployment → **⋯** → **Redeploy**

Env değiştirdiyseniz veya `NEXT_PUBLIC_*` kullandıysanız **Redeploy şart**.

---

## Adım 4: Canlıda oturum (token)

- **menuslide.com** (veya canlı domain) üzerinden **Çıkış** yapın.
- Aynı siteden **tekrar giriş** yapın (email + şifre).

Böylece token, canlıdaki `JWT_SECRET` ile imzalanır; 401 ve “veri gelmiyor” azalır.

---

## Adım 5: Kontrol listesi (canlıda test)

| Kontrol | Nerede | Beklenen |
|--------|--------|-----------|
| Giriş | `/tr/login` (veya /en, /fr) | Başarılı giriş, dashboard açılsın |
| Kullanıcılar | Kullanıcı Yönetimi | Yerelde gördüğünüz kullanıcılar listelensin |
| Raporlar – Tüm üyeler | Raporlar sayfası | Aynı kullanıcılar görünsün |
| Hazır Şablonlar | Şablonlar sayfası | Sistem şablonları listelensin |
| Ekranlar / Menüler | İlgili sayfalar | Yereldeki gibi veri görünsün |

Bunlardan biri hâlâ boş/yanlışsa:

- **Veri boş:** Adım 2’yi tekrarlayın (push-to-supabase), Supabase’te gerçekten satır var mı SQL Editor ile kontrol edin.
- **401:** JWT_SECRET doğru mu, çıkış yapıp tekrar giriş yaptınız mı kontrol edin.
- **500:** NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY doğru mu kontrol edin.

---

## Özet (sıra)

1. Vercel’de 4 env (Supabase 3 + JWT_SECRET), NEXT_PUBLIC_API_URL yok/boş.
2. `./scripts/push-to-supabase.sh` ile veriyi Supabase’e taşı.
3. Vercel’de Redeploy.
4. Canlıda çıkış yap, tekrar giriş yap.
5. Yukarıdaki kontrolleri yap.

Bu sırayla yaptıktan sonra sistem, “yerelde tasarladığınız” hale en yakın şekilde canlıda da çalışır. Belirli bir sayfa veya hata mesajı varsa onu ayrıca yazarsanız, sadece ona özel net adım da çıkarabiliriz.
