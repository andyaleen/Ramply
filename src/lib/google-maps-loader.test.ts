import { describe, expect, it, vi, afterEach } from 'vitest'
import { isGooglePlacesConfigured } from '@/lib/google-maps-loader'

describe('google-maps-loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('detects a configured public Google Places API key', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY', 'test-key')
    expect(isGooglePlacesConfigured()).toBe(true)
  })

  it('returns false when the public key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY', '')
    expect(isGooglePlacesConfigured()).toBe(false)
  })
})
