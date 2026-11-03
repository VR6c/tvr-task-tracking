import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, 'BOT_TOKEN must look like 123456:ABC-DEF'),
  ALLOWED_TELEGRAM_USER_ID: z.coerce.number().int().positive(),
  WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, 'WEBHOOK_SECRET may only contain A-Z a-z 0-9 _ -'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(8),
  /** Optional: self-hosted Bot API server (defaults to https://api.telegram.org). */
  TELEGRAM_API_ROOT: z.string().url().optional(),
  /** Optional Google Sheets sync: all three must be set to enable it. */
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_PRIVATE_KEY: z.string().min(1).optional(),
  GOOGLE_SHEET_ID: z.string().min(1).optional(),
  /** Tab that receives the daily task list (created when missing). */
  GOOGLE_SHEET_TAB: z.string().min(1).default('Daily Tasks'),
});

export type ServerEnv = z.infer<typeof serverSchema>;

/** Validated server env. Read lazily so `next build` works without secrets; throws a readable error on use. */
export function getEnv(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration - ${problems}`);
  }
  return parsed.data;
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
