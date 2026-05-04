import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    https: {
      cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost.pem')),
      key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
    },
    headers: {
      'X-Frame-Options': 'DENY',
      ...(command === 'serve'
        ? {
            'Content-Security-Policy':
              "frame-ancestors 'none'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws: wss:; object-src 'none';",
          }
        : {}),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));