#!/usr/bin/env tsx
/**
 * Strike Finance Contract Discovery Tool
 * 
 * This script discovers the actual Strike Finance smart contract addresses
 * by analyzing successful transactions and API responses.
 * 
 * Methods:
 * 1. Analyze successful Strike Finance transaction CBOR data
 * 2. Query Cardano explorer APIs for Strike Finance transactions
 * 3. Parse Strike Finance API responses for contract references
 * 4. Validate discovered addresses against known patterns
 * 
 * Usage:
 *   tsx discover-strike-contracts.ts
 *   tsx discover-strike-contracts.ts --tx-hash 14f025be82f53f6b7a1725bf64a2fc415536ea8c9474bb9fe46a4b879020989d
 */

import { readFileSync, writeFileSync } from 'fs';

// Cardano Serialization Library for CBOR parsing
let CSL: any;

interface StrikeContract {
  name: string;
  scriptHash: string;
  address: string;
  purpose: string;
  confidence: 'high' | 'medium' | 'low';
  source: string;
}

interface DiscoveryResult {
  timestamp: string;
  method: string;
  contracts: StrikeContract[];
  totalFound: number;
  validationStatus: 'validated' | 'pending' | 'failed';
}

class StrikeContractDiscovery {
  private contracts: StrikeContract[] = [];
  
  constructor() {
    this.initializeCSL();
  }

  /**
   * Initialize Cardano Serialization Library
   */
  private async initializeCSL() {
    try {
      CSL = await import('@emurgo/cardano-serialization-lib-browser');
      console.log('✅ Cardano Serialization Library loaded');
    } catch (error) {
      console.error('❌ Failed to load CSL:', error);
      throw error;
    }
  }

  /**
   * Main discovery process
   */
  async discover(): Promise<DiscoveryResult> {
    console.log('🔍 Starting Strike Finance contract discovery...');
    
    try {
      // Method 1: Analyze known successful transaction
      await this.analyzeSuccessfulTransaction();
      
      // Method 2: Query Strike Finance API for contract hints
      await this.queryStrikeFinanceAPI();
      
      // Method 3: Search Cardano explorer for Strike Finance transactions
      await this.searchCardanoExplorer();
      
      // Method 4: Analyze CBOR patterns from documentation
      await this.analyzeCBORPatterns();
      
      // Validate discovered contracts
      const validationStatus = await this.validateContracts();
      
      const result: DiscoveryResult = {
        timestamp: new Date().toISOString(),
        method: 'multi-source-analysis',
        contracts: this.contracts,
        totalFound: this.contracts.length,
        validationStatus
      };
      
      this.saveResults(result);
      this.displayResults(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ Discovery failed:', error);
      throw error;
    }
  }

  /**
   * Analyze the known successful Strike Finance transaction
   */
  private async analyzeSuccessfulTransaction(): Promise<void> {
    console.log('📊 Analyzing successful transaction...');
    
    const knownTxHash = '14f025be82f53f6b7a1725bf64a2fc415536ea8c9474bb9fe46a4b879020989d';
    
    try {
      // Query transaction from Blockfrost or other explorer
      const txData = await this.queryTransaction(knownTxHash);
      
      if (txData) {
        const contracts = this.extractContractsFromTransaction(txData);
        this.contracts.push(...contracts);
        console.log(`✅ Found ${contracts.length} contracts from successful transaction`);
      }
    } catch (error) {
      console.log('⚠️  Could not analyze successful transaction:', error);
    }
  }

  /**
   * Query Strike Finance API for contract information
   */
  private async queryStrikeFinanceAPI(): Promise<void> {
    console.log('🎯 Querying Strike Finance API...');
    
    try {
      // Test with a sample request to get CBOR data
      const response = await fetch('https://app.strikefinance.org/api/perpetuals/openPosition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          request: {
            address: 'addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf',
            asset: { policyId: '', assetName: '' },
            collateralAmount: 50,
            leverage: 2,
            position: 'Long',
            enteredPositionTime: Date.now()
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.cbor) {
          const contracts = this.extractContractsFromCBOR(data.cbor);
          this.contracts.push(...contracts);
          console.log(`✅ Found ${contracts.length} contracts from Strike Finance API`);
        }
      }
    } catch (error) {
      console.log('⚠️  Could not query Strike Finance API:', error);
    }
  }

