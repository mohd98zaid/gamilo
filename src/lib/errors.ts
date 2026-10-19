/**
 * Error Taxonomy & Recovery Strategies
 * Conforms to Error-handling specification (9-Error-handling.md).
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: Record<string, unknown>,
    public isOperational = true,
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// 400 Validation Error
export class ValidationError extends AppError {
  constructor(message: string, public fields?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, { fields });
  }
}

// 401 Authentication Error
export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTHENTICATION_REQUIRED', 401);
  }
}

// 403 Authorization Error
export class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions', public requiredScope?: string) {
    super(message, 'INSUFFICIENT_PERMISSIONS', 403, { requiredScope });
  }
}

// 404 Not Found Error
export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404, { resource, id });
  }
}

// 409 Conflict Error
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409);
  }
}

// 429 Rate Limit Error
export class RateLimitError extends AppError {
  constructor(limit: number, windowMs: number, retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, {
      limit,
      windowMs,
      retryAfter: retryAfter ?? Math.ceil(windowMs / 1000),
    });
  }
}

// 402 Plan Limit Error
export class PlanLimitError extends AppError {
  constructor(resource: string, limit: number, current: number) {
    super(
      `Plan limit reached for ${resource} (${current}/${limit})`,
      'PLAN_LIMIT_EXCEEDED',
      402,
      { resource, limit, current, upgradeUrl: '/dashboard/billing' },
    );
  }
}

// 402 Insufficient AI Credits
export class InsufficientCreditsError extends AppError {
  constructor(required: number, available: number) {
    super(
      `Insufficient AI credits: requires ${required}, available ${available}`,
      'INSUFFICIENT_CREDITS',
      402,
      { required, available, topUpUrl: '/dashboard/billing' },
    );
  }
}

// 502 External Service Error
export class ExternalServiceError extends AppError {
  constructor(service: string, originalError?: Error | unknown) {
    super(
      `${service} service error: ${originalError instanceof Error ? originalError.message : String(originalError)}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      { service },
    );
  }
}

/**
 * Exponential backoff retry with full jitter
 * Matches 9-Error-handling.md section 3.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }
      // Full jitter: random between 0 and min(maxDelay, base * 2^attempt)
      const exponential = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
      const delay = Math.floor(Math.random() * exponential);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
