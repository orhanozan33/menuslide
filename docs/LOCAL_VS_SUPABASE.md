# Veritabanı: Şu An Local, İleride Supabase

## Mevcut durum (Local)

- **Backend**: Yerel PostgreSQL kullanılıyor (`DatabaseService` + `*-local.service.ts` modülleri).
- **Auth**: Local auth (login → JWT `auth_token` + `user` bilgisi `localStorage`’da).
- **Frontend**: `NEXT_PUBLIC_API_URL=http://localhost:3001` ile backend’e istek atıyor. Supabase env değişkenleri **zorunlu değil**; boş bırakılırsa Supabase devre dışı (mock) kalır.

## İleride Supabase kullanımı

Supabase’e geçildiğinde:

1. **Backend**: Supabase client env ile sağlanacak; mevcut `SupabaseOptionalModule` ve service’lerde Supabase implementasyonu kullanılacak.
2. **Frontend**: `.env.local` içine `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_ANON_KEY` eklenecek; `lib/api.ts` ve `lib/supabase.ts` içinde Supabase session/token kullanımı tekrar devreye alınabilir.
3. **Auth**: İstenirse Supabase Auth kullanılır; token yine API isteklerinde `Authorization` header’da gönderilir.

Şu an tüm veri ve kimlik doğrulama **local PostgreSQL + local auth** ile çalışıyor; Supabase paketleri kurulu ama kullanılmıyor (mock).
