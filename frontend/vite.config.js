import fs from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        https: {
            cert: fs.readFileSync(path.resolve(__dirname, '../certs/localhost.pem')),
            key: fs.readFileSync(path.resolve(__dirname, '../certs/localhost-key.pem')),
        },
        headers: {
            'X-Frame-Options': 'DENY',
            'Content-Security-Policy': "frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; object-src 'none';",
        },
        proxy: {
            '/api': {
                target: 'https://localhost:5001',
                changeOrigin: true,
                secure: false,
            },
        },
    },
});
