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

  it('normalizes apex ramply.org to www for SEO output', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://ramply.org')
    expect(getSiteOrigin()).toBe('https://www.ramply.org')
    expect(getMetadataBase().toString()).toBe('https://www.ramply.org/')
  })

  it('leaves localhost origins unchanged', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
    expect(getSiteOrigin()).toBe('http://localhost:3000')
  })

  it('returns relative canonical paths for metadata', () => {
    expect(canonicalMetadata('/pricing')).toEqual({
      alternates: { canonical: '/pricing' },
    })
  })
})
