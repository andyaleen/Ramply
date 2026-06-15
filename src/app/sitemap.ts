import type { MetadataRoute } from 'next'

import { getSiteOrigin, MARKETING_PATHS } from '@/lib/site-url'

/** Sitemap for indexable marketing pages. */
export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getSiteOrigin()

  return MARKETING_PATHS.map((path) => ({
    url: path === '/' ? `${origin}/` : `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.8,
  }))
}
