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

  it('syncs structured address components from fulfillment', () => {
    expect(
      profileUpdatesFromFulfillmentFields(
        { legal_name: 'Acme LLC' },
        {
          address_line1: '123 Main St',
          city: 'New York',
          state: 'NY',
          postal_code: '10001',
        }
      )
    ).toEqual({
      legal_name: 'Acme LLC',
      address_line1: '123 Main St',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
    })
  })
})
