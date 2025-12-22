/**
 * 도메인 에러 기본 클래스
 */
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'DOMAIN_ERROR',
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 크롤링 에러
 */
export class CrawlingError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CRAWLING_ERROR', cause);
    this.name = 'CrawlingError';
  }
}

/**
 * Slack 발송 에러
 */
export class SlackDeliveryError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'SLACK_DELIVERY_ERROR', cause);
    this.name = 'SlackDeliveryError';
  }
}

/**
 * 유효성 검증 에러
 */
export class ValidationError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}

/**
 * 리소스 없음 에러
 */
export class NotFoundError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'NOT_FOUND', cause);
    this.name = 'NotFoundError';
  }
}

/**
 * 중복 에러
 */
export class DuplicateError extends DomainError {
  constructor(message: string, cause?: unknown) {
    super(message, 'DUPLICATE_ERROR', cause);
    this.name = 'DuplicateError';
  }
}
