# Vercel'e deploy

## Yapılan değişiklik (Roku için)
`app/api/device/register/route.ts` — API artık Roku'dan gelen küçük harfli body alanlarını kabul ediyor: `displaycode`, `deviceid` (camelCase yanında).

## Deploy yöntemleri

### 1) Git push (önerilen)
Vercel projeniz GitHub/GitLab/Bitbucket ile bağlıysa:
```bash
cd /Users/admin/Desktop/Tvproje
git add frontend/app/api/device/register/route.ts
git commit -m "fix: device/register accept lowercase displaycode, deviceid for Roku"
git push origin main
```
Vercel otomatik olarak yeni deploy başlatır.

### 2) Vercel CLI
```bash
cd /Users/admin/Desktop/Tvproje/frontend
npx vercel login    # Tarayıcıda giriş yapın
npx vercel --prod   # Production deploy
```

### 3) Vercel Dashboard
1. https://vercel.com/dashboard
2. Projeyi seçin → Deployments
3. "Redeploy" veya son deployment’a tıklayıp "Redeploy" (aynı commit ile tekrar deploy)

Deploy bittikten sonra Roku uygulamasında kodu tekrar deneyin; API 200 dönmeli.
