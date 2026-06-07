import { describe, expect, test, vi } from 'vitest'

import {
  applyPasswordRecoveryRoutingHints,
  applySupabaseSiteUrlRecoveryRouting,
  resolvePostAuthDestination,
} from './password-recovery-pending'

describe('applySupabaseSiteUrlRecoveryRouting', () => {
  test('routes bare Site URL code links to update-password', () => {
    const params = new URLSearchParams('code=abc')
    applySupabaseSiteUrlRecoveryRouting(params)
    expect(params.get('type')).toBe('recovery')
    expect(params.get('next')).toBe('/auth/update-password')
  })

  test('preserves OAuth callback when next is present', () => {
    const params = new URLSearchParams('code=abc&next=%2Fdashboard')
    applySupabaseSiteUrlRecoveryRouting(params)
    expect(params.get('type')).toBeNull()
    expect(params.get('next')).toBe('/dashboard')
  })

  test('marks update-password next as recovery when type is missing', () => {
    const params = new URLSearchParams(`code=abc&next=${encodeURIComponent('/auth/update-password')}`)
    applySupabaseSiteUrlRecoveryRouting(params)
    expect(params.get('type')).toBe('recovery')
    expect(params.get('next')).toBe('/auth/update-password')
  })

  test('does not override explicit non-recovery type', () => {
    const params = new URLSearchParams('code=abc&type=signup')
    applySupabaseSiteUrlRecoveryRouting(params)
    expect(params.get('type')).toBe('signup')
    expect(params.get('next')).toBeNull()
  })
})

describe('applyPasswordRecoveryRoutingHints', () => {
  test('clears stale recovery flag when OAuth returns to dashboard', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
    })
    store.set('ramply_password_recovery_pending', '1')

    const params = new URLSearchParams('code=abc&next=%2Fdashboard')
    applyPasswordRecoveryRoutingHints(params)

    expect(params.get('type')).toBeNull()
    expect(params.get('next')).toBe('/dashboard')
    expect(store.has('ramply_password_recovery_pending')).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('resolvePostAuthDestination', () => {
  test('honors dashboard next even when recovery type was set incorrectly', () => {
    const params = new URLSearchParams('code=abc&next=%2Fdashboard&type=recovery')
    expect(
      resolvePostAuthDestination({
        params,
        resultNextPath: '/dashboard',
        recoveryFlow: true,
        pendingRecovery: true,
      })
    ).toBe('/dashboard')
  })

  test('routes recovery email links to update-password', () => {
    const params = new URLSearchParams('code=abc&type=recovery&next=%2Fauth%2Fupdate-password')
    expect(
      resolvePostAuthDestination({
        params,
        resultNextPath: '/auth/update-password',
        recoveryFlow: false,
        pendingRecovery: false,
      })
    ).toBe('/auth/update-password')
  })
})

describe('buildAuthConfirmPath recovery', () => {
  test('site-url code-only builds confirm path to update-password', async () => {
    const { buildAuthConfirmPath } = await import('./parse-auth-callback-params')
    const params = new URLSearchParams('code=xyz')
    applyPasswordRecoveryRoutingHints(params)
    expect(buildAuthConfirmPath(params)).toContain('next=%2Fauth%2Fupdate-password')
    expect(buildAuthConfirmPath(params)).toContain('type=recovery')
  })
})
