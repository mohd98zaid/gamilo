/**
 * Rate Limiter (In-Memory Sliding Window)
 * Conforms to System Design specification (4-System-Design.md).
 * In production connects to Redis, locally operates in-process.
 */

interface RateLimitRecord {
  timestamps: number[];
}

export class SlidingWindowRateLimiter {
  private store = new Map<string, RateLimitRecord>();

  /**
   * Check and record a hit.
   * @param key unique identifier (e.g. `workspaceId` or `ipAddress`)
   * @param limit maximum allowed requests within window
   * @param windowMs window duration in milliseconds
   * @returns object with success, remaining, and retryAfter seconds
   */
  check(key: string, limit: number, windowMs: number): {
    success: boolean;
    remaining: number;
    retryAfter: number;
  } {
    const now = Date.now();
    const windowStart = now - windowMs;

    let record = this.store.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.store.set(key, record);
    }

    // Filter out expired timestamps
    record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

    if (record.timestamps.length >= limit) {
      const oldest = record.timestamps[0];
      const retryAfter = Math.ceil((oldest + windowMs - now) / 1000);
      return {
        success: false,
        remaining: 0,
        retryAfter: Math.max(1, retryAfter),
      };
    }

    record.timestamps.push(now);
    return {
      success: true,
      remaining: limit - record.timestamps.length,
      retryAfter: 0,
    };
  }

  reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

export const globalRateLimiter = new SlidingWindowRateLimiter();
