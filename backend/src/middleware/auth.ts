import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { TokenPayload } from '../types';
import { errorResponse } from '../utils/response';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('Authentication required', 'UNAUTHORIZED'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json(errorResponse('Invalid or expired token', 'TOKEN_INVALID'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const payload = jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
      req.user = payload;
    } catch {
      // Token invalid, proceed without auth
    }
  }
  next();
}
