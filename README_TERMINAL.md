# 🖥️ Terminal'de Çalıştırma

Backend ve Frontend'i ayrı terminallerde çalıştırmak için:

## 📋 Yöntem 1: Script'ler ile (Önerilen)

### Terminal 1 - Backend
```bash
./scripts/start-backend.sh
```

### Terminal 2 - Frontend
```bash
./scripts/start-frontend.sh
```

## 📋 Yöntem 2: Manuel

### Terminal 1 - Backend
```bash
cd backend
npm run start:dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm run dev
```

## 🛑 Durdurma

Her terminal'de `Ctrl+C` ile durdurabilirsiniz.

Veya tüm süreçleri durdurmak için:
```bash
./scripts/stop-all-node.sh
```

## 🔗 Erişim

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## ✅ Test

Login:
- Email: `orhanozan33@hotmail.com`
- Password: `33333333`
