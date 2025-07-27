import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript and ESLint during build for now
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Configuration for Cardano CSL and Agent Vault functionality
  webpack: (config, { isServer }) => {
    // Handle CSL WebAssembly files in all environments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Add WebAssembly support
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Configure CSL for server-side
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@emurgo/cardano-serialization-lib-nodejs': 'commonjs @emurgo/cardano-serialization-lib-nodejs',
        '@emurgo/cardano-serialization-lib-browser': 'commonjs @emurgo/cardano-serialization-lib-browser',
      });
    }

    // Browser fallbacks (always needed)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer'),
      };
    }

    return config;
  },
};

export default nextConfig;
