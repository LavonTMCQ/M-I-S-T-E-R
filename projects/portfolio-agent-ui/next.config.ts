import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/api/mastra/:path*',
        destination: 'http://localhost:4111/:path*',
      },
    ];
  },
};

export default nextConfig;
