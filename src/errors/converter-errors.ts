import { BaseError } from './custom-errors.js';

/**
 * Error thrown when HTML input is invalid or malformed
 */
export class InvalidHTMLError extends BaseError {
  constructor(message: string, public readonly details?: unknown) {
    super(message, 'INVALID_HTML', 400);
  }
}

/**
 * Error thrown when input exceeds size limits
 */
export class SizeLimitError extends BaseError {
  constructor(public readonly actualSize: number, public readonly maxSize: number) {
    super(
      `cash-out: Input size ${actualSize} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      'SIZE_LIMIT_EXCEEDED',
      413
    );
  }
}

/**
 * Error thrown when conversion takes too long
 */
export class ConversionTimeoutError extends BaseError {
  constructor(public readonly timeout: number) {
    super(
      `cash-out: Conversion timed out after ${timeout}ms`,
      'CONVERSION_TIMEOUT',
      408
    );
  }
}

/**
 * Error thrown when potentially malicious content is detected
 */
export class SecurityError extends BaseError {
  constructor(message: string, public readonly threatType?: string) {
    super(message, 'SECURITY_VIOLATION', 400);
  }
}