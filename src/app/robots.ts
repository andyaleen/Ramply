import type { MetadataRoute } from 'next'

import { getSiteOrigin } from '@/lib/site-url'

/** Crawler rules for public marketing pages; app routes stay out of the index. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard/',
        '/admin/',
        '/api/',
        '/auth/',
        '/login',
        '/signup',
        '/onboard/',
        '/complete-profile',
        '/post-login',
        '/signout',
      ],
    },
    sitemap: `${getSiteOrigin()}/sitemap.xml`,
  }
}
