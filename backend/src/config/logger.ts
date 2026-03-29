import pino from 'pino';
import { config } from './index';

const isProduction = config.nodeEnv === 'production' || !!process.env.VERCEL;

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  transport: !isProduction
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  redact: ['req.headers.authorization', 'password', 'passwordHash', 'token'],
});
