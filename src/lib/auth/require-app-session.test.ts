import { describe, expect, test } from 'vitest'

import {
  buildAppSessionActivityMetadata,
  parseAppSessionActivity,
  resolveAppSessionMetadata,
  serializeAppSessionActivity,
  touchAppSessionActivityMetadata,
} from './app-session-cookie'
import {
  AUTH_SESSION_ABSOLUTE_TIMEOUT_MS,
  AUTH_SESSION_IDLE_TIMEOUT_MS,
  getSessionTimeoutState,
  isAbsoluteAppSessionExpired,
} from './session-policy'
import { evaluateAppSessionForRequest } from './require-app-session'

describe('isAbsoluteAppSessionExpired', () => {
  test('expires after the absolute session window', () => {
    const lastSignIn = new Date(Date.now() - AUTH_SESSION_ABSOLUTE_TIMEOUT_MS - 1).toISOString()
    expect(isAbsoluteAppSessionExpired({ last_sign_in_at: lastSignIn })).toBe(true)
  })

  test('allows sessions inside the absolute window', () => {
    const lastSignIn = new Date().toISOString()
    expect(isAbsoluteAppSessionExpired({ last_sign_in_at: lastSignIn })).toBe(false)
  })
})

describe('app session cookie helpers', () => {
  test('round-trips session metadata', () => {
    const metadata = buildAppSessionActivityMetadata({
      id: 'user-1',
      last_sign_in_at: '2026-01-01T00:00:00.000Z',
    })

    expect(parseAppSessionActivity(serializeAppSessionActivity(metadata))).toEqual(metadata)
  })

  test('seeds fresh activity metadata when the cookie is missing', () => {
    const metadata = resolveAppSessionMetadata(
      { id: 'user-1', last_sign_in_at: '2026-01-01T00:00:00.000Z' },
      null
    )

    expect(metadata.userId).toBe('user-1')
    expect(metadata.lastActivityAt).toBeGreaterThan(0)
  })

  test('throttles activity cookie refreshes', () => {
    const metadata = {
      userId: 'user-1',
      sessionStartedAt: 0,
      lastActivityAt: 1000,
    }

    expect(touchAppSessionActivityMetadata(metadata, 2000)).toBeNull()
    expect(touchAppSessionActivityMetadata(metadata, 20_000)?.lastActivityAt).toBe(20_000)
  })
})

describe('evaluateAppSessionForRequest', () => {
  test('rejects idle-expired sessions from the activity cookie', () => {
    const now = AUTH_SESSION_IDLE_TIMEOUT_MS + 10
    const request = {
      cookies: {
        get: () => ({
          value: serializeAppSessionActivity({
            userId: 'user-1',
            sessionStartedAt: 0,
            lastActivityAt: 0,
          }),
        }),
      },
    } as never

    const result = evaluateAppSessionForRequest(
      { id: 'user-1', last_sign_in_at: new Date(now).toISOString() },
      request,
      now
    )

    expect(result.ok).toBe(false)
    expect(getSessionTimeoutState({
      userId: 'user-1',
      sessionStartedAt: 0,
      lastActivityAt: 0,
    }, now).shouldExpire).toBe(true)
  })
})
