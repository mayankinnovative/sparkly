import { ApiResponse } from '../types';

export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T> {
  return { success: true, data, message, error: null };
}

export function errorResponse(
  message: string,
  code: string,
  details?: unknown[]
): ApiResponse<null> {
  return { success: false, data: null, message, error: { code, details } };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string = 'ERROR'
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Build tenant filter — omit accountId for super_admin (null) so query returns all accounts */
export function tenantFilter(accountId: string | null): { accountId: string } | {} {
  return accountId ? { accountId } : {};
}

/** Require accountId for write operations — throws 403 for super_admin */
export function requireAccountId(accountId: string | null): string {
  if (!accountId) throw new AppError(403, 'Account context required for this operation', 'NO_ACCOUNT_CONTEXT');
  return accountId;
}
