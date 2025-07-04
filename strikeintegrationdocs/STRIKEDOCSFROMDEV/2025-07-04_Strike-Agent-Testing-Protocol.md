# Strike Agent Testing Protocol
## Comprehensive Testing for Cardano's First Perpetual DEX AI Integration

**Date:** January 4, 2025  
**Status:** ✅ VALIDATED  
**Purpose:** Ensure Strike Finance AI Agent remains operational

---

## 🧪 MANDATORY TESTING SEQUENCE

### Pre-Deployment Testing Checklist
Before making ANY changes to the Strike Agent system, run this complete test sequence:

```
[ ] 1. Environment Setup Test
[ ] 2. Agent Response Test  
[ ] 3. CBOR Generation Test
[ ] 4. Wallet Integration Test
[ ] 5. Transaction Signing Test
[ ] 6. Network Submission Test
[ ] 7. Error Handling Test
[ ] 8. Performance Test
```

---

## 🔧 TEST 1: ENVIRONMENT SETUP

### Prerequisites
- Cardano wallet with 100+ ADA
- Vespr/Nami/Eternl wallet extension installed
- Both services running (Mastra + Frontend)

### Setup Commands
```bash
# Terminal 1: Start Mastra
cd sydney-agents
pnpm dev
# Wait for: "🚀 Mastra is running on http://localhost:4112"

# Terminal 2: Start Frontend  
cd sydney-agents/mister-frontend
pnpm dev
# Wait for: "Ready - started server on 0.0.0.0:3000"

# Terminal 3: Verify Services
curl http://localhost:4112/health
curl http://localhost:3000/api/health
```

### Expected Results
- ✅ Mastra running on port 4112
- ✅ Frontend running on port 3000
- ✅ No compilation errors
- ✅ Wallet extension detected

---

## 🤖 TEST 2: AGENT RESPONSE

### Test Commands
```bash
# Direct API Test
curl http://localhost:4112/api/agents/strikeAgent/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{
      "role": "user", 
      "content": "User Context:\n- Wallet Address: addr1q82j3cnhky8u0w4wa0ntsgeypraf24jxz5qr6wgwcy97u7t8pvpwk4ker5z2lmfsjlvx0y2tex68ahdwql9xkm9urxks9n2nl8\n- Stake Address: stake1u9nskqht2mv36p90a5cf0kr8j99undr7mkhq0jntdj7pntgqfpmzy\n- Balance: 98.19 ADA\n- Wallet Type: vespr\n- ADA Handle: $@misterexc6\n\nUser Message: Hello"
    }]
  }'
```

### Frontend Test
1. Navigate to http://localhost:3000/trading
2. Connect wallet
3. Type: "Hello" in chat
4. Wait for agent response

### Expected Results
- ✅ Agent responds within 5 seconds
- ✅ Response includes user context acknowledgment
- ✅ No error messages in console
- ✅ Chat interface remains responsive

---

## 📋 TEST 3: CBOR GENERATION

### Test Trade Command
```bash
# Frontend Chat Input
"Go long 45 ADA with 2x leverage"
```

### Monitor Logs
```bash
# Terminal 1 (Mastra): Look for
"🔗 Registering connected wallet"
"🎯 Executing manual trade"
"📋 Connected wallet trade prepared - CBOR ready for frontend signing"
"📋 CBOR length: XXXX characters"

# Terminal 2 (Frontend): Look for  
"🔍 Wallet signing required detected in response"
"🔍 Checking messages array for tool results..."
"✅ Found CBOR data"
```

### Expected Results
- ✅ Strike Finance API returns 200 OK
- ✅ CBOR generated (8000+ characters)
- ✅ Frontend detects signing requirement
- ✅ CBOR extracted successfully

---

## 🔐 TEST 4: WALLET INTEGRATION

### Wallet Popup Test
1. Execute trade command from Test 3
2. Wait for agent response
3. Observe wallet behavior

### Expected Results
- ✅ Vespr/Nami wallet popup appears
- ✅ Transaction details visible in wallet
- ✅ User can review transaction
- ✅ Signing option available

### Wallet Signing Test
1. Click "Sign" in wallet popup
2. Monitor browser console
3. Check for success/error messages

### Expected Results
- ✅ Wallet signs transaction successfully
- ✅ witnessSetCbor generated (~200 bytes)
- ✅ No wallet errors
- ✅ Frontend receives signature

---

## 🔧 TEST 5: TRANSACTION SIGNING (CSL)

### CSL API Test
```bash
# Test CSL endpoint directly
curl http://localhost:3000/api/cardano/sign-transaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "txCbor": "84ac00d9010282825820...",
    "witnessSetCbor": "a100818258..."
  }'
```

