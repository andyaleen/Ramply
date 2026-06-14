import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getPlacesServerReferer,
  isValidPlaceResourceName,
  PLACE_RESOURCE_NAME_PATTERN,
} from '@/lib/places-api-server'

describe('places-api-server', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('prefers apex origin from NEXT_PUBLIC_APP_URL for server referer', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.ramply.org')
    expect(getPlacesServerReferer()).toBe('https://ramply.org/')
  })

  it('uses explicit GOOGLE_PLACES_SERVER_REFERER when set', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.ramply.org')
    vi.stubEnv('GOOGLE_PLACES_SERVER_REFERER', 'https://example.com')
    expect(getPlacesServerReferer()).toBe('https://example.com/')
  })

  it('accepts valid Places resource names', () => {
    expect(isValidPlaceResourceName('places/ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true)
    expect(PLACE_RESOURCE_NAME_PATTERN.test('places/ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true)
  })

  it('rejects path traversal and unexpected resource names', () => {
    expect(isValidPlaceResourceName('places/../secrets')).toBe(false)
    expect(isValidPlaceResourceName('other/ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(false)
    expect(isValidPlaceResourceName('places/')).toBe(false)
  })
})
