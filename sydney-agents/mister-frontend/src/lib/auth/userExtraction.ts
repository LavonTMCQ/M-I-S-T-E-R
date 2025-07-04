/**
 * User Extraction Utilities for Backend Authentication
 * Provides consistent user identification from auth tokens
 */

export interface ExtractedUser {
  userId: string;
  userType: 'wallet' | 'email';
  walletAddress?: string;
  stakeAddress?: string;
  email?: string;
  handle?: string;
}

/**
 * Extract user information from authorization header
 */
export function extractUserFromAuthHeader(authHeader: string | undefined): ExtractedUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  
  // Handle different token formats
  if (token.startsWith('mock_token_')) {
    // Email authentication token
    const userId = token.replace('mock_token_', '');
    return {
      userId,
      userType: 'email',
    };
  }
  
  if (token.startsWith('mister_token_')) {
    // Wallet authentication token - need to look up in token store
    // This will be implemented in backend middleware
    return null; // Will be handled by backend token store lookup
  }

  return null;
}

/**
 * Validate user ownership of a resource
 */
export function validateUserOwnership(
  extractedUser: ExtractedUser,
  resourceUserId: string
): boolean {
  // For wallet users, compare wallet addresses
  if (extractedUser.userType === 'wallet' && extractedUser.walletAddress) {
    return extractedUser.walletAddress === resourceUserId;
  }
  
  // For email users, compare user IDs
  if (extractedUser.userType === 'email') {
    return extractedUser.userId === resourceUserId;
  }
  
  return false;
}

/**
 * Generate consistent user identifier for API operations
 */
export function generateUserIdentifier(user: ExtractedUser): string {
  if (user.userType === 'wallet' && user.walletAddress) {
    return user.walletAddress;
  }
  
  return user.userId;
}

/**
 * Backend middleware helper (for Node.js/Express)
 * This will be used in the backend API endpoints
 */
export const authMiddlewareHelpers = {
  /**
   * Extract user from request headers
   */
  extractUserFromRequest: (req: any): ExtractedUser | null => {
    const authHeader = req.headers.authorization;
    return extractUserFromAuthHeader(authHeader);
  },

  /**
   * Validate user has access to resource
   */
  validateResourceAccess: (
    extractedUser: ExtractedUser | null,
    resourceUserId: string
  ): boolean => {
    if (!extractedUser) {
      return false;
    }
    
    return validateUserOwnership(extractedUser, resourceUserId);
  },

  /**
   * Create authentication error response
   */
  createAuthError: (message: string = 'Unauthorized') => ({
    success: false,
    error: message,
  }),

  /**
   * Create forbidden error response
   */
  createForbiddenError: (message: string = 'Access denied') => ({
    success: false,
    error: message,
  }),
};

/**
 * Frontend API client helper
 */
export const apiClientHelpers = {
  /**
   * Add user context to API requests
   */
  addUserContext: (requestData: any, userIdentifier: string | null) => {
    if (!userIdentifier) {
      return requestData;
    }

    return {
      ...requestData,
      userId: userIdentifier,
    };
  },

  /**
   * Create user-specific API endpoint
   */
  createUserEndpoint: (baseEndpoint: string, userIdentifier: string | null): string => {
    if (!userIdentifier) {
      return baseEndpoint;
    }

    // For managed wallets, use the user identifier in the URL
    if (baseEndpoint.includes('/managed/')) {
      return baseEndpoint.replace('/managed/', `/managed/${userIdentifier}/`);
    }

    return `${baseEndpoint}?userId=${encodeURIComponent(userIdentifier)}`;
  },
};

/**
 * Token store interface for backend implementation
 */
export interface TokenStore {
  set: (token: string, userData: ExtractedUser) => void;
  get: (token: string) => ExtractedUser | null;
  delete: (token: string) => void;
  clear: () => void;
}

/**
 * In-memory token store implementation (for development)
 */
export function createInMemoryTokenStore(): TokenStore {
  const store = new Map<string, ExtractedUser>();

  return {
    set: (token: string, userData: ExtractedUser) => {
      store.set(token, userData);
    },

    get: (token: string) => {
      return store.get(token) || null;
    },

    delete: (token: string) => {
      store.delete(token);
    },

    clear: () => {
      store.clear();
    },
  };
}

/**
 * User identification patterns for different authentication methods
 */
export const USER_ID_PATTERNS = {
  WALLET_ADDRESS: /^addr1[a-z0-9]{50,}$/,
  STAKE_ADDRESS: /^stake1[a-z0-9]{50,}$/,
  EMAIL_USER_ID: /^temp_user_\d+_[a-z0-9]+$/,
  HANDLE: /^\$[a-zA-Z0-9_-]+$/,
} as const;

/**
 * Detect user ID type
 */
export function detectUserIdType(userId: string): 'wallet' | 'email' | 'unknown' {
  if (USER_ID_PATTERNS.WALLET_ADDRESS.test(userId) || USER_ID_PATTERNS.STAKE_ADDRESS.test(userId)) {
    return 'wallet';
  }
  
  if (USER_ID_PATTERNS.EMAIL_USER_ID.test(userId)) {
    return 'email';
  }
  
  return 'unknown';
}
