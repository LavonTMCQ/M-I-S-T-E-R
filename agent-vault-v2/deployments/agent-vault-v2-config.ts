// Agent Vault V2 Configuration
// Generated on 2025-01-27

export const AGENT_VAULT_V2_CONFIG = {
  contractAddress: "addr1w8hksl7jnqst7e58ypcn4d6k68d6z0rw7hkuch5wad7d07c3zn2nj",
  scriptHash: "ef687fd29820bf668720713ab756d1dba13c6ef5edcc5e8eeb7cd7fb",
  cborHex: "5870010100323232323225333002323232323253330073370e900118041baa0011323322533300a3370e900018059baa0011324a2601a60186ea800452898058009805980600098049baa001163009300a0033008002300700230070013004375400229309b2b2b9a5573aaae795d0aba201",
  network: "mainnet",
  version: "2.0.0",
  
  // Contract Constants
  agentVkh: "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
  strikeContract: "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5",
  minStrikeTrade: 40_000_000,  // 40 ADA in lovelace
  maxLeverage: 2,              // 2x leverage maximum
  minVaultBalance: 5_000_000,  // 5 ADA minimum
  
  // Features
  features: {
    leverageEnforcement: true,
    userControl: true,
    agentTrading: true,
    emergencyStop: true,
    strikeFinanceIntegration: true
  }
};

// Vault Datum Type (TypeScript)
export interface VaultDatum {
  owner: string;              // User's verification key hash (hex)
  agentAuthorized: boolean;   // Whether agent trading is enabled
  totalDeposited: number;     // Total ADA deposited (lovelace)
  availableBalance: number;   // Available for trading (lovelace)
  maxTradeAmount: number;     // Maximum single trade (lovelace)
  leverageLimit: number;      // Maximum leverage (2 for 2x)
  emergencyStop: boolean;     // Emergency trading halt
  createdAt: number;         // Creation timestamp
  lastTradeAt: number;       // Last trading activity
  tradeCount: number;        // Number of trades executed
}

// Vault Redeemer Types (TypeScript)
export type VaultRedeemer = 
  | { type: 'UserDeposit'; amount: number }
  | { type: 'UserWithdraw'; amount: number }
  | { type: 'AgentTrade'; amount: number; leverage: number; position: 'Long' | 'Short'; strikeCbor: string }
  | { type: 'EmergencyStop' }
  | { type: 'UpdateSettings'; maxTradeAmount: number; leverageLimit: number };

// Agent Vault V2 Trading Signal Interface
export interface AgentVaultV2TradingSignal {
  vaultAddress: string;
  action: 'Long' | 'Short' | 'Close';
  amount: number;           // ADA amount
  leverage: number;         // 1-2x leverage
  confidence: number;       // 0-100%
  reason: string;
  stopLoss?: number;
  takeProfit?: number;
  signalId: string;
}

// Agent Vault V2 Trading Result Interface
export interface AgentVaultV2TradingResult {
  success: boolean;
  txHash?: string;
  error?: string;
  vaultAddress: string;
  action: string;
  amount: number;
  leverage: number;
  timestamp: Date;
  gasUsed?: number;
  fees?: number;
}

// Deployment Information
export const DEPLOYMENT_INFO = {
  deployedAt: "2025-01-27T20:00:00Z",
  aikenVersion: "v1.1.7",
  plutusVersion: "v3",
  network: "mainnet",
  status: "deployed"
};

// Usage Example
export const USAGE_EXAMPLE = {
  // Create vault transaction
  createVault: {
    contractAddress: AGENT_VAULT_V2_CONFIG.contractAddress,
    operation: 'UserDeposit',
    amount: 50_000_000, // 50 ADA
    userVkh: "user_verification_key_hash"
  },
  
  // Agent trade execution
  agentTrade: {
    contractAddress: AGENT_VAULT_V2_CONFIG.contractAddress,
    operation: 'AgentTrade',
    amount: 40_000_000,    // 40 ADA (Strike Finance minimum)
    leverage: 2,           // 2x leverage (maximum)
    position: 'Long',      // 'Long' or 'Short'
    strikeCbor: 'strike_finance_transaction_cbor'
  }
};
