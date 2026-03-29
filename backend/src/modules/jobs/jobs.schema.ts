import { z } from 'zod';

export const createJobSchema = z.object({
  customerId: z.string().uuid(),
  assignedTo: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional().nullable(),
  jobType: z.string().max(100).default('Residential'),
  scheduledDate: z.string().datetime(),
  completedAt: z.string().datetime().optional().nullable(),
  price: z.number().min(0).default(0),
  duration: z.number().min(0).default(0),
  supplies: z.number().min(0).default(0),
  staffCount: z.number().int().min(1).default(1),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateJobSchema = createJobSchema.partial();

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
