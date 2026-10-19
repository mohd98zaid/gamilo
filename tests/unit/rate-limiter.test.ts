import { describe, it, expect } from 'vitest';
import { SlidingWindowRateLimiter } from '@/lib/rate-limiter';

describe('Sliding Window Rate Limiter (4-System-Design.md)', () => {
  it('allows requests within limit and tracks remaining hits', () => {
    const limiter = new SlidingWindowRateLimiter();
    const key = 'test_ws_1';

    const res1 = limiter.check(key, 3, 1000);
    expect(res1.success).toBe(true);
    expect(res1.remaining).toBe(2);

    const res2 = limiter.check(key, 3, 1000);
    expect(res2.success).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = limiter.check(key, 3, 1000);
    expect(res3.success).toBe(true);
    expect(res3.remaining).toBe(0);

    // 4th request exceeds limit
    const res4 = limiter.check(key, 3, 1000);
    expect(res4.success).toBe(false);
    expect(res4.retryAfter).toBeGreaterThanOrEqual(1);
  });
});
