import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type PartnerItem = { kind: 'text' | 'logo'; value: string };

export async function GET() {
  try {
    const supabase = getServerSupabase();
    const { data } = await supabase
      .from('home_partners_config')
      .select('business_partners, partners')
      .limit(1)
      .maybeSingle();
    const business_partners = Array.isArray(data?.business_partners) ? data.business_partners : [];
    const partners = Array.isArray(data?.partners) ? data.partners : [];
    return NextResponse.json({ business_partners, partners });
  } catch {
    return NextResponse.json({ business_partners: [], partners: [] });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    const body = await request.json();
    const business_partners = Array.isArray(body.business_partners) ? body.business_partners : [];
    const partners = Array.isArray(body.partners) ? body.partners : [];
    const { error } = await supabase
      .from('home_partners_config')
      .upsert(
        {
          id: '00000000-0000-0000-0000-000000000002',
          business_partners: business_partners,
          partners: partners,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
    return NextResponse.json({ business_partners, partners });
  } catch (e) {
    return NextResponse.json({ message: 'Save failed' }, { status: 500 });
  }
}
