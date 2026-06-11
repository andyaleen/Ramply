import { describe, expect, test } from 'vitest'
import { NextRequest } from 'next/server'
import {
  hasSupabaseAuthSessionCookie,
  isAnonymousPublicPath,
  shouldSkipMiddlewareAuth,
} from '@/lib/auth/middleware-session-cookie'

function requestWithCookies(
  pathname: string,
  cookies: Record<string, string> = {}
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000')
  const request = new NextRequest(url)
  for (const [name, value] of Object.entries(cookies)) {
    request.cookies.set(name, value)
  }
  return request
}

describe('isAnonymousPublicPath', () => {
  test('matches landing, pricing, and login only', () => {
    expect(isAnonymousPublicPath('/')).toBe(true)
    expect(isAnonymousPublicPath('/pricing')).toBe(true)
    expect(isAnonymousPublicPath('/login')).toBe(true)
    expect(isAnonymousPublicPath('/signup')).toBe(false)
    expect(isAnonymousPublicPath('/dashboard')).toBe(false)
  })
})

describe('hasSupabaseAuthSessionCookie', () => {
  test('detects Supabase auth token cookies', () => {
    const request = requestWithCookies('/', {
      'sb-project-auth-token': 'token-value',
    })
    expect(hasSupabaseAuthSessionCookie(request)).toBe(true)
  })

  test('detects chunked auth token cookies', () => {
    const request = requestWithCookies('/', {
      'sb-project-auth-token.0': 'chunk',
    })
    expect(hasSupabaseAuthSessionCookie(request)).toBe(true)
  })

  test('returns false when no auth cookie is present', () => {
    expect(hasSupabaseAuthSessionCookie(requestWithCookies('/'))).toBe(false)
  })
})

describe('shouldSkipMiddlewareAuth', () => {
  test('skips auth on anonymous public pages without session cookies', () => {
    const request = requestWithCookies('/pricing')
    expect(shouldSkipMiddlewareAuth('/pricing', request, false, false)).toBe(true)
  })

  test('does not skip when a session cookie is present', () => {
    const request = requestWithCookies('/login', {
      'sb-project-auth-token': 'token-value',
    })
    expect(shouldSkipMiddlewareAuth('/login', request, false, false)).toBe(false)
  })

  test('does not skip when auth callback params are present', () => {
    const request = requestWithCookies('/')
    expect(shouldSkipMiddlewareAuth('/', request, true, false)).toBe(false)
  })

  test('does not skip protected routes', () => {
    const request = requestWithCookies('/dashboard')
    expect(shouldSkipMiddlewareAuth('/dashboard', request, false, false)).toBe(false)
  })
})
