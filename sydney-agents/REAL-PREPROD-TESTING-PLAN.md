# 🧪 REAL PREPROD TESTING PLAN - 1000 ADA DEPOSITS

## **🎯 OBJECTIVE**
Test Agent Vault with **real 1000 ADA deposits and withdrawals** on Cardano preprod testnet to prove the system works with production amounts.

---

## **📋 CURRENT STATUS**
- ✅ **Transaction Building**: Works perfectly (CBOR generation)
- ✅ **Preprod API**: Connected and functional
- ✅ **Address Handling**: Fixed for testnet
- ❌ **Real Signing**: Need actual wallet with private keys
- ❌ **Large Amounts**: Need 1000+ tADA for testing

---

## **🔧 WHAT WE NEED FOR REAL TESTING**

### **1. 🏦 CONTROLLED PREPROD WALLET**
- **Create new wallet** with seed phrase we control
- **Get preprod address** for this wallet
- **Fund with 1500+ tADA** (1000 for deposit + 500 for fees/testing)

### **2. 💰 PREPROD ADA FUNDING**
- **Option A**: Multiple faucet requests (100 tADA per request)
- **Option B**: Use existing preprod ADA if available
- **Option C**: Convert mainnet ADA to preprod (if possible)

### **3. 🔐 SIGNING CAPABILITY**
- **Option A**: Use wallet browser extension (Vespr/Eternl)
- **Option B**: Programmatic signing with seed phrase
- **Option C**: Manual CBOR signing tools

---

## **🚀 STEP-BY-STEP REAL TESTING PROCESS**

### **PHASE 1: SETUP (15 minutes)**
1. **Create Test Wallet**
   ```bash
   # Generate new wallet with seed phrase
   node create-real-test-wallet.js
   ```

2. **Fund Wallet with 1500 tADA**
   ```bash
   # Multiple faucet requests or bulk funding
   node fund-test-wallet.js --amount 1500
   ```

3. **Verify Balance**
   ```bash
   # Confirm we have enough for testing
   node check-wallet-balance.js
   ```

### **PHASE 2: 1000 ADA DEPOSIT TEST (10 minutes)**
1. **Build 1000 ADA Deposit Transaction**
   ```bash
   node test-large-deposit.js --amount 1000
   ```

2. **Sign Transaction**
   - Use Vespr/Eternl browser extension
   - Or programmatic signing with seed phrase

3. **Submit to Preprod**
   - Submit signed CBOR to preprod blockchain
   - Get transaction hash

4. **Verify Deposit**
   ```bash
   # Check contract received 1000 ADA
   node verify-contract-balance.js
   ```

### **PHASE 3: LARGE WITHDRAWAL TEST (10 minutes)**
1. **Build 800 ADA Withdrawal Transaction**
   ```bash
   node test-large-withdrawal.js --amount 800
   ```

2. **Sign & Submit Withdrawal**
   - Sign with same wallet
   - Submit to preprod

3. **Verify Withdrawal**
   ```bash
   # Check 800 ADA returned to wallet
   node verify-withdrawal-success.js
   ```

### **PHASE 4: STRESS TESTING (20 minutes)**
1. **Multiple Deposits**
   - Test 500 ADA, 750 ADA, 1000 ADA deposits
   - Verify each works correctly

2. **Multiple Withdrawals**
   - Test partial withdrawals (100, 200, 500 ADA)
   - Test full withdrawal

3. **Edge Cases**
   - Test minimum amounts (1 ADA)
   - Test maximum contract balance
   - Test insufficient balance scenarios

---

## **🛠️ IMPLEMENTATION SCRIPTS NEEDED**

### **1. Real Wallet Creation**
```javascript
// create-real-test-wallet.js
// - Generate seed phrase
// - Derive preprod address
// - Store securely for testing
```

### **2. Bulk Faucet Funding**
```javascript
// fund-test-wallet.js
// - Make multiple faucet requests
// - Wait for confirmations
// - Verify total balance
```

### **3. Large Amount Testing**
```javascript
// test-large-amounts.js
// - Build 1000 ADA transactions
// - Handle large UTxO selection
// - Proper fee calculation
```

### **4. Real Transaction Signing**
```javascript
// sign-and-submit.js
// - Sign CBOR with real private key
// - Submit to preprod blockchain
// - Monitor transaction status
```

---

## **🎯 SUCCESS CRITERIA**

### **✅ DEPOSIT SUCCESS**
- [ ] 1000 tADA successfully sent to contract
- [ ] Contract balance shows 1000 tADA
- [ ] Transaction confirmed on preprod
- [ ] Proper datum attached to UTxO

### **✅ WITHDRAWAL SUCCESS**
- [ ] 800 tADA successfully withdrawn from contract
- [ ] Wallet balance increased by 800 tADA
- [ ] Contract balance reduced to 200 tADA
- [ ] Script execution successful

### **✅ SYSTEM VALIDATION**
- [ ] No transaction failures
- [ ] Proper fee handling
- [ ] Correct UTxO management
- [ ] Smart contract logic works

---

## **⚠️ RISKS & MITIGATION**

### **🔴 POTENTIAL RISKS**
1. **Lost tADA**: If transactions fail
2. **Script Errors**: If smart contract has bugs
3. **Network Issues**: If preprod is unstable

### **🛡️ MITIGATION STRATEGIES**
1. **Start Small**: Test with 10 tADA first
2. **Incremental Testing**: 10 → 100 → 500 → 1000 tADA
3. **Backup Plans**: Multiple test wallets
4. **Recovery Methods**: Ensure withdrawal always works

---

## **🚀 IMMEDIATE NEXT STEPS**

### **OPTION A: QUICK TEST (30 minutes)**
1. Create test wallet with seed phrase
2. Fund with 100 tADA from faucet
3. Test 50 tADA deposit/withdrawal
4. Scale up if successful

### **OPTION B: FULL TEST (2 hours)**
1. Create production-like test environment
2. Fund with 1500 tADA
3. Complete full 1000 ADA testing
4. Document all results

### **OPTION C: HYBRID APPROACH (1 hour)**
1. Start with 100 tADA test
2. If successful, immediately scale to 1000 tADA
3. Real-time validation and monitoring

---

## **🎉 EXPECTED OUTCOME**

**After completing this testing:**
- ✅ **Proven system works** with real 1000 ADA amounts
- ✅ **Validated on actual blockchain** (not just theory)
- ✅ **Confirmed smart contract security**
- ✅ **Ready for mainnet deployment**

**This will provide 100% confidence for production use with thousands of ADA!**

---

*Ready to execute real preprod testing with actual 1000 ADA amounts* 🚀
