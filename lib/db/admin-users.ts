import { eq } from 'drizzle-orm';
import { adminUsers, type AdminUserRow } from '@/db/schema';
import type { Database } from '@/lib/db/client';

/** Usernames are case-insensitive: stored and looked up lower-cased. */
export const normalizeUsername = (username: string): string => username.trim().toLowerCase();

export async function findAdminByUsername(db: Database, username: string): Promise<AdminUserRow | undefined> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.username, normalizeUsername(username))).limit(1);
  return row;
}

/** Creates the admin, or replaces the password of an existing one. */
export async function upsertAdmin(db: Database, username: string, passwordHash: string): Promise<AdminUserRow> {
  const [row] = await db
    .insert(adminUsers)
    .values({ username: normalizeUsername(username), passwordHash })
    .onConflictDoUpdate({ target: adminUsers.username, set: { passwordHash } })
    .returning();
  if (!row) throw new Error('Admin upsert returned no row');
  return row;
}

export async function touchAdminLogin(db: Database, id: string): Promise<void> {
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
}
