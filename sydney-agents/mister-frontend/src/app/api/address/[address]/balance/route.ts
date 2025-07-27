import { NextRequest, NextResponse } from 'next/server';
import { bech32 } from 'bech32';

// Get the Blockfrost API key from environment variables
const getBlockfrostApiKey = (isTestnet: boolean = false): string => {
  if (isTestnet) {
    const key = process.env.BLOCKFROST_TESTNET_PROJECT_ID ||
                process.env.NEXT_PUBLIC_BLOCKFROST_TESTNET_PROJECT_ID ||
                'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f'; // Testnet fallback
    return key;
  } else {
    const key = process.env.BLOCKFROST_PROJECT_ID ||
                process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID ||
                'mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'; // Mainnet fallback
    return key;
  }
};

/**
 * Convert hex address to bech32 format using bech32 encoding
 */
const convertHexToBech32 = async (hexAddress: string): Promise<string> => {
  try {
    // Remove '0x' prefix if present
    const cleanHex = hexAddress.startsWith('0x') ? hexAddress.slice(2) : hexAddress;

    // Convert hex to bytes
    const addressBytes = Buffer.from(cleanHex, 'hex');

    // Get the first byte to determine address type
    const firstByte = addressBytes[0];

    // Determine prefix based on address type
    let prefix = 'addr';
    if (firstByte >= 0xe0 && firstByte <= 0xef) {
      prefix = 'stake';
    }

    // Convert to 5-bit groups for bech32
    const words = bech32.toWords(addressBytes);

    // Encode as bech32
    const bech32Address = bech32.encode(prefix, words);

    return bech32Address;
  } catch (error) {
    console.error('Error converting hex to bech32:', error);
    // If conversion fails, return the original address
    return hexAddress;
  }
};

/**
 * Normalize address format for Blockfrost API calls
 */
const normalizeAddress = async (address: string): Promise<string> => {
  try {
    // If it's already a bech32 address, return as-is
    if (address.startsWith('addr1') || address.startsWith('addr_test1') ||
        address.startsWith('stake1') || address.startsWith('stake_test1')) {
      return address;
    }

    // If it's a hex address, convert to bech32
    if (/^[0-9a-fA-F]+$/.test(address) && address.length >= 56) {
      console.log(`Converting hex address to bech32: ${address}`);
      const bech32Address = await convertHexToBech32(address);
      console.log(`Converted to: ${bech32Address}`);
      return bech32Address;
    }

    // Return as-is if we can't determine the format
    return address;
  } catch (error) {
    console.error('Error normalizing address:', error);
    return address;
  }
};

/**
 * Get ADA balance for a payment address
 */
const getBalanceForPaymentAddress = async (address: string, apiKey: string, isTestnet: boolean = false): Promise<number> => {
  try {
    // Normalize the address first
    const normalizedAddress = await normalizeAddress(address);

    const baseUrl = isTestnet
      ? 'https://cardano-preprod.blockfrost.io/api/v0'
      : 'https://cardano-mainnet.blockfrost.io/api/v0';

    const response = await fetch(
      `${baseUrl}/addresses/${normalizedAddress}`,
      {
        headers: {
          'project_id': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch balance for address: ${response.status} for address: ${normalizedAddress}`);
      return 0;
    }

    const addressInfo = await response.json();
    
    // Find ADA amount (lovelace)
    const adaAmount = addressInfo.amount?.find((asset: any) => asset.unit === 'lovelace');
    
    if (adaAmount) {
      // Convert lovelace to ADA
      return parseInt(adaAmount.quantity) / 1000000;
    }

    return 0;
  } catch (error) {
    console.error('Error fetching balance for payment address:', error);
    return 0;
  }
};

/**
 * Get ADA balance for a stake address (sum of all associated payment addresses)
 */
const getBalanceForStakeAddress = async (address: string, apiKey: string, isTestnet: boolean = false): Promise<number> => {
  try {
    // Normalize the address first
    const normalizedAddress = await normalizeAddress(address);

    const baseUrl = isTestnet
      ? 'https://cardano-preprod.blockfrost.io/api/v0'
      : 'https://cardano-mainnet.blockfrost.io/api/v0';

    // Get all payment addresses associated with this stake address
    const response = await fetch(
      `${baseUrl}/accounts/${normalizedAddress}/addresses`,
      {
        headers: {
          'project_id': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch addresses for stake address: ${response.status} for address: ${normalizedAddress}`);
      return 0;
    }

    const addresses = await response.json();
    
    // Sum balances from all payment addresses
    let totalBalance = 0;
    for (const addressInfo of addresses) {
      const balance = await getBalanceForPaymentAddress(addressInfo.address, apiKey, isTestnet);
      totalBalance += balance;
    }
    
    return totalBalance;
  } catch (error) {
    console.error('Error fetching balance for stake address:', error);
    return 0;
  }
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json({
        success: false,
        error: 'Address parameter is required'
      }, { status: 400 });
    }

    // Determine if this is a testnet address
    const isTestnet = address.startsWith('addr_test') || address.startsWith('stake_test');
    const apiKey = getBlockfrostApiKey(isTestnet);
    console.log(`Getting balance for address: ${address} (${isTestnet ? 'testnet' : 'mainnet'})`);

    if (!apiKey) {
      console.error('No Blockfrost API key available');
      return NextResponse.json({
        success: false,
        error: 'Blockfrost API key not configured'
      }, { status: 500 });
    }

    // Check if this is a stake address (starts with 'stake1' or 'stake_test1')
    const isStakeAddress = address.startsWith('stake1') || address.startsWith('stake_test1');

    let balance: number = 0;

    if (isStakeAddress) {
      console.log(`Getting balance for stake address: ${address}`);
      balance = await getBalanceForStakeAddress(address, apiKey, isTestnet);
    } else {
      console.log(`Getting balance for payment address: ${address}`);
      balance = await getBalanceForPaymentAddress(address, apiKey, isTestnet);
    }

    return NextResponse.json({
      success: true,
      address,
      balance,
      isStakeAddress,
      network: isTestnet ? 'testnet' : 'mainnet'
    });

  } catch (error) {
    console.error('Error in balance API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
