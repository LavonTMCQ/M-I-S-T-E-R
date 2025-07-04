# Strike Agent Troubleshooting & Maintenance Guide
## Keep the First Cardano Perpetual DEX Integration Running

**Date:** January 4, 2025  
**Status:** ✅ OPERATIONAL  
**Purpose:** Comprehensive troubleshooting for Strike Finance AI Agent

---

## 🚨 EMERGENCY TROUBLESHOOTING

### Quick Health Check Commands
```bash
# 1. Check Mastra Agent Status
curl http://localhost:4112/api/agents/strikeAgent/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"health check"}]}'

# 2. Check Frontend Status
curl http://localhost:3000/api/agents/strike/chat \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"message":"test"}'

# 3. Check CSL API Status
curl http://localhost:3000/api/cardano/sign-transaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"txCbor":"test","witnessSetCbor":"test"}'
```

### Critical Service Restart
```bash
# If Strike Agent stops working:
cd sydney-agents
pkill -f "pnpm dev"
pnpm dev

# If Frontend stops working:
cd sydney-agents/mister-frontend  
pkill -f "next dev"
pnpm dev
```

---

## 🔍 COMMON ISSUES & SOLUTIONS

### Issue 1: Agent Not Responding
**Symptoms:**
- Chat shows "Strike Agent is thinking..." indefinitely
- No response from agent after 30+ seconds

**Diagnosis:**
```bash
# Check Mastra logs
cd sydney-agents
pnpm dev
# Look for errors in terminal output
```

**Solutions:**
1. **Restart Mastra Service:**
   ```bash
   cd sydney-agents
   pkill -f "pnpm dev"
   pnpm dev
   ```

2. **Check Agent Registration:**
   ```bash
   # Verify agent is registered
   curl http://localhost:4112/api/agents
   # Should include "strikeAgent"
   ```

3. **Verify User Context:**
   - Ensure wallet is connected
   - Check wallet balance > 40 ADA
   - Verify wallet type is supported (vespr, nami, eternl)

---

### Issue 2: Wallet Popup Not Appearing
**Symptoms:**
- Agent responds with "Please sign the transaction"
- No wallet popup appears
- No CBOR data found in logs

**Diagnosis:**
```bash
# Check browser console for CBOR extraction logs
# Look for: "🔍 Wallet signing required detected in response"
# Look for: "✅ Found CBOR data"
```

**Solutions:**
1. **Check CBOR Extraction:**
   ```typescript
   // In browser console, check for these logs:
   "🔍 Checking messages array for tool results..."
   "🔍 Checking steps array for tool results..."
   "🔍 Performing deep search for CBOR data..."
   ```

2. **Verify API Response Structure:**
   ```bash
   # Check API bridge logs
   cd sydney-agents/mister-frontend
   pnpm dev
   # Look for Mastra API response structure
   ```

3. **Test CBOR Detection:**
   ```javascript
   // In browser console:
   console.log('Testing CBOR detection...');
   // Check if transactionCbor variable is populated
   ```

---

### Issue 3: Transaction Signing Fails
**Symptoms:**
- Wallet popup appears and user signs
- Error: "Size mismatch when decoding Record RecD"
- Transaction fails to submit

**Diagnosis:**
```bash
# Check CSL API logs
curl http://localhost:3000/api/cardano/sign-transaction \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"txCbor":"84ac...","witnessSetCbor":"a100..."}'
```

**Solutions:**
1. **Verify CSL Dependencies:**
   ```bash
   cd sydney-agents/mister-frontend
   npm list @emurgo/cardano-serialization-lib-browser
   # Should show version ^12.1.1 or higher
   ```

2. **Check Next.js WASM Configuration:**
   ```typescript
   // Verify next.config.ts has:
   config.experiments = { asyncWebAssembly: true };
   ```

3. **Test CSL Import:**
   ```javascript
   // In Node.js console:
   const CSL = await import('@emurgo/cardano-serialization-lib-browser');
   console.log('CSL loaded:', !!CSL.Transaction);
   ```

---

### Issue 4: Strike Finance API Errors
**Symptoms:**
- Agent responds but no CBOR generated
- Strike Finance API returns 500 error
- "Insufficient collateral" errors

**Diagnosis:**
```bash
# Check Strike Finance API directly
curl https://api.strike.finance/api/perpetuals/openPosition \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "address": "addr1...",
    "asset": {"policyId": "", "assetName": ""},
    "collateralAmount": 45,
    "leverage": 2,
    "position": "Long",
    "enteredPositionTime": 1704326400000
  }'
```

**Solutions:**
1. **Verify Trade Amount:**
   - Minimum: 40 ADA
   - Maximum: Based on wallet balance
   - Must be integer (no decimals)

2. **Check Address Format:**
   ```typescript
   // Use payment address, NOT bech32 stake address
   address: "addr1q82j3cnhky8u0w4..." // ✅ Correct
   address: "stake1u9nskqht2mv36p..." // ❌ Wrong
   ```

