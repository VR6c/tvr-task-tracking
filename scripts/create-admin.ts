import './load-env';
import { createInterface } from 'node:readline';
import { hashPassword } from '../lib/auth/password';
import { createDatabase } from '../lib/db/client';
import { upsertAdmin } from '../lib/db/admin-users';

const MIN_PASSWORD_LENGTH = 10;

/** Reads a line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const output = rl as unknown as { _writeToOutput: (text: string) => void };
    let muted = false;
    output._writeToOutput = (text) => {
      if (!muted || text.includes('\n')) process.stdout.write(muted ? '\n' : text);
    };
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
    muted = true;
  });
}

/**
 * Creates a web admin, or resets an existing admin's password:
 *   npm run admin:create -- <username>
 * The password is prompted (hidden), or read from ADMIN_PASSWORD for non-interactive use.
 */
async function main(): Promise<void> {
  const username = process.argv[2]?.trim();
  if (!username || !/^[A-Za-z0-9._-]{3,64}$/.test(username)) {
    throw new Error('Usage: npm run admin:create -- <username>  (3-64 chars: letters, digits, . _ -)');
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set');

  let password = process.env.ADMIN_PASSWORD;
  if (!password) {
    password = await promptHidden('Password: ');
    if (password !== (await promptHidden('Repeat password: '))) throw new Error('Passwords do not match');
  }
  if (password.length < MIN_PASSWORD_LENGTH) throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);

  const { db, close } = createDatabase(url);
  try {
    const admin = await upsertAdmin(db, username, await hashPassword(password));
    console.log(`Admin "${admin.username}" saved. Log in at ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`);
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
