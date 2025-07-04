import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable WebAssembly support for Cardano WASM libraries
  webpack: (config, { isServer }) => {
    // Enable WebAssembly experiments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };

    // Handle .wasm files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Fallback for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },

  // Additional optimizations for WASM
  transpilePackages: ['@emurgo/cardano-serialization-lib-browser'],

  // Skip ESLint during build for now
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