3. **Verify Request Format:**
   ```typescript
   // Correct Strike Finance API format:
   {
     address: walletAddress,           // Payment address
     asset: { policyId: "", assetName: "" }, // ADA
     collateralAmount: 45,            // ADA amount (not lovelace)
     leverage: 2,                     // Integer
     position: "Long",                // "Long" or "Short"
     enteredPositionTime: Date.now()  // POSIX timestamp
   }
   ```

---

### Issue 5: Frontend Build Errors
**Symptoms:**
- "Expression expected" syntax errors
- TypeScript compilation failures
- Page won't load

**Diagnosis:**
```bash
cd sydney-agents/mister-frontend
pnpm build
# Check for compilation errors
```

**Solutions:**
1. **Check Critical Files:**
   ```bash
   # Verify these files exist and have no syntax errors:
   src/components/trading/AITradingChat.tsx
   src/app/api/agents/strike/chat/route.ts
   src/app/api/cardano/sign-transaction/route.ts
   ```

2. **Fix Common Syntax Issues:**
   ```typescript
   // Check for missing closing braces
   // Check for proper async/await syntax
   // Verify all imports are correct
   ```

3. **Reset to Working State:**
   ```bash
   git checkout HEAD -- src/components/trading/AITradingChat.tsx
   # Restore from backup if needed
   ```

---

## 📊 MONITORING & HEALTH CHECKS

### Daily Health Check Script
```bash
#!/bin/bash
# daily-health-check.sh

echo "🔍 Strike Agent Health Check - $(date)"

# 1. Check Mastra Agent
echo "Checking Mastra Agent..."
MASTRA_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4112/api/agents/strikeAgent/generate -X POST -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"health"}]}')
echo "Mastra Status: $MASTRA_STATUS"

# 2. Check Frontend API
echo "Checking Frontend API..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/agents/strike/chat -X POST -H "Content-Type: application/json" -d '{"message":"health"}')
echo "Frontend Status: $FRONTEND_STATUS"

# 3. Check CSL API
echo "Checking CSL API..."
CSL_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/cardano/sign-transaction -X POST -H "Content-Type: application/json" -d '{"txCbor":"test","witnessSetCbor":"test"}')
echo "CSL Status: $CSL_STATUS"

# 4. Check Strike Finance API
echo "Checking Strike Finance API..."
STRIKE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://api.strike.finance/health)
echo "Strike Finance Status: $STRIKE_STATUS"

echo "✅ Health check complete"
```

### Performance Monitoring
```bash
# Monitor response times
time curl http://localhost:4112/api/agents/strikeAgent/generate \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Go long 45 ADA"}]}'

# Monitor memory usage
ps aux | grep -E "(node|pnpm)" | grep -v grep

# Monitor disk space
df -h
```

---

## 🔧 MAINTENANCE PROCEDURES

### Weekly Maintenance
1. **Update Dependencies:**
   ```bash
   cd sydney-agents/mister-frontend
   pnpm update @emurgo/cardano-serialization-lib-browser
   pnpm update @emurgo/cardano-serialization-lib-nodejs
   ```

2. **Clear Logs:**
   ```bash
   # Clear old log files
   find . -name "*.log" -mtime +7 -delete
   ```

3. **Test End-to-End:**
   ```bash
   # Run full test sequence
   # 1. Connect wallet
   # 2. Execute test trade
   # 3. Verify transaction submission
   ```

### Monthly Maintenance
1. **Backup Configuration:**
   ```bash
   cp -r sydney-agents/src/mastra/agents/ backup/agents-$(date +%Y%m%d)/
   cp -r sydney-agents/mister-frontend/src/app/api/ backup/api-$(date +%Y%m%d)/
   ```

2. **Performance Review:**
   - Analyze transaction success rates
   - Review error logs
   - Check response times

3. **Security Audit:**
   - Review API endpoints
   - Check for dependency vulnerabilities
   - Verify wallet integration security

---

## 📞 ESCALATION PROCEDURES

### Level 1: Basic Issues
- Restart services
- Check logs
- Verify configuration

### Level 2: Complex Issues
- Review code changes
- Check dependencies
- Test individual components

### Level 3: Critical Issues
- Restore from backup
- Contact development team
- Implement emergency fixes

---

## 📋 SUCCESS METRICS

### Key Performance Indicators
- **Agent Response Time:** < 5 seconds
- **Transaction Success Rate:** > 95%
- **Wallet Popup Success:** > 98%
- **CBOR Extraction Success:** > 99%

### Monitoring Alerts
- Agent downtime > 1 minute
- Transaction failure rate > 5%
- API response time > 10 seconds
- Memory usage > 80%

---

**⚠️ MAINTENANCE NOTICE:**
This is the first perpetual DEX integration on Cardano. Maintain this system with extreme care. Any downtime affects the historic significance of this achievement.
