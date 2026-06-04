import { describe, expect, test } from 'vitest'

import { buildPasswordResetCallbackUrl } from './password-reset-email'

describe('buildPasswordResetCallbackUrl', () => {
  test('builds token_hash callback to update-password', () => {
    const url = new URL(buildPasswordResetCallbackUrl('hashed-token-123'))
    expect(url.pathname).toBe('/auth/callback')
    expect(url.searchParams.get('token_hash')).toBe('hashed-token-123')
    expect(url.searchParams.get('type')).toBe('recovery')
    expect(url.searchParams.get('next')).toBe('/auth/update-password')
  })
})
