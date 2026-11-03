import './load-env';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabase } from '../lib/db/client';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');
  const { db, close } = createDatabase(url);
  try {
    await migrate(db, { migrationsFolder: 'db/migrations' });
    console.log('Migrations applied.');
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
