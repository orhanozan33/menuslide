/**
 * Yerel PostgreSQL bağlantısı ve dual-write (yerel → Supabase push).
 * USE_LOCAL_DB=true iken okuma/yazma yerel DB'den; her yazma aynı anda Supabase'e de gider.
 */
import { Client } from 'pg';
import { getServerSupabase } from '@/lib/supabase-server';

let localClient: Client | null = null;

export function useLocalDb(): boolean {
  return process.env.USE_LOCAL_DB === 'true' || process.env.USE_LOCAL_DB === '1';
}

function getLocalConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'tvproje',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
  };
}

export async function getLocalPg(): Promise<Client> {
  if (!useLocalDb()) throw new Error('USE_LOCAL_DB is not set');
  if (localClient) return localClient;
  const config = getLocalConfig();
  localClient = new Client(config);
  try {
    await localClient.connect();
  } catch (e: unknown) {
    localClient = null;
    const msg = e instanceof Error ? e.message : String(e);
    const err = new Error(`LOCAL_DB_CONNECTION_FAILED: ${msg}`);
    (err as Error & { cause?: unknown }).cause = e;
    throw err;
  }
  return localClient;
}

export async function queryLocal<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  const client = await getLocalPg();
  const res = await client.query(sql, params);
  return (res.rows || []) as T[];
}

export async function queryOne<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await queryLocal<T>(sql, params);
  return rows[0] ?? null;
}

/** INSERT ... RETURNING * ; returns inserted row */
export async function insertLocal(
  table: string,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const keys = Object.keys(row).filter((k) => row[k] !== undefined);
  const cols = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const sql = `INSERT INTO ${table} (${cols}) VALUES (${placeholders}) RETURNING *`;
  const vals = keys.map((k) => row[k]);
  const rows = await queryLocal<Record<string, unknown>>(sql, vals);
  if (!rows[0]) throw new Error(`Insert into ${table} returned no row`);
  return rows[0];
}

export async function updateLocal(
  table: string,
  id: string,
  row: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  const keys = Object.keys(row).filter((k) => row[k] !== undefined && k !== 'id');
  if (keys.length === 0) return queryOne(`SELECT * FROM ${table} WHERE id = $1`, [id]) as Promise<Record<string, unknown> | null>;
  const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const params = [...keys.map((k) => row[k]), id];
  const sql = `UPDATE ${table} SET ${setClause} WHERE id = $${params.length} RETURNING *`;
  const rows = await queryLocal<Record<string, unknown>>(sql, params);
  return rows[0] ?? null;
}

export async function deleteLocal(table: string, id: string): Promise<void> {
  const client = await getLocalPg();
  await client.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
}

/** Run arbitrary SQL (e.g. DELETE WHERE ...) without returning rows */
export async function runLocal(sql: string, params: unknown[] = []): Promise<void> {
  const client = await getLocalPg();
  await client.query(sql, params);
}

/** Supabase yapılandırılmamışsa mirror atlanır (sadece yerel DB) */
export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Her yazma yerelde yapıldıktan sonra Supabase'e de aynı işlemi uygula (push). Supabase yoksa atlanır. */
export async function mirrorToSupabase(
  table: string,
  op: 'insert' | 'update' | 'delete',
  payload: { row?: Record<string, unknown>; id?: string }
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const supabase = getServerSupabase();
    if (op === 'insert' && payload.row) {
      await supabase.from(table).insert(payload.row);
    } else if (op === 'update' && payload.id && payload.row) {
      const { id, ...rest } = payload.row as Record<string, unknown> & { id?: string };
      await supabase.from(table).update(rest).eq('id', payload.id);
    } else if (op === 'delete' && payload.id) {
      await supabase.from(table).delete().eq('id', payload.id);
    }
  } catch (e) {
    console.error(`[db-local] mirrorToSupabase ${table} ${op}:`, e);
  }
}
