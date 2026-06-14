import { beforeEach, describe, expect, test } from 'vitest'

import { enforceAuthenticatedRateLimit } from './authenticated-rate-limits'
import { resetRateLimitStoreForTests } from './memory-rate-limiter'

function buildRequest(ip: string): Request {
  return new Request('https://example.com/api/share-requests', {
    method: 'POST',
    headers: {
      'x-forwarded-for': ip,
    },
  })
}

describe('enforceAuthenticatedRateLimit', () => {
  beforeEach(() => {
    resetRateLimitStoreForTests()
  })

  test('blocks referral sends once the recipient email limit is exceeded', async () => {
    const requestA = buildRequest('203.0.113.40')
    const requestB = buildRequest('203.0.113.41')
    const userId = '11111111-1111-1111-1111-111111111111'
    const email = 'recipient@example.com'

    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(
        (await enforceAuthenticatedRateLimit(requestA, 'referral-send', { userId, email })).ok,
      ).toBe(true)
    }

    const blocked = await enforceAuthenticatedRateLimit(requestB, 'referral-send', {
      userId,
      email,
    })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.response.status).toBe(429)
    }
  })
})
