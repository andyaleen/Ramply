import { describe, expect, test } from 'vitest'

import {
  AUTH_REDIRECT_REASON_SESSION_EXPIRED,
  AUTH_SESSION_ABSOLUTE_TIMEOUT_MS,
  AUTH_SESSION_IDLE_TIMEOUT_MS,
  getSessionExpiryMessage,
  getSessionTimeoutState,
} from './session-policy'

describe('session policy', () => {
  test('expires when inactivity limit is reached', () => {
    const state = getSessionTimeoutState(
      {
        userId: 'user-1',
        sessionStartedAt: 0,
        lastActivityAt: 0,
      },
      AUTH_SESSION_IDLE_TIMEOUT_MS
    )

    expect(state.shouldExpire).toBe(true)
    expect(state.reason).toBe('idle')
  })

  test('expires when absolute session limit is reached', () => {
    const state = getSessionTimeoutState(
      {
        userId: 'user-1',
        sessionStartedAt: 0,
        lastActivityAt: AUTH_SESSION_ABSOLUTE_TIMEOUT_MS - 60_000,
      },
      AUTH_SESSION_ABSOLUTE_TIMEOUT_MS
    )

    expect(state.shouldExpire).toBe(true)
    expect(state.reason).toBe('absolute')
  })

  test('maps timeout redirects to a friendly login message', () => {
    expect(getSessionExpiryMessage(AUTH_REDIRECT_REASON_SESSION_EXPIRED)).toMatch(/session expired/i)
    expect(getSessionExpiryMessage('something-else')).toBeNull()
  })
})
