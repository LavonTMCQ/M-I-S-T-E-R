# Strike Agent Code Reference
## Exact Working Implementations - DO NOT MODIFY

**Date:** January 4, 2025  
**Status:** ✅ PRODUCTION READY  
**Purpose:** Preserve exact working code for Strike Finance AI Agent integration

---

## 🚨 CRITICAL CODE SECTIONS

### 1. MASTRA STRIKE AGENT CONFIGURATION

**File:** `sydney-agents/src/mastra/agents/strike-agent.ts`

**Critical Pattern - Agent Function Signature:**
```typescript
// ✅ CORRECT - Must use ({ context }) pattern
export const strikeAgent = createAgent({
  name: 'strikeAgent',
  instructions: ({ context }) => {
    const systemPrompt = `
User Context:
- Wallet Address: ${context.walletAddress}
- Stake Address: ${context.stakeAddress}
- Balance: ${context.balance} ADA
- Wallet Type: ${context.walletType}
- ADA Handle: ${context.handle}

[System prompt content...]
`;
    return systemPrompt;
  },
  model: {
    provider: 'GOOGLE',
    name: 'gemini-2.5-pro',
    toolChoice: 'auto',
  },
  tools: {
    executeManualTrade,
    registerConnectedWallet,
    // ... other tools
  },
});
```

**❌ WRONG Pattern:**
```typescript
// This will break user context injection
instructions: (params) => { ... }
```

---

### 2. FRONTEND CBOR EXTRACTION LOGIC

**File:** `sydney-agents/mister-frontend/src/app/api/agents/strike/chat/route.ts`

**Critical CBOR Detection Code:**
```typescript
// Check if the response indicates wallet signing is required
if (agentResponse.includes('sign the transaction') || agentResponse.includes('approve the transaction') || agentResponse.includes('Vespr wallet')) {
  requiresWalletSigning = true;
  console.log('🔍 Wallet signing required detected in response');

  // Method 1: Check in result.messages for tool results
  if (result.messages && Array.isArray(result.messages)) {
    console.log('🔍 Checking messages array for tool results...');
    for (const message of result.messages) {
      if (message.role === 'tool' && message.content && Array.isArray(message.content)) {
        for (const contentItem of message.content) {
          if (contentItem.type === 'tool-result' && 
              contentItem.toolName === 'executeManualTrade' && 
              contentItem.result?.data) {
            
            const toolData = contentItem.result.data;
            console.log('🎯 Found executeManualTrade tool result in messages');
            
            if (toolData.requiresFrontendSigning && toolData.cbor) {
              transactionCbor = toolData.cbor;
              tradeDetails = toolData.tradeDetails;
              console.log('✅ Found CBOR data in messages:', toolData.cbor.substring(0, 50) + '...');
              break;
            }
          }
        }
        if (transactionCbor) break;
      }
    }
  }
  
  // Method 2: Check in result.steps (Mastra step-by-step execution)
  if (!transactionCbor && result.steps && Array.isArray(result.steps)) {
    console.log('🔍 Checking steps array for tool results...');
    for (const step of result.steps) {
      if (step.stepType === 'tool-result' && step.toolResults && Array.isArray(step.toolResults)) {
        for (const toolResult of step.toolResults) {
          if (toolResult.toolName === 'executeManualTrade' && toolResult.result?.data) {
            const toolData = toolResult.result.data;
            console.log('🎯 Found executeManualTrade in steps');
            
            if (toolData.requiresFrontendSigning && toolData.cbor) {
              transactionCbor = toolData.cbor;
              tradeDetails = toolData.tradeDetails;
              console.log('✅ Found CBOR data in steps:', toolData.cbor.substring(0, 50) + '...');
              break;
            }
          }
        }
        if (transactionCbor) break;
      }
    }
  }
  
  // Method 3: Deep search in the entire response object
  if (!transactionCbor) {
    console.log('🔍 Performing deep search for CBOR data...');
    const searchForCbor = (obj: any, path = ''): any => {
      if (typeof obj !== 'object' || obj === null) return null;
      
      // Check if this object has the CBOR structure we're looking for
      if (obj.requiresFrontendSigning && obj.cbor && typeof obj.cbor === 'string') {
        console.log('✅ Found CBOR data at path:', path);
        return obj;
      }
      
      // Recursively search nested objects and arrays
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          const found = searchForCbor(value, `${path}.${key}`);
          if (found) return found;
        }
      }
      
      return null;
    };
    
    const foundData = searchForCbor(result);
    if (foundData) {
      transactionCbor = foundData.cbor;
      tradeDetails = foundData.tradeDetails;
      console.log('✅ Found CBOR data via deep search:', foundData.cbor.substring(0, 50) + '...');
    }
  }
}
```

