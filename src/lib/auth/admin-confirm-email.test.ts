import { describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import {
  adminConfirmAuthUserEmail,
  isEmailNotConfirmedError,
  isSignInBlockedByConfirmation,
} from './admin-confirm-email'

function createAdminMock(authUser?: {
  id: string
  email?: string
  email_confirmed_at?: string | null
}): SupabaseClient {
  const listUsers = vi.fn(async () => ({
    data: { users: authUser ? [authUser] : [] },
    error: null,
  }))

  const getUserById = vi.fn(async () => ({
    data: { user: authUser ?? null },
    error: authUser ? null : { message: 'missing' },
  }))

  const updateUserById = vi.fn(async () => ({
    data: { user: authUser },
    error: null,
  }))

  return {
    auth: {
      admin: {
        listUsers,
        getUserById,
        updateUserById,
      },
    },
  } as unknown as SupabaseClient
}

describe('isEmailNotConfirmedError', () => {
  test('detects Supabase confirmation message', () => {
    expect(isEmailNotConfirmedError('Email not confirmed')).toBe(true)
  })
})

describe('isSignInBlockedByConfirmation', () => {
  test('treats invalid login credentials as confirmation-related', () => {
    expect(isSignInBlockedByConfirmation('Invalid login credentials')).toBe(true)
  })
})

describe('adminConfirmAuthUserEmail', () => {
  test('confirms unconfirmed user', async () => {
    const admin = createAdminMock({
      id: 'user-1',
      email: 'user@example.com',
      email_confirmed_at: null,
    })

    const result = await adminConfirmAuthUserEmail(admin, 'user@example.com', 'user-1')
    expect(result).toEqual({ ok: true })
  })
})
