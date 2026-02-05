import { Injectable, Inject } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';

/**
 * Database service wrapper for PostgreSQL
 * Provides Supabase-like interface for local PostgreSQL
 */
@Injectable()
export class DatabaseService {
  constructor(@Inject('DATABASE_POOL') private pool: Pool) {}

  /**
   * Execute a query and return results
   */
  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  /**
   * Get a client for transactions (caller must release)
   */
  async getClient() {
    return this.pool.connect();
  }

  /**
   * Select from table (Supabase-like interface)
   */
  from(table: string) {
    return {
      select: (columns: string = '*') => ({
        eq: (column: string, value: any) => ({
          single: async () => {
            const result = await this.pool.query(
              `SELECT ${columns} FROM ${table} WHERE ${column} = $1`,
              [value]
            );
            return { data: result.rows[0] || null, error: result.rows.length === 0 ? { message: 'Not found' } : null };
          },
          limit: async (limit: number) => ({
            single: async () => {
              const result = await this.pool.query(
                `SELECT ${columns} FROM ${table} WHERE ${column} = $1 LIMIT $2`,
                [value, limit]
              );
              return { data: result.rows[0] || null, error: null };
            },
          }),
          order: async (orderBy: string, options?: { ascending?: boolean }) => ({
            single: async () => {
              const asc = options?.ascending !== false ? 'ASC' : 'DESC';
              const result = await this.pool.query(
                `SELECT ${columns} FROM ${table} WHERE ${column} = $1 ORDER BY ${orderBy} ${asc} LIMIT 1`,
                [value]
              );
              return { data: result.rows[0] || null, error: null };
            },
          }),
        }),
        order: (orderBy: string, options?: { ascending?: boolean }) => ({
          single: async () => {
            const asc = options?.ascending !== false ? 'ASC' : 'DESC';
            const result = await this.pool.query(
              `SELECT ${columns} FROM ${table} ORDER BY ${orderBy} ${asc} LIMIT 1`,
              []
            );
            return { data: result.rows[0] || null, error: null };
          },
        }),
      }),
      insert: (data: any) => ({
        select: (columns: string = '*') => ({
          single: async () => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const columnsStr = keys.join(', ');
            const result = await this.pool.query(
              `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders}) RETURNING ${columns}`,
              values
            );
            return { data: result.rows[0], error: null };
          },
        }),
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          select: (columns: string = '*') => ({
            single: async () => {
              const keys = Object.keys(data);
              const values = Object.values(data);
              const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
              const result = await this.pool.query(
                `UPDATE ${table} SET ${setClause} WHERE ${column} = $${keys.length + 1} RETURNING ${columns}`,
                [...values, value]
              );
              return { data: result.rows[0] || null, error: null };
            },
          }),
        }),
      }),
      delete: () => ({
        eq: (column: string, value: any) => ({
          then: async (callback: any) => {
            const result = await this.pool.query(
              `DELETE FROM ${table} WHERE ${column} = $1`,
              [value]
            );
            return callback({ error: null });
          },
        }),
      }),
      upsert: (data: any, options?: { onConflict?: string }) => ({
        select: (columns: string = '*') => ({
          single: async () => {
            const keys = Object.keys(data);
            const values = Object.values(data);
            const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
            const columnsStr = keys.join(', ');
            const conflictClause = options?.onConflict 
              ? ` ON CONFLICT (${options.onConflict}) DO UPDATE SET ${keys.map((key, i) => `${key} = $${i + 1}`).join(', ')}`
              : '';
            const result = await this.pool.query(
              `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders})${conflictClause} RETURNING ${columns}`,
              values
            );
            return { data: result.rows[0], error: null };
          },
        }),
      }),
    };
  }

  /**
   * Call database function (RPC)
   */
  async rpc(functionName: string, params: Record<string, any>) {
    const paramKeys = Object.keys(params);
    const paramValues = Object.values(params);
    const placeholders = paramKeys.map((_, i) => `$${i + 1}`).join(', ');
    const result = await this.pool.query(
      `SELECT ${functionName}(${placeholders}) as result`,
      paramValues
    );
    return { data: result.rows[0]?.result || null, error: null };
  }
}
