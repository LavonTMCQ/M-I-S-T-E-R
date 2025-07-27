# MISTER Bridge Server Deployment Guide

## 🚀 Production Deployment

### Railway Deployment

1. **Connect Repository**
   - Connect this repository to Railway
   - Select the `sydney-agents` directory as the root

2. **Environment Variables**
   Copy the following environment variables to Railway:

   ```bash
   NODE_ENV=production
   PORT=4113
   
   # Discord Webhook
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/1398703610430230548/UKHnlT45pCZWLAYizmSlAJbSZVBg_FJw4r2FMrCzdYyEdFhFN_e77nRja2m7liankAXW
   
   # API URLs
   CNT_API_URL=https://cnt-trading-api-production.up.railway.app
   STRIKE_API_URL=https://app.strikefinance.org
   TWITTER_API_URL=https://twitscap-production.up.railway.app
   
   # Blockfrost & Taptools
   BLOCKFROST_PROJECT_ID_MAINNET=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
   TAPTOOLS_API_KEY=WghkJaZlDWYdQFsyt3uiLdTIOYnR5uhO
   
   # LLM Configuration
   LLM_PROVIDER=google
   LLM_MODEL=gemini-2.5-flash
   LLM_MAX_TOKENS=10000
   
   # Add your production frontend URL
   ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend-domain.com
   ```

3. **Deploy**
   - Railway will automatically build and deploy
   - The server will be available at your Railway URL
   - Health check available at `/health`

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run mister:bridge

# Start production server locally
npm run start:production
```

## 📊 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `POST /api/wallet/register` - Register wallet for trading
- `GET /api/strike/positions` - Get Strike Finance positions
- `POST /api/signals/ada-algorithm` - Generate ADA algorithm signals

### Authentication
- `POST /api/auth/wallet` - Wallet-based authentication
- `GET /api/auth/validate` - Validate authentication token
- `GET /api/auth/me` - Get current user info

### Trading
- `POST /api/agents/strike/chat` - Strike agent chat
- `GET /api/wallets/available` - Get available wallets

## 🔧 Configuration

### CORS
The server supports multiple origins for development and production. Add your production domain to `ALLOWED_ORIGINS`.

### Rate Limiting
- Strike Finance API: 15-minute cache, 5-second delays
- Wallet Registration: 1-minute cache
- Position Updates: Every 5 minutes

### Caching
- Strike Finance positions: 15 minutes
- Wallet registrations: 1 minute
- Market data: 1 minute

## 🚨 Production Checklist

- [ ] Environment variables configured
- [ ] CORS origins updated for production domain
- [ ] Discord webhook URL verified
- [ ] API keys validated
- [ ] Health check responding
- [ ] Frontend updated with production API URL

## 📈 Monitoring

### Health Check
```bash
curl https://your-railway-url.railway.app/health
```

### Logs
Monitor Railway logs for:
- API call frequency
- Strike Finance rate limiting
- Authentication issues
- Error patterns

## 🔄 Updates

To update the production server:
1. Push changes to the connected repository
2. Railway will automatically redeploy
3. Verify health check after deployment

## 🛠️ Troubleshooting

### Common Issues
1. **CORS Errors**: Update `ALLOWED_ORIGINS` environment variable
2. **Rate Limiting**: Check Strike Finance API call frequency
3. **Authentication**: Verify wallet registration flow
4. **Health Check Fails**: Check server startup logs

### Debug Commands
```bash
# Check server status
curl https://your-url/health

# Test Strike Finance API
curl "https://your-url/api/strike/positions?walletAddress=addr1..."

# Test signal generation
curl -X POST https://your-url/api/signals/ada-algorithm \
  -H "Content-Type: application/json" \
  -d '{"current_price": 0.83, "symbol": "ADA/USD"}'
```