---

### 3. WALLET SIGNING FLOW

**File:** `sydney-agents/mister-frontend/src/components/trading/AITradingChat.tsx`

**Critical Wallet Signing Implementation:**
```typescript
const handleWalletSigning = async (transactionCbor: string, tradeDetails: any) => {
  if (!mainWallet || !window.cardano) {
    console.error('❌ Wallet not connected for signing');
    return;
  }

  try {
    console.log('🔐 Starting Strike Finance wallet signing process...');
    console.log('📋 CBOR to sign:', transactionCbor.substring(0, 50) + '...');

    // Get the wallet API
    const walletApi = await window.cardano[mainWallet.walletType].enable();

    // Step 1: Sign the transaction with wallet (partial signing) - Strike Finance CSL approach
    console.log('🔐 Requesting wallet signature...');
    const witnessSetCbor = await walletApi.signTx(transactionCbor, true); // partial signing
    console.log('✅ Wallet signature received, length:', witnessSetCbor.length);

    // Step 2: Send to server for proper CBOR combination using CSL
    console.log('🔧 Sending to server for CSL combination...');
    const signingResponse = await fetch('/api/cardano/sign-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        txCbor: transactionCbor, 
        witnessSetCbor: witnessSetCbor 
      })
    });

    if (!signingResponse.ok) {
      const errorData = await signingResponse.json();
      throw new Error(`Server signing failed (${signingResponse.status}): ${errorData.error || 'Unknown error'}`);
    }

    const { success, signedTxCbor, error } = await signingResponse.json();
    
    if (!success || !signedTxCbor) {
      throw new Error(`CSL combination failed: ${error || 'Unknown error'}`);
    }

    console.log('✅ Server: Transaction signed successfully using CSL');
    console.log('📋 Final transaction length:', signedTxCbor.length);

    // Step 3: Submit to Cardano network
    console.log('🚀 Submitting transaction to Cardano network...');
    const txHash = await walletApi.submitTx(signedTxCbor);
    console.log('🎉 Transaction successfully submitted! Hash:', txHash);

    // Add success message to chat
    const successMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'agent',
      content: `✅ **Trade Executed Successfully!**\n\nYour Strike Finance position has been opened successfully.\n\n**Transaction Hash:** \`${txHash}\`\n\n**Trade Details:**\n- **Action:** ${tradeDetails?.action || 'Open'}\n- **Side:** ${tradeDetails?.side || 'Long'}\n- **Collateral:** ${tradeDetails?.collateralAmount ? (tradeDetails.collateralAmount / 1000000) + ' ADA' : 'N/A'}\n- **Leverage:** ${tradeDetails?.leverage || 'N/A'}x\n- **Pair:** ${tradeDetails?.pair || 'ADA/USD'}\n\nYou can view this transaction on [Cardanoscan](https://cardanoscan.io/transaction/${txHash})`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, successMessage]);

  } catch (error) {
    console.error('❌ Strike Finance wallet signing failed:', error);

    // Add error message to chat
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'agent',
      content: `❌ **Transaction Failed**\n\nI was unable to complete the Strike Finance transaction. Please try again.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}\n\n**Troubleshooting:**\n- Ensure your wallet is connected\n- Check that you have sufficient ADA for fees\n- Try refreshing the page and reconnecting your wallet`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, errorMessage]);
  }
};
```

---

### 4. CSL TRANSACTION SIGNING API

**File:** `sydney-agents/mister-frontend/src/app/api/cardano/sign-transaction/route.ts`

**Critical CSL Implementation:**
```typescript
async function properCardanoTransactionSigning(
  txCbor: string,
  witnessSetCbor: string
): Promise<{ success: boolean; signedTxCbor?: string; error?: string }> {
  try {
    console.log('🔧 CSL: Starting proper Cardano transaction signing...');

    // Import the browser version of Cardano Serialization Library (works better in Next.js)
    const CSL = await import('@emurgo/cardano-serialization-lib-browser');
    console.log('✅ CSL: Cardano Serialization Library loaded');

    // Parse the original transaction from Strike Finance
    console.log('🔍 CSL: Parsing Strike Finance transaction...');
    const originalTx = CSL.Transaction.from_bytes(Buffer.from(txCbor, 'hex'));
    console.log('✅ CSL: Original transaction parsed successfully');

    // Extract the transaction body (this is what we want to keep)
    const txBody = originalTx.body();
    console.log('✅ CSL: Transaction body extracted');

    // Parse the witness set from the wallet
    console.log('🔍 CSL: Parsing wallet witness set...');
    const walletWitnessSet = CSL.TransactionWitnessSet.from_bytes(Buffer.from(witnessSetCbor, 'hex'));
    console.log('✅ CSL: Wallet witness set parsed successfully');

    // Get any existing witness set from the original transaction
    const originalWitnessSet = originalTx.witness_set();

    // Create a new combined witness set
    console.log('🔧 CSL: Combining witness sets...');
    const combinedWitnessSet = CSL.TransactionWitnessSet.new();

    // Add witnesses from wallet
    const walletVkeys = walletWitnessSet.vkeys();
    if (walletVkeys) {
      combinedWitnessSet.set_vkeys(walletVkeys);
      console.log('✅ CSL: Added wallet vkey witnesses');
    }

    // Add any existing witnesses from original transaction
    if (originalWitnessSet) {
      const originalVkeys = originalWitnessSet.vkeys();
      if (originalVkeys) {
        // If we already have vkeys, we need to merge them
        const existingVkeys = combinedWitnessSet.vkeys() || CSL.Vkeywitnesses.new();
        for (let i = 0; i < originalVkeys.len(); i++) {
          existingVkeys.add(originalVkeys.get(i));
        }
        combinedWitnessSet.set_vkeys(existingVkeys);
        console.log('✅ CSL: Merged original vkey witnesses');
      }

      // Copy other witness types if they exist
      const nativeScripts = originalWitnessSet.native_scripts();
      if (nativeScripts) {
        combinedWitnessSet.set_native_scripts(nativeScripts);
      }

      const plutusScripts = originalWitnessSet.plutus_scripts();
      if (plutusScripts) {
        combinedWitnessSet.set_plutus_scripts(plutusScripts);
      }

      const plutusData = originalWitnessSet.plutus_data();
      if (plutusData) {
        combinedWitnessSet.set_plutus_data(plutusData);
      }

      const redeemers = originalWitnessSet.redeemers();
      if (redeemers) {
        combinedWitnessSet.set_redeemers(redeemers);
      }
    }

    // Get auxiliary data if it exists
    const auxiliaryData = originalTx.auxiliary_data();

    // Create the final signed transaction
    console.log('🔧 CSL: Building final signed transaction...');
    const signedTx = CSL.Transaction.new(
      txBody,
      combinedWitnessSet,
      auxiliaryData
    );

    // Convert back to CBOR hex
    const signedTxCbor = Buffer.from(signedTx.to_bytes()).toString('hex');
    console.log('✅ CSL: Final transaction built successfully');
    console.log('📋 CSL: Original length:', txCbor.length, 'Final length:', signedTxCbor.length);

    return {
      success: true,
      signedTxCbor
    };

  } catch (error) {
    console.error('❌ CSL: Proper transaction signing failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown CSL error'
    };
  }
}
```

---

**⚠️ CODE PRESERVATION NOTICE:**
These exact code implementations are BATTLE-TESTED and OPERATIONAL. Any modifications must be tested end-to-end before deployment. This represents the first successful AI agent integration with a Cardano perpetual DEX.
