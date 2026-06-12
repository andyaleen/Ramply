import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import {
  deliverResendEmail,
  isDevEmailFallbackError,
  isDevEmailLogEnabled,
} from './resend-delivery'

describe('resend delivery', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('EMAIL_DEV_LOG', '')
    vi.stubEnv('RESEND_API_KEY', '')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  test('logs instead of sending when Resend is not configured in development', async () => {
    const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

    const result = await deliverResendEmail({
      to: 'partner@example.com',
      subject: 'Test referral',
      html: '<a href="http://localhost:3000/signup?ref=abc">Join</a>',
      context: 'referral-invite',
    })

    expect(result).toEqual({ ok: true, devLogged: true })
    expect(logSpy).toHaveBeenCalled()
    logSpy.mockRestore()
  })

  test('EMAIL_DEV_LOG=false disables dev logging fallback', () => {
    vi.stubEnv('EMAIL_DEV_LOG', 'false')
    expect(isDevEmailLogEnabled()).toBe(false)
  })

  test('treats Resend sandbox recipient restrictions as dev fallback errors', () => {
    expect(
      isDevEmailFallbackError(
        'You can only send testing emails to your own email address (you@example.com).'
      )
    ).toBe(true)
  })
})
