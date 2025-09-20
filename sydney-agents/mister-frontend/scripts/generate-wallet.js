// Generate a fresh wallet for HyperEVM testnet
import { ethers } from "ethers";

function generateWallet() {
  console.log("🔑 Generating Fresh Wallet for HyperEVM Testnet...\n");
  
  // Generate a random wallet
  const wallet = ethers.Wallet.createRandom();
  
  console.log("✅ Wallet Generated Successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📍 Address:", wallet.address);
  console.log("🔐 Private Key:", wallet.privateKey);
  console.log("🌱 Mnemonic:", wallet.mnemonic.phrase);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  
  console.log("\n📋 Instructions:");
  console.log("1. Copy the ADDRESS above");
  console.log("2. Use it in faucets to claim testnet tokens");
  console.log("3. Add the PRIVATE KEY to .env.local");
  console.log("4. We'll use this wallet for deployment");
  
  console.log("\n⚠️  Security Notes:");
  console.log("- This is for TESTNET ONLY");
  console.log("- Never use for mainnet funds");
  console.log("- Keep private key secure");
  
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
    mnemonic: wallet.mnemonic.phrase
  };
}

const walletInfo = generateWallet();