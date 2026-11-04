import { LoginScreen } from '@/components/auth/LoginScreen';
import { getTelegramApi } from '@/lib/telegram/bot';

export const dynamic = 'force-dynamic';

async function botUsername(): Promise<string | null> {
  try {
    return (await getTelegramApi().getMe()).username ?? null;
  } catch (error) {
    console.error('Could not load the bot username for the login widget', error);
    return null;
  }
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Only same-site paths, so the login page can't be used as an open redirect.
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/admin';
  return <LoginScreen botUsername={await botUsername()} next={target} />;
}
