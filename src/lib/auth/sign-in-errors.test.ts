import { describe, expect, test } from 'vitest'
import {
  INVALID_SIGN_IN_CREDENTIALS_CODE,
  INVALID_SIGN_IN_CREDENTIALS_MESSAGE,
  isInvalidCredentialsAuthError,
  resolvePasswordSignInApiError,
  RATE_LIMITED_SIGN_IN_MESSAGE,
} from '@/lib/auth/sign-in-errors'

describe('sign-in-errors', () => {
  test('detects Supabase invalid credential message variants', () => {
    expect(isInvalidCredentialsAuthError('Invalid login credentials')).toBe(true)
    expect(isInvalidCredentialsAuthError('Invalid credentials')).toBe(true)
    expect(isInvalidCredentialsAuthError('Email not confirmed')).toBe(false)
  })

  test('maps invalid_credentials API code to user copy', () => {
    expect(
      resolvePasswordSignInApiError({
        code: INVALID_SIGN_IN_CREDENTIALS_CODE,
      }),
    ).toBe(INVALID_SIGN_IN_CREDENTIALS_MESSAGE)
  })

  test('maps rate limit responses to retry copy', () => {
    expect(resolvePasswordSignInApiError({ code: 'RATE_LIMITED' }, 429)).toBe(
      RATE_LIMITED_SIGN_IN_MESSAGE,
    )
  })

  test('does not throw when API error payload is a validation object', () => {
    expect(
      resolvePasswordSignInApiError({
        error: { fieldErrors: { password: ['Too small'] }, formErrors: [] },
      }),
    ).toBe('An unexpected error occurred')
  })
})
