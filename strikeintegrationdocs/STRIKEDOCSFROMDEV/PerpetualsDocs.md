# Open Position API Documentation

## BASE URL

https://app.strikefinance.org

## Overview

The `openPosition` API endpoint allows users to create new perpetual trading positions. It handles the creation of leveraged positions by interfacing with the perpetuals smart contract system.

## Endpoint

```
POST /api/perpetuals/openPosition
```

## Request Format

### Headers

```
Content-Type: application/json
```

### Request Body

The request body should contain a `request` object with the following structure:

```typescript
{
  request: CreatePerpetualRequest;
}
```

### CreatePerpetualRequest Interface

```typescript
interface CreatePerpetualRequest {
  address: string; // User's wallet address
  asset: {
    policyId: string; // Token policy ID
    assetName: string; // Token asset name
  };
  collateralAmount: number; // Amount of collateral in ADA (NOT LOVELACE)
  leverage: number; // Leverage multiplier (e.g., 2 for 2x)
  position: "Long" | "Short"; // Position type
  enteredPositionTime: number; // Timestamp when position was entered. In posix time.
  stopLossPrice?: number; // Optional stop loss price in USD
  takeProfitPrice?: number; // Optional take profit price in USD
}
```

## Response Format

### Success Response (200)

```typescript
{
  cbor: string; // Partially signed transaction in CBOR format
}
```

---

# Close Position API Documentation

## Overview

The `closePosition` API endpoint allows users to close existing perpetual trading positions. It handles the closure of leveraged positions by interfacing with the perpetuals smart contract system and calculating final PnL.

## Endpoint

```
POST /api/perpetuals/closePosition
```

## Request Format

### Headers

```
Content-Type: application/json
```

### Request Body

The request body should contain a `request` object with the following structure:

```typescript
{
  request: ClosePerpetualRequest;
}
```

### ClosePerpetualRequest Interface

```typescript
interface ClosePerpetualRequest {
  address: string; // User's wallet address
  asset: {
    policyId: string; // Token policy ID. Empty for ada
    assetName: string; // Token asset name. Empty for ada
  };
  outRef: {
    txHash: string; // Transaction hash of the position UTxO
    outputIndex: number; // Output index of the position UTxO
  };
  enteredPositionTime: number; // Timestamp when position was entered (posix time)
}
```

## Response Format

### Success Response (200)

```typescript
{
  cbor: string; // Partially signed transaction in CBOR format
}
```

### Error Response (400/500)

```typescript
{
  error: string; // Error message describing what went wrong
}
```

---

# Get Positions API Documentation

## Overview

The `getPositions` API endpoint allows users to retrieve all their active and pending perpetual trading positions. It returns detailed information about each position including current status, PnL calculations, and liquidation prices.

## Endpoint

```
GET /api/perpetuals/getPositions?address={userAddress}
```

## Request Format

### Headers

```
Content-Type: application/json
```

### Query Parameters

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| address   | string | Yes      | User's wallet address |

## Response Format

### Success Response (200)

```typescript
PerpetualInfo[]
```

### PerpetualInfo Interface

```typescript
interface PerpetualInfo {
  position: "Long" | "Short"; // Position side
  positionSize: number; // Size of the position
  leverage: number; // Leverage multiplier
  stopLoss: number; // Stop loss price in USD
  takeProfit: number; // Take profit price in USD
  asset: {
    ticker: string; // Asset ticker symbol
    asset: {
      policyId: string; // Token policy ID (empty for ADA)
      assetName: string; // Token asset name (empty for ADA)
    };
    type: string; // Asset type
    url: string; // Asset icon URL
    decimals: number; // Asset decimal places
    dex: string; // DEX where asset is traded
    perpAuthPolicyId: string; // Perpetuals authorization policy ID
  };
  collateral: {
    amount: number; // Collateral amount
    ticker: string; // Collateral asset ticker
    includeStrike?: boolean; // Optional strike inclusion flag
    strikeAmount?: number; // Optional strike amount
  };
  entryPrice: number; // Entry price in USD
  isPending: boolean; // Whether position is pending confirmation
  outRef: {
    txHash: string; // Transaction hash
    outputIndex: number; // Output index
  };
  enteredPositionTime: number; // Timestamp when position was entered
  status: "Pending" | "Completed"; // Position status
  liquidationPrice: number; // Liquidation price in USD
  version: number; // Contract version (0 for V1, 1+ for V2)
  hourlyBorrowFee?: number; // Optional hourly borrow fee
  originalTxHash?: string; // Optional original transaction hash
}
```

### Error Response (400/500)

```typescript
{
  error: string; // Error message describing what went wrong
}
```

## Example Usage

### Request Example

```javascript
const address = "addr1qy...";
const response = await fetch(
  `/api/perpetuals/getPositions?address=${address}`,
  {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }
);

const positions = await response.json();
```

### Response Example

```json
[
  {
    "position": "Long",
    "positionSize": 100,
    "leverage": 2,
    "stopLoss": 0.4,
    "takeProfit": 0.55,
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
      "perpAuthPolicyId": "..."
    },
    "collateral": {
      "amount": 50,
      "ticker": "ADA"
    },
    "entryPrice": 0.45,
    "isPending": false,
    "outRef": {
      "txHash": "abc123...",
      "outputIndex": 0
    },
    "enteredPositionTime": 1703097600000,
    "status": "Completed",
    "liquidationPrice": 0.35,
    "version": 1,
    "hourlyBorrowFee": 0.0001
  }
]
```

## Notes

- The API automatically detects and handles both V1 and V2 perpetuals contracts
- Pending positions are merged with confirmed positions and duplicates are removed
- Liquidation prices are calculated dynamically based on current market conditions
- Positions are sorted by entry time (newest first)
- The API handles both active positions and pending transactions