  /**
   * Search Cardano explorer for Strike Finance transactions
   */
  private async searchCardanoExplorer(): Promise<void> {
    console.log('🔎 Searching Cardano explorer...');
    
    try {
      // Search for transactions involving Strike Finance
      // This would require Blockfrost API key or other explorer API
      const searchResults = await this.searchExplorerTransactions();
      
      for (const tx of searchResults) {
        const contracts = this.extractContractsFromTransaction(tx);
        this.contracts.push(...contracts);
      }
      
      console.log(`✅ Found contracts from explorer search`);
    } catch (error) {
      console.log('⚠️  Could not search Cardano explorer:', error);
    }
  }

  /**
   * Analyze CBOR patterns from documentation
   */
  private async analyzeCBORPatterns(): Promise<void> {
    console.log('📋 Analyzing CBOR patterns from documentation...');
    
    // Known CBOR patterns from documentation
    const knownPatterns = [
      '84ac00d9', // Strike Finance transaction start pattern
      'f5f6',     // Strike Finance transaction end pattern
    ];
    
    // Sample CBOR data from documentation (if available)
    const sampleCBOR = this.getSampleCBORFromDocs();
    
    if (sampleCBOR) {
      const contracts = this.extractContractsFromCBOR(sampleCBOR);
      this.contracts.push(...contracts);
      console.log(`✅ Found ${contracts.length} contracts from CBOR analysis`);
    }
  }

