import { Request, Response, NextFunction } from 'express';
import { DomainError } from '@shared/errors/DomainError';

/**
 * 전역 에러 핸들러
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[ErrorHandler]', err);

  if (err instanceof DomainError) {
    res.status(400).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? '서버 내부 오류가 발생했습니다'
          : err.message,
    },
  });
}
