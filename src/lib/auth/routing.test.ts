import { describe, expect, test } from 'vitest'

import {
  isCompanyProfileComplete,
  isSafeRedirectPath,
  normalizeRequestedPath,
} from './routing'

describe('isSafeRedirectPath', () => {
  test('allows normal app paths', () => {
    expect(isSafeRedirectPath('/dashboard')).toBe(true)
    expect(isSafeRedirectPath('/onboard/abc')).toBe(true)
  })

  test('rejects open redirects', () => {
    expect(isSafeRedirectPath('//evil.com')).toBe(false)
    expect(isSafeRedirectPath('/\\evil')).toBe(false)
    expect(isSafeRedirectPath('/login:evil')).toBe(false)
    expect(isSafeRedirectPath('https://evil.com')).toBe(false)
  })
})

describe('normalizeRequestedPath', () => {
  test('rewrites legacy admin paths', () => {
    expect(normalizeRequestedPath('/admin/responses', '/dashboard')).toBe('/dashboard/responses')
  })

  test('falls back on unsafe paths', () => {
    expect(normalizeRequestedPath('//evil.com', '/dashboard')).toBe('/dashboard')
  })
})

describe('isCompanyProfileComplete', () => {
  test('requires legal name, contact name, and EIN', () => {
    expect(
      isCompanyProfileComplete({
        legal_name: 'Acme',
        contact_name: 'Jane',
        ein: '12-3456789',
      })
    ).toBe(true)

    expect(
      isCompanyProfileComplete({
        legal_name: 'Acme',
        contact_name: 'Jane',
        ein: '',
      })
    ).toBe(false)
  })
})
