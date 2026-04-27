import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 5001),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-super-secret-change-me',
  cookieName: process.env.COOKIE_NAME ?? 'ipp_auth',
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? 'https://localhost:5173',
};

export const isProduction = env.nodeEnv === 'production';

if (isProduction) {
  if (env.jwtSecret === 'dev-super-secret-change-me') {
    throw new Error('JWT_SECRET must be changed from the default value before running in production.');
  }
  if (env.jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters in production.');
  }
  if (!env.frontendOrigin.startsWith('https://')) {
    throw new Error('FRONTEND_ORIGIN must use HTTPS in production.');
  }
}
