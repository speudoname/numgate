import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Page Builder app - proxy everything under /page-builder
      {
        source: '/page-builder',
        destination: 'https://pagenumgate.vercel.app/page-builder',
      },
      {
        source: '/page-builder/:path*',
        destination: 'https://pagenumgate.vercel.app/page-builder/:path*',
      },
    ]
  },
};

export default nextConfig;
