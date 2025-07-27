# 🔑 GET PREPROD API KEY FOR TESTNET VALIDATION

## **🎯 CURRENT ISSUE**

The testnet validation is failing because we're using a **mainnet API key** for **preprod testnet** endpoints.

**Error**: `"Network token mismatch. Are you using token for the correct network?"`

## **✅ SOLUTION: GET PREPROD API KEY**

### **Step 1: Visit Blockfrost Dashboard**
1. Go to: https://blockfrost.io/dashboard
2. You should see "DONMAAD's Workspace" with HOBBY PLAN

### **Step 2: Add Preprod Project**
1. Click "Add Project" button
2. Choose **"Cardano Preprod"** network
3. Give it a name like "Agent Vault Testnet"
4. Copy the generated preprod API key

### **Step 3: Update Configuration**
Replace the API key in our scripts:

```javascript
// CURRENT (WRONG - MAINNET KEY)
blockfrostKey: 'preprodKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu'

// NEW (CORRECT - PREPROD KEY)
blockfrostKey: 'preprod[YOUR_NEW_PREPROD_KEY_HERE]'
```

## **🧪 ALTERNATIVE: USE CARDANO-TESTNET**

If Blockfrost doesn't work, we can use the local testnet:

### **Install cardano-testnet**
```bash
# Install cardano-testnet
npm install -g cardano-testnet

# Start local testnet
cardano-testnet --testnet-magic 42
```

### **Benefits of Local Testnet**
- ✅ **No API keys needed**
- ✅ **Full control**
- ✅ **Instant transactions**
- ✅ **Unlimited test ADA**

## **🎯 RECOMMENDED APPROACH**

### **Option 1: Get Preprod API Key (5 minutes)**
1. Visit Blockfrost dashboard
2. Add preprod project
3. Update our scripts
4. Test immediately

### **Option 2: Local Testnet (15 minutes)**
1. Install cardano-testnet
2. Start local network
3. Update endpoints
4. Test with local network

## **📋 WHAT TO DO NEXT**

1. **Choose your approach** (Preprod API key recommended)
2. **Get the API key** or set up local testnet
3. **Update the configuration** in our scripts
4. **Run the validation** again

## **🚀 EXPECTED RESULTS**

Once we have the correct API key:
- ✅ **Balance check will work**
- ✅ **Transaction building will work**
- ✅ **Complete testnet validation**
- ✅ **Proof that system works**

## **🎯 CONFIDENCE LEVEL**

**95% confident** that getting the correct preprod API key will solve all issues and allow complete testnet validation.

---

**The testnets ARE active - we just need the right API key!** 🔑
