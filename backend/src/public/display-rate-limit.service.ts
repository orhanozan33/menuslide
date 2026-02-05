import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

const DEFAULT_WINDOW_MS = 60_000; // 1 minute window
const DEFAULT_MAX_REQUESTS = 1500; // per token/min (1000 TVs @ 60s poll ≈ 1000/min; cache reduces DB load)

interface TokenBucket {
  count: number;
  resetAt: number;
}

/**
 * Simple in-memory rate limiter for display endpoint.
 * Prevents runaway clients from overwhelming DB (e.g. broken TV app retrying every 100ms).
 * For 1000 TVs polling every 60s, 30 req/min/token is generous.
 */
@Injectable()
export class DisplayRateLimitService {
  private readonly buckets = new Map<string, TokenBucket>();
  private readonly windowMs = DEFAULT_WINDOW_MS;
  private readonly maxRequests = DEFAULT_MAX_REQUESTS;

  check(token: string): void {
    const now = Date.now();
    let bucket = this.buckets.get(token);

    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 1, resetAt: now + this.windowMs };
      this.buckets.set(token, bucket);
      return;
    }

    bucket.count++;
    if (bucket.count > this.maxRequests) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please slow down.',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
