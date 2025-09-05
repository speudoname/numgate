import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // In production, use Vercel URLs. In development, use localhost
    const isProduction = process.env.NODE_ENV === 'production'
    
    const pageBuilderUrl = isProduction 
      ? 'https://pagenumgate.vercel.app/page-builder'
      : 'http://localhost:3002'
    
    return [
      // Page Builder - handle root path specially  
      {
        source: '/page-builder',
        destination: isProduction 
          ? 'https://pagenumgate.vercel.app/page-builder'
          : 'http://localhost:3002/',
      },
      // All other Page Builder routes
      {
        source: '/page-builder/:path+',
        destination: isProduction
          ? 'https://pagenumgate.vercel.app/page-builder/:path+'
          : 'http://localhost:3002/:path+',
      },
      // Email app (placeholder for future)
      {
        source: '/email',
        destination: 'http://localhost:3003/',
      },
      {
        source: '/email/:path+',
        destination: 'http://localhost:3003/:path+',
      },
      // Webinar app (placeholder for future)
      {
        source: '/webinar',
        destination: 'http://localhost:3004/',
      },
      {
        source: '/webinar/:path+',
        destination: 'http://localhost:3004/:path+',
      },
      // LMS app (placeholder for future)
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
