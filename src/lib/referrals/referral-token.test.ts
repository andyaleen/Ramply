import { createReferralToken, verifyReferralToken } from './referral-token'

describe('referral token', () => {
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
})
