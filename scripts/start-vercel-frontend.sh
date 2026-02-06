#!/bin/bash
# Vercel + Supabase modu: Sadece frontend başlatır (backend/Render gerekmez).
# API istekleri /api/proxy ve Vercel API route'ları üzerinden Supabase'e gider.

echo "🎨 Vercel + Supabase modu — Frontend başlatılıyor..."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$SCRIPT_DIR/../frontend"
cd "$FRONTEND_DIR" || exit 1

if [ ! -f ".env.local" ]; then
  echo "⚠️  .env.local bulunamadı."
  if [ -f ".env.example" ]; then
    cp .env.example .env.local
    echo "✅ .env.example'dan .env.local oluşturuldu."
    echo "📝 Lütfen frontend/.env.local içine Supabase URL, anon key, service_role key ve JWT_SECRET girin."
    echo "   NEXT_PUBLIC_API_URL boş bırakın (Vercel API kullanılır)."
    echo ""
  else
    echo "❌ .env.example da yok. Çıkılıyor."
    exit 1
  fi
fi

if [ ! -d "node_modules" ]; then
  echo "📦 Bağımlılıklar yükleniyor..."
  npm install
fi

echo "✅ Next.js başlatılıyor — http://localhost:3000"
echo "   Durdurmak için Ctrl+C"
echo ""

npm run dev
