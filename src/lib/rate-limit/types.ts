export type RateLimitConfig = {
  limit: number
  windowMs: number
}

export type RateLimitConsumeResult = {
  allowed: boolean
  retryAfterSec: number
}

export type RateLimitCheck = {
  key: string
  config: RateLimitConfig
}
