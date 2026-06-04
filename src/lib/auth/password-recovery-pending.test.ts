import { describe, expect, test } from 'vitest'

import {
  applyPasswordRecoveryRoutingHints,
  applySupabaseSiteUrlRecoveryRouting,
} from './password-recovery-pending'

describe('applySupabaseSiteUrlRecoveryRouting', () => {
  test('routes bare Site URL code links to update-password', () => {
    const params = new URLSearchParams('code=abc')
    applySupabaseSiteUrlRecoveryRouting(params)
    expect(params.get('type')).toBe('recovery')
    expect(params.get('next')).toBe('/auth/update-password')
  })

  test('overrides dashboard fallback when type is missing', () => {
    const params = new URLSearchParams('code=abc&next=%2Fdashboard')
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

describe('buildAuthConfirmPath recovery', () => {
  test('site-url code-only builds confirm path to update-password', async () => {
    const { buildAuthConfirmPath } = await import('./parse-auth-callback-params')
    const params = new URLSearchParams('code=xyz')
    applyPasswordRecoveryRoutingHints(params)
    expect(buildAuthConfirmPath(params)).toContain('next=%2Fauth%2Fupdate-password')
    expect(buildAuthConfirmPath(params)).toContain('type=recovery')
  })
})
