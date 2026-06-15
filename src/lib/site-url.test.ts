import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  canonicalMetadata,
  DEFAULT_SITE_ORIGIN,
  getMetadataBase,
  getSiteOrigin,
} from '@/lib/site-url'

describe('site-url', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('defaults to the canonical www production origin', () => {
    expect(getSiteOrigin()).toBe(DEFAULT_SITE_ORIGIN)
    expect(getMetadataBase().toString()).toBe('https://www.ramply.org/')
  })

  it('prefers NEXT_PUBLIC_APP_URL when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://www.ramply.org/')
    expect(getSiteOrigin()).toBe('https://www.ramply.org')
  })

  it('returns relative canonical paths for metadata', () => {
    expect(canonicalMetadata('/pricing')).toEqual({
      alternates: { canonical: '/pricing' },
    })
  })
})
