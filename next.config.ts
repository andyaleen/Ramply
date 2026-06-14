import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // PDFKit reads Helvetica.afm from disk; keep it out of the server bundle.
  serverExternalPackages: ['pdfkit', 'archiver'],
  experimental: {
    serverActions: {
      bodySizeLimit: '15mb',
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/array/:path*',
        destination: 'https://us-assets.i.posthog.com/array/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
    ]
  },
  // Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  async redirects() {
    return [
      // Legacy /admin/* paths have been consolidated into /dashboard/*.
      // Deprecated subpages are pointed at /dashboard; everything else maps
      // 1:1 into the unified dashboard tree.
      { source: '/admin', destination: '/dashboard', permanent: true },
      { source: '/admin/request-types', destination: '/dashboard', permanent: true },
      { source: '/admin/settings', destination: '/dashboard/settings', permanent: true },
      { source: '/admin/:path*', destination: '/dashboard/:path*', permanent: true },
    ]
  },
};

export default nextConfig;
