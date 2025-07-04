# Strike Finance Perpetuals API Documentation

This document provides detailed information about the Strike Finance Perpetuals API endpoints.

**Base URL:** `https://app.strikefinance.org`

---

## Table of Contents

1. [Position Management](#position-management)
2. [Pool Information](#pool-information)
3. [Liquidity Management](#liquidity-management)
4. [Transaction History](#transaction-history)
5. [Market Data](#market-data)
6. [Types](#types)

---

## Position Management

### Open Position

**Endpoint:** `POST /api/perpetuals/openPosition`

**Description:** Opens a new perpetual position with specified leverage and direction (Long/Short).

**Request Body:**

```typescript
{
  request: {
    bech32Address: string;
    leverage: number;
    position: "Long" | "Short";
    asset: {
      policyId: string;
      assetName: string;
    }
    collateralAmount: number;
    positionSize: number;
    enteredPrice: number;
    positionType: string;
  }
}
```

**Response:**

```typescript
{
  cbor: string;
}
```

**Example Request:**

```json
{
  "request": {
    "bech32Address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "leverage": 5,
    "position": "Long",
    "asset": {
      "policyId": "",
      "assetName": ""
    },
    "collateralAmount": 1000000000, // 1000 ADA (1,000,000,000 lovelace)
    "positionSize": 5000000000, // 5000 ADA (5,000,000,000 lovelace)
    "enteredPrice": 0.45,
    "positionType": "Long"
  }
}
```

---

### Close Position

**Endpoint:** `POST /api/perpetuals/closePosition`

**Description:** Closes an existing perpetual position and realizes profit/loss.

**Request Body:**

```typescript
{
  request: {
    address: string;
    asset: Asset;
    outRef: OutRef;
    positionSize: number;
    positionType: string;
    collateralAmount: number;
    position: Side;
  }
}
```

**Response:**

```typescript
{
  cbor: string;
}
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "asset": {
      "policyId": "",
      "assetName": ""
    },
    "outRef": {
      "txHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "outputIndex": 0
    },
    "positionSize": 5000000000, // 5000 ADA (5,000,000,000 lovelace)
    "positionType": "Long",
    "collateralAmount": 1000000000, // 1000 ADA (1,000,000,000 lovelace)
    "position": "Long"
  }
}
```

---

### Update Position

**Endpoint:** `POST /api/perpetuals/updatePosition`

**Description:** Updates stop loss and take profit prices for an existing position.

**Request Body:**

```typescript
{
  request: {
    address: string;
    asset: Asset;
    outRef: OutRef;
    stopLossPrice: number;
    takeProfitPrice: number;
  }
}
```

**Response:**

```typescript
{
  cbor: string;
}
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "asset": {
      "policyId": "",
      "assetName": ""
    },
    "outRef": {
      "txHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "outputIndex": 0
    },
    "stopLossPrice": 0.4,
    "takeProfitPrice": 0.6
  }
}
```

---

### Get Positions

**Endpoint:** `GET /api/perpetuals/getPositions?address={address}`

**Description:** Retrieves all active and pending positions for a given address.

**Query Parameters:**

- `address` (string, required): The wallet address to query positions for

**Response:**

```typescript
PerpetualInfo[]

interface PerpetualInfo {
  position: "Long" | "Short";
  positionSize: number;
  leverage: number;
  stopLoss: number;
  takeProfit: number;
  asset: {
    ticker: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    type: string;
    url: string;
    decimals: number;
    dex: string;
    perpAuthPolicyId: string;
  };
  collateral: {
    amount: number;
    ticker: string;
  };
  entryPrice: number;
  isPending: boolean;
  outRef: {
    txHash: string;
    outputIndex: number;
  };
  enteredPositionTime: number;
  status: "Pending" | "Completed";
  liquidationPrice: number;
  hourlyBorrowFee: number;
}
```

---

## Pool Information

### Get Pool Info (V1)

**Endpoint:** `GET /api/perpetuals/getPoolInfo`

**Description:** Retrieves information about the V1 perpetuals liquidity pool.

**Response:**

```typescript
{
  data: {
    totalAssetAmount: number;
    availableAssetAmount: number;
    totalLpMinted: number;
    totalValueLocked: number;
  }
}
```

---

### Get Pool Info V2

**Endpoint:** `GET /api/perpetuals/getPoolInfoV2`

**Description:** Retrieves information about the V2 perpetuals liquidity pool with enhanced features.

**Response:**

```typescript
{
  data: {
    totalAssetAmount: number;
    availableAssetAmount: number;
    totalLpMinted: number;
    totalValueLocked: number;
  }
}
```

---

### Get Overall Info

**Endpoint:** `GET /api/perpetuals/getOverallInfo`

**Description:** Retrieves overall market information including long and short interest.

**Response:**

```typescript
{
  data: {
    longInterest: number;
    shortInterest: number;
  }
}
```

---

## Liquidity Management

### Provide Liquidity

**Endpoint:** `POST /api/perpetuals/provideLiquidity`

**Description:** Provides liquidity to the perpetuals pool and receives LP tokens in return.

**Request Body:**

```typescript
{
  request: {
    address: string;
    asset: Asset;
    amount: number;
  }
}
```

**Response:**

```typescript
{
  cbor: string;
}
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "asset": {
      "policyId": "",
      "assetName": ""
    },
    "amount": 50000000000 // 50,000 ADA (50,000,000,000 lovelace)
  }
}
```

---

### Withdraw Liquidity

**Endpoint:** `POST /api/perpetuals/withdrawLiquidity`

**Description:** Withdraws liquidity from the perpetuals pool by burning LP tokens.

**Request Body:**

```typescript
{
  request: {
    address: string;
    asset: Asset;
    amount: number;
  }
}
```

**Response:**

```typescript
{
  cbor: string;
}
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "asset": {
      "policyId": "",
      "assetName": ""
    },
    "amount": 25000000000 // 25,000 ADA (25,000,000,000 lovelace)
  }
}
```

---

### Get LP Profit

**Endpoint:** `GET /api/perpetuals/getLPProfit`

**Description:** Retrieves profit information for liquidity providers.

**Response:**

```typescript
{
  data: {
    // LP profit information structure
  }
}
```

---

## Transaction History

### Get Perpetual History

**Endpoint:** `GET /api/perpetuals/getPerpetualHistory?address={address}`

**Description:** Retrieves the transaction history for perpetual trades for a specific address.

**Query Parameters:**

- `address` (string, required): The wallet address to query history for

**Response:**

```typescript
{
  transactions: PerpetualTransactionInfo[]
}

interface PerpetualTransactionInfo {
  contract: "Perpetual";
  action: string;
  assetTicker: string;
  type: "Perpetual";
  pair: string;
  time: number;
  address: string;
  txHash: string;
  status: string;
  enteredPrice: number;
  positionSize: number;
  positionType: string;
  collateralAmount: number;
  description: string;
  pnl: number;
  usdPrice?: number;
  leverage?: number;
  currentPrice: number;
}
```

---

### Get Liquidity History Transactions

**Endpoint:** `GET /api/perpetuals/getLiquidityHistoryTransactions?address={address}`

**Description:** Retrieves the transaction history for liquidity operations (provide/withdraw) for a specific address.

**Query Parameters:**

- `address` (string, required): The wallet address to query liquidity history for

**Response:**

```typescript
{
  transactions: LiquidityTransactionInfo[]
}

interface LiquidityTransactionInfo {
  txHash: string;
  depositedAssetAmount: number;
  recievedAssetAmount: number;
  assetTicker: string;
  date: number;
  action: "Assets recieved" | "LP assets recieved" | "Provide Liquidity" | "Withdraw Liquidity";
}
```

---

### Get Trade History

**Endpoint:** `GET /api/perpetuals/getTradeHistory`

**Description:** Retrieves completed trade history (currently returns empty array as placeholder).

**Response:**

```typescript
HistoryEntry[]

interface HistoryEntry {
  type: "Long" | "Short";
  asset: string;
  size: string;
  entryPrice: string;
  exitPrice: string;
  pnl: string;
  closedAt: string;
}
```

---

### Get Open Orders

**Endpoint:** `GET /api/perpetuals/getOpenOrders`

**Description:** Retrieves open orders (currently returns empty array as placeholder).

**Response:**

```typescript
OpenOrder[]

interface OpenOrder {
  type: "Long" | "Short";
  asset: string;
  size: string;
  price: string;
  timeInForce: string;
  status: string;
  date: string;
}
```

---

## Transaction Management

### Add Perpetual Transaction

**Endpoint:** `POST /api/perpetuals/addPerpetualTransaction`

**Description:** Records a perpetual transaction in the system for tracking and history purposes.

**Request Body:**

```typescript
{
  request: {
    address: string;
    historyInfo: PerpetualTransactionInfo;
    pendingInfo?: PerpetualInfo;
  }
}
```

**Response:**

```typescript
(""); // Empty string response
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "historyInfo": {
      "contract": "Perpetual",
      "action": "Open Position",
      "assetTicker": "ADA",
      "type": "Perpetual",
      "pair": "ADA/USD",
      "time": 1704067200000,
      "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
      "txHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
      "status": "Completed",
      "enteredPrice": 0.45,
      "positionSize": 5000000000, // 5000 ADA (5,000,000,000 lovelace)
      "positionType": "Long",
      "collateralAmount": 1000000000, // 1000 ADA (1,000,000,000 lovelace)
      "description": "Opened Long position",
      "pnl": 0,
      "leverage": 5,
      "currentPrice": 0.45
    },
    "pendingInfo": {
      "position": "Long",
      "positionSize": 5000000000, // 5000 ADA (5,000,000,000 lovelace)
      "leverage": 5,
      "stopLoss": 0.4,
      "takeProfit": 0.6,
      "asset": {
        "ticker": "ADA",
        "asset": {
          "policyId": "",
          "assetName": ""
        },
        "type": "native",
        "url": "/images/tokens/cardano.svg",
        "decimals": 6,
        "dex": "minswap",
        "perpAuthPolicyId": "auth123456789"
      },
      "collateral": {
        "amount": 1000000000, // 1000 ADA (1,000,000,000 lovelace)
        "ticker": "ADA"
      },
      "entryPrice": 0.45,
      "isPending": true,
      "outRef": {
        "txHash": "a1b2c3d4e5f6789012345678901234567890123456789012345678901234567890",
        "outputIndex": 0
      },
      "enteredPositionTime": 1704067200000,
      "status": "Pending",
      "liquidationPrice": 0.35,
      "hourlyBorrowFee": 0.0001
    }
  }
}
```

---

### Add Liquidity Transaction

**Endpoint:** `POST /api/perpetuals/addLiquidityTransaction`

**Description:** Records a liquidity transaction in the system for tracking purposes.

**Request Body:**

```typescript
{
  request: {
    address: string;
    transactionInfo: LiquidityTransactionInfo;
  }
}
```

**Response:**

```typescript
(""); // Empty string response
```

**Example Request:**

```json
{
  "request": {
    "address": "addr1qx2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj0vs2f9xd3c6k09qggqkqf",
    "transactionInfo": {
      "txHash": "b2c3d4e5f6789012345678901234567890123456789012345678901234567890ab",
      "depositedAssetAmount": 50000000000, // 50,000 ADA (50,000,000,000 lovelace)
      "recievedAssetAmount": 48500000000, // 48,500 ADA (48,500,000,000 lovelace)
      "assetTicker": "ADA",
      "date": 1704067200000,
      "action": "Provide Liquidity"
    }
  }
}
```

---

## Types

### Common Types

```typescript
interface Asset {
  policyId: string;
  assetName: string;
}

interface OutRef {
  txHash: string;
  outputIndex: number;
}

type Side = "Long" | "Short";

interface AssetInfo {
  asset: Asset;
  ticker: string;
  type: string;
  url: string;
  decimals: number;
  dex: string;
  perpAuthPolicyId: string;
}

interface PoolInfo {
  totalAssetAmount: number;
  availableAssetAmount: number;
  totalLpMinted: number;
  totalValueLocked: number;
}

interface MarketInfo {
  longInterest: number;
  shortInterest: number;
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```typescript
{
  error: string;
}
```

Common HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `405`: Method Not Allowed (incorrect HTTP method)
- `500`: Internal Server Error

---

## Notes

1. All monetary amounts are typically in the base unit of the asset (e.g., for ADA: 1 ADA = 1,000,000 lovelaces)
2. Prices are often scaled by 10,000 for precision (e.g., $1.50 USD = 15,000)
3. The `cbor` field in responses contains the transaction data in CBOR format for signing
4. Some endpoints support both V1 and V2 versions of the perpetuals protocol
5. All timestamps are in POSIX time (milliseconds since Unix epoch)
