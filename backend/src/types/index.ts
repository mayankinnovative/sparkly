import { UserRole, Plan } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  accountId: string | null;
  role: UserRole;
}

// After tenantScope middleware, accountId is guaranteed non-null
export interface AuthenticatedRequest {
  user: TokenPayload & { accountId: string };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  message: string;
  error: { code: string; details?: unknown[] } | null;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface DateRangeQuery {
  startDate?: string;
  endDate?: string;
}

export const PLAN_HIERARCHY: Record<Plan, number> = {
  solo: 1,
  pro: 2,
  business: 3,
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  staff: 1,
  accountant: 2,
  account_owner: 3,
  super_admin: 4,
};
