import { describe, expect, test, beforeEach, afterEach } from 'vitest'
import {
  checkSendRequestLimit,
  CLASSIC_MONTHLY_LIMIT,
  FREE_REQUEST_LIMIT,
  getPlanFromPriceId,
  isActiveSubscription,
  isBillingExemptEmail,
} from './plan-limits'

describe('isActiveSubscription', () => {
  test('treats active and trialing as subscribed', () => {
    expect(isActiveSubscription('active')).toBe(true)
    expect(isActiveSubscription('trialing')).toBe(true)
    expect(isActiveSubscription('canceled')).toBe(false)
    expect(isActiveSubscription(null)).toBe(false)
  })
})

describe('getPlanFromPriceId', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env.STRIPE_CLASSIC_PRICE_ID = 'price_classic'
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('maps known price IDs to plans', () => {
    expect(getPlanFromPriceId('price_classic')).toBe('classic')
    expect(getPlanFromPriceId('price_pro')).toBe('pro')
    expect(getPlanFromPriceId(null)).toBe('free')
  })
})

describe('checkSendRequestLimit', () => {
  test('allows free users under the lifetime cap', () => {
    const result = checkSendRequestLimit(null, null, {
      totalSent: FREE_REQUEST_LIMIT - 1,
      monthlySent: FREE_REQUEST_LIMIT - 1,
    })
    expect(result).toEqual({ allowed: true, plan: 'free' })
  })

  test('blocks free users at the lifetime cap', () => {
    const result = checkSendRequestLimit(null, null, {
      totalSent: FREE_REQUEST_LIMIT,
      monthlySent: 1,
    })
    expect(result.allowed).toBe(false)
    expect(result.error).toBe('free_tier_limit')
  })

  test('allows classic users under the monthly cap', () => {
    process.env.STRIPE_CLASSIC_PRICE_ID = 'price_classic'
    const result = checkSendRequestLimit('active', 'price_classic', {
      totalSent: 50,
      monthlySent: CLASSIC_MONTHLY_LIMIT - 1,
    })
    expect(result).toEqual({ allowed: true, plan: 'classic' })
  })

  test('blocks classic users at the monthly cap', () => {
    process.env.STRIPE_CLASSIC_PRICE_ID = 'price_classic'
    const result = checkSendRequestLimit('active', 'price_classic', {
      totalSent: 50,
      monthlySent: CLASSIC_MONTHLY_LIMIT,
    })
    expect(result.allowed).toBe(false)
    expect(result.error).toBe('classic_monthly_limit')
  })

  test('allows unlimited pro requests', () => {
    process.env.STRIPE_PRO_PRICE_ID = 'price_pro'
    const result = checkSendRequestLimit('active', 'price_pro', {
      totalSent: 500,
      monthlySent: 200,
    })
    expect(result).toEqual({ allowed: true, plan: 'pro' })
  })

  test('allows unlimited requests for billing-exempt emails', () => {
    process.env.BILLING_EXEMPT_EMAILS = 'Tester@Example.com, other@example.com'
    const result = checkSendRequestLimit(null, null, {
      totalSent: FREE_REQUEST_LIMIT + 10,
      monthlySent: CLASSIC_MONTHLY_LIMIT + 10,
    }, 'tester@example.com')
    expect(result).toEqual({ allowed: true, plan: 'pro' })
    expect(isBillingExemptEmail('other@example.com')).toBe(true)
    expect(isBillingExemptEmail('not-listed@example.com')).toBe(false)
    delete process.env.BILLING_EXEMPT_EMAILS
  })
})
