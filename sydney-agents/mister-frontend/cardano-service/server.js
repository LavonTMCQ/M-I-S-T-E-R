/**
 * Standalone Cardano Service - Express server
 * Runs completely separate from Next.js to avoid WASM issues
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { 
  generateCredentials, 
  getProvider, 
  getScriptAddress, 
  lockFunds, 
  unlockFunds,
  NETWORK,
  NETWORK_ID,
  MAINNET_MAX_ADA
} from './vault-operations.js';
import { MeshWallet, MeshTxBuilder } from '@meshsdk/core';

dotenv.config();

const app = express();
const PORT = process.env.PORT || process.env.CARDANO_SERVICE_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Blockfrost API key from environment (network-specific)
const API_KEY = NETWORK === 'mainnet' 
  ? process.env.BLOCKFROST_MAINNET_PROJECT_ID 
  : process.env.BLOCKFROST_TESTNET_PROJECT_ID || process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_PROJECT_ID;

const expectedKeyName = NETWORK === 'mainnet' 
  ? 'BLOCKFROST_MAINNET_PROJECT_ID'
  : 'BLOCKFROST_TESTNET_PROJECT_ID';

if (!API_KEY) {
  console.error(`⚠️  Blockfrost API key not found for ${NETWORK.toUpperCase()}`);
  console.log(`Set ${expectedKeyName} in your .env file`);
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'Cardano Vault Service',
    version: '1.0.0',
    network: NETWORK,
    networkId: NETWORK_ID,
    aiken_pattern: true,
    mainnet_safety_limit: NETWORK === 'mainnet' ? `${MAINNET_MAX_ADA / 1000000} ADA` : 'N/A'
  });
});

// Get script address
app.get('/script-address', (req, res) => {
  try {
    const { scriptAddr } = getScriptAddress();
    res.json({
      success: true,
      scriptAddress: scriptAddr
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate new wallet credentials
app.post('/generate-credentials', async (req, res) => {
  try {
    const credentials = await generateCredentials();
    res.json({
      success: true,
      ...credentials
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Debug endpoint to check UTXOs
app.post('/check-utxos', async (req, res) => {
  try {
    const { seed } = req.body;
    if (!seed) {
      return res.status(400).json({
        success: false,
        error: 'Wallet seed required'
      });
    }

    const provider = getProvider(API_KEY);
    
    // Create wallet
    const mnemonicWords = seed.split(' ');
    const wallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    const walletAddress = (await wallet.getUsedAddresses())[0];
    console.log('Wallet address:', walletAddress);
    
    // Try direct provider fetch
    const providerUtxos = await provider.fetchAddressUTxOs(walletAddress);
    console.log('Provider UTXOs:', providerUtxos);
    
    // Try wallet fetch
    const walletUtxos = await wallet.getUtxos();
    console.log('Wallet UTXOs:', walletUtxos);
    
    res.json({
      success: true,
      network: NETWORK,
      address: walletAddress,
      providerUtxos: providerUtxos,
      walletUtxos: walletUtxos,
      providerUtxoCount: providerUtxos?.length || 0,
      walletUtxoCount: walletUtxos?.length || 0
    });
  } catch (error) {
    console.error('❌ Check UTXOs error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Lock funds to vault
app.post('/lock', async (req, res) => {
  try {
    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    const { seed, amount = '1000000' } = req.body;
    
    if (!seed) {
      return res.status(400).json({
        success: false,
        error: 'Wallet seed required'
      });
    }

    const amountADA = parseInt(amount) / 1000000;
    console.log(`🔒 Locking ${amountADA} ADA to vault on ${NETWORK.toUpperCase()}...`);
    
    if (NETWORK === 'mainnet') {
      console.log(`⚠️  MAINNET TRANSACTION - Using real ADA!`);
    }
    
    const provider = getProvider(API_KEY);
    const result = await lockFunds(provider, seed, amount);
    
    console.log('✅ Funds locked successfully:', result.txHash);
    res.json({
      success: true,
      network: NETWORK,
      message: `${amountADA} ADA locked to vault on ${NETWORK}`,
      ...result
    });
  } catch (error) {
    console.error('❌ Lock error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Unlock funds from vault
app.post('/unlock', async (req, res) => {
  try {
    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    const { seed, txHash } = req.body;
    
    if (!seed || !txHash) {
      return res.status(400).json({
        success: false,
        error: 'Wallet seed and transaction hash required'
      });
    }

    console.log(`🔓 Unlocking funds from vault on ${NETWORK.toUpperCase()}...`);
    
    if (NETWORK === 'mainnet') {
      console.log(`⚠️  MAINNET TRANSACTION - Using real ADA!`);
    }
    
    const provider = getProvider(API_KEY);
    const result = await unlockFunds(provider, seed, txHash);
    
    console.log('✅ Funds unlocked successfully:', result.txHash);
    res.json({
      success: true,
      network: NETWORK,
      message: `Funds unlocked from vault on ${NETWORK}`,
      ...result
    });
  } catch (error) {
    console.error('❌ Unlock error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Agent wallet balance checking
app.post('/check-balance', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address required'
      });
    }

    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    console.log(`💰 Checking balance for: ${address.substring(0, 20)}...`);
    
    const provider = getProvider(API_KEY);
    
    // Fetch UTXOs for the address
    const utxos = await provider.fetchAddressUTxOs(address);
    
    // Calculate total balance
    let totalLovelace = 0;
    const processedUtxos = [];
    
    if (utxos && utxos.length > 0) {
      for (const utxo of utxos) {
        const amount = parseInt(utxo.output.amount[0].quantity) || 0;
        totalLovelace += amount;
        
        processedUtxos.push({
          txHash: utxo.input.txHash,
          outputIndex: utxo.input.outputIndex,
          amount: utxo.output.amount[0].quantity,
          assets: utxo.output.amount.slice(1) // Any native tokens
        });
      }
    }
    
    const balanceAda = totalLovelace / 1000000;
    
    console.log(`✅ Balance check complete: ${balanceAda} ADA (${processedUtxos.length} UTXOs)`);
    
    res.json({
      success: true,
      address: address,
      balanceLovelace: totalLovelace,
      balanceAda: balanceAda,
      utxoCount: processedUtxos.length,
      utxos: processedUtxos,
      network: NETWORK,
      lastChecked: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Balance check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Derive wallet from mnemonic
app.post('/derive-from-mnemonic', async (req, res) => {
  try {
    const { mnemonic, purpose = 'wallet_derivation' } = req.body;
    
    if (!mnemonic) {
      return res.status(400).json({
        success: false,
        error: 'Mnemonic phrase required'
      });
    }

    console.log(`🔧 Deriving wallet from mnemonic for: ${purpose}`);
    
    // Create wallet from mnemonic
    const mnemonicWords = mnemonic.split(' ');
    if (mnemonicWords.length < 12 || mnemonicWords.length > 24) {
      throw new Error('Invalid mnemonic length (must be 12-24 words)');
    }
    
    const provider = getProvider(API_KEY);
    const wallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    const address = (await wallet.getUsedAddresses())[0] || (await wallet.getUnusedAddresses())[0];
    
    // Get private key (note: this exposes sensitive data - use carefully)
    const accounts = wallet.getAccounts();
    const privateKey = accounts[0]?.privateKey || 'unavailable';
    const publicKey = accounts[0]?.publicKey || 'unavailable';
    
    console.log(`✅ Wallet derived successfully: ${address.substring(0, 20)}...`);
    
    res.json({
      success: true,
      address: address,
      privateKey: privateKey,
      mnemonic: mnemonic,
      publicKey: publicKey,
      network: NETWORK,
      purpose: purpose
    });
    
  } catch (error) {
    console.error('❌ Wallet derivation error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Network info endpoint
app.get('/network-info', (req, res) => {
  res.json({
    success: true,
    network: NETWORK,
    networkId: NETWORK_ID,
    isMainnet: NETWORK === 'mainnet',
    isTestnet: NETWORK !== 'mainnet',
    apiKeyConfigured: !!API_KEY,
    serviceVersion: '1.0.0',
    capabilities: [
      'wallet_generation',
      'balance_checking',
      'vault_operations',
      'mnemonic_derivation',
      'vault_agent_transfers'
    ]
  });
});

// Vault to Agent Transfer - Allocate capital to agent wallet
app.post('/vault-to-agent-transfer', async (req, res) => {
  try {
    const { vaultAddress, agentAddress, amountLovelace, userSeed } = req.body;
    
    if (!vaultAddress || !agentAddress || !amountLovelace) {
      return res.status(400).json({
        success: false,
        error: 'Vault address, agent address, and amount are required'
      });
    }

    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    const amountADA = amountLovelace / 1_000_000;
    console.log(`🏦 Vault → Agent Transfer: ${amountADA} ADA`);
    console.log(`   From Vault: ${vaultAddress.substring(0, 20)}...`);
    console.log(`   To Agent: ${agentAddress.substring(0, 20)}...`);
    
    if (NETWORK === 'mainnet') {
      console.log(`⚠️  MAINNET TRANSACTION - Using real ADA!`);
    }

    // For now, we'll use a simple wallet-to-wallet transfer
    // TODO: Integrate with actual vault unlocking mechanism
    if (!userSeed) {
      return res.status(400).json({
        success: false,
        error: 'User seed required for vault operations (temporary implementation)'
      });
    }
    
    const provider = getProvider(API_KEY);
    
    // Create sender wallet from seed
    const mnemonicWords = userSeed.split(' ');
    const senderWallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    // Get sender wallet UTXOs
    const senderAddress = (await senderWallet.getUsedAddresses())[0] || (await senderWallet.getUnusedAddresses())[0];
    console.log('Sender address:', senderAddress);
    
    let utxos = await senderWallet.getUtxos();
    if (!utxos || utxos.length === 0) {
      console.log('Wallet.getUtxos() returned empty, trying provider.fetchAddressUTxOs()');
      utxos = await provider.fetchAddressUTxOs(senderAddress);
    }
    
    if (!utxos || utxos.length === 0) {
      throw new Error(`Sender wallet has no UTXOs: ${senderAddress}`);
    }
    
    // Calculate total available balance
    const totalLovelace = utxos.reduce((sum, utxo) => {
      const ada = utxo.output.amount.find(asset => asset.unit === 'lovelace');
      return sum + parseInt(ada?.quantity || '0');
    }, 0);
    
    const availableADA = totalLovelace / 1_000_000;
    const requestedADA = amountLovelace / 1_000_000;
    const estimatedFee = 0.2; // Conservative estimate
    const requiredTotal = requestedADA + estimatedFee;
    
    console.log(`💰 Balance Check:`);
    console.log(`   Available: ${availableADA} ADA`);
    console.log(`   Requested: ${requestedADA} ADA`);
    console.log(`   Est. Fee: ${estimatedFee} ADA`);
    console.log(`   Required Total: ${requiredTotal} ADA`);
    
    if (availableADA < requiredTotal) {
      const shortage = requiredTotal - availableADA;
      return res.status(400).json({
        success: false,
        error: `Insufficient funds: Need ${requiredTotal} ADA (${requestedADA} + ${estimatedFee} fee) but vault only has ${availableADA} ADA. Shortage: ${shortage.toFixed(3)} ADA`,
        details: {
          availableADA,
          requestedADA,
          estimatedFee,
          requiredTotal,
          shortageADA: shortage
        }
      });
    }
    
    console.log(`Found ${utxos.length} UTXOs for transfer`);

    // Simple transfer to agent wallet using MeshTxBuilder
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
    });

    // Add UTXOs as inputs explicitly
    for (const utxo of utxos) {
      txBuilder.txIn(
        utxo.input.txHash,
        utxo.input.outputIndex,
        utxo.output.amount,
        utxo.output.address
      );
    }

    // Build transaction
    await txBuilder
      .txOut(agentAddress, [{ unit: 'lovelace', quantity: amountLovelace.toString() }])
      .changeAddress(senderAddress)
      .setNetwork(NETWORK)
      .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await senderWallet.signTx(unsignedTx);
    const txHash = await senderWallet.submitTx(signedTx);
    
    console.log('✅ Vault → Agent transfer successful:', txHash);
    res.json({
      success: true,
      network: NETWORK,
      message: `${amountADA} ADA transferred from vault to agent on ${NETWORK}`,
      txHash: txHash,
      amountADA: amountADA,
      fromAddress: vaultAddress,
      toAddress: agentAddress
    });
    
  } catch (error) {
    console.error('❌ Vault → Agent transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Agent to Vault Transfer - Return capital/profits to vault
app.post('/agent-to-vault-transfer', async (req, res) => {
  try {
    const { agentAddress, vaultAddress, amountLovelace, agentSeed } = req.body;
    
    if (!agentAddress || !vaultAddress || !amountLovelace) {
      return res.status(400).json({
        success: false,
        error: 'Agent address, vault address, and amount are required'
      });
    }

    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    const amountADA = amountLovelace / 1_000_000;
    console.log(`🔄 Agent → Vault Transfer: ${amountADA} ADA`);
    console.log(`   From Agent: ${agentAddress.substring(0, 20)}...`);
    console.log(`   To Vault: ${vaultAddress.substring(0, 20)}...`);
    
    if (NETWORK === 'mainnet') {
      console.log(`⚠️  MAINNET TRANSACTION - Using real ADA!`);
    }

    // For now, we'll use a simple wallet-to-wallet transfer
    // TODO: Integrate with actual vault locking mechanism
    if (!agentSeed) {
      return res.status(400).json({
        success: false,
        error: 'Agent seed required for transfer (temporary implementation)'
      });
    }
    
    const provider = getProvider(API_KEY);
    
    // Create agent wallet from seed
    const mnemonicWords = agentSeed.split(' ');
    const agentWallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    // Simple transfer back to vault using MeshTxBuilder
    const txBuilder = new MeshTxBuilder({
      fetcher: provider,
      submitter: provider,
    });

    // Build transaction
    await txBuilder
      .txOut(vaultAddress, [{ unit: 'lovelace', quantity: amountLovelace.toString() }])
      .changeAddress(agentAddress)
      .setNetwork(NETWORK)
      .complete();

    const unsignedTx = txBuilder.txHex;
    const signedTx = await agentWallet.signTx(unsignedTx);
    const txHash = await agentWallet.submitTx(signedTx);
    
    console.log('✅ Agent → Vault transfer successful:', txHash);
    res.json({
      success: true,
      network: NETWORK,
      message: `${amountADA} ADA transferred from agent to vault on ${NETWORK}`,
      txHash: txHash,
      amountADA: amountADA,
      fromAddress: agentAddress,
      toAddress: vaultAddress
    });
    
  } catch (error) {
    console.error('❌ Agent → Vault transfer error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Get vault balance (for allocation validation)
app.post('/get-vault-balance', async (req, res) => {
  try {
    const { vaultAddress } = req.body;
    
    if (!vaultAddress) {
      return res.status(400).json({
        success: false,
        error: 'Vault address required'
      });
    }

    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    console.log(`💰 Checking vault balance: ${vaultAddress.substring(0, 20)}...`);
    
    const provider = getProvider(API_KEY);
    
    // Check both regular balance and locked balance in vault
    const utxos = await provider.fetchAddressUTxOs(vaultAddress);
    
    let totalLovelace = 0;
    let vaultLockedLovelace = 0;
    const { scriptAddr } = getScriptAddress();
    
    if (utxos && utxos.length > 0) {
      for (const utxo of utxos) {
        const amount = parseInt(utxo.output.amount[0].quantity) || 0;
        totalLovelace += amount;
        
        // Check if this UTXO is locked in vault script
        if (utxo.output.address === scriptAddr) {
          vaultLockedLovelace += amount;
        }
      }
    }
    
    const totalADA = totalLovelace / 1_000_000;
    const vaultLockedADA = vaultLockedLovelace / 1_000_000;
    const availableADA = totalADA - vaultLockedADA;
    
    console.log(`✅ Vault balance checked: ${totalADA} ADA total, ${vaultLockedADA} ADA locked, ${availableADA} ADA available`);
    
    res.json({
      success: true,
      vaultAddress: vaultAddress,
      totalBalanceLovelace: totalLovelace,
      totalBalanceADA: totalADA,
      vaultLockedLovelace: vaultLockedLovelace,
      vaultLockedADA: vaultLockedADA,
      availableLovelace: totalLovelace - vaultLockedLovelace,
      availableADA: availableADA,
      network: NETWORK,
      lastChecked: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Vault balance check error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Sign and submit CBOR transaction (for Strike Finance integration)
app.post('/sign-submit-tx', async (req, res) => {
  try {
    const { address, cbor, agentSeed } = req.body;
    
    if (!address || !cbor) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address and CBOR transaction required'
      });
    }

    console.log(`📝 Signing CBOR transaction for address: ${address.slice(0, 20)}...`);
    
    if (!API_KEY) {
      throw new Error('Blockfrost API key not configured');
    }

    // In production, retrieve agent mnemonic from secure database storage
    // For now, require it to be passed (this will be secured later)
    if (!agentSeed) {
      console.log('⚠️  Agent seed not provided, using mock signing for development...');
      
      // Simulate a successful transaction for development
      const mockTxHash = 'tx_' + Date.now().toString(16) + '_' + Math.random().toString(36).substring(2, 10);
      console.log(`✅ Mock transaction signed: ${mockTxHash}`);
      
      return res.json({
        success: true,
        txHash: mockTxHash,
        network: NETWORK,
        message: `CBOR transaction mock-signed on ${NETWORK} (development mode)`,
        isMock: true
      });
    }

    // Real signing with agent wallet
    console.log('🔐 Performing real transaction signing with agent wallet...');
    
    const provider = getProvider(API_KEY);
    
    // Create agent wallet from seed
    const mnemonicWords = agentSeed.split(' ');
    const agentWallet = new MeshWallet({
      networkId: NETWORK_ID,
      fetcher: provider,
      submitter: provider,
      key: {
        type: 'mnemonic',
        words: mnemonicWords,
      },
    });

    // Verify the wallet address matches
    const walletAddress = (await agentWallet.getUsedAddresses())[0] || (await agentWallet.getUnusedAddresses())[0];
    if (walletAddress !== address) {
      throw new Error(`Agent wallet address mismatch: expected ${address}, got ${walletAddress}`);
    }

    // Sign the CBOR transaction
    console.log('🖋️  Signing CBOR with agent private key...');
    const signedTx = await agentWallet.signTx(cbor);
    
    // Submit the signed transaction
    console.log('📤 Submitting signed transaction to blockchain...');
    const txHash = await agentWallet.submitTx(signedTx);
    
    console.log(`✅ Real transaction signed and submitted: ${txHash}`);
    
    res.json({
      success: true,
      txHash: txHash,
      network: NETWORK,
      message: `CBOR transaction signed and submitted on ${NETWORK}`,
      isMock: false
    });

  } catch (error) {
    console.error('❌ Transaction signing error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      network: NETWORK
    });
  }
});

// Strike Finance Proxy Endpoints - Bypass CORS restrictions
app.get('/api/strike/perpetuals/getOverallInfo', async (req, res) => {
  try {
    console.log('📡 [PROXY] Forwarding getOverallInfo to Strike Finance...');
    const response = await fetch('https://app.strikefinance.org/api/perpetuals/getOverallInfo');
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] getOverallInfo successful');
    } else {
      console.warn('⚠️ [PROXY] getOverallInfo failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] getOverallInfo error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.get('/api/strike/perpetuals/getPoolInfo', async (req, res) => {
  try {
    console.log('📡 [PROXY] Forwarding getPoolInfo to Strike Finance...');
    const response = await fetch('https://app.strikefinance.org/api/perpetuals/getPoolInfo');
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] getPoolInfo successful');
    } else {
      console.warn('⚠️ [PROXY] getPoolInfo failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] getPoolInfo error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.get('/api/strike/perpetuals/getPoolInfoV2', async (req, res) => {
  try {
    console.log('📡 [PROXY] Forwarding getPoolInfoV2 to Strike Finance...');
    const response = await fetch('https://app.strikefinance.org/api/perpetuals/getPoolInfoV2');
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] getPoolInfoV2 successful');
    } else {
      console.warn('⚠️ [PROXY] getPoolInfoV2 failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] getPoolInfoV2 error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.get('/api/strike/perpetuals/getPositions', async (req, res) => {
  try {
    const { address } = req.query;
    console.log(`📡 [PROXY] Forwarding getPositions for address: ${address}...`);
    
    const response = await fetch(`https://app.strikefinance.org/api/perpetuals/getPositions?address=${address}`);
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] getPositions successful');
    } else {
      console.warn('⚠️ [PROXY] getPositions failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] getPositions error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.post('/api/strike/perpetuals/openPosition', async (req, res) => {
  try {
    console.log('📡 [PROXY] Forwarding openPosition to Strike Finance...');
    const response = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] openPosition successful');
    } else {
      console.warn('⚠️ [PROXY] openPosition failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] openPosition error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

app.post('/api/strike/perpetuals/closePosition', async (req, res) => {
  try {
    console.log('📡 [PROXY] Forwarding closePosition to Strike Finance...');
    const response = await fetch('https://app.strikefinance.org/api/perpetuals/closePosition', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(req.body)
    });
    
    const data = await response.text();
    
    if (response.ok) {
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(data);
      console.log('✅ [PROXY] closePosition successful');
    } else {
      console.warn('⚠️ [PROXY] closePosition failed:', response.status);
      res.status(response.status).send(data);
    }
  } catch (error) {
    console.error('❌ [PROXY] closePosition error:', error);
    res.status(500).json({ error: 'Proxy server error', details: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n🚀 Cardano Vault Service Started!');
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🌐 Network: ${NETWORK.toUpperCase()} (ID: ${NETWORK_ID})`);
  console.log(`🔑 API Key configured: ${API_KEY ? 'YES' : 'NO'}`);
  
  if (NETWORK === 'mainnet') {
    console.log(`🚨 MAINNET MODE - Using REAL ADA!`);
    console.log(`💡 Safety Limit: Maximum ${MAINNET_MAX_ADA / 1000000} ADA per transaction`);
  } else {
    console.log(`🧪 Testnet mode - Using test ADA`);
  }
  
  console.log(`🔗 CORS enabled for Next.js frontend`);
  console.log('\n📋 Available endpoints:');
  console.log(`  GET  /health - Service health check`);
  console.log(`  GET  /network-info - Network and service information`);
  console.log(`  GET  /script-address - Get vault script address`);
  console.log(`  POST /generate-credentials - Generate ${NETWORK} wallet`);
  console.log(`  POST /derive-from-mnemonic - Derive wallet from mnemonic`);
  console.log(`  POST /check-balance - Check wallet balance`);
  console.log(`  POST /lock - Lock funds to vault`);
  console.log(`  POST /unlock - Unlock funds from vault`);
  console.log('\n🔗 Strike Finance Proxy endpoints:');
  console.log(`  GET  /api/strike/perpetuals/getOverallInfo - Strike market info`);
  console.log(`  GET  /api/strike/perpetuals/getPoolInfo - Strike pool data`);
  console.log(`  GET  /api/strike/perpetuals/getPoolInfoV2 - Strike pool V2`);
  console.log(`  GET  /api/strike/perpetuals/getPositions?address=... - User positions`);
  console.log(`  POST /api/strike/perpetuals/openPosition - Open position`);
  console.log(`  POST /api/strike/perpetuals/closePosition - Close position`);
  console.log('\n✨ This uses the EXACT Aiken hello_world pattern!');
  
  if (!API_KEY) {
    console.log(`\n⚠️  Set ${expectedKeyName} in .env for full functionality`);
  }
});