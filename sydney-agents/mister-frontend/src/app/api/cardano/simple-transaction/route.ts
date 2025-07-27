/**
 * MESH SDK Cardano Transaction Builder API
 * Uses Mesh SDK for PROPER CBOR generation
 * FIXED for Vespr wallet compatibility with Mesh
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  BlockfrostProvider,
  MeshTxBuilder,
  UTxO
} from '@meshsdk/core';

interface TransactionRequest {
  fromAddress: string;
  toAddress: string;
  amount: number; // in ADA
  metadata?: any;
  network?: 'mainnet' | 'testnet';
}

/**
 * Create PROPER transaction using Mesh SDK with simplified approach
 */
async function createMeshTransaction(
  fromAddress: string,
  toAddress: string,
  amountLovelace: number,
  selectedUtxos: any[],
  blockfrostProjectId: string,
  network: string
): Promise<string> {
  console.log('🔧 Creating MESH SDK transaction...');

  try {
    // Initialize Blockfrost provider
    const blockfrostProvider = new BlockfrostProvider(blockfrostProjectId);

    console.log(`🔗 Using ${selectedUtxos.length} UTxOs for transaction`);
    console.log(`💰 Sending ${amountLovelace} lovelace`);
    console.log(`📍 From: ${fromAddress.substring(0, 30)}...`);
    console.log(`📍 To: ${toAddress.substring(0, 30)}...`);

    // Validate addresses first
    if (!fromAddress.startsWith('addr1')) {
      throw new Error(`Invalid from address format: ${fromAddress}`);
    }
    if (!toAddress.startsWith('addr1')) {
      throw new Error(`Invalid to address format: ${toAddress}`);
    }

    // Get UTxOs from Blockfrost for Mesh
    console.log('🔍 Fetching UTxOs for Mesh...');
    const utxos = await blockfrostProvider.fetchAddressUTxOs(fromAddress);
    console.log(`📦 Mesh found ${utxos.length} UTxOs`);

    if (utxos.length === 0) {
      throw new Error('No UTxOs found by Mesh provider');
    }

    // Create transaction builder
    const txBuilder = new MeshTxBuilder({
      fetcher: blockfrostProvider,
      submitter: blockfrostProvider,
    });

    console.log('🏗️ Building transaction with Mesh...');

    // Build transaction with explicit UTxO selection
    const unsignedTx = await txBuilder
      .txOut(toAddress, [{
        unit: 'lovelace',
        quantity: amountLovelace.toString()
      }])
      .selectUtxosFrom(utxos)
      .changeAddress(fromAddress)
      .complete();

    console.log(`✅ Created MESH transaction: ${unsignedTx.length} characters`);
    console.log(`🔍 CBOR preview: ${unsignedTx.substring(0, 100)}...`);

    return unsignedTx;

  } catch (error) {
    console.error('❌ Mesh transaction creation failed:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔨 MESH SDK Cardano transaction building...');

    const body: TransactionRequest = await request.json();
    const { fromAddress, toAddress, amount, metadata, network = 'mainnet' } = body;

    console.log('💰 From:', fromAddress.substring(0, 20) + '...');
    console.log('💰 To:', toAddress.substring(0, 20) + '...');
    console.log('💰 Amount:', amount, 'ADA');
    console.log('🌐 Network:', network.toUpperCase());

    // Validate inputs
    if (!fromAddress || !toAddress || !amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: fromAddress, toAddress, amount'
      }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    const amountLovelace = Math.floor(amount * 1_000_000);

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
    const blockfrostProjectId = blockfrostConfig.projectId;
    const blockfrostBaseUrl = blockfrostConfig.baseUrl;

    // STEP 1: Validate address has funds (let Mesh handle UTxO selection)
    console.log('🔍 Checking address has funds...');
    const utxosResponse = await fetch(`${blockfrostBaseUrl}/addresses/${fromAddress}/utxos`, {
      headers: { 'project_id': blockfrostProjectId }
    });

    if (!utxosResponse.ok) {
      throw new Error(`Failed to fetch UTxOs: ${utxosResponse.status}`);
    }

    const utxos = await utxosResponse.json();
    console.log(`📦 Found ${utxos.length} UTxOs`);

    if (utxos.length === 0) {
      throw new Error('No UTxOs found at address');
    }

    // Calculate total available (just for validation)
    const totalAvailable = utxos.reduce((sum: number, utxo: any) => {
      const adaAmount = utxo.amount.find((asset: any) => asset.unit === 'lovelace');
      return sum + (adaAmount ? parseInt(adaAmount.quantity) : 0);
    }, 0);

    if (totalAvailable < amountLovelace + 500000) { // 0.5 ADA buffer for fees
      throw new Error(`Insufficient funds. Need ~${amountLovelace + 500000} lovelace, have ${totalAvailable}`);
    }

    console.log(`✅ Address has ${totalAvailable} lovelace available`);

    // STEP 2: Create MESH transaction (let Mesh handle UTxO selection)
    const meshCbor = await createMeshTransaction(
      fromAddress,
      toAddress,
      amountLovelace,
      [], // Empty array - let Mesh auto-select
      blockfrostProjectId,
      network
    );

    console.log('✅ MESH transaction created successfully!');
    console.log('📋 CBOR length:', meshCbor.length, 'characters');

    return NextResponse.json({
      success: true,
      cborHex: meshCbor,
      txSize: meshCbor.length / 2,
      amount: amountLovelace.toString(),
      method: 'MESH',
      utxos: utxos.length
    });

  } catch (error) {
    console.error('❌ Mesh transaction building failed:', error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
