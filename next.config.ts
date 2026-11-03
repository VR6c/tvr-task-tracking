import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: { root: path.resolve(__dirname) },
  // Lets `next dev` serve assets when the Mini App is opened through a tunnel (see README).
  allowedDevOrigins: ['*.ngrok-free.app', '*.ngrok.app', '*.trycloudflare.com', '*.loca.lt'],
  async headers() {
    return [
      {
        // Allow Telegram clients (web + desktop + mobile) to embed the Mini App.
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org",
          },
        ],
      },
      { source: '/api/(.*)', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

export default nextConfig;
