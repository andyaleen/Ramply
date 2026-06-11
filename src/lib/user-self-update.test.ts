import { describe, expect, test } from 'vitest'

import { pickUserSelfUpdateFields } from './user-self-update'

describe('pickUserSelfUpdateFields', () => {
  test('keeps only self-service profile fields', () => {
    expect(
      pickUserSelfUpdateFields({
        notification_preferences: { email_notifications: true },
        updated_at: '2026-01-01T00:00:00.000Z',
        role: 'admin',
        email: 'attacker@example.com',
      })
    ).toEqual({
      notification_preferences: { email_notifications: true },
      updated_at: '2026-01-01T00:00:00.000Z',
    })
  })
})
