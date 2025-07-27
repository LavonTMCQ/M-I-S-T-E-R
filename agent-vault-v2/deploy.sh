#!/bin/bash

# Agent Vault V2 Deployment Script
# Builds and deploys the secure 2x leverage Agent Vault smart contract

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
NETWORK="mainnet"  # Change to "testnet" for testing
CONTRACT_NAME="simple_test.agent_vault_v2.spend"
DEPLOYMENT_DIR="deployments"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

echo -e "${BLUE}🚀 Agent Vault V2 Deployment${NC}"
echo -e "${BLUE}==============================${NC}"
echo -e "${BLUE}Network: ${NETWORK}${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}"
echo -e "${BLUE}Contract: ${CONTRACT_NAME}${NC}"
echo ""

# Step 1: Validate prerequisites
echo -e "${BLUE}📋 Step 1: Validating Prerequisites${NC}"

# Check Aiken installation
if ! command -v aiken &> /dev/null; then
    echo -e "${RED}❌ Aiken not found. Please install Aiken first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Aiken: $(aiken --version)${NC}"

# Check Cardano CLI installation
if ! command -v cardano-cli &> /dev/null; then
    echo -e "${RED}❌ Cardano CLI not found. Please install cardano-cli first.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Cardano CLI: $(cardano-cli --version | head -n1)${NC}"

# Check if we're in the right directory
if [ ! -f "aiken.toml" ]; then
    echo -e "${RED}❌ aiken.toml not found. Please run from agent-vault-v2 directory.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Project structure validated${NC}"

echo ""

# Step 2: Build the contract
echo -e "${BLUE}🔧 Step 2: Building Smart Contract${NC}"

# Clean previous builds
if [ -d "build" ]; then
    rm -rf build
fi

# Build the contract
echo "Building Aiken contract..."
if aiken build; then
    echo -e "${GREEN}✅ Contract built successfully${NC}"
else
    echo -e "${RED}❌ Contract build failed${NC}"
    exit 1
fi

# Check if plutus.json was generated
if [ ! -f "plutus.json" ]; then
    echo -e "${RED}❌ plutus.json not found after build${NC}"
    exit 1
fi
echo -e "${GREEN}✅ plutus.json generated${NC}"

echo ""

# Step 3: Extract contract information
echo -e "${BLUE}🔍 Step 3: Extracting Contract Information${NC}"

# Extract CBOR from plutus.json
CONTRACT_CBOR=$(jq -r ".validators[] | select(.title == \"${CONTRACT_NAME}\") | .compiledCode" plutus.json)

if [ "$CONTRACT_CBOR" == "null" ] || [ -z "$CONTRACT_CBOR" ]; then
    echo -e "${RED}❌ Could not extract contract CBOR from plutus.json${NC}"
    exit 1
fi

# Create plutus script file
echo "{\"type\": \"PlutusScriptV3\", \"description\": \"Agent Vault V2 - 2x Leverage Trading\", \"cborHex\": \"$CONTRACT_CBOR\"}" > ${CONTRACT_NAME}.plutus

# Generate contract address
CONTRACT_ADDRESS=$(cardano-cli address build --payment-script-file ${CONTRACT_NAME}.plutus --${NETWORK})
echo -e "${GREEN}✅ Contract Address: ${CONTRACT_ADDRESS}${NC}"

# Calculate script hash
SCRIPT_HASH=$(cardano-cli transaction policyid --script-file ${CONTRACT_NAME}.plutus)
echo -e "${GREEN}✅ Script Hash: ${SCRIPT_HASH}${NC}"

echo ""

# Step 4: Create deployment record
echo -e "${BLUE}📝 Step 4: Creating Deployment Record${NC}"

# Create deployments directory
mkdir -p ${DEPLOYMENT_DIR}

# Create deployment record
DEPLOYMENT_FILE="${DEPLOYMENT_DIR}/agent-vault-v2-deployment-${TIMESTAMP}.json"
cat > ${DEPLOYMENT_FILE} << EOF
{
  "contractName": "${CONTRACT_NAME}",
  "contractAddress": "${CONTRACT_ADDRESS}",
  "scriptHash": "${SCRIPT_HASH}",
  "cborHex": "${CONTRACT_CBOR}",
  "network": "${NETWORK}",
  "deployedAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "version": "2.0.0",
  "features": [
    "2x leverage enforcement",
    "User deposit/withdrawal",
    "Agent trading authorization",
    "Emergency stop mechanism",
    "Strike Finance integration"
  ],
  "constants": {
    "agentVkh": "34f1cf4a537fed73e8061ff16ec347c8cf62be45abc89ec1493aba3d",
    "strikeContract": "be7544ca7d42c903268caecae465f3f8b5a7e7607d09165e471ac8b5",
    "minStrikeTrade": 40000000,
    "maxLeverage": 2,
    "minVaultBalance": 5000000
  }
}
EOF

echo -e "${GREEN}✅ Deployment record: ${DEPLOYMENT_FILE}${NC}"

echo ""

# Step 5: Generate integration code
echo -e "${BLUE}🔗 Step 5: Generating Integration Code${NC}"

# Create TypeScript configuration
INTEGRATION_FILE="${DEPLOYMENT_DIR}/agent-vault-v2-config.ts"
cat > ${INTEGRATION_FILE} << EOF
// Agent Vault V2 Configuration
// Generated on $(date)

export const AGENT_VAULT_V2_CONFIG = {
  contractAddress: "${CONTRACT_ADDRESS}",
  scriptHash: "${SCRIPT_HASH}",
  cborHex: "${CONTRACT_CBOR}",
  network: "${NETWORK}",
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
EOF

echo -e "${GREEN}✅ Integration config: ${INTEGRATION_FILE}${NC}"

echo ""

# Step 6: Summary
echo -e "${BLUE}🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""
echo -e "${BLUE}📊 DEPLOYMENT SUMMARY:${NC}"
echo -e "${BLUE}   Contract Address: ${CONTRACT_ADDRESS}${NC}"
echo -e "${BLUE}   Script Hash: ${SCRIPT_HASH}${NC}"
echo -e "${BLUE}   Network: ${NETWORK}${NC}"
echo -e "${BLUE}   Version: 2.0.0${NC}"
echo ""
echo -e "${BLUE}📁 FILES CREATED:${NC}"
echo -e "${BLUE}   Contract Script: ${CONTRACT_NAME}.plutus${NC}"
echo -e "${BLUE}   Deployment Record: ${DEPLOYMENT_FILE}${NC}"
echo -e "${BLUE}   Integration Config: ${INTEGRATION_FILE}${NC}"
echo ""
echo -e "${BLUE}🚀 NEXT STEPS:${NC}"
echo -e "${BLUE}   1. Test the contract with small amounts${NC}"
echo -e "${BLUE}   2. Integrate with frontend application${NC}"
echo -e "${BLUE}   3. Set up agent trading service${NC}"
echo -e "${BLUE}   4. Configure Strike Finance integration${NC}"
echo -e "${BLUE}   5. Deploy to production environment${NC}"
echo ""
echo -e "${GREEN}✅ Agent Vault V2 deployment pipeline completed successfully!${NC}"
