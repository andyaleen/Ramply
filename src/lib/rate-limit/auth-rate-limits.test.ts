import { describe, expect, test, beforeEach } from 'vitest'

import { enforceAuthRateLimit } from './auth-rate-limits'
import { resetRateLimitStoreForTests } from './memory-rate-limiter'
import { getRequestClientIp } from './request-client-ip'

function buildRequest(ip: string): Request {
  return new Request('https://example.com/api/auth/complete-sign-in', {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('getRequestClientIp', () => {
  test('uses the first forwarded hop', () => {
    const request = buildRequest('203.0.113.10, 10.0.0.1')
    expect(getRequestClientIp(request)).toBe('203.0.113.10')
  })
})

describe('enforceAuthRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
  })

  test('allows requests under the IP limit', async () => {
    const request = buildRequest('203.0.113.20')

    expect((await enforceAuthRateLimit(request, 'complete-sign-in')).ok).toBe(true)
  })

  test('blocks requests once the IP limit is exceeded', async () => {
    const request = buildRequest('203.0.113.21')

    for (let attempt = 0; attempt < 20; attempt += 1) {
      expect((await enforceAuthRateLimit(request, 'complete-sign-in')).ok).toBe(true)
    }

    const blocked = await enforceAuthRateLimit(request, 'complete-sign-in')
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
      expect(blocked.response.headers.get('Retry-After')).toBeTruthy()
    }
  })

  test('tracks email limits independently from IP limits', async () => {
    const requestA = buildRequest('203.0.113.30')
    const requestB = buildRequest('203.0.113.31')
    const email = 'attacker@example.com'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (await enforceAuthRateLimit(requestA, 'complete-sign-in', { email })).ok
      ).toBe(true)
    }

    const blockedByEmail = await enforceAuthRateLimit(requestB, 'complete-sign-in', { email })
    expect(blockedByEmail.ok).toBe(false)

    const otherEmail = await enforceAuthRateLimit(requestB, 'complete-sign-in', {
      email: 'other@example.com',
    })
    expect(otherEmail.ok).toBe(true)
  })
})
