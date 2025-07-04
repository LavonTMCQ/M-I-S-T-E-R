/**
 * Cardano Address Utilities
 * Simplified utilities without CSL dependencies
 */

/**
 * Validate if an address is a valid Cardano address
 */
export const isValidCardanoAddress = (address: string): boolean => {
  try {
    // Check if it starts with addr1 (mainnet) or addr_test1 (testnet)
    if (address.startsWith('addr1') || address.startsWith('addr_test1')) {
      return true;
    }
    
    // Check if it starts with stake1 (mainnet stake) or stake_test1 (testnet stake)
    if (address.startsWith('stake1') || address.startsWith('stake_test1')) {
      return true;
    }
    
    // Check if it's a hex address (common from wallet APIs)
    if (/^[0-9a-fA-F]+$/.test(address) && address.length >= 56) {
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
};

/**
 * Convert hex address to bech32 format (frontend version) - DYNAMIC
 */
const convertHexToBech32Frontend = async (hexAddress: string): Promise<string> => {
  try {
    // Remove '0x' prefix if present
    const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress;
    console.log('🔧 Converting hex address:', cleanHex.length, 'characters');

    // Validate hex length - bech32 has limits
    if (cleanHex.length > 114) {
      console.warn('⚠️ Hex address too long for bech32 encoding, truncating to 57 bytes');
      // Truncate to maximum safe length (57 bytes = 114 hex chars)
      const truncatedHex = cleanHex.substring(0, 114);
      return await convertHexToBech32Frontend(truncatedHex);
    }

    // Handle different hex lengths
    let addressBytes: Buffer;

    if (cleanHex.length === 114) {
      // This is a 57-byte Cardano payment address (header + payment hash + stake hash)
      console.log('🔧 Detected 57-byte Cardano payment address structure');
      addressBytes = Buffer.from(cleanHex, 'hex');
    } else if (cleanHex.length === 58) {
      // This is a 29-byte address
      console.log('🔧 Detected 29-byte address structure');
      addressBytes = Buffer.from(cleanHex, 'hex');
    } else if (cleanHex.length === 56) {
      // This is a 28-byte stake address
      console.log('🔧 Detected 28-byte stake address structure');
      addressBytes = Buffer.from(cleanHex, 'hex');
    } else {
      console.log('🔧 Unknown hex length, using as-is');
      addressBytes = Buffer.from(cleanHex, 'hex');
    }

    // Validate byte length for bech32 encoding (max ~65 bytes for safety)
    if (addressBytes.length > 65) {
      console.warn('⚠️ Address bytes too long for bech32, truncating to 57 bytes');
      addressBytes = addressBytes.slice(0, 57);
    }

    // Get the first byte to determine address type and prefix
    const firstByte = addressBytes[0];
    console.log('🔧 First byte:', firstByte.toString(16));

    let prefix = 'addr';
    if (firstByte >= 0xe0 && firstByte <= 0xef) {
      prefix = 'stake';
    }

    // Use bech32 library for address conversion
    try {
      const { bech32: bech32Lib } = await import('bech32');
      const words = bech32Lib.toWords(addressBytes);

      // Additional validation before encoding
      if (words.length > 104) { // bech32 practical limit
        console.warn('⚠️ Too many words for bech32, truncating');
        const truncatedWords = words.slice(0, 104);
        const bech32Address = bech32Lib.encode(prefix, truncatedWords);
        console.log('✅ Converted hex to bech32 (truncated):', cleanHex.substring(0, 20) + '...', '→', bech32Address.substring(0, 20) + '...');
        return bech32Address;
      }

      const bech32Address = bech32Lib.encode(prefix, words);
      console.log('✅ Converted hex to bech32:', cleanHex.substring(0, 20) + '...', '→', bech32Address.substring(0, 20) + '...');
      console.log('🔍 DEBUG: Full bech32 address:', bech32Address);
      console.log('🔍 DEBUG: Address length:', bech32Address.length);

      // Check for the problematic 'x' character
      if (bech32Address.includes('x')) {
        console.log('⚠️ DEBUG: Found "x" character in address at positions:',
          [...bech32Address].map((char, i) => char === 'x' ? i : null).filter(i => i !== null));
      }

      return bech32Address;
    } catch (bech32Error) {
      console.error('❌ bech32 encoding failed:', bech32Error);

      // Final fallback: try manual bech32 encoding
      return await manualBech32Encode(addressBytes, prefix);
    }
  } catch (error) {
    console.error('❌ Error converting hex to bech32 (frontend):', error);
    // If conversion fails, return the original address
    return hexAddress;
  }
};

/**
 * Manual bech32 encoding fallback with proper checksum
 */
const manualBech32Encode = async (data: Buffer, prefix: string): Promise<string> => {
  try {
    const alphabet = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

    // Convert bytes to 5-bit groups
    let acc = 0;
    let bits = 0;
    const result: number[] = [];

    for (const byte of data) {
      acc = (acc << 8) | byte;
      bits += 8;

      while (bits >= 5) {
        bits -= 5;
        result.push((acc >> bits) & 31);
      }
    }

    if (bits > 0) {
      result.push((acc << (5 - bits)) & 31);
    }

    // Calculate proper bech32 checksum
    const checksum = bech32Checksum(prefix, result);
    const fullData = result.concat(checksum);

    const encoded = fullData.map(x => alphabet[x]).join('');

    console.log('🔧 Manual encoding with checksum:', `${prefix}1${encoded}`);
    console.log('🔍 DEBUG: alphabet used:', alphabet);
    console.log('🔍 DEBUG: fullData indices:', fullData);
    console.log('🔍 DEBUG: mapped characters:', fullData.map(x => `${x}->${alphabet[x]}`));

    return `${prefix}1${encoded}`;
  } catch (error) {
    console.error('❌ Manual bech32 encoding failed:', error);
    return data.toString('hex');
  }
};

/**
 * Calculate bech32 checksum
 */
const bech32Checksum = (prefix: string, data: number[]): number[] => {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

  // Convert prefix to 5-bit values
  const prefixData = [];
  for (let i = 0; i < prefix.length; i++) {
    prefixData.push(prefix.charCodeAt(i) >> 5);
  }
  prefixData.push(0);
  for (let i = 0; i < prefix.length; i++) {
    prefixData.push(prefix.charCodeAt(i) & 31);
  }

  // Calculate checksum
  let chk = 1;
  for (const value of prefixData.concat(data).concat([0, 0, 0, 0, 0, 0])) {
    const top = chk >> 25;
    chk = (chk & 0x1ffffff) << 5 ^ value;
    for (let i = 0; i < 5; i++) {
      chk ^= ((top >> i) & 1) ? GEN[i] : 0;
    }
  }

  const result = [];
  for (let i = 0; i < 6; i++) {
    result.push((chk >> 5 * (5 - i)) & 31);
  }

  return result;
};

/**
 * Normalize address format - DYNAMIC conversion for all users
 */
export const normalizeAddress = async (address: string): Promise<string> => {
  try {
    // If it's already a bech32 address, return as-is
    if (address.startsWith('addr1') || address.startsWith('addr_test1') ||
        address.startsWith('stake1') || address.startsWith('stake_test1')) {
      console.log('✅ Address already in bech32 format');
      return address;
    }

    // If it's a hex address, try to convert to bech32
    if (/^[0-9a-fA-F]+$/.test(address) && address.length >= 56) {
      console.log('🔧 Attempting DYNAMIC hex-to-bech32 conversion for:', address.substring(0, 20) + '...');

      try {
        const bech32Address = await convertHexToBech32Frontend(address);

        // Only return converted address if it looks valid and different from input
        if (bech32Address !== address &&
            (bech32Address.startsWith('addr1') || bech32Address.startsWith('stake1'))) {
          console.log('✅ Successfully converted to bech32:', bech32Address.substring(0, 20) + '...');
          return bech32Address;
        } else {
          console.log('⚠️ Conversion failed or returned same address, using original');
        }
      } catch (conversionError) {
        console.error('❌ Bech32 conversion failed:', conversionError);

        // Check if it's a length limit error
        if (conversionError instanceof Error && conversionError.message.includes('length limit')) {
          console.log('🔧 Address too long for bech32, using truncated version');
          // Try with truncated address
          const truncatedAddress = address.substring(0, 114); // Max 57 bytes
          try {
            const truncatedBech32 = await convertHexToBech32Frontend(truncatedAddress);
            if (truncatedBech32.startsWith('addr1') || truncatedBech32.startsWith('stake1')) {
              console.log('✅ Successfully converted truncated address to bech32');
              return truncatedBech32;
            }
          } catch (truncatedError) {
            console.error('❌ Even truncated conversion failed:', truncatedError);
          }
        }

        // Fall back to original address
        console.log('🔧 Using original address due to conversion error');
      }
    }

    // Return as-is if we can't convert
    console.log('🔧 Using address as-is (no conversion needed)');
    return address;
  } catch (error) {
    console.error('❌ Error normalizing address:', error);
    return address;
  }
};

/**
 * Check if address is a stake address
 */
export const isStakeAddress = (address: string): boolean => {
  return address.startsWith('stake1') || address.startsWith('stake_test1');
};

/**
 * Format address for display
 */
export const formatAddressForDisplay = (address: string, length: number = 8): string => {
  if (!address) return '';
  if (address.length <= length * 2) return address;
  return `${address.substring(0, length)}...${address.substring(address.length - length)}`;
};
