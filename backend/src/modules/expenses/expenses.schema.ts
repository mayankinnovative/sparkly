import { z } from 'zod';

export const createExpenseSchema = z.object({
  category: z.enum([
    'supplies', 'equipment', 'fuel', 'wages', 'insurance',
    'marketing', 'storage', 'training', 'software', 'other',
  ]),
  description: z.string().max(500).optional().nullable(),
  amount: z.number().positive(),
  date: z.string().datetime(),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
