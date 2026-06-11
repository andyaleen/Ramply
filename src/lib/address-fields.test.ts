import { describe, expect, it } from 'vitest'
import {
  ADDRESS_CATALOG_KEY,
  formatAddressFromComponents,
  isAddressComplete,
  normalizeFieldSelections,
  pickAddressComponents,
  requestIncludesAddress,
  resolveAddressDisplayValue,
} from '@/lib/address-fields'
import { parseAddressComponentsFromGoogle, parseGoogleAddressComponents } from '@/lib/parse-google-address'

describe('address-fields', () => {
  it('normalizes legacy address catalog keys to a single address key', () => {
    expect(
      normalizeFieldSelections(['legal_name', 'address_line1', 'city', 'state'])
    ).toEqual(['legal_name', ADDRESS_CATALOG_KEY])
  })

  it('detects address in mixed legacy selections', () => {
    expect(requestIncludesAddress(['ein', 'postal_code'])).toBe(true)
  })

  it('formats structured components for sharing', () => {
    expect(
      formatAddressFromComponents({
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'United States',
      })
    ).toBe('123 Main St, Suite 100, New York, NY, 10001, United States')
  })

  it('requires core fields for a complete address', () => {
    expect(isAddressComplete({ address_line1: '123 Main St', city: 'NY', state: 'NY', postal_code: '10001' })).toBe(true)
    expect(isAddressComplete({ address_line1: '123 Main St' })).toBe(false)
  })

  it('resolves shared address from formatted or legacy component data', () => {
    expect(resolveAddressDisplayValue({ address: '123 Main St, New York, NY 10001' })).toBe(
      '123 Main St, New York, NY 10001'
    )
    expect(
      resolveAddressDisplayValue({
        address_line1: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
      })
    ).toBe('123 Main St, New York, NY, 10001')
  })
})

describe('parseGoogleAddressComponents', () => {
  it('maps legacy Google address components into Ramply columns', () => {
    expect(
      parseGoogleAddressComponents([
        { long_name: '123', short_name: '123', types: ['street_number'] },
        { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
        { long_name: 'New York', short_name: 'New York', types: ['locality'] },
        { long_name: 'New York', short_name: 'NY', types: ['administrative_area_level_1'] },
        { long_name: '10001', short_name: '10001', types: ['postal_code'] },
        { long_name: 'United States', short_name: 'US', types: ['country'] },
      ])
    ).toEqual({
      address_line1: '123 Main Street',
      address_line2: '',
      city: 'New York',
      state: 'NY',
      postal_code: '10001',
      country: 'United States',
    })
  })

  it('maps Places (New) address components into Ramply columns', () => {
    expect(
      parseAddressComponentsFromGoogle([
        { longText: '123', shortText: '123', types: ['street_number'] },
        { longText: 'Main Street', shortText: 'Main St', types: ['route'] },
        { longText: 'Austin', shortText: 'Austin', types: ['locality'] },
        { longText: 'Texas', shortText: 'TX', types: ['administrative_area_level_1'] },
        { longText: '78705', shortText: '78705', types: ['postal_code'] },
        { longText: 'United States', shortText: 'US', types: ['country'] },
      ])
    ).toMatchObject({
      address_line1: '123 Main Street',
      city: 'Austin',
      state: 'TX',
      postal_code: '78705',
    })
  })
})
