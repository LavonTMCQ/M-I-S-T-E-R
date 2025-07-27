import { NextRequest, NextResponse } from 'next/server';

/**
 * 🚨 PROPER CSL RECOVERY TRANSACTION BUILDER
 * 
 * This API route builds recovery transactions using proper Cardano Serialization Library
 * instead of manual CBOR, preventing the "greyed out Vespr" issue.
 * 
 * Based on: /legacy-smart-contracts/vespr-integration/VESPR_TROUBLESHOOTING.md
 */

export async function POST(request: NextRequest) {
    try {
        console.log('🚀 Building recovery transaction...');
        
        const { contractAddress, walletAddress } = await request.json();
        
        const CONTRACT_ADDRESS = contractAddress || "addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j";
        const WALLET_ADDRESS = walletAddress || "addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc";
        const BLOCKFROST_PROJECT_ID = "mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu";

        // Fetch contract UTxOs
        console.log(`🔍 Fetching UTxOs for contract: ${CONTRACT_ADDRESS}`);
        const utxosResponse = await fetch(
            `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${CONTRACT_ADDRESS}/utxos`,
            {
                headers: { 'project_id': BLOCKFROST_PROJECT_ID }
            }
        );

        if (!utxosResponse.ok) {
            throw new Error(`Failed to fetch UTxOs: ${utxosResponse.statusText}`);
        }

        const utxos = await utxosResponse.json();
        console.log(`✅ Found ${utxos.length} UTxOs in contract`);

        if (utxos.length === 0) {
            return NextResponse.json({ 
                error: 'No UTxOs found in contract',
                cbor: null 
            });
        }

        // Get protocol parameters
        console.log('🔍 Fetching protocol parameters...');
        const protocolResponse = await fetch(
            'https://cardano-mainnet.blockfrost.io/api/v0/epochs/latest/parameters',
            {
                headers: { 'project_id': BLOCKFROST_PROJECT_ID }
            }
        );

        if (!protocolResponse.ok) {
            throw new Error(`Failed to fetch protocol parameters: ${protocolResponse.statusText}`);
        }

        const protocolParams = await protocolResponse.json();
        console.log('✅ Protocol parameters fetched');

        // Import CSL using the working pattern from build-transaction
        const CSL = await import('@emurgo/cardano-serialization-lib-browser');
        console.log('✅ Successfully loaded CSL browser version');

        // Process first UTxO for recovery
        const utxo = utxos[0];
        const adaAmount = parseInt(utxo.amount.find((a: any) => a.unit === 'lovelace')?.quantity || '0');
        
        console.log(`💰 Processing UTxO: ${utxo.tx_hash}#${utxo.output_index} with ${adaAmount / 1_000_000} ADA`);

        // Build transaction using the EXACT working pattern from build-transaction
        console.log('🔧 Building transaction with WORKING CSL pattern...');

        // Create TransactionBuilderConfig with the EXACT fallback from working code
        let txBuilderConfig;
        try {
            // Try coins_per_utxo_byte first (newer API)
            txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
                .fee_algo(CSL.LinearFee.new(
                    CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
                    CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
                ))
                .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
                .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
                .coins_per_utxo_byte(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
                .max_value_size(protocolParams.max_val_size)
                .max_tx_size(protocolParams.max_tx_size)
                .build();
            console.log('✅ Used coins_per_utxo_byte method');
        } catch (error1) {
            console.log('⚠️ coins_per_utxo_byte failed, trying coins_per_utxo_word...');
            try {
                txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
                    .fee_algo(CSL.LinearFee.new(
                        CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
                        CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
                    ))
                    .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
                    .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
                    .coins_per_utxo_word(CSL.BigNum.from_str(protocolParams.coins_per_utxo_size))
                    .max_value_size(protocolParams.max_val_size)
                    .max_tx_size(protocolParams.max_tx_size)
                    .build();
                console.log('✅ Used coins_per_utxo_word method');
            } catch (error2) {
                console.log('❌ Both coin methods failed, using default value...');
                txBuilderConfig = CSL.TransactionBuilderConfigBuilder.new()
                    .fee_algo(CSL.LinearFee.new(
                        CSL.BigNum.from_str(protocolParams.min_fee_a.toString()),
                        CSL.BigNum.from_str(protocolParams.min_fee_b.toString())
                    ))
                    .pool_deposit(CSL.BigNum.from_str(protocolParams.pool_deposit))
                    .key_deposit(CSL.BigNum.from_str(protocolParams.key_deposit))
                    .coins_per_utxo_byte(CSL.BigNum.from_str('4310')) // Default Cardano value
                    .max_value_size(protocolParams.max_val_size)
                    .max_tx_size(protocolParams.max_tx_size)
                    .build();
                console.log('✅ Used default coins_per_utxo_byte value');
            }
        }

        const txBuilder = CSL.TransactionBuilder.new(txBuilderConfig);

        // Add input using the EXACT working pattern
        const txInput = CSL.TransactionInput.new(
            CSL.TransactionHash.from_bytes(Buffer.from(utxo.tx_hash, 'hex')),
            utxo.output_index
        );

        const inputValue = CSL.Value.new(CSL.BigNum.from_str(adaAmount.toString()));

        // Create TransactionUnspentOutput for the input
        const inputAddr = CSL.Address.from_bech32(CONTRACT_ADDRESS);
        const inputOutput = CSL.TransactionOutput.new(inputAddr, inputValue);
        const unspentOutput = CSL.TransactionUnspentOutput.new(txInput, inputOutput);

        // Create UTxO set and add our input
        const txUnspentOutputs = CSL.TransactionUnspentOutputs.new();
        txUnspentOutputs.add(unspentOutput);

        // Add inputs using the UTxO selection algorithm (EXACT working pattern)
        txBuilder.add_inputs_from(txUnspentOutputs, 1); // 1 = RandomImprove algorithm
        console.log('✅ Input added using WORKING add_inputs_from pattern');

        // Add output to wallet
        const outputAmount = adaAmount - 500_000; // Subtract ~0.5 ADA for fees
        const outputValue = CSL.Value.new(CSL.BigNum.from_str(outputAmount.toString()));
        const outputAddr = CSL.Address.from_bech32(WALLET_ADDRESS);
        const output = CSL.TransactionOutput.new(outputAddr, outputValue);
        txBuilder.add_output(output);
        console.log('✅ Output added using WORKING pattern');

        // Set TTL using working pattern
        const latestBlockResponse = await fetch('https://cardano-mainnet.blockfrost.io/api/v0/blocks/latest', {
            headers: { 'project_id': BLOCKFROST_PROJECT_ID }
        });
        const latestBlock = await latestBlockResponse.json();
        const ttlSlot = latestBlock.slot + 3600; // 1 hour TTL
        txBuilder.set_ttl(ttlSlot);

        // Add change using working pattern
        const changeAddr = CSL.Address.from_bech32(CONTRACT_ADDRESS);
        txBuilder.add_change_if_needed(changeAddr);

        // Build the complete transaction using EXACT working pattern
        const txBody = txBuilder.build();

        // Create empty witness set (wallet will populate this after signing)
        const witnessSet = CSL.TransactionWitnessSet.new();

        // Create complete transaction as required by CIP-30
        const transaction = CSL.Transaction.new(txBody, witnessSet);

        // Convert to CBOR hex
        const cborHex = Buffer.from(transaction.to_bytes()).toString('hex');

        console.log('✅ Complete transaction built successfully using WORKING CSL pattern!');
        console.log('📋 Complete transaction CBOR length:', cborHex.length, 'characters');
        console.log('🔥 This is REAL CSL CBOR that should NOT be greyed out in Vespr!');

        return NextResponse.json({
            success: true,
            cbor: cborHex,
            adaAmount: adaAmount / 1_000_000,
            utxoDetails: {
                txHash: utxo.tx_hash,
                outputIndex: utxo.output_index,
                amount: adaAmount
            },
            message: 'Real CSL transaction built with working pattern - should fix greyed out Vespr!',
            note: 'Uses exact same CSL pattern as working build-transaction API'
        });

    } catch (error) {
        console.error('❌ Transaction building failed:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Transaction building failed',
            cbor: null 
        }, { status: 500 });
    }
}