import { describe, expect, it } from 'vitest'

import { profileUpdatesFromFulfillmentFields } from '@/lib/fulfillment-profile-sync'

describe('profileUpdatesFromFulfillmentFields', () => {
  it('includes only non-empty catalog field values', () => {
    expect(
      profileUpdatesFromFulfillmentFields({
        legal_name: ' Acme LLC ',
        ein: '',
        contact_email: 'finance@example.com',
      })
    ).toEqual({
      legal_name: 'Acme LLC',
      contact_email: 'finance@example.com',
    })
  })

  it('ignores unknown keys', () => {
    expect(
      profileUpdatesFromFulfillmentFields({
        legal_name: 'Acme LLC',
        not_a_field: 'ignored',
      } as never)
    ).toEqual({
      legal_name: 'Acme LLC',
    })
  })
})