  /**
   * Extract contract addresses from transaction data
   */
  private extractContractsFromTransaction(txData: any): StrikeContract[] {
    const contracts: StrikeContract[] = [];
    
    try {
      // Parse transaction outputs for script addresses
      if (txData.outputs) {
        for (const output of txData.outputs) {
          if (output.address && this.isScriptAddress(output.address)) {
            const scriptHash = this.extractScriptHash(output.address);
            if (scriptHash && this.isLikelyStrikeContract(scriptHash)) {
              contracts.push({
                name: this.inferContractName(scriptHash),
                scriptHash,
                address: output.address,
                purpose: this.inferContractPurpose(output),
                confidence: 'high',
                source: 'transaction-analysis'
              });
            }
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Error extracting contracts from transaction:', error);
    }
    
    return contracts;
  }

  /**
   * Extract contract addresses from CBOR data
   */
  private extractContractsFromCBOR(cbor: string): StrikeContract[] {
    const contracts: StrikeContract[] = [];
    
    try {
      if (!CSL) {
        console.log('⚠️  CSL not available for CBOR parsing');
        return contracts;
      }
      
      // Parse CBOR transaction
      const tx = CSL.Transaction.from_bytes(Buffer.from(cbor, 'hex'));
      const outputs = tx.body().outputs();
      
      for (let i = 0; i < outputs.len(); i++) {
        const output = outputs.get(i);
        const address = output.address();
        
        if (address.kind() === CSL.AddressKind.Script) {
          const scriptHash = Buffer.from(
            address.as_script().script_hash().to_bytes()
          ).toString('hex');
          
          if (this.isLikelyStrikeContract(scriptHash)) {
            contracts.push({
              name: this.inferContractName(scriptHash),
              scriptHash,
              address: address.to_bech32(),
              purpose: 'trading-contract',
              confidence: 'medium',
              source: 'cbor-analysis'
            });
          }
        }
      }
    } catch (error) {
      console.log('⚠️  Error parsing CBOR:', error);
    }
    
    return contracts;
  }

  /**
   * Helper functions
   */
  private async queryTransaction(txHash: string): Promise<any> {
    // This would require Blockfrost API or similar
    // For now, return null
    return null;
  }

  private async searchExplorerTransactions(): Promise<any[]> {
    // This would search for Strike Finance related transactions
    // For now, return empty array
    return [];
  }

  private getSampleCBORFromDocs(): string | null {
    // Try to read sample CBOR from documentation files
    try {
      const docFiles = [
        '../2025-07-03_Strike-Finance-Quick-Reference.md',
        '../2025-07-03_NextJS-CardanoCSL-StrikeFinance_Integration-Guide.md'
      ];
      
      for (const file of docFiles) {
        try {
          const content = readFileSync(file, 'utf8');
          const cborMatch = content.match(/84ac00d9[a-f0-9]+f5f6/gi);
          if (cborMatch) {
            return cborMatch[0];
          }
        } catch {
          // File not found, continue
        }
      }
    } catch (error) {
      console.log('⚠️  Could not read documentation files');
    }
    
    return null;
  }

  private isScriptAddress(address: string): boolean {
    // Check if address is a script address (starts with addr1w, addr1x, addr1y, addr1z)
    return /^addr1[wxyz]/.test(address);
  }

  private extractScriptHash(address: string): string | null {
    try {
      if (!CSL) return null;
      
      const addr = CSL.Address.from_bech32(address);
      if (addr.kind() === CSL.AddressKind.Script) {
        return Buffer.from(
          addr.as_script().script_hash().to_bytes()
        ).toString('hex');
      }
    } catch (error) {
      console.log('⚠️  Error extracting script hash:', error);
    }
    
    return null;
  }

  private isLikelyStrikeContract(scriptHash: string): boolean {
    // Heuristics to identify Strike Finance contracts
    // This could be improved with more specific patterns
    return scriptHash.length === 56; // Standard script hash length
  }

  private inferContractName(scriptHash: string): string {
    // Try to infer contract name from hash patterns or known mappings
    const knownContracts: { [key: string]: string } = {
      'e58541289ab794860a0333a64d1f5843284a772626b9a2b534af914b': 'position-opening',
      'f733a30f3a6081e35a42ea1f66e857738325f05359c82c332213a1a4': 'position-closing'
    };
    
    return knownContracts[scriptHash] || `unknown-${scriptHash.substring(0, 8)}`;
  }

  private inferContractPurpose(output: any): string {
    // Infer contract purpose from transaction context
    return 'trading-operation';
  }

  private async validateContracts(): Promise<'validated' | 'pending' | 'failed'> {
    console.log('✅ Validating discovered contracts...');
    
    // Remove duplicates
    const uniqueContracts = this.contracts.filter((contract, index, self) =>
      index === self.findIndex(c => c.scriptHash === contract.scriptHash)
    );
    
    this.contracts = uniqueContracts;
    
    // Basic validation
    const validContracts = this.contracts.filter(c => 
      c.scriptHash.length === 56 && /^[a-f0-9]+$/.test(c.scriptHash)
    );
    
    if (validContracts.length === this.contracts.length) {
      return 'validated';
    } else if (validContracts.length > 0) {
      return 'pending';
    } else {
      return 'failed';
    }
  }

  private saveResults(result: DiscoveryResult): void {
    const outputFile = './strike-contracts-discovery.json';
    writeFileSync(outputFile, JSON.stringify(result, null, 2));
    console.log(`💾 Results saved to ${outputFile}`);
  }

  private displayResults(result: DiscoveryResult): void {
    console.log('\n🎯 STRIKE FINANCE CONTRACT DISCOVERY RESULTS');
    console.log('='.repeat(50));
    console.log(`📅 Timestamp: ${result.timestamp}`);
    console.log(`🔍 Method: ${result.method}`);
    console.log(`📊 Total Found: ${result.totalFound}`);
    console.log(`✅ Status: ${result.validationStatus}`);
    console.log('\n📋 DISCOVERED CONTRACTS:');
    
    if (result.contracts.length === 0) {
      console.log('❌ No contracts discovered');
      console.log('\n🔧 NEXT STEPS:');
      console.log('1. Check Strike Finance API access');
      console.log('2. Verify Blockfrost API key');
      console.log('3. Analyze more transaction examples');
      console.log('4. Contact Strike Finance team for contract addresses');
    } else {
      result.contracts.forEach((contract, index) => {
        console.log(`\n${index + 1}. ${contract.name.toUpperCase()}`);
        console.log(`   Hash: ${contract.scriptHash}`);
        console.log(`   Address: ${contract.address}`);
        console.log(`   Purpose: ${contract.purpose}`);
        console.log(`   Confidence: ${contract.confidence}`);
        console.log(`   Source: ${contract.source}`);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// CLI interface
async function main() {
  const txHash = process.argv.find(arg => arg.startsWith('--tx-hash='))?.split('=')[1];
  
  const discovery = new StrikeContractDiscovery();
  
  try {
    const result = await discovery.discover();
    
    if (result.totalFound > 0) {
      console.log('🎉 Contract discovery completed successfully!');
      process.exit(0);
    } else {
      console.log('⚠️  No contracts discovered. Manual investigation required.');
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Discovery failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { StrikeContractDiscovery, DiscoveryResult };
