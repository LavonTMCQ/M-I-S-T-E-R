# ⚡ **MISTER Bot - Quick Reference Guide**

## 🔗 **ESSENTIAL LINKS**

| Resource | URL |
|----------|-----|
| **Railway Dashboard** | https://railway.com/project/eedfad1d-fe38-4093-ba15-b43663086cef |
| **Bot Health Check** | https://mister-trading-mcp-production.up.railway.app/health |
| **Discord Channel** | 𓄀｜mcp-analysis (ID: 1329622661831327773) |
| **Service Logs** | https://railway.com/project/eedfad1d-fe38-4093-ba15-b43663086cef/service/0f5d6713-45e2-439a-8cd2-c28f76420bb9 |

---

## ⚡ **QUICK COMMANDS**

### **Deploy Updates:**
```bash
cd MMISTERMMCP
railway up
```

### **Check Status:**
```bash
railway status
railway logs --follow
```

### **Environment Variables:**
```bash
railway variables
railway variables --set VAR_NAME=value
```

---

## 🤖 **BOT BEHAVIOR**

| Setting | Value | Description |
|---------|-------|-------------|
| **Run Frequency** | Every 1 hour | Analyzes 20 tokens |
| **Min Confidence** | 8/10 | Only high-confidence trades |
| **Min Trade Size** | 5 ADA | Minimum trade amount |
| **Max Trade %** | 80% | Max % of wallet per trade |
| **Reserve ADA** | 10 ADA | Always kept for fees |

---

## 📊 **CURRENT PORTFOLIO**

```
Total Value: 15,847,400.09 ADA (~$15.8M)
├── ADA: 49.61 ADA (0.00%)
├── STRIKE: 3,206,662 tokens (49.98% - DeFi)
└── BODEGA: 11,101,587 tokens (50.02% - New)
```

---

## 🚨 **TROUBLESHOOTING**

### **Bot Not Trading:**
- Check confidence threshold (needs ≥8/10)
- Verify portfolio limits not exceeded
- Check ADA balance > 10 ADA reserve

### **Discord Alerts Missing:**
- Verify DISCORD_TOKEN in Railway
- Check channel ID: 1329622661831327773
- Review bot permissions

### **Deployment Issues:**
- Check Railway logs for errors
- Verify all environment variables set
- Ensure health check responding

---

## 🎯 **NEXT STEPS**

1. **Monitor for 2-4 hours** - Let bot run and observe behavior
2. **Fix BODEGA categorization** - Should be "defi" not "new"
3. **Create API endpoints** - For frontend integration
4. **Build user dashboard** - Real-time bot following
5. **Multi-user support** - Scale to multiple wallets

---

**🎉 Bot is LIVE and trading! Check Discord for real-time updates!**
