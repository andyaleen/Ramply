import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { createReferralToken, verifyReferralToken } from './referral-token'

const TEST_SECRET = 'test-referral-secret-for-unit-tests'

describe('referral token', () => {
  beforeEach(() => {
    process.env.REFERRAL_TOKEN_SECRET = TEST_SECRET
  })

  afterEach(() => {
    delete process.env.REFERRAL_TOKEN_SECRET
  })

  test('creates and verifies a token for a company id', () => {
    const companyId = '11111111-1111-1111-1111-111111111111'
    const token = createReferralToken(companyId)

    expect(verifyReferralToken(token)).toBe(companyId)
  })

  test('rejects tampered tokens', () => {
    const token = createReferralToken('22222222-2222-2222-2222-222222222222')
    const tampered = token.replace(/^v1\./, 'v1.33333333-3333-3333-3333-333333333333.')

    expect(verifyReferralToken(tampered)).toBeNull()
    expect(verifyReferralToken('not-a-token')).toBeNull()
  })

  test('throws when REFERRAL_TOKEN_SECRET is missing', () => {
    delete process.env.REFERRAL_TOKEN_SECRET

    expect(() => createReferralToken('11111111-1111-1111-1111-111111111111')).toThrow(
      'REFERRAL_TOKEN_SECRET is not configured',
    )
  })
})
