import { describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { confirmShareRecipientAccount } from './share-recipient-confirm'

function createAdminMock(overrides: {
  shareRequest?: { recipient_email: string | null; status: string | null; expires_at: string | null } | null
  shareError?: boolean
  listUsers?: Array<{ id: string; email?: string }>
  authUser?: { id: string; email?: string; email_confirmed_at?: string | null }
  updateError?: boolean
}): SupabaseClient {
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(async () => {
          if (overrides.shareError) {
            return { data: null, error: { message: 'not found' } }
          }
          return { data: overrides.shareRequest ?? null, error: null }
        }),
      })),
    })),
  }))

  const listUsers = vi.fn(async () => ({
    data: { users: overrides.listUsers ?? [] },
    error: null,
  }))

  const getUserById = vi.fn(async () => ({
    data: { user: overrides.authUser ?? null },
    error: overrides.authUser ? null : { message: 'missing' },
  }))

  const updateUserById = vi.fn(async () => ({
    data: { user: overrides.authUser },
    error: overrides.updateError ? { message: 'update failed' } : null,
  }))

  return {
    from,
    auth: {
      admin: {
        listUsers,
        getUserById,
        updateUserById,
      },
    },
  } as unknown as SupabaseClient
}

describe('confirmShareRecipientAccount', () => {
  test('confirms matching invite recipient', async () => {
    const admin = createAdminMock({
      shareRequest: {
        recipient_email: 'vendor@example.com',
        status: 'pending',
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
      },
      authUser: {
        id: 'user-1',
        email: 'vendor@example.com',
        email_confirmed_at: null,
      },
    })

    const result = await confirmShareRecipientAccount(admin, {
      email: 'vendor@example.com',
      token: 'a'.repeat(64),
      userId: 'user-1',
    })

    expect(result).toEqual({ ok: true })
  })

  test('rejects email mismatch on invite', async () => {
    const admin = createAdminMock({
      shareRequest: {
        recipient_email: 'vendor@example.com',
        status: 'pending',
        expires_at: null,
      },
    })

    const result = await confirmShareRecipientAccount(admin, {
      email: 'other@example.com',
      token: 'a'.repeat(64),
      userId: 'user-1',
    })

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: 'Email does not match this share request',
    })
  })
})
