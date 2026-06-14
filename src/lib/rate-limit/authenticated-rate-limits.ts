import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit/consume-rate-limit'
import { getRequestClientIp } from '@/lib/rate-limit/request-client-ip'
import type { RateLimitCheck, RateLimitConfig } from '@/lib/rate-limit/types'

export const AUTHENTICATED_RATE_LIMITED_CODE = 'RATE_LIMITED'

export type AuthenticatedRateLimitBucket = 'share-request-create' | 'referral-send'

const AUTHENTICATED_RATE_LIMITS: Record<
  AuthenticatedRateLimitBucket,
  { ip: RateLimitConfig; user: RateLimitConfig; email?: RateLimitConfig }
> = {
  'share-request-create': {
    ip: { limit: 30, windowMs: 15 * 60 * 1000 },
    user: { limit: 20, windowMs: 15 * 60 * 1000 },
  },
  'referral-send': {
    ip: { limit: 20, windowMs: 60 * 60 * 1000 },
    user: { limit: 15, windowMs: 60 * 60 * 1000 },
    email: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
}

type EnforceAuthenticatedRateLimitOptions = {
  userId: string
  email?: string | null
}

type EnforceAuthenticatedRateLimitSuccess = { ok: true }
type EnforceAuthenticatedRateLimitFailure = { ok: false; response: NextResponse }
export type EnforceAuthenticatedRateLimitResult =
  | EnforceAuthenticatedRateLimitSuccess
  | EnforceAuthenticatedRateLimitFailure

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function buildRateLimitChecks(
  bucket: AuthenticatedRateLimitBucket,
  request: Request,
  options: EnforceAuthenticatedRateLimitOptions
): RateLimitCheck[] {
  const limits = AUTHENTICATED_RATE_LIMITS[bucket]
  const userId = options.userId.trim()
  const checks: RateLimitCheck[] = [
    {
      key: `${bucket}:ip:${getRequestClientIp(request)}`,
      config: limits.ip,
    },
    {
      key: `${bucket}:user:${userId}`,
      config: limits.user,
    },
  ]

  const email = normalizeEmail(options.email)
  if (email && limits.email) {
    checks.push({
      key: `${bucket}:email:${email}`,
      config: limits.email,
    })
  }

  return checks
}

function rateLimitedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many attempts. Please try again later.',
      code: AUTHENTICATED_RATE_LIMITED_CODE,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

/** Applies IP, user, and optional recipient email limits to authenticated API routes. */
export async function enforceAuthenticatedRateLimit(
  request: Request,
  bucket: AuthenticatedRateLimitBucket,
  options: EnforceAuthenticatedRateLimitOptions
): Promise<EnforceAuthenticatedRateLimitResult> {
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
