import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  vaultDatum?: any;
  network?: 'mainnet' | 'testnet';
}

// Raw CBOR transaction builder without CSL dependencies
function buildRawCBOR(
  inputs: any[],
  outputs: any[],
  fee: number,
  ttl: number,
  datum?: any
): string {
  console.log('🔧 Building raw CBOR transaction manually...');
  
  // This is a simplified CBOR builder for basic transactions
  // In production, you'd want a more robust implementation
  
  // For now, return a basic transaction structure that Vespr can handle
  // This is a minimal working transaction format
  const rawTransaction = {
    type: 'Witnessed Tx ShelleyEra',
    description: '',
    cborHex: '', // Will be filled by a working transaction builder
  };

  // Create a basic transaction in CBOR format
  // This is a placeholder - in practice you'd need proper CBOR encoding
  const basicCBOR = createBasicTransactionCBOR(inputs, outputs, fee, ttl, datum);
  
  return basicCBOR;
}

function createBasicTransactionCBOR(
  inputs: any[],
  outputs: any[],
  fee: number,
  ttl: number,
  datum?: any
): string {
  // This creates a basic Cardano transaction in CBOR format
  // For a real implementation, you'd need proper CBOR library
  
  console.log('📦 Creating basic CBOR structure...');
  
  // Return a minimal valid CBOR transaction
  // This is simplified but should work for basic transactions
  const cborParts = [];
  
  // Transaction body (map with inputs, outputs, fee, ttl)
  const txBody = {
    inputs: inputs,
    outputs: outputs,
    fee: fee,
    ttl: ttl
  };
  
  // For now, return a hex string that represents the transaction
  // In practice, this would be proper CBOR encoding
  const mockCBOR = Buffer.from(JSON.stringify(txBody)).toString('hex');
  
  return mockCBOR;
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, vaultDatum, network = 'testnet' } = body;

    console.log(`🔨 Building RAW CBOR transaction (${network.toUpperCase()})...`);
    console.log(`💰 From: ${fromAddress.substring(0, 20)}...`);
    console.log(`💰 To: ${toAddress.substring(0, 20)}...`);
    console.log(`💰 Amount: ${amount} ${network === 'testnet' ? 'tADA' : 'ADA'}`);

    // Convert amount from ADA to lovelace
    const amountLovelace = Math.round(amount * 1000000);

    // Configure Blockfrost for network
    const blockfrostConfig = network === 'testnet'
      ? {
          projectId: process.env.BLOCKFROST_TESTNET_PROJECT_ID || 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f',
          baseUrl: 'https://cardano-preprod.blockfrost.io/api/v0'
        }
      : {
          projectId: process.env.BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu',
          baseUrl: 'https://cardano-mainnet.blockfrost.io/api/v0'
        };

    console.log(`🔗 Using Blockfrost: ${blockfrostConfig.baseUrl}`);
    
    // Get UTxOs from the sender address
    const utxosResponse = await fetch(`${blockfrostConfig.baseUrl}/addresses/${fromAddress}/utxos`, {
      headers: {
        'project_id': blockfrostConfig.projectId
      }
    });

    if (!utxosResponse.ok) {
      const errorText = await utxosResponse.text();
      throw new Error(`Failed to fetch UTxOs: ${utxosResponse.statusText} - ${errorText}`);
    }

    const utxos = await utxosResponse.json();

    if (!utxos || utxos.length === 0) {
      throw new Error('No UTxOs found at sender address');
    }

    // Get latest block for TTL
    const latestBlockResponse = await fetch(`${blockfrostConfig.baseUrl}/blocks/latest`, {
      headers: { 'project_id': blockfrostConfig.projectId }
    });

    if (!latestBlockResponse.ok) {
      throw new Error('Failed to fetch latest block for TTL calculation');
    }

    const latestBlock = await latestBlockResponse.json();
    const currentSlot = latestBlock.slot;
    const ttlSlot = currentSlot + 7200; // 2 hours from now

    // Filter UTxOs to ONLY include pure ADA (no native tokens/NFTs)
    const adaOnlyUtxos = utxos.filter((utxo: any) => {
      return utxo.amount.length === 1 && utxo.amount[0].unit === 'lovelace';
    });

    if (adaOnlyUtxos.length === 0) {
      throw new Error('No ADA-only UTxOs available for transaction');
    }

    // Calculate required amount (amount + estimated fee)
    const estimatedFee = 500000; // 0.5 ADA conservative estimate
    const requiredAmount = amountLovelace + estimatedFee;

    // Select UTxO with enough balance
    let selectedUtxo = null;
    for (const utxo of adaOnlyUtxos) {
      const utxoAmount = parseInt(utxo.amount[0].quantity);
      if (utxoAmount >= requiredAmount) {
        selectedUtxo = utxo;
        break;
      }
    }

    if (!selectedUtxo) {
      throw new Error(`Insufficient funds. Need ${requiredAmount} lovelace, but no single UTxO has enough.`);
    }

    const inputAmount = parseInt(selectedUtxo.amount[0].quantity);
    const changeAmount = inputAmount - amountLovelace - estimatedFee;

    // Create transaction inputs and outputs
    const inputs = [{
      txHash: selectedUtxo.tx_hash,
      outputIndex: selectedUtxo.output_index,
      address: fromAddress,
      amount: selectedUtxo.amount[0].quantity
    }];

    const outputs = [
      {
        address: toAddress,
        amount: amountLovelace,
        datum: vaultDatum
      }
    ];

    // Add change output if needed
    if (changeAmount > 1000000) { // Only add change if > 1 ADA
      outputs.push({
        address: fromAddress,
        amount: changeAmount,
        datum: null
      });
    }

    // Instead of using CSL, let's return a pre-built transaction
    // This is a workaround - in practice you'd want proper CBOR generation
    console.log('🚧 RETURNING MOCK TRANSACTION - CSL issues prevent real CBOR generation');
    
    // For testing, return a transaction structure that can be signed
    return NextResponse.json({
      success: false,
      error: 'CSL WebAssembly issues prevent server-side transaction building. Please use client-side approach or external transaction builder.',
      alternativeApproach: 'Consider using a pre-built transaction or external Cardano transaction builder service',
      transactionData: {
        inputs,
        outputs,
        fee: estimatedFee,
        ttl: ttlSlot,
        network
      }
    }, { status: 501 });

  } catch (error) {
    console.error('❌ Raw transaction building failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}