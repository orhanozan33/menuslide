/**
 * Admin hareket günlüğü - backend handler'lardan çağrılır.
 * Sadece admin/super_admin kullanıcılar için kayıt ekler.
 */
import type { JwtPayload } from '@/lib/auth-server';
import { getServerSupabase } from '@/lib/supabase-server';
import { useLocalDb, insertLocal, queryLocal } from '@/lib/api-backend/db-local';

export type AdminActivityPayload = {
  action_type: string;
  page_key: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
};

export async function insertAdminActivityLog(user: JwtPayload, payload: AdminActivityPayload): Promise<void> {
  if (user.role !== 'super_admin' && user.role !== 'admin') return;
  try {
    const row = {
      user_id: user.userId,
      action_type: payload.action_type ?? 'view',
      page_key: payload.page_key ?? '',
      resource_type: payload.resource_type ?? null,
      resource_id: payload.resource_id ?? null,
      details: payload.details ?? null,
    };
    if (useLocalDb()) {
      const tableExists = await queryLocal(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_activity_log'"
      );
      if (tableExists.length > 0) {
        await insertLocal('admin_activity_log', row);
      }
    } else {
      const supabase = getServerSupabase();
      const { error } = await supabase.from('admin_activity_log').insert(row);
      if (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[admin-activity-log] Supabase insert failed:', error.message);
        }
        throw error;
      }
    }
  } catch (e) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin-activity-log] Insert failed:', e instanceof Error ? e.message : e);
    }
    // Sessizce yoksay (ana işlemi bozma)
  }
}
