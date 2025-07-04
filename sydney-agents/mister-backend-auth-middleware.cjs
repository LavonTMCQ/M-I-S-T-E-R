/**
 * Authentication Middleware for MISTER Backend
 * Provides user extraction, validation, and security for managed wallet operations
 * 
 * NOTE: Designed for easy migration to production database later
 */

// In-memory stores (will be replaced with production DB)
const tokenStore = new Map(); // token -> userId mapping
const userStore = new Map();  // userId -> user data mapping

/**
 * Extract user information from authorization header
 */
function extractUserFromAuthHeader(authHeader) {
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
      token,
    };
  }
  
  if (token.startsWith('mister_token_')) {
    // Wallet authentication token - look up in token store
    const userId = tokenStore.get(token);
    if (userId) {
      const userData = userStore.get(userId);
      return {
        userId,
        userType: 'wallet',
        token,
        walletAddress: userData?.walletAddress,
        stakeAddress: userData?.stakeAddress,
        handle: userData?.handle,
      };
    }
  }

  return null;
}

/**
 * Validate user ownership of a resource
 */
function validateUserOwnership(extractedUser, resourceUserId) {
  if (!extractedUser || !resourceUserId) {
    return false;
  }
  
  // For wallet users, compare wallet addresses or handles
  if (extractedUser.userType === 'wallet') {
    return extractedUser.userId === resourceUserId || 
           extractedUser.walletAddress === resourceUserId ||
           (extractedUser.handle && extractedUser.handle === resourceUserId);
  }
  
  // For email users, compare user IDs
  if (extractedUser.userType === 'email') {
    return extractedUser.userId === resourceUserId;
  }
  
  return false;
}

/**
 * Authentication middleware - extracts and validates user
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const extractedUser = extractUserFromAuthHeader(authHeader);
  
  if (!extractedUser) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  
  // Attach user to request object
  req.user = extractedUser;
  next();
}

/**
 * User ownership validation middleware
 * Validates that the authenticated user owns the requested resource
 */
function requireOwnership(resourceIdParam = 'userId') {
  return (req, res, next) => {
    const resourceUserId = req.params[resourceIdParam] || req.query[resourceIdParam] || req.body[resourceIdParam];
    
    if (!resourceUserId) {
      return res.status(400).json({
        success: false,
        error: `Missing required parameter: ${resourceIdParam}`,
        code: 'MISSING_RESOURCE_ID'
      });
    }
    
    if (!validateUserOwnership(req.user, resourceUserId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied - you can only access your own resources',
        code: 'ACCESS_DENIED'
      });
    }
    
    next();
  };
}

/**
 * Managed wallet specific middleware
 * Ensures user can only access their own managed wallets
 */
function requireManagedWalletAccess(req, res, next) {
  const { user } = req;
  
  // For managed wallet operations, the user identifier should match
  // the authenticated user's identifier
  const requestedUserId = req.params.mainWalletAddress || 
                         req.params.userId || 
                         req.query.userId ||
                         req.body.userId;
  
  if (requestedUserId && !validateUserOwnership(user, requestedUserId)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied - you can only access your own managed wallets',
      code: 'MANAGED_WALLET_ACCESS_DENIED'
    });
  }
  
  // Attach user identifier for consistent API usage
  req.userIdentifier = user.userId;
  next();
}

/**
 * Store token mapping (for wallet authentication)
 */
function storeTokenMapping(token, userId, userData = {}) {
  tokenStore.set(token, userId);
  userStore.set(userId, {
    ...userData,
    lastAccess: new Date(),
  });
  
  console.log(`🔐 Stored token mapping for user: ${userId.substring(0, 12)}...`);
}

/**
 * Clear token mapping (for logout)
 */
function clearTokenMapping(token) {
  const userId = tokenStore.get(token);
  if (userId) {
    tokenStore.delete(token);
    // Note: Keep user data for potential re-authentication
    console.log(`🔐 Cleared token mapping for user: ${userId.substring(0, 12)}...`);
    return userId;
  }
  return null;
}

/**
 * Get user data by ID
 */
function getUserData(userId) {
  return userStore.get(userId) || null;
}

/**
 * Update user data
 */
function updateUserData(userId, userData) {
  const existing = userStore.get(userId) || {};
  userStore.set(userId, {
    ...existing,
    ...userData,
    lastUpdated: new Date(),
  });
}

/**
 * Error response helpers
 */
const errorResponses = {
  unauthorized: (message = 'Authentication required') => ({
    success: false,
    error: message,
    code: 'UNAUTHORIZED'
  }),
  
  forbidden: (message = 'Access denied') => ({
    success: false,
    error: message,
    code: 'FORBIDDEN'
  }),
  
  badRequest: (message = 'Bad request') => ({
    success: false,
    error: message,
    code: 'BAD_REQUEST'
  }),
  
  notFound: (message = 'Resource not found') => ({
    success: false,
    error: message,
    code: 'NOT_FOUND'
  })
};

/**
 * Logging middleware for security auditing
 */
function auditLog(req, res, next) {
  const { method, path, user } = req;
  const userInfo = user ? `${user.userType}:${user.userId.substring(0, 12)}...` : 'anonymous';
  
  console.log(`🔍 [AUDIT] ${method} ${path} - User: ${userInfo} - ${new Date().toISOString()}`);
  next();
}

/**
 * Production DB migration helpers
 * These functions will be replaced when migrating to production database
 */
const productionMigrationHelpers = {
  // TODO: Replace with actual database queries
  async findUserByToken(token) {
    // In production: SELECT * FROM users WHERE token = ?
    return getUserData(tokenStore.get(token));
  },
  
  async findManagedWalletsByUser(userId) {
    // In production: SELECT * FROM managed_wallets WHERE user_id = ?
    console.log(`📝 [PRODUCTION_TODO] Query managed wallets for user: ${userId}`);
    return [];
  },
  
  async createManagedWallet(userId, walletData) {
    // In production: INSERT INTO managed_wallets (user_id, ...) VALUES (?, ...)
    console.log(`📝 [PRODUCTION_TODO] Create managed wallet for user: ${userId}`);
    return walletData;
  },
  
  async updateManagedWallet(walletId, userId, updateData) {
    // In production: UPDATE managed_wallets SET ... WHERE id = ? AND user_id = ?
    console.log(`📝 [PRODUCTION_TODO] Update managed wallet: ${walletId} for user: ${userId}`);
    return updateData;
  },
  
  async deleteManagedWallet(walletId, userId) {
    // In production: DELETE FROM managed_wallets WHERE id = ? AND user_id = ?
    console.log(`📝 [PRODUCTION_TODO] Delete managed wallet: ${walletId} for user: ${userId}`);
    return true;
  }
};

// Export using CommonJS syntax for compatibility with .cjs files
exports.requireAuth = requireAuth;
exports.requireOwnership = requireOwnership;
exports.requireManagedWalletAccess = requireManagedWalletAccess;
exports.auditLog = auditLog;
exports.extractUserFromAuthHeader = extractUserFromAuthHeader;
exports.validateUserOwnership = validateUserOwnership;
exports.storeTokenMapping = storeTokenMapping;
exports.clearTokenMapping = clearTokenMapping;
exports.getUserData = getUserData;
exports.updateUserData = updateUserData;
exports.errorResponses = errorResponses;
exports.productionMigrationHelpers = productionMigrationHelpers;
exports.getTokenStore = () => tokenStore;
exports.getUserStore = () => userStore;