### Monitor CSL Logs
```bash
# Look for in browser console:
"🔧 CSL: Starting proper Cardano transaction signing..."
"✅ CSL: Cardano Serialization Library loaded"
"✅ CSL: Original transaction parsed successfully"
"✅ CSL: Wallet witness set parsed successfully"
"✅ CSL: Final transaction built successfully"
```

### Expected Results
- ✅ CSL loads without errors
- ✅ Transaction parsed successfully
- ✅ Witness sets combined properly
- ✅ Final transaction generated
- ✅ No CBOR structure errors

---

## 🚀 TEST 6: NETWORK SUBMISSION

### Transaction Submission Test
1. Complete Tests 1-5 successfully
2. Allow wallet signing to complete
3. Monitor final submission

### Monitor Submission Logs
```bash
# Look for:
"🚀 Submitting transaction to Cardano network..."
"🎉 Transaction successfully submitted! Hash: XXXXXXX"
```

### Verify Transaction
```bash
# Check transaction on Cardanoscan
curl https://cardanoscan.io/api/transaction/TRANSACTION_HASH
```

### Expected Results
- ✅ Transaction submits to Cardano network
- ✅ Transaction hash returned
- ✅ Transaction appears on Cardanoscan
- ✅ Success message displayed in chat

---

## ❌ TEST 7: ERROR HANDLING

### Error Scenario Tests

#### Test 7A: Insufficient Balance
```bash
# Input: Trade amount > wallet balance
"Go long 1000 ADA with 2x leverage"
```
**Expected:** Graceful error message

#### Test 7B: Invalid Trade Amount
```bash
# Input: Below minimum (40 ADA)
"Go long 30 ADA with 2x leverage"
```
**Expected:** Strike Finance API error handled

#### Test 7C: Wallet Disconnection
1. Start trade
2. Disconnect wallet during process
**Expected:** Clear error message

#### Test 7D: Network Issues
1. Disconnect internet
2. Attempt trade
**Expected:** Network error handling

### Expected Error Behaviors
- ✅ Clear error messages displayed
- ✅ No system crashes
- ✅ User can retry after fixing issue
- ✅ Logs contain debugging information

---

## ⚡ TEST 8: PERFORMANCE

### Response Time Test
```bash
# Measure agent response time
time curl http://localhost:4112/api/agents/strikeAgent/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Go long 45 ADA"}]}'
```

### Load Test
```bash
# Multiple concurrent requests
for i in {1..5}; do
  curl http://localhost:3000/api/agents/strike/chat \
    -X POST \
    -H "Content-Type: application/json" \
    -d '{"message":"test"}' &
done
wait
```

### Memory Usage Test
```bash
# Monitor memory during operation
ps aux | grep -E "(node|pnpm)" | awk '{print $4, $11}'
```

### Expected Performance
- ✅ Agent response: < 10 seconds
- ✅ CBOR generation: < 5 seconds
- ✅ CSL processing: < 2 seconds
- ✅ Memory usage: < 1GB total

---

## 📊 TEST RESULTS TEMPLATE

### Test Execution Report
```
Date: ___________
Tester: ___________
Environment: ___________

TEST RESULTS:
[ ] Test 1: Environment Setup - PASS/FAIL
[ ] Test 2: Agent Response - PASS/FAIL  
[ ] Test 3: CBOR Generation - PASS/FAIL
[ ] Test 4: Wallet Integration - PASS/FAIL
[ ] Test 5: Transaction Signing - PASS/FAIL
[ ] Test 6: Network Submission - PASS/FAIL
[ ] Test 7: Error Handling - PASS/FAIL
[ ] Test 8: Performance - PASS/FAIL

TRANSACTION HASH: ___________
TOTAL TIME: ___________
ISSUES FOUND: ___________

OVERALL STATUS: PASS/FAIL
```

---

## 🚨 FAILURE PROTOCOLS

### If Any Test Fails
1. **STOP** - Do not proceed with deployment
2. **Document** - Record exact error messages
3. **Investigate** - Use troubleshooting guide
4. **Fix** - Address root cause
5. **Retest** - Run complete sequence again

### Critical Failure Response
If Tests 1-6 fail:
1. Revert to last known working state
2. Check git history for recent changes
3. Restore from backup if necessary
4. Contact development team

---

## 🔄 REGRESSION TESTING

### After Any Code Changes
- Run complete test sequence
- Compare results with baseline
- Document any performance changes
- Update documentation if needed

### Before Major Releases
- Run extended test suite
- Test with multiple wallet types
- Verify on different browsers
- Load test with higher volumes

---

**⚠️ TESTING MANDATE:**
This testing protocol is MANDATORY before any changes to the Strike Agent system. This represents the first AI agent integration with a Cardano perpetual DEX - maintain the highest testing standards.
