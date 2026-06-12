import { consumeRateLimit as consumeMemoryRateLimit } from '@/lib/rate-limit/memory-rate-limiter'
import { isUpstashRateLimitConfigured } from '@/lib/rate-limit/is-upstash-configured'
import { consumeUpstashRateLimit } from '@/lib/rate-limit/upstash-rate-limiter'
import type { RateLimitConfig, RateLimitConsumeResult } from '@/lib/rate-limit/types'

/**
 * Consumes one rate-limit token using Upstash when configured, otherwise memory.
 */
export async function consumeRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): Promise<RateLimitConsumeResult> {
  if (isUpstashRateLimitConfigured()) {
    try {
      return await consumeUpstashRateLimit(key, config, now)
    } catch (error) {
      console.warn('Upstash rate limit failed; falling back to in-memory limiter:', error)
    }
  }

  return consumeMemoryRateLimit(key, config, now)
}
