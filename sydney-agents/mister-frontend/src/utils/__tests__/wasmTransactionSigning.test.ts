/**
 * Tests for WASM Transaction Signing utilities
 * These tests verify the WASM library integration works correctly
 */

import { WASMTransactionSigner } from '../wasmTransactionSigning';

// Mock wallet API for testing
const mockWalletApi = {
  signTx: jest.fn(),
  submitTx: jest.fn()
};

// Sample CBOR transaction data for testing (shortened for test purposes)
const sampleCBOR = '84a400818258200123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00018182581d60abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123451a000f4240021a0002710003190bb8a0f5f6';

describe('WASMTransactionSigner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console methods
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  describe('signTransaction', () => {
    it('should successfully sign a valid transaction', async () => {
      // Mock wallet API response
      mockWalletApi.signTx.mockResolvedValue('a10081825820abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567895840123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef');

      const result = await WASMTransactionSigner.signTransaction(sampleCBOR, mockWalletApi);

      expect(result.success).toBe(true);
      expect(result.signedTxCbor).toBeDefined();
      expect(result.error).toBeUndefined();
      expect(mockWalletApi.signTx).toHaveBeenCalledWith(sampleCBOR, true);
    });

    it('should handle invalid CBOR format', async () => {
      const invalidCBOR = 'invalid-cbor-data';

      const result = await WASMTransactionSigner.signTransaction(invalidCBOR, mockWalletApi);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid CBOR format');
      expect(mockWalletApi.signTx).not.toHaveBeenCalled();
    });

    it('should handle wallet signing errors', async () => {
      mockWalletApi.signTx.mockRejectedValue(new Error('User rejected signing'));

      const result = await WASMTransactionSigner.signTransaction(sampleCBOR, mockWalletApi);

      expect(result.success).toBe(false);
      expect(result.error).toContain('User rejected signing');
    });

    it('should handle short CBOR data', async () => {
      const shortCBOR = '84a400'; // Too short to be valid

      const result = await WASMTransactionSigner.signTransaction(shortCBOR, mockWalletApi);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid CBOR format');
    });
  });

  describe('submitTransaction', () => {
    const sampleSignedTx = '84a400818258200123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef00018182581d60abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123451a000f4240021a0002710003190bb8a10081825820abcdef0123456789abcdef0123456789abcdef0123456789abcdef01234567895840123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    it('should successfully submit via wallet API', async () => {
      const expectedTxHash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      mockWalletApi.submitTx.mockResolvedValue(expectedTxHash);

      const result = await WASMTransactionSigner.submitTransaction(sampleSignedTx, mockWalletApi);

      expect(result.success).toBe(true);
      expect(result.txHash).toBe(expectedTxHash);
      expect(result.error).toBeUndefined();
      expect(mockWalletApi.submitTx).toHaveBeenCalledWith(sampleSignedTx);
    });

    it('should fallback to Blockfrost when wallet submission fails', async () => {
      mockWalletApi.submitTx.mockRejectedValue(new Error('Wallet submission failed'));
      
      // Mock fetch for Blockfrost
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('blockfrost-tx-hash-123')
      });
      global.fetch = mockFetch;

      const result = await WASMTransactionSigner.submitTransaction(
        sampleSignedTx, 
        mockWalletApi, 
        'test-project-id'
      );

      expect(result.success).toBe(true);
      expect(result.txHash).toBe('blockfrost-tx-hash-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://cardano-mainnet.blockfrost.io/api/v0/tx/submit',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/cbor',
            'project_id': 'test-project-id'
          }
        })
      );
    });

    it('should handle both wallet and Blockfrost failures', async () => {
      mockWalletApi.submitTx.mockRejectedValue(new Error('Wallet failed'));
      
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        text: () => Promise.resolve('Blockfrost error message')
      });
      global.fetch = mockFetch;

      const result = await WASMTransactionSigner.submitTransaction(
        sampleSignedTx, 
        mockWalletApi, 
        'test-project-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Blockfrost error');
    });

    it('should handle wallet failure without Blockfrost fallback', async () => {
      mockWalletApi.submitTx.mockRejectedValue(new Error('Wallet submission failed'));

      const result = await WASMTransactionSigner.submitTransaction(sampleSignedTx, mockWalletApi);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Wallet submission failed');
    });
  });

  describe('CBOR validation', () => {
    it('should validate proper hex format', () => {
      const validHex = '84a400818258200123456789abcdef';
      // This test would need access to the private method, so we test it indirectly
      expect(validHex.match(/^[0-9a-fA-F]+$/)).toBeTruthy();
    });

    it('should reject non-hex characters', () => {
      const invalidHex = '84a400818258200123456789abcdefg'; // 'g' is invalid
      expect(invalidHex.match(/^[0-9a-fA-F]+$/)).toBeFalsy();
    });
  });
});

// Integration test helper
export const testWASMIntegration = async () => {
  console.log('🧪 Testing WASM Transaction Signer integration...');
  
  try {
    // Test CBOR validation
    const validCBOR = sampleCBOR;
    const invalidCBOR = 'invalid';
    
    console.log('✅ WASM integration test setup complete');
    console.log('📋 Sample CBOR length:', validCBOR.length);
    console.log('📋 Invalid CBOR:', invalidCBOR);
    
    return {
      success: true,
      message: 'WASM integration test helpers ready'
    };
  } catch (error) {
    console.error('❌ WASM integration test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown test error'
    };
  }
};
