import { describe, expect, test } from 'vitest'
import {
  isBootstrapRpcUnavailable,
  parseBootstrapAppUserPayload,
} from '@/lib/auth/bootstrap-app-user'
import type { CompanyRow, UserRow } from '@/lib/database.types'

const sampleUser: UserRow = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'user@example.com',
  role: 'external',
  notification_preferences: {},
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const sampleCompany: CompanyRow = {
  id: '22222222-2222-2222-2222-222222222222',
  owner_user_id: sampleUser.id,
  legal_name: null,
  dba_name: null,
  ein: null,
  business_type: null,
  address_line1: null,
  address_line2: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  contact_name: null,
  contact_email: null,
  contact_phone: null,
  bank_name: null,
  bank_account_number: null,
  bank_routing_number: null,
  website: null,
  year_founded: null,
  accounting_name: null,
  accounting_email: null,
  accounting_phone: null,
  bank_reference_email: null,
  vendor_references: null,
  payment_terms: null,
  payment_method: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  subscription_status: null,
  subscription_price_id: null,
  subscription_current_period_end: null,
  logo_path: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('parseBootstrapAppUserPayload', () => {
  test('maps RPC payload into app state', () => {
    expect(
      parseBootstrapAppUserPayload({
        user: sampleUser,
        company: sampleCompany,
      })
    ).toEqual({
      userProfile: sampleUser,
      company: sampleCompany,
    })
  })

  test('rejects incomplete payloads', () => {
    expect(() => parseBootstrapAppUserPayload({ user: sampleUser })).toThrow(
      'Missing user or company in bootstrap payload'
    )
  })
})

describe('isBootstrapRpcUnavailable', () => {
  test('detects missing RPC errors', () => {
    expect(isBootstrapRpcUnavailable({ code: 'PGRST202', message: 'Could not find function bootstrap_app_user' }))
      .toBe(true)
    expect(isBootstrapRpcUnavailable({ code: '42883', message: 'function bootstrap_app_user() does not exist' }))
      .toBe(true)
  })

  test('ignores unrelated errors', () => {
    expect(isBootstrapRpcUnavailable({ code: '42501', message: 'permission denied' })).toBe(false)
    expect(isBootstrapRpcUnavailable(null)).toBe(false)
  })
})
