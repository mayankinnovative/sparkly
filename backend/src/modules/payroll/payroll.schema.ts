import { z } from 'zod';

export const createPayrollEntrySchema = z.object({
  userId: z.string().uuid(),
  payPeriodStart: z.string().datetime(),
  payPeriodEnd: z.string().datetime(),
  hours: z.number().min(0),
  hourlyRate: z.number().positive(),
  province: z.enum(['QC', 'ON']),
});

export const updatePayrollEntrySchema = z.object({
  hours: z.number().min(0).optional(),
  hourlyRate: z.number().positive().optional(),
});

export const calculatePayrollSchema = z.object({
  userId: z.string().uuid(),
  grossPay: z.number().positive(),
  province: z.enum(['QC', 'ON']),
  annualizedGross: z.number().positive().optional(),
});

export type CreatePayrollEntryInput = z.infer<typeof createPayrollEntrySchema>;
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
