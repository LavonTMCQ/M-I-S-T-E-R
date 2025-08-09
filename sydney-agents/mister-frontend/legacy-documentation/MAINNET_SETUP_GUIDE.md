# 🚨 MAINNET SETUP GUIDE - Production Testing with Real ADA

## ⚠️ CRITICAL SAFETY INFORMATION

**YOU WILL BE USING REAL ADA ON CARDANO MAINNET!**

This guide shows you how to test the working vault implementation with real ADA on mainnet. The system has built-in safety limits (max 5 ADA per transaction) for testing purposes.

## 🎯 Why Mainnet Testing?

- Testnet faucets can be unreliable (as you experienced)
- Small amounts of real ADA provide immediate, reliable testing
- Validates the contract works in production environment
- Builds confidence before larger deployments

## 📋 Prerequisites

1. **Blockfrost Mainnet API Key**
   - Register at https://blockfrost.io/
   - Create a mainnet project
   - Copy your API key

2. **Real ADA**
   - Have 3-5 ADA available for testing
   - We'll only use 1-2 ADA per test transaction

3. **Understanding of Risks**
   - This uses real money
   - Smart contracts can have bugs
   - Only test with amounts you can afford to lose

## 🚀 Step-by-Step Setup

### 1. Configure Mainnet Environment

```bash
# Navigate to the project
cd sydney-agents/mister-frontend/cardano-service

# Create mainnet environment file
cp .env.mainnet .env

# Edit the .env file and add your Blockfrost API key:
# CARDANO_NETWORK=mainnet
# BLOCKFROST_MAINNET_PROJECT_ID=mainnet_your_api_key_here
```

### 2. Start Mainnet Services

```bash
# From mister-frontend directory
./start-mainnet-vault.sh
```

This will:
- Ask for confirmation (type "I UNDERSTAND")
- Start Cardano service in mainnet mode
- Start Next.js frontend
- Show clear warnings about real ADA usage

### 3. Access the Vault

- **Frontend**: http://localhost:3000/working-aiken-vault
- **API**: http://localhost:3001

You'll see red warning banners indicating mainnet mode.

## 🧪 Testing Process

### Option 1: Automated Testing (Recommended)

```bash
./test-mainnet-vault.sh
```

This script will:
1. Generate a mainnet wallet
2. Ask you to fund it with 2-3 ADA
3. Test locking 2 ADA to the vault
4. Wait for confirmation
5. Test unlocking the funds

### Option 2: Manual Testing

1. **Health Check**:
   ```bash
   curl http://localhost:3001/health
   ```
   Verify `"network": "mainnet"` in response

2. **Generate Wallet**:
   ```bash
   curl -X POST http://localhost:3001/generate-credentials
   ```
   Copy the address and fund it with 2-3 ADA

3. **Test Lock** (replace with your seed):
   ```bash
   curl -X POST http://localhost:3001/lock \
     -H "Content-Type: application/json" \
     -d '{"seed":"your_seed_here","amount":"2000000"}'
   ```

4. **Test Unlock** (replace with your seed and tx hash):
   ```bash
   curl -X POST http://localhost:3001/unlock \
     -H "Content-Type: application/json" \
     -d '{"seed":"your_seed_here","txHash":"your_tx_hash_here"}'
   ```

## 💰 Safety Features

### Built-in Protections

1. **Amount Limit**: Maximum 5 ADA per transaction (enforced by code)
2. **Clear Warnings**: Red alerts throughout the UI
3. **Confirmation Required**: Scripts ask for explicit confirmation
4. **Network Verification**: All endpoints show which network is being used

### Manual Safety Checks

1. **Verify Script Address**: Always check the script address before funding
2. **Start Small**: Begin with 1-2 ADA transactions
3. **Monitor Transactions**: Use CardanoScan.io to track your transactions
4. **Keep Records**: Save wallet seeds and transaction hashes

## 🔍 Monitoring Your Transactions

### CardanoScan.io
- View transaction details: https://cardanoscan.io/transaction/YOUR_TX_HASH
- Check wallet balance: https://cardanoscan.io/address/YOUR_WALLET_ADDRESS
- Verify script address: https://cardanoscan.io/address/YOUR_SCRIPT_ADDRESS

### Service Logs
The service provides detailed logging:
- Shows network being used
- Displays transaction amounts in ADA
- Warns when using real ADA
- Shows transaction hashes

## 🛠️ Configuration Files

### Environment Files

```bash
# .env.mainnet (template)
CARDANO_NETWORK=mainnet
BLOCKFROST_MAINNET_PROJECT_ID=mainnet_your_api_key_here
CARDANO_SERVICE_PORT=3001

# .env.testnet (template)  
CARDANO_NETWORK=preprod
BLOCKFROST_TESTNET_PROJECT_ID=preprod_your_api_key_here
CARDANO_SERVICE_PORT=3001
```

### Switching Networks

```bash
# For mainnet
cp cardano-service/.env.mainnet cardano-service/.env
./start-mainnet-vault.sh

# For testnet
cp cardano-service/.env.testnet cardano-service/.env
./start-working-vault.sh
```

## 📊 Expected Results

### Successful Test Flow:
1. ✅ Service starts in mainnet mode
2. ✅ Generate mainnet wallet address
3. ✅ Fund wallet with 2-3 ADA
4. ✅ Lock 2 ADA to vault (get transaction hash)
5. ✅ Wait ~30 seconds for confirmation
6. ✅ Unlock ADA from vault (get new transaction hash)
7. ✅ Check wallet balance to confirm funds returned

### Transaction Details:
- **Lock Transaction**: ~0.18 ADA fee + your deposit
- **Unlock Transaction**: ~0.4 ADA fee (higher due to script execution)
- **Net Cost**: ~0.6 ADA in fees for complete test cycle

## 🚨 Emergency Procedures

### If Lock Works but Unlock Fails:
1. Don't panic - funds are in the script address
2. Check transaction confirmation (wait 5-10 minutes)
3. Verify you have sufficient wallet balance for fees
4. Try unlock again with correct transaction hash

### Service Issues:
```bash
# Kill all processes and restart
lsof -ti:3001 | xargs kill -9
lsof -ti:3000 | xargs kill -9
./start-mainnet-vault.sh
```

## 🎉 Production Readiness Verification

After successful mainnet testing, you'll have proven:
- ✅ Smart contract works on mainnet
- ✅ MeshJS integration is correct
- ✅ Transaction building/signing works
- ✅ Service architecture is sound
- ✅ Network switching works properly
- ✅ Safety limits are enforced

## 📝 Next Steps After Testing

1. **Document Script Address**: Save the mainnet script address for reference
2. **Backup Test Wallets**: Keep records of successful test wallets
3. **Scale Gradually**: If needed, increase transaction limits carefully
4. **Monitor Performance**: Track transaction fees and confirmation times
5. **Plan Production**: Consider multi-sig, governance, or automated systems

---

**Remember**: This is REAL MONEY. Always double-check everything and start with minimal amounts you can afford to lose!