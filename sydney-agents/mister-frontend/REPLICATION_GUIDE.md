# MISTER Frontend – Complete Replication Guide (Production-Ready)

This guide enables a senior developer to clone and fully replicate the MISTER trading frontend with real services (no mocks), including Strike Finance integration, live data, and a backtesting page.

## 0) Repo & Prereqs
- Node.js 18+
- pnpm or npm
- Blockfrost Mainnet API key (Project ID)
- Access to production services (Railway/Mastra Cloud)

Repo paths in this guide are relative to `sydney-agents/mister-frontend`.

## 1) Canonical Production Endpoints (verified)
- Mastra Cloud: https://substantial-scarce-magazin.mastra.cloud
- Strike Bridge Server (canonical): https://bridge-server-cjs-production.up.railway.app
- Cardano service proxy: https://friendly-reprieve-production.up.railway.app
- CNT Trading API: https://cnt-trading-api-production.up.railway.app
- MisterLabs220 Algo: https://misterlabs220-production.up.railway.app (WS: wss://misterlabs220-production.up.railway.app/ws)
- Blockfrost: https://cardano-mainnet.blockfrost.io/api/v0

Health checks:
- Bridge health: GET https://bridge-server-cjs-production.up.railway.app/health
- Bridge Strike health: GET https://bridge-server-cjs-production.up.railway.app/api/strike/health

## 2) Environment Configuration (.env.local)
Create `sydney-agents/mister-frontend/.env.local` with:

```
# Cardano Service (Railway Deployed)
CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app
NEXT_PUBLIC_CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app

# Core Services (Production)
NEXT_PUBLIC_API_URL=https://bridge-server-cjs-production.up.railway.app
NEXT_PUBLIC_MASTRA_API_URL=https://substantial-scarce-magazin.mastra.cloud
NEXT_PUBLIC_CNT_API_URL=https://cnt-trading-api-production.up.railway.app
NEXT_PUBLIC_STRIKE_API_URL=https://bridge-server-cjs-production.up.railway.app

# Blockfrost (Cardano API)
BLOCKFROST_PROJECT_ID=<YOUR_MAINNET_PROJECT_ID>
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=<YOUR_MAINNET_PROJECT_ID>

# Optional (Algo & Discord)
NEXT_PUBLIC_ALGO_API_URL=https://misterlabs220-production.up.railway.app
NEXT_PUBLIC_ALGO_WS_URL=wss://misterlabs220-production.up.railway.app/ws
NEXT_PUBLIC_DISCORD_WEBHOOK_URL=<YOUR_DISCORD_WEBHOOK>
```

## 3) Dependency Installation
From `sydney-agents/mister-frontend`:

```
pnpm install
# or
npm install
```

## 4) Strike Finance – Real Integration (no mocks)
The canonical bridge URL is now used across the app. We replaced mock Strike service wiring.

- Config (canonical URL): `src/lib/api-config.ts` → production `STRIKE_API_URL` points to the CJS Bridge.
- Production wiring: `src/services/strike-finance/index.ts` now delegates to `OneClickExecutionService`.
- Server execution route: `src/app/api/strike/trade/route.ts` (for server-side execution).

Recommendation: use the server-side route from the UI for execution. It centralizes validation, avoids CORS, and protects any sensitive handling.

## 5) Backtesting Page (Scaffolded)
A new backtesting page is added at `/backtest-results`:
- File: `src/app/backtest-results/page.tsx`
- Action: Click "Run Backtest" to POST to `POST /api/backtest/ada-custom-algorithm` on the Bridge (`bridge-server-cjs-production`).
- Display: Renders a TradingView-style chart using `components/charts/TradingViewChart.tsx` and lists trades (LONG/SHORT) with entry/exit.
- Notes: If your Python backtesting service is deployed separately, update the POST target in the page or add a server route proxying to your deployment.

Optional: Deploy `sydney-agents/backtesting-service` (Flask) to Railway using its provided scripts and point the frontend to that URL instead of the bridge if desired.

## 6) External Services Checklist
Ensure the following services are running and reachable:
- Mastra Cloud at https://substantial-scarce-magazin.mastra.cloud
- Strike Bridge Server at https://bridge-server-cjs-production.up.railway.app
- Cardano service proxy at https://friendly-reprieve-production.up.railway.app
- CNT Trading API at https://cnt-trading-api-production.up.railway.app
- MisterLabs220 Algo at https://misterlabs220-production.up.railway.app (WebSocket enabled)
- Blockfrost Mainnet project ID configured in .env.local
- Discord webhook (optional)

## 7) Run & Verify
```
# Start frontend
pnpm dev
# or
npm run dev
```

Visit http://localhost:3000

### Verify Wallet Integration
- Connect CIP-30 wallet (Vespr, Nami, Eternl, Flint)
- Observe stake/payment address recognition and live balance

### Verify Market Data & Charts
- Navigate to /trading → live Kraken OHLC should populate charts

### Verify Strike Positions & Health
- From the Bridge:
  - GET https://bridge-server-cjs-production.up.railway.app/api/strike/health → should return operational
  - Use in-app positions panel or server route `/api/strike/positions`

### Verify Trade Execution (Server-side)
- Trigger a test execution via UI that calls `POST /api/strike/trade` (Next.js API)
- Confirm success response and any Discord notification (if enabled)

### Verify Backtesting Page
- Go to /backtest-results
- Select timeframe/symbol → Run Backtest
- Expect chart render and list of trades; if the bridge endpoint is unavailable, check service logs or point to your Python backtester deployment

## 8) Operations – Health & Troubleshooting
- Bridge health: GET /health, GET /api/strike/health
- Next API logs: check Vercel/host logs (if deployed)
- Blockfrost issues: verify project ID and rate limits
- Wallet issues: confirm CIP-30 enablement and permissions

## 9) Notes on Architecture Choices
- Strike execution via server route is recommended (security & CORS).
- Client-side `OneClickExecutionService` is available for advanced UI flows but should still use server routes for the final API call to Bridge/Strike.

## 10) What Was Updated in This Commit
- Canonical Bridge URL set to `bridge-server-cjs-production.up.railway.app`
- api-config.ts updated (production STRIKE_API_URL)
- Railway deployment guide updated for health checks and endpoint
- strike-finance/index.ts switched from mock to real OneClick wiring
- New page `/backtest-results` scaffolded and connected to Bridge

You are now ready to replicate the full MISTER frontend with real data and execution.

