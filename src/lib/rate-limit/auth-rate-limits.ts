import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit/consume-rate-limit'
import { getRequestClientIp } from '@/lib/rate-limit/request-client-ip'
import type { RateLimitCheck, RateLimitConfig } from '@/lib/rate-limit/types'

export const AUTH_RATE_LIMITED_CODE = 'RATE_LIMITED'

export type AuthRateLimitBucket =
  | 'complete-sign-in'
  | 'request-password-reset'
  | 'confirm-share-recipient'
  | 'auth-bootstrap'
  | 'auth-sync-session'

const AUTH_RATE_LIMITS: Record<
  AuthRateLimitBucket,
  { ip: RateLimitConfig; email?: RateLimitConfig; user?: RateLimitConfig }
> = {
  'complete-sign-in': {
    ip: { limit: 20, windowMs: 15 * 60 * 1000 },
    email: { limit: 10, windowMs: 15 * 60 * 1000 },
  },
  'request-password-reset': {
    ip: { limit: 10, windowMs: 60 * 60 * 1000 },
    email: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
  'confirm-share-recipient': {
    ip: { limit: 15, windowMs: 15 * 60 * 1000 },
    email: { limit: 10, windowMs: 15 * 60 * 1000 },
  },
  'auth-bootstrap': {
    ip: { limit: 30, windowMs: 15 * 60 * 1000 },
    user: { limit: 30, windowMs: 15 * 60 * 1000 },
  },
  'auth-sync-session': {
    ip: { limit: 60, windowMs: 15 * 60 * 1000 },
    user: { limit: 30, windowMs: 15 * 60 * 1000 },
  },
}

type EnforceAuthRateLimitOptions = {
  email?: string | null
  userId?: string | null
}

type EnforceAuthRateLimitSuccess = { ok: true }
type EnforceAuthRateLimitFailure = { ok: false; response: NextResponse }
export type EnforceAuthRateLimitResult =
  | EnforceAuthRateLimitSuccess
  | EnforceAuthRateLimitFailure

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function buildRateLimitChecks(
  bucket: AuthRateLimitBucket,
  request: Request,
  options?: EnforceAuthRateLimitOptions
): RateLimitCheck[] {
  const limits = AUTH_RATE_LIMITS[bucket]
  const checks: RateLimitCheck[] = [
    {
      key: `${bucket}:ip:${getRequestClientIp(request)}`,
      config: limits.ip,
    },
  ]

  const email = normalizeEmail(options?.email)
  if (email && limits.email) {
    checks.push({
      key: `${bucket}:email:${email}`,
      config: limits.email,
    })
  }

  const userId = options?.userId?.trim()
  if (userId && limits.user) {
    checks.push({
      key: `${bucket}:user:${userId}`,
      config: limits.user,
    })
  }

  return checks
}

function rateLimitedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many attempts. Please try again later.',
      code: AUTH_RATE_LIMITED_CODE,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

/**
 * Applies IP and optional email rate limits to unauthenticated auth endpoints.
 */
export async function enforceAuthRateLimit(
  request: Request,
  bucket: AuthRateLimitBucket,
  options?: EnforceAuthRateLimitOptions
): Promise<EnforceAuthRateLimitResult> {
  const checks = buildRateLimitChecks(bucket, request, options)
  let retryAfterSec = 0

  for (const check of checks) {
    const result = await consumeRateLimit(check.key, check.config)
    if (!result.allowed) {
      retryAfterSec = Math.max(retryAfterSec, result.retryAfterSec)
    }
  }

  if (retryAfterSec > 0) {
    return { ok: false, response: rateLimitedResponse(retryAfterSec) }
  }

  return { ok: true }
}
