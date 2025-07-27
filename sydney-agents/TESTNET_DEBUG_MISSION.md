# 🚨 URGENT TESTNET DEBUG MISSION

## **CONTEXT & GOAL**
We have a **WORKING MAINNET Agent Vault system** that successfully creates smart contract vaults and executes real ADA transactions. The user wants to test this on **PREPROD TESTNET** before using real funds, but we're hitting technical roadblocks.

## **WHAT'S WORKING (MAINNET)**
✅ **Agent Vault Creation**: Successfully creates smart contracts on mainnet  
✅ **Transaction Building**: CBOR transactions work with Vespr wallet  
✅ **Wallet Integration**: Vespr wallet connects and signs transactions  
✅ **Smart Contracts**: Deployed and functional on mainnet  
✅ **API Endpoints**: Build-transaction API works for mainnet  

## **WHAT'S BROKEN (TESTNET)**
❌ **Balance Display**: Vespr shows 10,000 tADA in UI but API returns 0.000001 ADA  
❌ **Address Format**: Wallet returns HEX addresses, API needs Bech32  
❌ **API Routing**: Conflict between Pages Router and App Router endpoints  
❌ **Network Configuration**: Mixed mainnet/testnet API calls  
❌ **Transaction Signing**: Vespr error code -2 "Invalid transaction format"  

## **CURRENT STATE**
- **User's Wallet**: Vespr on Preprod network with 10,000 tADA visible
- **Frontend**: React/Next.js with wallet connection working
- **Backend**: Node.js API with Blockfrost integration
- **Smart Contract**: Deployed on both mainnet and testnet
- **Error**: Transaction builds successfully but Vespr rejects with code -2

## **TECHNICAL DETAILS**

### **Working Mainnet Addresses**
- Payment: `addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc`
- Stake: `stake1uyg2xsmvfjz6xm...`

### **Testnet Addresses (Issue)**
- Payment (HEX): `008a674e6760ac84c5f38da67395756d6a23b07ca326f88cc08464e8a14ab27a0fed3b904914bcf9bfdb01a95413211a9a681b37470fb92347`
- Payment (Bech32): `addr_test1qz9xwnn8vzkgf30n3kn889t4d44z8vru5vn03rxqs3jw3g22kfaqlmfmjpy3f08ehldsr225zvs34xngrvm5wraeydrskg5m3u`
- Stake: `stake_test1up9ty7s0a5aeqjg5hnumlkcp492pxgg6nf5pkd68p7ujx3cwh457n`

### **API Configuration**
```typescript
// TESTNET CONFIG (should work)
const blockfrostConfig = {
  projectId: 'preprodfHBBQsTsk1g3Lna67Vqb8HqZ0NbcPo1f',
  baseUrl: 'https://cardano-preprod.blockfrost.io/api/v0'
};
```

### **Error Logs**
```
✅ Transaction built successfully! CBOR length: 324
❌ Vespr wallet error: {"code":-2,"info":"An error occurred during execution of this API call."}
```

## **YOUR MISSION**

### **PRIMARY OBJECTIVE**
Fix the testnet Agent Vault creation so it works exactly like mainnet but with test ADA.

### **SPECIFIC TASKS**
1. **Fix API Routing Conflict**: Resolve Pages Router vs App Router conflict
2. **Fix Address Conversion**: Ensure HEX → Bech32 conversion works properly
3. **Fix Balance API**: Make wallet balance display correctly (10,000 tADA)
4. **Fix Transaction Format**: Resolve Vespr error code -2
5. **Preserve Mainnet Logic**: Don't break the working mainnet system

### **SUCCESS CRITERIA**
- [ ] User can create Agent Vault on testnet with 1-10 tADA
- [ ] Vespr wallet shows correct balance (10,000 tADA)
- [ ] Transaction builds and Vespr accepts it (no error -2)
- [ ] Smart contract receives the deposit
- [ ] Mainnet functionality remains intact

## **KEY FILES TO EXAMINE**

### **Frontend**
- `sydney-agents/mister-frontend/src/components/wallet/AgentVaultCreationSimple.tsx`
- `sydney-agents/mister-frontend/src/app/api/cardano/build-transaction/route.ts`
- `sydney-agents/mister-frontend/src/pages/api/cardano/build-transaction.ts` (CONFLICT!)

### **Configuration**
- `sydney-agents/mister-frontend/.env.local`
- Blockfrost API keys and endpoints

### **Debug Tools**
- `sydney-agents/mister-frontend/src/app/wallet-debug/page.tsx` (shows wallet info)

## **CONSTRAINTS**
- **DO NOT BREAK MAINNET**: The working mainnet system must remain functional
- **USE EXISTING PATTERNS**: Follow the same transaction building logic as mainnet
- **MINIMAL CHANGES**: Fix testnet without major refactoring
- **REAL TESTING**: User has real 10,000 tADA and wants to test with it

## **DEBUGGING APPROACH**
1. **Start with API routing**: Fix the Pages/App Router conflict first
2. **Test transaction building**: Use the debug tool to verify CBOR generation
3. **Check address formats**: Ensure proper Bech32 conversion
4. **Verify network config**: Confirm all APIs use testnet endpoints
5. **Test with small amounts**: Start with 1 tADA transactions

## **EXPECTED OUTCOME**
User should be able to click "Create Agent Vault" with 1 tADA, see Vespr popup with correct amount, approve it, and successfully create a testnet vault - exactly like the working mainnet version but with test funds.

## **URGENCY**
HIGH - User is frustrated with testnet delays and wants to proceed with AI trading system development. This testnet validation is blocking the main mission.

---

**Your job**: Debug and fix the testnet issues while preserving the working mainnet system. Focus on the technical problems, not the broader AI trading goals. Get testnet working so we can move forward.
