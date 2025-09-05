import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Page Builder app - proxy through internal API route
      {
        source: '/page-builder',
        destination: '/api/proxy/page-builder',
      },
      {
        source: '/page-builder/:path*',
        destination: '/api/proxy/page-builder/:path*',
      },
    ]
  },
};

export default nextConfig;
