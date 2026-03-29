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
