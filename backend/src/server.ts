import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { initDb } from './services/db.js';
import { seedEmployees } from './services/authService.js';

async function start() {
  await initDb();
  await seedEmployees();

  const app = createApp();

  // In production set CERT_PATH and KEY_PATH to Let's Encrypt paths:
  //   CERT_PATH=/etc/letsencrypt/live/<domain>/fullchain.pem
  //   KEY_PATH=/etc/letsencrypt/live/<domain>/privkey.pem
  const certPath = process.env.CERT_PATH ?? path.resolve(process.cwd(), '..', 'certs', 'localhost.pem');
  const keyPath = process.env.KEY_PATH ?? path.resolve(process.cwd(), '..', 'certs', 'localhost-key.pem');

  const httpsServer = https.createServer(
    {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    },
    app,
  );

  httpsServer.listen(env.port, () => {
    console.log(`Secure API running at https://localhost:${env.port}`);
  });
}

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
