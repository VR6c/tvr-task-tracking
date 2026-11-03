import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/db/schema';
import { getEnv } from '@/lib/env';

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __tvrSql?: ReturnType<typeof postgres>; __tvrDb?: Database };

export function createDatabase(url: string): { db: Database; close: () => Promise<void> } {
  // prepare:false keeps this compatible with transaction-mode poolers (Supabase, Neon pooled URLs).
  const sql = postgres(url, { max: 5, prepare: false, idle_timeout: 20, connect_timeout: 10 });
  return { db: drizzle(sql, { schema }), close: () => sql.end({ timeout: 5 }) };
}

/** Process-wide singleton (survives Next.js dev hot reloads). */
export function getDb(): Database {
  if (!globalForDb.__tvrDb) {
    const { db } = createDatabase(getEnv().DATABASE_URL);
    globalForDb.__tvrDb = db;
  }
  return globalForDb.__tvrDb;
}
