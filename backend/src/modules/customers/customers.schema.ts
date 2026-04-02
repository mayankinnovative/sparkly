import { z } from 'zod';

const emptyToNull = z.string().transform((v) => (v === '' ? null : v));

export const createCustomerSchema = z.object({
  name: z.string().min(1).max(255),
  email: emptyToNull.pipe(z.string().email().nullable()).optional().nullable(),
  phone: emptyToNull.pipe(z.string().regex(/^\d+$/, 'Phone must contain only numbers').max(50).nullable()).optional().nullable(),
  address: emptyToNull.pipe(z.string().max(500).nullable()).optional().nullable(),
  city: emptyToNull.pipe(z.string().max(100).nullable()).optional().nullable(),
  province: emptyToNull.pipe(z.string().max(50).nullable()).optional().nullable(),
  postalCode: emptyToNull.pipe(z.string().max(20).nullable()).optional().nullable(),
  customerType: z.enum(['QC', 'ON']).default('QC'),
  notes: emptyToNull.pipe(z.string().nullable()).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
