import { describe, expect, test, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { findAuthUserIdByEmail } from './lookup-auth-user'

describe('findAuthUserIdByEmail', () => {
  test('returns id from app users table', async () => {
    const admin = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          ilike: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: 'user-1' }, error: null })),
          })),
        })),
      })),
      auth: { admin: { listUsers: vi.fn() } },
    } as unknown as SupabaseClient

    await expect(findAuthUserIdByEmail(admin, 'vendor@example.com')).resolves.toBe('user-1')
  })
})
