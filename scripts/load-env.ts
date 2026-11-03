import { loadEnvConfig } from '@next/env';

/** Loads .env / .env.local the same way Next.js does, so scripts and the app share configuration. */
loadEnvConfig(process.cwd());
