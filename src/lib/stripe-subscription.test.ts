import { describe, expect, test } from 'vitest'
import type Stripe from 'stripe'

import { getSubscriptionPeriodEnd } from './stripe-subscription'

describe('getSubscriptionPeriodEnd', () => {
  test('returns ISO string from current_period_end', () => {
    const periodEnd = 1_700_000_000
    const result = getSubscriptionPeriodEnd({
      items: { data: [{ current_period_end: periodEnd }] },
    } as Stripe.Subscription)

    expect(result).toBe(new Date(periodEnd * 1000).toISOString())
  })

  test('returns null when period end is missing', () => {
    expect(
      getSubscriptionPeriodEnd({} as Parameters<typeof getSubscriptionPeriodEnd>[0])
    ).toBeNull()
  })
})
