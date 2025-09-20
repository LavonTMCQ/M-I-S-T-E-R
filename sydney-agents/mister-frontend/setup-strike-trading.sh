#!/bin/bash

echo "🚀 Strike Finance Autonomous Trading Setup"
echo "=========================================="
echo ""
echo "This script will help you set up and test Strike Finance trading."
echo ""
echo "⚠️  SECURITY WARNINGS:"
echo "1. Never share your seed phrase"
echo "2. Never commit seed phrases to git"
echo "3. Use a test wallet first if possible"
echo "4. Understand the risks of leveraged trading"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

echo ""
echo "📝 Step 1: Enter your wallet address"
echo "Example: addr1qx..."
read -p "Wallet Address: " WALLET_ADDRESS

echo ""
echo "📝 Step 2: Enter your seed phrase (will be hidden)"
echo "Note: The seed phrase will be stored in memory only for this session"
read -s -p "Seed Phrase: " WALLET_SEED
echo ""

echo ""
echo "📝 Step 3: Choose trading parameters"
read -p "Collateral amount in ADA (default 40): " COLLATERAL
COLLATERAL=${COLLATERAL:-40}

read -p "Leverage (1-5, default 2): " LEVERAGE
LEVERAGE=${LEVERAGE:-2}

echo ""
echo "======================================"
echo "📋 Configuration Summary:"
echo "======================================"
echo "Wallet: ${WALLET_ADDRESS:0:20}..."
echo "Collateral: $COLLATERAL ADA"
echo "Leverage: ${LEVERAGE}x"
echo "Max Risk: $(($COLLATERAL * $LEVERAGE)) ADA"
echo ""
echo "Ready to test Strike Finance trading?"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Export for the test script
export WALLET_ADDRESS=$WALLET_ADDRESS
export WALLET_SEED="$WALLET_SEED"
export COLLATERAL=$COLLATERAL
export LEVERAGE=$LEVERAGE

echo ""
echo "🚀 Running Strike Finance trading test..."
echo ""

# Run the test
npx tsx test-strike-live.ts

echo ""
echo "✅ Test completed!"
echo ""
echo "📝 Next steps:"
echo "1. Check your position at https://app.strikefinance.org"
echo "2. Monitor P&L with the monitoring script"
echo "3. Set up autonomous trading signals"
echo ""