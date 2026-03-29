import type { Request, Response } from 'express';

let app: any;
let initError: Error | null = null;

try {
  app = require('../backend/src/index').default;
} catch (err: any) {
  initError = err;
  console.error('Failed to initialize app:', err);
}

export default function handler(req: Request, res: Response) {
  if (initError) {
    return res.status(500).json({
      success: false,
      message: 'Server initialization failed',
      error: initError.message,
      stack: process.env.NODE_ENV !== 'production' ? initError.stack : undefined,
    });
  }
  return app(req, res);
}
