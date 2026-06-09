import { describe, expect, it } from 'vitest'

import { resolvePendingRequestDisplayStatus } from '@/lib/pending-request-status'

describe('resolvePendingRequestDisplayStatus', () => {
  it('returns expired when expires_at is in the past', () => {
    expect(
      resolvePendingRequestDisplayStatus({
        expires_at: '2020-01-01T00:00:00.000Z',
        opened_at: '2025-01-01T00:00:00.000Z',
      })
    ).toBe('expired')
  })

  it('returns opened when the link was opened and not expired', () => {
    expect(
      resolvePendingRequestDisplayStatus({
        expires_at: '2099-01-01T00:00:00.000Z',
        opened_at: '2025-01-01T00:00:00.000Z',
      })
    ).toBe('opened')
  })

  it('returns awaiting when the link has not been opened', () => {
    expect(
      resolvePendingRequestDisplayStatus({
        expires_at: '2099-01-01T00:00:00.000Z',
        opened_at: null,
      })
    ).toBe('awaiting')
  })
})
