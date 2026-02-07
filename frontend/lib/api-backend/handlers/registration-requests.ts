import { NextRequest } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import type { JwtPayload } from '@/lib/auth-server';
import { randomUUID } from 'crypto';
import { useLocalDb, queryLocal, queryOne, insertLocal, updateLocal, deleteLocal, mirrorToSupabase } from '@/lib/api-backend/db-local';
import { insertAdminActivityLog } from '@/lib/api-backend/admin-activity-log';

const TABLE = 'registration_requests';

function rowToDto(r: Record<string, unknown>) {
  return {
    id: r.id,
    businessName: r.business_name,
    email: r.email,
    phone: r.phone ?? undefined,
    tvCount: r.tv_count ?? undefined,
    address: r.address ?? undefined,
    province: r.province ?? undefined,
    city: r.city ?? undefined,
    reference_number: r.reference_number ?? undefined,
    status: r.status,
    createdAt: r.created_at,
  };
}

function requireAdmin(user: JwtPayload | null): void {
  if (!user) throw new Error('Unauthorized');
  if (user.role !== 'super_admin' && user.role !== 'admin') {
    throw new Error('Only admin or super admin can access registration requests');
  }
}

/** GET /registration-requests — list (admin only) */
export async function findAll(user: JwtPayload): Promise<Response> {
  requireAdmin(user);
  if (useLocalDb()) {
    try {
      const data = await queryLocal(`SELECT * FROM ${TABLE} ORDER BY created_at DESC`, []);
      return Response.json(data.map(rowToDto));
    } catch (e: any) {
      if (e?.message?.includes('does not exist') || e?.code === '42P01') return Response.json([]);
      throw e;
    }
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) {
    if (error.message?.includes('could not find the table') || error.code === '42P01') return Response.json([]);
    return Response.json({ message: error.message }, { status: 500 });
  }
  return Response.json((data ?? []).map(rowToDto));
}

/** POST /registration-requests — public create */
export async function create(req: NextRequest): Promise<Response> {
  let body: { businessName?: string; email?: string; phone?: string; tvCount?: string; address?: string; province?: string; city?: string; reference_number?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const email = String(body?.email ?? '').trim();
  const businessName = String(body?.businessName ?? '').trim();
  if (!email || !businessName) {
    return Response.json({ message: 'businessName and email are required' }, { status: 400 });
  }
  const row = {
    id: randomUUID(),
    business_name: businessName,
    email,
    phone: body.phone ? String(body.phone).trim() : null,
    tv_count: body.tvCount ? String(body.tvCount).trim() : null,
    address: body.address ? String(body.address).trim() : null,
    province: body.province ? String(body.province).trim() : null,
    city: body.city ? String(body.city).trim() : null,
    reference_number: body.reference_number ? String(body.reference_number).trim() : null,
    status: 'pending',
  };
  if (useLocalDb()) {
    const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email]);
    if (existing) return Response.json({ message: 'EMAIL_ALREADY_REGISTERED' }, { status: 409 });
    const inserted = await insertLocal(TABLE, row);
    await mirrorToSupabase(TABLE, 'insert', { row: inserted });
    return Response.json(rowToDto(inserted), { status: 201 });
  }
  const supabase = getServerSupabase();
  const { data: existing } = await supabase.from('users').select('id').eq('email', email).maybeSingle();
  if (existing) return Response.json({ message: 'EMAIL_ALREADY_REGISTERED' }, { status: 409 });
  const { data: inserted, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  return Response.json(rowToDto(inserted), { status: 201 });
}

/** PATCH /registration-requests/:id/status */
export async function updateStatus(id: string, req: NextRequest, user: JwtPayload): Promise<Response> {
  requireAdmin(user);
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ message: 'Invalid body' }, { status: 400 });
  }
  const status = body?.status as string;
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return Response.json({ message: 'Invalid status' }, { status: 400 });
  }
  const actionType = status === 'approved' ? 'reg_approve' : status === 'rejected' ? 'reg_reject' : 'reg_update';
  if (useLocalDb()) {
    const data = await updateLocal(TABLE, id, { status });
    if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
    await mirrorToSupabase(TABLE, 'update', { id, row: { status, id } });
    await insertAdminActivityLog(user, { action_type: actionType, page_key: 'registration-requests', resource_type: 'registration_request', resource_id: id, details: { status } });
    return Response.json(rowToDto(data));
  }
  const supabase = getServerSupabase();
  const { data, error } = await supabase.from(TABLE).update({ status }).eq('id', id).select().maybeSingle();
  if (error) return Response.json({ message: error.message }, { status: 500 });
  if (!data) return Response.json({ message: 'Not found' }, { status: 404 });
  await insertAdminActivityLog(user, { action_type: actionType, page_key: 'registration-requests', resource_type: 'registration_request', resource_id: id, details: { status } });
  return Response.json(rowToDto(data));
}

/** DELETE /registration-requests/:id */
export async function remove(id: string, user: JwtPayload): Promise<Response> {
  requireAdmin(user);
  if (useLocalDb()) {
    await deleteLocal(TABLE, id);
    await mirrorToSupabase(TABLE, 'delete', { id });
    await insertAdminActivityLog(user, { action_type: 'reg_delete', page_key: 'registration-requests', resource_type: 'registration_request', resource_id: id, details: {} });
    return Response.json({ success: true });
  }
  const supabase = getServerSupabase();
  const { error } = await supabase.from(TABLE).delete().eq('id', id);
  if (error) return Response.json({ message: error.message }, { status: 500 });
  await insertAdminActivityLog(user, { action_type: 'reg_delete', page_key: 'registration-requests', resource_type: 'registration_request', resource_id: id, details: {} });
  return Response.json({ success: true });
}
