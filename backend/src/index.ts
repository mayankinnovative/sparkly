import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';

import { config } from './config';
import { logger } from './config/logger';
import prisma from './config/database';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import customersRoutes from './modules/customers/customers.routes';
import jobsRoutes from './modules/jobs/jobs.routes';
import recurringJobsRoutes from './modules/recurring-jobs/recurring-jobs.routes';
import payrollRoutes from './modules/payroll/payroll.routes';
import invoicesRoutes from './modules/invoices/invoices.routes';
import expensesRoutes from './modules/expenses/expenses.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import adminRoutes from './modules/admin/admin.routes';

// Service imports (for cron)
import { recurringJobsService } from './modules/recurring-jobs/recurring-jobs.service';
import { detectTimezone } from './middleware/timezone';

const app = express();

// ─── Raw body for Stripe webhooks ───────────────────────────────────────────
app.use('/api/v1/invoices/webhook', express.raw({ type: 'application/json' }));

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(detectTimezone);

// ─── Timezone detection (IP-based) ──────────────────────────────────────────
app.get('/api/v1/timezone', (req, res) => {
  const vercelTz = req.headers['x-vercel-ip-timezone'] as string | undefined;
  const clientTz = req.headers['x-timezone'] as string | undefined;
  res.json({
    success: true,
    data: {
      timezone: vercelTz || clientTz || 'UTC',
      detectedFrom: vercelTz ? 'ip' : clientTz ? 'browser' : 'fallback',
    },
  });
});

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/v1/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', timestamp: new Date().toISOString(), db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

// ─── API routes ─────────────────────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/customers', customersRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/recurring-jobs', recurringJobsRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/invoices', invoicesRoutes);
app.use('/api/v1/expenses', expensesRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/admin', adminRoutes);

// ─── Cron endpoint for Vercel Cron Jobs ─────────────────────────────────────
app.get('/api/v1/cron/recurring-jobs', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  try {
    const result = await recurringJobsService.processRecurringJobs();
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error({ err }, 'Recurring job cron failed');
    res.status(500).json({ success: false, message: 'Cron failed' });
  }
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error handler ──────────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Cron: process recurring jobs every 5 minutes (local only) ──────────────
if (!process.env.VERCEL) {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await recurringJobsService.processRecurringJobs();
      if (result.totalDue > 0) {
        logger.info(result, 'Recurring jobs processed');
      }
    } catch (err) {
      logger.error({ err }, 'Recurring job cron failed');
    }
  });
}

// ─── Start server (local only, Vercel uses serverless) ──────────────────────
if (!process.env.VERCEL) {
  const port = config.port;
  app.listen(port, () => {
    logger.info(`Sparkly API running on port ${port}`);
    logger.info(`Health check: http://localhost:${port}/api/v1/health`);
  });
}

export default app;
