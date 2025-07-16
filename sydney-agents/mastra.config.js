import { createMastraConfig } from '@mastra/core';
import { CloudflareDeployer } from '@mastra/deployer-cloudflare';

export default createMastraConfig({
  name: 'sydney-agents',
  deployer: new CloudflareDeployer({
    // Cloudflare deployment configuration
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    projectName: 'sydney-agents-mastra',
    // Deploy to the existing Mastra Cloud URL
    customDomain: 'substantial-scarce-magazin.mastra.cloud'
  }),
  // Environment variables for production
  env: {
    LLM_PROVIDER: 'GOOGLE',
    LLM_MODEL: 'google/gemini-2.5-flash',
    LLM_MAX_TOKENS: '10000',
    KRAKEN_API_URL: 'https://api.kraken.com',
    STRIKE_FINANCE_API_URL: 'https://api.strike.finance',
    // Add other necessary environment variables
    NODE_ENV: 'production'
  }
});
