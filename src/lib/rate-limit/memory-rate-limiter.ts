import type { RateLimitConfig, RateLimitConsumeResult } from '@/lib/rate-limit/types'

type RateLimitEntry = {
  count: number
  resetAt: number
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

function getStore(): Map<string, RateLimitEntry> {
  const globalScope = globalThis as typeof globalThis & {
    __ramplyRateLimitStore?: Map<string, RateLimitEntry>
    __ramplyRateLimitCleanupAt?: number
  }

  if (!globalScope.__ramplyRateLimitStore) {
    globalScope.__ramplyRateLimitStore = new Map()
  }

  const now = Date.now()
  if (
    !globalScope.__ramplyRateLimitCleanupAt
    || now - globalScope.__ramplyRateLimitCleanupAt > CLEANUP_INTERVAL_MS
  ) {
    for (const [key, entry] of globalScope.__ramplyRateLimitStore) {
      if (entry.resetAt <= now) {
        globalScope.__ramplyRateLimitStore.delete(key)
      }
    }
    globalScope.__ramplyRateLimitCleanupAt = now
  }

  return globalScope.__ramplyRateLimitStore
}

/** Fixed-window counter used for auth endpoint throttling. */
export function consumeRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): RateLimitConsumeResult {
  const store = getStore()
  let entry = store.get(key)

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowMs }
    store.set(key, entry)
  }

  if (entry.count >= config.limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    }
  }

  entry.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

/** Resets the in-memory store — test helper only. */
export function resetRateLimitStoreForTests(): void {
  const globalScope = globalThis as typeof globalThis & {
    __ramplyRateLimitStore?: Map<string, RateLimitEntry>
    __ramplyRateLimitCleanupAt?: number
  }

  globalScope.__ramplyRateLimitStore = new Map()
  globalScope.__ramplyRateLimitCleanupAt = undefined
}
