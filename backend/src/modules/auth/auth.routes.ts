import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authService } from './auth.service';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { registerSchema, loginSchema, refreshSchema } from './auth.schema';
import { successResponse } from '../../utils/response';

const router = Router();

// SRS NFR-SEC-07: max 10 attempts per minute per IP on auth endpoints
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, data: null, message: 'Too many authentication attempts, please try again later', error: { code: 'RATE_LIMIT_EXCEEDED' } },
  skip: (req) => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.ip ?? ''),
});

router.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(successResponse(result, 'Registration successful'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.login(req.body);
      res.status(200).json(successResponse(result, 'Login successful'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/refresh',
  validate(refreshSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await authService.refresh(req.body.refreshToken);
      res.status(200).json(successResponse(result, 'Token refreshed'));
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/logout',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await authService.logout(req.user!.userId);
      res.status(200).json(successResponse(null, 'Logged out successfully'));
    } catch (error) {
      next(error);
    }
  }
);

export default router;
