import { afterEach, describe, expect, it, vi } from 'vitest'
import { getPlacesServerReferer } from '@/lib/places-api-server'

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
})
