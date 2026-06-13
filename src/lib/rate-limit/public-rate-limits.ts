import { NextResponse } from 'next/server'
import { consumeRateLimit } from '@/lib/rate-limit/consume-rate-limit'
import { getRequestClientIp } from '@/lib/rate-limit/request-client-ip'
import type { RateLimitCheck, RateLimitConfig } from '@/lib/rate-limit/types'

export const PUBLIC_RATE_LIMITED_CODE = 'RATE_LIMITED'

export type PublicRateLimitBucket = 'contact-form'

const PUBLIC_RATE_LIMITS: Record<
  PublicRateLimitBucket,
  { ip: RateLimitConfig; email?: RateLimitConfig }
> = {
  'contact-form': {
    ip: { limit: 10, windowMs: 60 * 60 * 1000 },
    email: { limit: 5, windowMs: 60 * 60 * 1000 },
  },
}

type EnforcePublicRateLimitOptions = {
  email?: string | null
}

type EnforcePublicRateLimitSuccess = { ok: true }
type EnforcePublicRateLimitFailure = { ok: false; response: NextResponse }
export type EnforcePublicRateLimitResult =
  | EnforcePublicRateLimitSuccess
  | EnforcePublicRateLimitFailure

function normalizeEmail(email: string | null | undefined): string | null {
  const normalized = email?.trim().toLowerCase()
  return normalized || null
}

function buildRateLimitChecks(
  bucket: PublicRateLimitBucket,
  request: Request,
  options?: EnforcePublicRateLimitOptions
): RateLimitCheck[] {
  const limits = PUBLIC_RATE_LIMITS[bucket]
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

  return checks
}

function rateLimitedResponse(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Too many attempts. Please try again later.',
      code: PUBLIC_RATE_LIMITED_CODE,
    },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfterSec),
      },
    }
  )
}

/** Applies IP and optional email rate limits to public form endpoints. */
export async function enforcePublicRateLimit(
  request: Request,
  bucket: PublicRateLimitBucket,
  options?: EnforcePublicRateLimitOptions
): Promise<EnforcePublicRateLimitResult> {
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
