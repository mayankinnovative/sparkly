import prisma from '../../config/database';
import { AppError, tenantFilter, requireAccountId } from '../../utils/response';
import { CreateRecurringJobInput, UpdateRecurringJobInput } from './recurring-jobs.schema';
import { logger } from '../../config/logger';

function computeNextRunDate(current: Date, frequency: 'daily' | 'weekly' | 'monthly'): Date {
  const next = new Date(current);
  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
  }
  return next;
}

export class RecurringJobsService {
  async list(accountId: string | null) {
    return prisma.recurringJob.findMany({
      where: { ...tenantFilter(accountId) },
      include: {
        customer: { select: { id: true, name: true } },
        _count: { select: { schedulerLogs: true } },
      },
      orderBy: { nextRun: 'asc' },
    });
  }

  async getById(accountId: string | null, id: string) {
    const rj = await prisma.recurringJob.findFirst({
      where: { id, ...tenantFilter(accountId) },
      include: {
        customer: { select: { id: true, name: true } },
        schedulerLogs: { orderBy: { executedAt: 'desc' }, take: 10 },
      },
    });
    if (!rj) throw new AppError(404, 'Recurring job not found', 'NOT_FOUND');
    return rj;
  }

  async create(accountId: string | null, input: CreateRecurringJobInput) {
    const aid = requireAccountId(accountId);
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, accountId: aid, isActive: true },
    });
    if (!customer) throw new AppError(404, 'Customer not found', 'CUSTOMER_NOT_FOUND');

    if (input.assignedTo) {
      const user = await prisma.user.findFirst({
        where: { id: input.assignedTo, accountId: aid, isActive: true },
      });
      if (!user) throw new AppError(404, 'Assigned user not found', 'USER_NOT_FOUND');
    }

    return prisma.recurringJob.create({
      data: {
        ...input,
        nextRun: new Date(input.nextRun),
        accountId: aid,
        status: 'active',
      },
    });
  }

  async update(accountId: string | null, id: string, input: UpdateRecurringJobInput) {
    const aid = requireAccountId(accountId);
    const rj = await prisma.recurringJob.findFirst({ where: { id, accountId: aid } });
    if (!rj) throw new AppError(404, 'Recurring job not found', 'NOT_FOUND');

    const data: any = { ...input };
    if (input.nextRun) data.nextRun = new Date(input.nextRun);

    return prisma.recurringJob.update({ where: { id }, data });
  }

  async cancel(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const rj = await prisma.recurringJob.findFirst({ where: { id, accountId: aid } });
    if (!rj) throw new AppError(404, 'Recurring job not found', 'NOT_FOUND');

    return prisma.recurringJob.update({
      where: { id },
      data: { status: 'paused' },
    });
  }

  async delete(accountId: string | null, id: string) {
    const aid = requireAccountId(accountId);
    const rj = await prisma.recurringJob.findFirst({ where: { id, accountId: aid } });
    if (!rj) throw new AppError(404, 'Recurring job not found', 'NOT_FOUND');

    await prisma.recurringJob.delete({ where: { id } });
  }

  /** Called by the cron scheduler every 5 minutes */
  async processRecurringJobs() {
    const now = new Date();
    const dueJobs = await prisma.recurringJob.findMany({
      where: {
        status: 'active',
        nextRun: { lte: now },
      },
    });

    let created = 0;
    let failed = 0;

    for (const rj of dueJobs) {
      try {
        // FR-REC-07: Idempotency check — skip if job already created for this nextRun
        const existingJob = await prisma.job.findFirst({
          where: {
            accountId: rj.accountId,
            customerId: rj.customerId,
            title: rj.title,
            scheduledDate: rj.nextRun,
          },
        });

        if (existingJob) {
          // Job already created for this nextRun; advance without duplicate
          const nextDate = computeNextRunDate(rj.nextRun, rj.frequency as any);
          await prisma.recurringJob.update({
            where: { id: rj.id },
            data: { nextRun: nextDate, failureCount: 0 },
          });
          await prisma.schedulerLog.create({
            data: {
              recurringJobId: rj.id,
              status: 'skipped',
              errorMessage: 'Job already exists for this nextRun (idempotent skip)',
            },
          });
          continue;
        }

        await prisma.$transaction(async (tx: any) => {
          // Create a new Job from the recurring template
          await tx.job.create({
            data: {
              accountId: rj.accountId,
              customerId: rj.customerId,
              assignedTo: rj.assignedTo,
              title: rj.title,
              description: rj.description,
              jobType: rj.jobType,
              scheduledDate: rj.nextRun,
              price: rj.price,
              duration: rj.duration,
              supplies: rj.supplies,
              staffCount: rj.staffCount,
              status: 'pending',
            },
          });

          // Advance nextRun and reset failure count
          const nextDate = computeNextRunDate(rj.nextRun, rj.frequency as any);
          await tx.recurringJob.update({
            where: { id: rj.id },
            data: { nextRun: nextDate, failureCount: 0 },
          });
        });

        // FR-REC-09: Log individual success
        await prisma.schedulerLog.create({
          data: {
            recurringJobId: rj.id,
            status: 'success',
          },
        });

        created++;
      } catch (err) {
        failed++;
        logger.error({ recurringJobId: rj.id, err }, 'Failed to process recurring job');

        // FR-REC-08: Increment failure count; auto-pause after 3 consecutive failures
        const newFailureCount = rj.failureCount + 1;
        const updateData: any = { failureCount: newFailureCount };
        if (newFailureCount >= 3) {
          updateData.status = 'paused';
          logger.warn({ recurringJobId: rj.id }, 'Recurring job auto-paused after 3 consecutive failures');
        }
        await prisma.recurringJob.update({
          where: { id: rj.id },
          data: updateData,
        });

        // FR-REC-09: Log individual failure
        await prisma.schedulerLog.create({
          data: {
            recurringJobId: rj.id,
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        });
      }
    }

    return { totalDue: dueJobs.length, created, failed };
  }
}

export const recurringJobsService = new RecurringJobsService();
