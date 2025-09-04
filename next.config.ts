import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Page Builder - handle root path specially  
      {
        source: '/page-builder',
        destination: 'http://localhost:3002/',
      },
      // All other Page Builder routes
      {
        source: '/page-builder/:path+',
        destination: 'http://localhost:3002/:path+',
      },
      // Email app
      {
        source: '/email',
        destination: 'http://localhost:3003/',
      },
      {
        source: '/email/:path+',
        destination: 'http://localhost:3003/:path+',
      },
      // Webinar app
      {
        source: '/webinar',
        destination: 'http://localhost:3004/',
      },
      {
        source: '/webinar/:path+',
        destination: 'http://localhost:3004/:path+',
      },
      // LMS app
      {
        source: '/lms',
        destination: 'http://localhost:3005/',
      },
      {
        source: '/lms/:path+',
        destination: 'http://localhost:3005/:path+',
      },
    ]
  },
};

export default nextConfig;
