import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TypeScript and ESLint during build for now
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Add proxy for Blockfrost API to handle CORS
  async rewrites() {
    return [
      {
        source: '/api/blockfrost/:path*',
        destination: 'https://cardano-mainnet.blockfrost.io/api/v0/:path*',
      },
      {
        source: '/api/blockfrost-testnet/:path*',
        destination: 'https://cardano-testnet.blockfrost.io/api/v0/:path*',
      },
      {
        source: '/api/blockfrost-preview/:path*',
        destination: 'https://cardano-preview.blockfrost.io/api/v0/:path*',
      },
    ];
  },

  // Configuration for Cardano CSL and Agent Vault functionality
  webpack: (config, { isServer }) => {
    // Handle CSL WebAssembly files in all environments
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
      syncWebAssembly: true,
    };

    // Add WebAssembly support
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });

    // Handle dynamic requires in WASM modules
    config.module.rules.push({
      test: /whisky_js_bg\.js$/,
      loader: 'string-replace-loader',
      options: {
        search: 'require\\(getStringFromWasm0\\(.*?\\)\\)',
        replace: 'null',
      },
    });

    // Configure for lucid-evolution and MeshJS WASM files
    if (isServer) {
      // Exclude WASM-using packages from server-side bundling
      config.externals = config.externals || [];
      config.externals.push({
        '@emurgo/cardano-serialization-lib-nodejs': 'commonjs @emurgo/cardano-serialization-lib-nodejs',
        '@emurgo/cardano-serialization-lib-browser': 'commonjs @emurgo/cardano-serialization-lib-browser',
        '@anastasia-labs/cardano-multiplatform-lib-nodejs': 'commonjs @anastasia-labs/cardano-multiplatform-lib-nodejs',
        '@anastasia-labs/cardano-multiplatform-lib-browser': 'commonjs @anastasia-labs/cardano-multiplatform-lib-browser',
        '@meshsdk/core': 'commonjs @meshsdk/core',
        '@meshsdk/core-csl': 'commonjs @meshsdk/core-csl',
        '@sidan-lab/whisky-js-browser': 'commonjs @sidan-lab/whisky-js-browser',
      });
      
      // Alias to browser version for Next.js SSR
      config.resolve.alias = {
        ...config.resolve.alias,
        '@anastasia-labs/cardano-multiplatform-lib-nodejs': '@anastasia-labs/cardano-multiplatform-lib-browser',
        '@sidan-lab/whisky-js-nodejs': '@sidan-lab/whisky-js-browser',
      };
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
        process: require.resolve('process/browser'),
      };
    }

    // Ignore dynamic require warnings
    config.ignoreWarnings = [
      { module: /whisky_js_bg\.js/ },
    ];

    return config;
  },
};

export default nextConfig;
