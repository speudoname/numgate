import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed rewrites - letting route handlers handle directly
  // The /page-builder/[...path]/route.ts will handle all /page-builder/* requests
};

export default nextConfig;
