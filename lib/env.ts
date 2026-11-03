import { z } from 'zod';

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  BOT_TOKEN: z.string().regex(/^\d+:[\w-]+$/, 'BOT_TOKEN must look like 123456:ABC-DEF'),
  ALLOWED_TELEGRAM_USER_ID: z.coerce.number().int().positive(),
  WEBHOOK_SECRET: z.string().regex(/^[A-Za-z0-9_-]{1,256}$/, 'WEBHOOK_SECRET may only contain A-Z a-z 0-9 _ -'),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  CRON_SECRET: z.string().min(8),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

/** Validated server env. Lazy so `next build` works without secrets; throws a readable error at first use. */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration - ${problems}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
