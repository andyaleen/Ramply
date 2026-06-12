import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { readEnv } from '@/lib/env'
import type { RateLimitConfig, RateLimitConsumeResult } from '@/lib/rate-limit/types'

let redisClient: Redis | null = null
const limiterCache = new Map<string, Ratelimit>()

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = readEnv('UPSTASH_REDIS_REST_URL')
    const token = readEnv('UPSTASH_REDIS_REST_TOKEN')
    if (!url || !token) {
      throw new Error('Upstash Redis is not configured')
    }

    redisClient = new Redis({ url, token })
  }

  return redisClient
}

function formatWindowDuration(windowMs: number): `${number} ms` | `${number} s` | `${number} m` | `${number} h` {
  if (windowMs % 3_600_000 === 0) {
    return `${windowMs / 3_600_000} h`
  }
  if (windowMs % 60_000 === 0) {
    return `${windowMs / 60_000} m`
  }
  if (windowMs % 1_000 === 0) {
    return `${windowMs / 1_000} s`
  }
  return `${windowMs} ms`
}

function getLimiter(config: RateLimitConfig): Ratelimit {
  const cacheKey = `${config.limit}:${config.windowMs}`
  const cached = limiterCache.get(cacheKey)
  if (cached) return cached

  const limiter = new Ratelimit({
    redis: getRedisClient(),
    limiter: Ratelimit.fixedWindow(config.limit, formatWindowDuration(config.windowMs)),
    prefix: 'ramply-auth',
  })

  limiterCache.set(cacheKey, limiter)
  return limiter
}

/** Distributed fixed-window counter backed by Upstash Redis. */
export async function consumeUpstashRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): Promise<RateLimitConsumeResult> {
  const limiter = getLimiter(config)
  const result = await limiter.limit(key)

  if (result.success) {
    return { allowed: true, retryAfterSec: 0 }
  }

  const retryAfterSec = Math.max(1, Math.ceil((result.reset - now) / 1000))
  return { allowed: false, retryAfterSec }
}

/** Clears cached clients — test helper only. */
export function resetUpstashRateLimitClientsForTests(): void {
  redisClient = null
  limiterCache.clear()
}
