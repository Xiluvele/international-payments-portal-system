import type { NextFunction, Request, Response } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);

  if (typeof err === 'object' && err && 'code' in err && (err as { code?: string }).code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ message: 'Invalid CSRF token.' });
  }

  return res.status(500).json({ message: 'Internal server error.' });
}
