import { z } from 'zod';

export const createRecurringJobSchema = z.object({
  customerId: z.string().uuid(),
  assignedTo: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  jobType: z.string().max(100).default('Recurring'),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  price: z.number().min(0).default(0),
  duration: z.number().min(0).default(0),
  supplies: z.number().min(0).default(0),
  staffCount: z.number().int().min(1).default(1),
  nextRun: z.string().datetime().refine((val) => new Date(val) >= new Date(), {
    message: 'Next run date cannot be in the past',
  }),
  delivery: z.string().max(50).default('Email'),
});

export const updateRecurringJobSchema = z.object({
  assignedTo: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional().nullable(),
  frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  price: z.number().min(0).optional(),
  nextRun: z.string().datetime().refine((val) => new Date(val) >= new Date(), {
    message: 'Next run date cannot be in the past',
  }).optional(),
  status: z.enum(['active', 'paused', 'draft']).optional(),
});

export type CreateRecurringJobInput = z.infer<typeof createRecurringJobSchema>;
export type UpdateRecurringJobInput = z.infer<typeof updateRecurringJobSchema>;
