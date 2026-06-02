import { describe, expect, test } from 'vitest'

import {
  canAutoConfirmShareRecipient,
  extractShareRequestToken,
} from './share-recipient-signup'

describe('canAutoConfirmShareRecipient', () => {
  test('allows matching pending recipient', () => {
    expect(
      canAutoConfirmShareRecipient(
        {
          recipient_email: 'vendor@example.com',
          status: 'pending',
          expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        },
        'vendor@example.com'
      )
    ).toBe(true)
  })

  test('rejects email mismatch', () => {
    expect(
      canAutoConfirmShareRecipient(
        {
          recipient_email: 'vendor@example.com',
          status: 'pending',
          expires_at: null,
        },
        'other@example.com'
      )
    ).toBe(false)
  })

  test('rejects expired requests', () => {
    expect(
      canAutoConfirmShareRecipient(
        {
          recipient_email: 'vendor@example.com',
          status: 'pending',
          expires_at: new Date(Date.now() - 86_400_000).toISOString(),
        },
        'vendor@example.com'
      )
    ).toBe(false)
  })
})

describe('extractShareRequestToken', () => {
  test('parses onboard token path', () => {
    const token = 'a'.repeat(64)
    expect(extractShareRequestToken(`/onboard/${token}`)).toBe(token)
  })
})
