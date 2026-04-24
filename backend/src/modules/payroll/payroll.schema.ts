import { z } from 'zod';

export const createPayrollEntrySchema = z.object({
  userId: z.string().uuid(),
  payPeriodStart: z.string().datetime(),
  payPeriodEnd: z.string().datetime(),
  hours: z.number().min(0).default(0),
  hourlyRate: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  flatPay: z.number().min(0).default(0),
  taxableBenefits: z.number().min(0).default(0),
  holidayPay: z.number().min(0).default(0),
  vacationRate: z.number().min(0).max(1).default(0.04),
  payType: z.enum(['hourly', 'flat', 'salary']).default('hourly'),
  province: z.enum(['QC', 'ON']),
});

export const updatePayrollEntrySchema = z.object({
  hours: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  flatPay: z.number().min(0).optional(),
  taxableBenefits: z.number().min(0).optional(),
  holidayPay: z.number().min(0).optional(),
  vacationRate: z.number().min(0).max(1).optional(),
  payType: z.enum(['hourly', 'flat', 'salary']).optional(),
});

export const calculatePayrollSchema = z.object({
  grossPay: z.number().positive(),
  province: z.enum(['QC', 'ON']),
  annualizedGross: z.number().positive().optional(),
});

export type CreatePayrollEntryInput = z.infer<typeof createPayrollEntrySchema>;
export type UpdatePayrollEntryInput = z.infer<typeof updatePayrollEntrySchema>;
export type CalculatePayrollInput = z.infer<typeof calculatePayrollSchema>;
