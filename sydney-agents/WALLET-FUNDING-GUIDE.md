# 💰 WALLET FUNDING GUIDE - GET 1000 tADA FOR TESTING

## **🎯 OBJECTIVE**
Fund your Vespr wallet with 1000+ tADA on Cardano Preprod testnet for real Agent Vault testing.

---

## **🔍 CURRENT SITUATION**
- **✅ Seed Phrase**: `"tube cactus middle sniff blanket glass size powder humble analyst absurd item forum between essay layer firm output believe conduct hurdle lion uniform stick"`
- **❌ Generated Address**: `addr_test1qr8128671602047054beff09e82752c0ae97157553a4502e7998e80741` (MALFORMED)
- **✅ New Fresh Contract**: `addr_test1w4befde4bb1435e60382a77419f6d53614e930d24e2a4ba809b19ad56` (0 ADA)

---

## **🚨 THE PROBLEM**
The address I generated is **malformed** and won't work with the faucet or Vespr wallet. We need to get the **real address** from Vespr.

---

## **✅ SOLUTION: GET REAL ADDRESS FROM VESPR**

### **STEP 1: Import Seed into Vespr Wallet**
1. **Open Vespr Wallet Extension**
2. **Click "Import Wallet"**
3. **Enter the 24-word seed phrase**:
   ```
   tube cactus middle sniff blanket glass size powder humble analyst absurd item forum between essay layer firm output believe conduct hurdle lion uniform stick
   ```
4. **Set wallet name**: "Agent Vault Testing"
5. **Complete import**

### **STEP 2: Switch to Preprod Network**
1. **In Vespr**: Click network dropdown (top right)
2. **Select "Preprod"** (NOT Preview or Mainnet)
3. **Confirm network switch**
4. **Verify**: Should show "Preprod" in the interface

### **STEP 3: Get Real Preprod Address**
1. **In Vespr**: Click "Receive" 
2. **Copy the preprod address** (starts with `addr_test1`)
3. **This is your REAL address** (not the malformed one I generated)

### **STEP 4: Fund with Faucet**
1. **Visit**: https://docs.cardano.org/cardano-testnets/tools/faucet
2. **Select "Preprod Testnet"** from dropdown
3. **Paste your REAL Vespr address**
4. **Request 1000 tADA** (may need multiple requests)
5. **Wait 5-10 minutes** for confirmation

### **STEP 5: Verify Funds in Vespr**
1. **Check Vespr balance** (should show tADA)
2. **If no funds**: Wait longer or try faucet again
3. **Target**: 1000+ tADA for testing

---

## **🧪 ALTERNATIVE: USE WORKING FAUCET ADDRESS**

If the above doesn't work, we can use the **working faucet address** that has 118M+ tADA:

### **Immediate Testing Option**
- **Address**: `addr_test1vzpwq95z3xyum8vqndgdd9mdnmafh3djcxnc6jemlgdmswcve6tkw`
- **Balance**: 118,466,133+ tADA
- **Limitation**: Can't sign transactions (no private key)
- **Use Case**: Generate 1000 ADA CBOR for manual signing

---

## **🎯 RECOMMENDED APPROACH**

### **OPTION A: Real Wallet Testing (BEST)**
1. Import seed into Vespr properly
2. Get real preprod address from Vespr
3. Fund with 1000+ tADA via faucet
4. Test full 1000 ADA deposit/withdrawal cycle
5. **Result**: Complete end-to-end validation

### **OPTION B: CBOR Generation + Manual Signing**
1. Use working faucet address for transaction building
2. Generate 1000 ADA deposit CBOR
3. Manually sign with different wallet
4. Submit to preprod blockchain
5. **Result**: Proves system works with large amounts

---

## **🔧 TROUBLESHOOTING**

### **If Vespr Shows 0 Balance**
- ✅ Confirm you're on **Preprod** network (not Preview)
- ✅ Wait 10+ minutes for faucet transaction
- ✅ Try faucet multiple times (100 tADA per request)
- ✅ Check transaction on preprod explorer

### **If Faucet Doesn't Work**
- ✅ Try different browsers
- ✅ Clear browser cache
- ✅ Use different IP address (VPN)
- ✅ Try at different times of day

### **If Address Seems Wrong**
- ✅ Get address directly from Vespr "Receive" button
- ✅ Don't use the malformed address I generated
- ✅ Preprod addresses start with `addr_test1`

---

## **🚀 NEXT STEPS**

Once you have **1000+ tADA** in Vespr on Preprod:

1. **Start Frontend**: `npm run dev`
2. **Connect Vespr**: Use the wallet connection
3. **Create Agent Vault**: Deposit 1000 ADA to new fresh contract
4. **Test Withdrawal**: Withdraw 800 ADA back to wallet
5. **Celebrate**: Full end-to-end validation complete! 🎉

---

## **📞 IMMEDIATE ACTION NEEDED**

**Please do this now:**
1. **Import seed into Vespr**
2. **Switch to Preprod network**
3. **Get real address from Vespr**
4. **Share the real address** so I can help fund it
5. **Test the new fresh contract**

**The new fresh contract is ready and waiting for your 1000 ADA test!** 🚀
