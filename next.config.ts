import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
