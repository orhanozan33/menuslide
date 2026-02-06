import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * GET /api/health
 * Frontend'in Supabase'e bağlanıp bağlanamadığını kontrol eder.
 * Veri gelmiyorsa tarayıcıda http://localhost:3000/api/health açın.
 */
export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasJwt = !!process.env.JWT_SECRET;

  if (!supabaseUrl || !hasServiceKey) {
    return NextResponse.json({
      ok: false,
      error: 'Supabase yapılandırması eksik',
      hint: 'frontend/.env.local içinde NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlayın.',
      env: {
        hasSupabaseUrl: !!supabaseUrl,
        hasServiceRoleKey: hasServiceKey,
        hasJwtSecret: hasJwt,
      },
    }, { status: 503 });
  }

  try {
    const supabase = getServerSupabase();
    const { count, error } = await supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true });
    if (error) {
      return NextResponse.json({
        ok: false,
        error: 'Supabase bağlantı hatası',
        message: error.message,
        hint: 'Supabase projesi doğru mu? Tablolar (businesses, templates vb.) oluşturuldu mu?',
        env: { hasSupabaseUrl: true, hasServiceRoleKey: true, hasJwtSecret: hasJwt },
      }, { status: 503 });
    }
    return NextResponse.json({
      ok: true,
      supabase: 'connected',
      businessesCount: count ?? 0,
      env: { hasSupabaseUrl: true, hasServiceRoleKey: true, hasJwtSecret: hasJwt },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({
      ok: false,
      error: 'Supabase bağlantı hatası',
      message,
      hint: 'frontend/.env.local değerlerini kontrol edin. Supabase Dashboard → Settings → API.',
      env: { hasSupabaseUrl: true, hasServiceRoleKey: true, hasJwtSecret: hasJwt },
    }, { status: 503 });
  }
}
