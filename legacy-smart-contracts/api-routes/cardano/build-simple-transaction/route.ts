import { NextRequest, NextResponse } from 'next/server';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  vaultDatum?: any;
  network?: 'mainnet' | 'testnet';
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, vaultDatum, network = 'testnet' } = body;

    console.log(`🔨 Building SIMPLE transaction via Blockfrost (${network.toUpperCase()})...`);
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

    // Get protocol parameters
    const protocolResponse = await fetch(`${blockfrostConfig.baseUrl}/epochs/latest/parameters`, {
      headers: {
        'project_id': blockfrostConfig.projectId
      }
    });

    if (!protocolResponse.ok) {
      throw new Error(`Failed to fetch protocol parameters: ${protocolResponse.statusText}`);
    }

    const protocolParams = await protocolResponse.json();

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

    // BUILD SIMPLE CBOR without CSL - just return transaction structure
    console.log('🔨 Building simple transaction structure...');
    
    const inputAmount = parseInt(selectedUtxo.amount[0].quantity);
    const changeAmount = inputAmount - amountLovelace - estimatedFee;

    // Create a simple transaction structure that can be converted to CBOR on the client side
    const transactionStructure = {
      inputs: [{
        txHash: selectedUtxo.tx_hash,
        outputIndex: selectedUtxo.output_index,
        address: fromAddress,
        amount: selectedUtxo.amount[0].quantity
      }],
      outputs: [
        {
          address: toAddress,
          amount: amountLovelace.toString(),
          datum: vaultDatum ? JSON.stringify(vaultDatum) : null
        }
      ],
      fee: estimatedFee.toString(),
      ttl: ttlSlot,
      protocolParameters: protocolParams
    };

    // Add change output if needed
    if (changeAmount > 1000000) { // Only add change if > 1 ADA
      transactionStructure.outputs.push({
        address: fromAddress,
        amount: changeAmount.toString(),
        datum: null
      });
    }

    console.log('✅ Simple transaction structure built successfully!');
    console.log('📋 Structure ready for client-side CBOR conversion');

    return NextResponse.json({
      success: true,
      transactionStructure: transactionStructure,
      message: 'Transaction structure ready - convert to CBOR on client side'
    });

  } catch (error) {
    console.error('❌ Transaction building failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}