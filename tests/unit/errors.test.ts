import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  RateLimitError,
  PlanLimitError,
  InsufficientCreditsError,
  withRetry,
} from '@/lib/errors';

describe('Error Taxonomy & Retry Policies (9-Error-handling.md)', () => {
  it('instantiates ValidationError with 400 and custom fields', () => {
    const err = new ValidationError('Bad input', { email: ['Invalid email format'] });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.fields?.email).toContain('Invalid email format');
    expect(err.isOperational).toBe(true);
  });

  it('instantiates RateLimitError with 429 and retryAfter', () => {
    const err = new RateLimitError(60, 60000, 30);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.details?.retryAfter).toBe(30);
  });

  it('instantiates PlanLimitError with 402 and upgrade link', () => {
    const err = new PlanLimitError('channels', 5, 5);
    expect(err.statusCode).toBe(402);
    expect(err.code).toBe('PLAN_LIMIT_EXCEEDED');
    expect(err.details?.upgradeUrl).toBe('/dashboard/billing');
  });

  it('retries failing operations with exponential backoff and recovers', async () => {
    let attempts = 0;
    const result = await withRetry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary network blip');
        }
        return 'SUCCESS';
      },
      { maxRetries: 3, baseDelayMs: 10 }
    );

    expect(result).toBe('SUCCESS');
    expect(attempts).toBe(3);
  });
});
