import { describe, expect, test } from 'vitest'
import { formatAuthExchangeError } from './auth-exchange-errors'

describe('formatAuthExchangeError', () => {
  test('explains PKCE verifier failures for OAuth and reset links', () => {
    const message = formatAuthExchangeError('PKCE code verifier not found')
    expect(message).toContain('same browser')
    expect(message).not.toContain('ramply.org/login')
  })
})
