import { afterEach, describe, expect, test, vi } from 'vitest'

import { getAuthConfirmNextPath, resolveAuthRedirectOrigin } from './auth-redirect'

describe('resolveAuthRedirectOrigin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('uses browser origin in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ramply.org')
    expect(resolveAuthRedirectOrigin('http://localhost:3001')).toBe('http://localhost:3001')
  })

  test('uses configured origin in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ramply.org')
    expect(resolveAuthRedirectOrigin('http://localhost:3001')).toBe('https://ramply.org')
  })

  test('falls back to localhost when unset', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(resolveAuthRedirectOrigin()).toBe('http://localhost:3000')
  })
})

describe('getAuthConfirmNextPath', () => {
  test('uses recovery default when type is recovery', () => {
    expect(getAuthConfirmNextPath(null, 'recovery')).toBe('/auth/update-password')
  })

  test('respects explicit next path', () => {
    expect(getAuthConfirmNextPath('/onboard/abc', 'recovery')).toBe('/onboard/abc')
  })

  test('preserves update-password next path from recovery email', () => {
    expect(getAuthConfirmNextPath('/auth/update-password', 'recovery')).toBe(
      '/auth/update-password'
    )
  })
})
