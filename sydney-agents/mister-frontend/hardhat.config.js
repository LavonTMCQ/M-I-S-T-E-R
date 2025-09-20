import "@nomicfoundation/hardhat-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  paths: {
    sources: "./src/contracts/hyperevm",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    hardhat: {
      type: "edr-simulated",
      chainId: 31337
    },
    hyperevm_testnet: {
      type: "http",
      url: "https://rpc.hyperliquid-testnet.xyz/evm",
      chainId: 998,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    },
    hyperevm_mainnet: {
      type: "http",
      url: "https://rpc.hyperliquid.xyz/evm", 
      chainId: 999,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  },
  etherscan: {
    apiKey: {
      hyperevm_testnet: "no-api-key-needed",
      hyperevm_mainnet: "no-api-key-needed"
    },
    customChains: [
      {
        network: "hyperevm_testnet",
        chainId: 998,
        urls: {
          apiURL: "https://explorer.hyperliquid-testnet.xyz/api",
          browserURL: "https://explorer.hyperliquid-testnet.xyz"
        }
      },
      {
        network: "hyperevm_mainnet", 
        chainId: 1337,
        urls: {
          apiURL: "https://explorer.hyperliquid.xyz/api",
          browserURL: "https://explorer.hyperliquid.xyz"
        }
      }
    ]
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  }
};