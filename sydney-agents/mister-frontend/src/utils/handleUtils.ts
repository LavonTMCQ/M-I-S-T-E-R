/**
 * ADA Handle Resolution Utilities
 * Uses server-side API routes for Blockfrost integration
 */

// Cache for resolved handles and balances
const handleCache = new Map<string, string | null>();
const balanceCache = new Map<string, number>();

/**
 * Check if address is a stake address
 */
export const isStakeAddress = (address: string): boolean => {
  return address.startsWith('stake1') || address.startsWith('stake_test1');
};

/**
 * Get ADA Handle for any Cardano address using server-side API
 */
export const getHandleForAddress = async (address: string): Promise<string | null> => {
  // Check cache first
  if (handleCache.has(address)) {
    return handleCache.get(address) || null;
  }

  try {
    console.log(`🔍 Fetching handle for address: ${address}`);

    const response = await fetch(`/api/address/${encodeURIComponent(address)}/handles`);

    if (!response.ok) {
      console.error(`Failed to fetch handle: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.success) {
      // Cache the result
      handleCache.set(address, data.handle);
      return data.handle;
    } else {
      console.error('Handle API returned error:', data.error);
      handleCache.set(address, null);
      return null;
    }
  } catch (error) {
    console.error('Error getting handle for address:', error);
    handleCache.set(address, null);
    return null;
  }
};

/**
 * Get ADA balance for any Cardano address using server-side API
 */
export const getBalanceForAddress = async (address: string): Promise<number> => {
  // Check cache first
  if (balanceCache.has(address)) {
    return balanceCache.get(address) || 0;
  }

  try {
    console.log(`💰 Fetching balance for address: ${address}`);

    const response = await fetch(`/api/address/${encodeURIComponent(address)}/balance`);

    if (!response.ok) {
      console.error(`Failed to fetch balance: ${response.status}`);
      return 0;
    }

    const data = await response.json();

    if (data.success) {
      // Cache the result
      balanceCache.set(address, data.balance);
      return data.balance;
    } else {
      console.error('Balance API returned error:', data.error);
      balanceCache.set(address, 0);
      return 0;
    }
  } catch (error) {
    console.error('Error getting balance for address:', error);
    balanceCache.set(address, 0);
    return 0;
  }
};

/**
 * Get wallet info including handle and balance
 */
export const getWalletInfo = async (address: string): Promise<{
  address: string;
  handle: string | null;
  balance: number;
  displayName: string;
}> => {
  try {
    const [handle, balance] = await Promise.all([
      getHandleForAddress(address),
      getBalanceForAddress(address)
    ]);

    const displayName = handle || `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;

    return {
      address,
      handle,
      balance,
      displayName
    };
  } catch (error) {
    console.error('Error getting wallet info:', error);
    return {
      address,
      handle: null,
      balance: 0,
      displayName: `${address.substring(0, 8)}...${address.substring(address.length - 8)}`
    };
  }
};


