import { z } from 'zod';

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid(),
  jobIds: z.array(z.string().uuid()).min(1),
  dueDate: z.string().datetime(),
  taxType: z.enum(['GST_QST', 'HST']),
  language: z.enum(['en', 'fr']).default('en'),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateInvoiceSchema = z.object({
  dueDate: z.string().datetime().optional(),
  status: z.enum(['draft', 'sent', 'paid', 'overdue', 'cancelled']).optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
