# 🧪 AGENT VAULT TESTING GUIDE

## **CRITICAL: Test Before Production Use**

The new Agent Vault contract has been deployed and all frontend components updated. **MUST TEST** with small amounts before production use.

## **NEW CONTRACT DETAILS**

### **Contract Information**
- **Address**: `addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j`
- **Script Hash**: `d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2`
- **Plutus Version**: V2
- **Registry ID**: `contract_1752955562387_7xdxbaqvf`
- **Status**: Ready for testing

## **TESTING PROTOCOL**

### **Phase 1: Basic Contract Testing** 🧪

#### **Step 1: Send Test Funds**
```bash
# Send 2 ADA to the new contract for testing
# Contract Address: addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j
```

#### **Step 2: Verify Funds Received**
- Check Blockfrost or Cardanoscan for the transaction
- Confirm 2 ADA is locked in the contract
- Note the UTxO details (tx_hash#output_index)

#### **Step 3: Test Withdrawal**
- Use the updated withdrawal transaction builder
- Attempt to withdraw 1 ADA (leave 1 ADA for fees)
- Verify transaction builds successfully
- Sign with Vespr wallet
- Confirm withdrawal completes

### **Phase 2: Frontend Integration Testing** 🖥️

#### **Step 1: Agent Vault Creation**
```typescript
// Test the updated AgentVaultCreation component
// Should use new contract address: addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j
```

#### **Step 2: Agent Vault Withdrawal**
```typescript
// Test the updated AgentVaultWithdrawal component
// Should use new script hash: d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2
```

#### **Step 3: Balance Manager**
```typescript
// Test the updated agent-vault-balance-manager
// Should query new contract address correctly
```

### **Phase 3: End-to-End Testing** 🔄

#### **Step 1: Full Agent Vault Flow**
1. Create new Agent Vault with 50 ADA
2. Verify vault creation transaction
3. Check vault balance
4. Test withdrawal of 10 ADA
5. Verify remaining balance

#### **Step 2: Automated Trading Integration**
1. Enable automated trading on vault
2. Trigger a test trade signal
3. Verify agent can execute trades
4. Check transaction history

## **VALIDATION CHECKLIST**

### **Contract Validation** ✅
- [ ] Contract address matches script hash
- [ ] Script CBOR is correct
- [ ] Plutus version is V2
- [ ] Test deposit successful
- [ ] Test withdrawal successful

### **Frontend Validation** ✅
- [ ] AgentVaultCreation uses new contract
- [ ] AgentVaultWithdrawal uses new script hash
- [ ] Balance manager queries correct address
- [ ] Transaction builder uses correct CBOR
- [ ] All hardcoded addresses updated

### **Integration Validation** ✅
- [ ] End-to-end vault creation works
- [ ] End-to-end withdrawal works
- [ ] Automated trading integration works
- [ ] No script hash mismatches occur
- [ ] Error handling works properly

## **TESTING COMMANDS**

### **Check Contract Balance**
```bash
curl -H "project_id: mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu" \
  https://cardano-mainnet.blockfrost.io/api/v0/addresses/addr1w8gnkw8z0jlyk4zsrc6rp5nv5wa9nxqmceq50jdarf0c9gs2vc87j/utxos
```

### **Verify Script Hash**
```javascript
// Use CSL to verify script hash matches contract address
const scriptBytes = Buffer.from('5857010100323232323225333002323232323253330073370e900118041baa00113233224a260160026016601800260126ea800458c024c02800cc020008c01c008c01c004c010dd50008a4c26cacae6955ceaab9e5742ae89', 'hex');
const plutusScript = CSL.PlutusScript.new_v2(scriptBytes);
const hash = Buffer.from(plutusScript.hash().to_bytes()).toString('hex');
console.log('Calculated hash:', hash);
// Should output: d13b38e27cbe4b54501e3430d26ca3ba59981bc64147c9bd1a5f82a2
```

## **ROLLBACK PLAN**

### **If Testing Fails**
1. **Immediate**: Stop all production deployments
2. **Investigate**: Check error logs and transaction details
3. **Fix**: Update contract or frontend code as needed
4. **Retest**: Repeat testing protocol
5. **Deploy**: Only proceed after successful testing

### **Emergency Contacts**
- Check contract registry for alternative contracts
- Use stuck contract documentation for reference
- Verify all script hashes before any transactions

## **SUCCESS CRITERIA**

### **Testing Complete When:**
- ✅ 2 ADA successfully deposited to new contract
- ✅ 1 ADA successfully withdrawn from new contract
- ✅ Frontend components work with new contract
- ✅ No script hash mismatch errors
- ✅ End-to-end vault creation and withdrawal work
- ✅ Automated trading integration functional

### **Production Ready When:**
- ✅ All testing criteria met
- ✅ No errors in any test scenarios
- ✅ Performance is acceptable
- ✅ Error handling works correctly
- ✅ Documentation is complete

## **POST-TESTING ACTIONS**

### **After Successful Testing**
1. **Update Status**: Mark contract as "active" in registry
2. **Deploy Production**: Update all production systems
3. **Monitor**: Watch for any issues in production
4. **Document**: Record successful deployment
5. **Cleanup**: Mark old stuck contracts as deprecated

### **Registry Updates**
```json
{
  "id": "contract_1752955562387_7xdxbaqvf",
  "status": "active",
  "metadata": {
    "notes": "Successfully tested and deployed to production",
    "testingCompleted": "2025-07-19",
    "productionDeployment": "2025-07-19"
  }
}
```

---

**🚨 CRITICAL REMINDER**: Do not use this contract in production until ALL testing phases are complete and successful.
