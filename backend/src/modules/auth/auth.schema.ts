import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name required').max(100),
  lastName: z.string().min(1, 'Last name required').max(100),
  accountName: z.string().min(1, 'Business name required').max(255),
  province: z.enum(['QC', 'ON']),
});

export const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
