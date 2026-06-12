import { describe, expect, test, vi, beforeEach } from 'vitest'

import { completePasswordSignIn } from './complete-password-sign-in'
import { INVALID_SIGN_IN_CREDENTIALS_CODE } from './sign-in-errors'

vi.mock('@/lib/auth/admin-confirm-email', () => ({
  adminConfirmAuthUserEmail: vi.fn(async () => ({ ok: true })),
  isSignInBlockedByConfirmation: vi.fn(() => false),
}))

vi.mock('@/lib/auth/share-recipient-confirm', () => ({
  confirmShareRecipientAccount: vi.fn(),
}))

vi.mock('@/lib/auth/lookup-auth-user', () => ({
  getAuthUserByEmail: vi.fn(),
  authUserHasPasswordProvider: vi.fn(),
}))

import { getAuthUserByEmail, authUserHasPasswordProvider } from '@/lib/auth/lookup-auth-user'

describe('completePasswordSignIn', () => {
  const supabase = {
    auth: {
      signInWithPassword: vi.fn(),
    },
  }
  const admin = {}

  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns the same failure for unknown emails and wrong passwords', async () => {
    vi.mocked(getAuthUserByEmail).mockResolvedValue(null)
    vi.mocked(authUserHasPasswordProvider).mockReturnValue(false)
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 },
    })

    const result = await completePasswordSignIn(supabase as never, admin as never, {
      email: 'missing@example.com',
      password: 'wrong-password-123',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(INVALID_SIGN_IN_CREDENTIALS_CODE)
      expect(result.status).toBe(401)
    }
  })

  test('returns the same failure for oauth-only accounts', async () => {
    vi.mocked(getAuthUserByEmail).mockResolvedValue({
      id: 'user-1',
      email: 'google@example.com',
      email_confirmed_at: '2026-01-01T00:00:00.000Z',
      identities: [{ provider: 'google', id: '1' }],
    } as never)
    vi.mocked(authUserHasPasswordProvider).mockReturnValue(false)
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials', name: 'AuthApiError', status: 400 },
    })

    const result = await completePasswordSignIn(supabase as never, admin as never, {
      email: 'google@example.com',
      password: 'wrong-password-123',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe(INVALID_SIGN_IN_CREDENTIALS_CODE)
    }
  })
})
