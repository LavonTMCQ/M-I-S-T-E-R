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

// Policy ID for ADA Handles
const HANDLE_POLICY_ID = 'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a';

/**
 * Extract handle from asset name
 */
const extractHandleFromAssetName = (assetName: string): string | null => {
  try {
    // Convert hex to UTF-8
    const handleName = Buffer.from(assetName, 'hex').toString('utf8');
    
    // Clean the handle name (remove non-printable characters)
    const cleanHandle = handleName.replace(/[^\x20-\x7E]/g, '');
    
    // Return with $ prefix if valid
    return cleanHandle.length > 0 ? `$${cleanHandle}` : null;
  } catch (error) {
    console.error('Error extracting handle from asset name:', error);
    return null;
  }
};

/**
 * Fetch ADA Handle for a payment address
 */
const getHandleForPaymentAddress = async (address: string, apiKey: string): Promise<string | null> => {
  try {
    // Normalize the address first
    const normalizedAddress = await normalizeAddress(address);

    const response = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/addresses/${normalizedAddress}`,
      {
        headers: {
          'project_id': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch address info: ${response.status} for address: ${normalizedAddress}`);
      return null;
    }

    const addressInfo = await response.json();
    
    // Check if address has any assets
    if (!addressInfo.amount || addressInfo.amount.length === 0) {
      return null;
    }

    // Look for handle assets
    for (const asset of addressInfo.amount) {
      if (asset.unit && asset.unit.startsWith(HANDLE_POLICY_ID)) {
        // Extract the asset name (everything after the policy ID)
        const assetName = asset.unit.substring(HANDLE_POLICY_ID.length);
        const handle = extractHandleFromAssetName(assetName);
        
        if (handle) {
          return handle;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching handle for payment address:', error);
    return null;
  }
};

/**
 * Fetch ADA Handle for a stake address
 */
const getHandleForStakeAddress = async (address: string, apiKey: string): Promise<string | null> => {
  try {
    // Normalize the address first
    const normalizedAddress = await normalizeAddress(address);

    // Get all payment addresses associated with this stake address
    const response = await fetch(
      `https://cardano-mainnet.blockfrost.io/api/v0/accounts/${normalizedAddress}/addresses`,
      {
        headers: {
          'project_id': apiKey,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.error(`Failed to fetch addresses for stake address: ${response.status} for address: ${normalizedAddress}`);
      return null;
    }

    const addresses = await response.json();
    
    // Check each payment address for handles
    for (const addressInfo of addresses) {
      const handle = await getHandleForPaymentAddress(addressInfo.address, apiKey);
      if (handle) {
        return handle;
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching handle for stake address:', error);
    return null;
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

    // For testnet addresses, return empty handles since handles are mainnet only
    if (address.startsWith('addr_test') || address.startsWith('stake_test')) {
      return NextResponse.json({
        success: true,
        address,
        handles: [],
        network: 'testnet'
      });
    }

    // Detect if testnet address
    const isTestnet = address.startsWith('addr_test') || address.startsWith('stake_test');
    const apiKey = getBlockfrostApiKey(isTestnet);
    console.log(`Using Blockfrost API key: ${apiKey ? apiKey.substring(0, 5) + '...' : 'None'}`);

    if (!apiKey) {
      console.error('No Blockfrost API key available');
      return NextResponse.json({
        success: false,
        error: 'Blockfrost API key not configured'
      }, { status: 500 });
    }

    // Check if this is a stake address (starts with 'stake1')
    const isStakeAddress = address.startsWith('stake1');

    let handle: string | null = null;

    if (isStakeAddress) {
      console.log(`Detected stake address: ${address}, fetching associated payment addresses`);
      handle = await getHandleForStakeAddress(address, apiKey);
    } else {
      console.log(`Detected payment address: ${address}, fetching handle directly`);
      handle = await getHandleForPaymentAddress(address, apiKey);
    }

    return NextResponse.json({
      success: true,
      address,
      handle,
      isStakeAddress
    });

  } catch (error) {
    console.error('Error in handle resolution API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
