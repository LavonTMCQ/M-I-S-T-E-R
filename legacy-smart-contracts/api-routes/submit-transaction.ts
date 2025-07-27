import { NextApiRequest, NextApiResponse } from 'next';

const BLOCKFROST_PROJECT_ID = process.env.BLOCKFROST_PROJECT_ID || 'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu';
const BLOCKFROST_BASE_URL = 'https://cardano-mainnet.blockfrost.io/api/v0';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cborHex, unsignedTxHex, witnessSetHex } = req.body;

    if (!cborHex && !witnessSetHex) {
      return res.status(400).json({ error: 'Missing cborHex or witnessSetHex parameter' });
    }

    let finalCborHex = cborHex;

    // If we have separate unsigned tx and witness set, reconstruct the complete transaction
    if (witnessSetHex && unsignedTxHex) {
      console.log('🔄 Reconstructing complete signed transaction from witness set...');
      console.log('🔍 Unsigned tx length:', unsignedTxHex.length);
      console.log('🔍 Witness set length:', witnessSetHex.length);

      try {
        // Import Cardano Serialization Library (server-side)
        const CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');

        // Parse the original unsigned transaction
        const unsignedTxBytes = Buffer.from(unsignedTxHex, 'hex');
        const unsignedTx = CardanoWasm.Transaction.from_bytes(unsignedTxBytes);
        const originalWitnessSet = unsignedTx.witness_set();

        // Parse the witness set from Vespr (contains signatures)
        const witnessBytes = Buffer.from(witnessSetHex, 'hex');
        const signedWitnessSet = CardanoWasm.TransactionWitnessSet.from_bytes(witnessBytes);

        // CRITICAL FIX: Merge witness sets to preserve script data
        console.log('🔥 Merging witness sets to preserve script data...');
        const mergedWitnessSet = CardanoWasm.TransactionWitnessSet.new();

        // Add wallet signatures (essential for transaction validity)
        if (signedWitnessSet.vkeys()) {
          mergedWitnessSet.set_vkeys(signedWitnessSet.vkeys());
        }

        // PRESERVE ALL SCRIPT DATA (this was being lost!)
        if (originalWitnessSet.redeemers()) {
          console.log('🔥 Preserving redeemers from original transaction');
          mergedWitnessSet.set_redeemers(originalWitnessSet.redeemers());
        }
        if (originalWitnessSet.plutus_scripts()) {
          console.log('🔥 Preserving Plutus scripts from original transaction');
          mergedWitnessSet.set_plutus_scripts(originalWitnessSet.plutus_scripts());
        }
        if (originalWitnessSet.plutus_data()) {
          console.log('🔥 Preserving Plutus data from original transaction');
          mergedWitnessSet.set_plutus_data(originalWitnessSet.plutus_data());
        }

        // Create the complete signed transaction with ALL preserved data
        const signedTransaction = CardanoWasm.Transaction.new(
          unsignedTx.body(),
          mergedWitnessSet,
          unsignedTx.auxiliary_data()
        );

        // Convert to hex for submission
        finalCborHex = Buffer.from(signedTransaction.to_bytes()).toString('hex');

        console.log('✅ Successfully reconstructed complete signed transaction');
        console.log('🔍 Complete signed tx length:', finalCborHex.length);

      } catch (reconstructionError) {
        console.error('❌ Transaction reconstruction failed:', reconstructionError);
        return res.status(400).json({
          error: 'Transaction reconstruction failed',
          details: reconstructionError.message
        });
      }
    }

    console.log('🔥 Submitting transaction to Cardano mainnet via Blockfrost...');
    console.log('🔍 Final CBOR length:', finalCborHex.length);
    console.log('🔍 CBOR preview:', finalCborHex.substring(0, 100) + '...');

    // Submit transaction to Blockfrost
    const submitResponse = await fetch(`${BLOCKFROST_BASE_URL}/tx/submit`, {
      method: 'POST',
      headers: {
        'project_id': BLOCKFROST_PROJECT_ID,
        'Content-Type': 'application/cbor',
      },
      body: Buffer.from(finalCborHex, 'hex'),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      console.error('❌ Blockfrost submission failed:', errorText);
      
      try {
        const errorJson = JSON.parse(errorText);
        return res.status(submitResponse.status).json({
          error: 'Transaction submission failed',
          details: errorJson,
          status: submitResponse.status
        });
      } catch {
        return res.status(submitResponse.status).json({
          error: 'Transaction submission failed',
          details: errorText,
          status: submitResponse.status
        });
      }
    }

    const txHash = await submitResponse.text();
    console.log('✅ Transaction submitted successfully! Hash:', txHash);

    return res.status(200).json({
      success: true,
      txHash: txHash.replace(/"/g, ''), // Remove quotes if present
      message: 'Transaction submitted to Cardano mainnet'
    });

  } catch (error) {
    console.error('❌ Transaction submission error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}
