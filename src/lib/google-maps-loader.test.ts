import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  isGooglePlacesConfigured,
  resetGooglePlacesLibraryCache,
  resolveGooglePlacesApiKey,
} from '@/lib/google-maps-loader'

describe('google-maps-loader', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    resetGooglePlacesLibraryCache()
    vi.unstubAllGlobals()
  })

  it('detects a configured public Google Places API key', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY', 'test-key')
    expect(isGooglePlacesConfigured()).toBe(true)
  })

  it('returns false when the public key is missing', () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY', '')
    expect(isGooglePlacesConfigured()).toBe(false)
  })

  it('loads the key from the public config route when it is not inlined', async () => {
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_PLACES_API_KEY', '')

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ googlePlacesApiKey: 'runtime-key' }),
    }))

    await expect(resolveGooglePlacesApiKey()).resolves.toBe('runtime-key')
  })
})
