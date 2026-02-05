# Vercel Build Hatası

Build Vercel'de düşüyorsa aşağıdakileri kontrol edin.

## 1. Root Directory (en sık neden)

Proje **monorepo**: frontend `frontend/` klasöründe.

- **Vercel** → Proje → **Settings** → **General**
- **Root Directory** alanına `frontend` yazın (veya "Edit" ile `frontend` seçin)
- **Save** → **Deployments** → **Redeploy**

Root Directory boş bırakılırsa Vercel repo kökünden build alır; kökte `package.json` olmadığı için build hata verir.

## 2. Node.js sürümü

Next 15 ve React 19 için **Node 18.18+** gerekir.

- **Settings** → **General** → **Node.js Version** → **20.x** seçin (veya 18.x)
- Projede `frontend/.nvmrc` ve `frontend/package.json` içinde `engines.node` tanımlı; Vercel bunu kullanabilir.

## 3. Environment variables

Build sırasında hata alıyorsanız env’e bağlı olmayabilir; yine de canlı için gerekli:

- **Settings** → **Environment Variables**
- `NEXT_PUBLIC_API_URL` = `https://tvproje-backend.onrender.com`
- `NEXT_PUBLIC_APP_URL` = `https://menuslide.com`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase’den)

Değiştirdikten sonra **Redeploy** yapın.

## 4. Hata mesajına göre

- **"Cannot find module 'next'"** → Root Directory = `frontend` yapın.
- **"n.cache is not a function"** → React 19 kullanıldığından emin olun (`package.json` içinde `react` / `react-dom` ^19.0.0).
- **Node / memory hatası** → Node 20 seçin, gerekirse **Redeploy with cleared cache**.

Detay için: Vercel → **Deployments** → ilgili deployment → **Building** log’una bakın.
