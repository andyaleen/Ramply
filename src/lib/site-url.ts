import type { Metadata } from 'next'

/** Canonical production origin when NEXT_PUBLIC_APP_URL is unset. */
export const DEFAULT_SITE_ORIGIN = 'https://www.ramply.org'

/** Public marketing routes included in sitemap.xml. */
export const MARKETING_PATHS = ['/', '/about', '/pricing', '/contact', '/privacy', '/terms'] as const

/**
 * Normalize Ramply production origins to the canonical www host for SEO output.
 * NEXT_PUBLIC_APP_URL may still be apex for legacy config; sitemap/metadata must use www.
 */
export function normalizeCanonicalOrigin(origin: string): string {
  try {
    const url = new URL(origin)
    if (url.hostname === 'ramply.org') {
      url.hostname = 'www.ramply.org'
      url.protocol = 'https:'
    }
    return url.origin
  } catch {
    return DEFAULT_SITE_ORIGIN
  }
}

/** Canonical site origin without a trailing slash. */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const origin = configured ?? DEFAULT_SITE_ORIGIN
  return normalizeCanonicalOrigin(origin)
}

/** Base URL for Next.js metadata (metadataBase). */
export function getMetadataBase(): URL {
  return new URL(`${getSiteOrigin()}/`)
}

/** Relative canonical path metadata for a public page. Requires metadataBase on a parent layout. */
export function canonicalMetadata(path: string): Pick<Metadata, 'alternates'> {
  const normalized = path.startsWith('/') ? path : `/${path}`

  return {
    alternates: {
      canonical: normalized,
    },
  }
}
