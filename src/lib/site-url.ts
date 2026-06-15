import type { Metadata } from 'next'

/** Canonical production origin when NEXT_PUBLIC_APP_URL is unset. */
export const DEFAULT_SITE_ORIGIN = 'https://www.ramply.org'

/** Public marketing routes included in sitemap.xml. */
export const MARKETING_PATHS = ['/', '/pricing', '/contact', '/privacy', '/terms'] as const

/** Canonical site origin without a trailing slash. */
export function getSiteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  if (configured) {
    return configured
  }

  return DEFAULT_SITE_ORIGIN
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
