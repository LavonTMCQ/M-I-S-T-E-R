# Perpetuals API Documentation

This document provides detailed information about the perpetuals trading API endpoints.

## Endpoints Overview

- `POST /api/perpetuals/openPosition` - Open a new perpetual position
- `POST /api/perpetuals/openLimitOrder` - Create a limit order for a perpetual position
- `POST /api/perpetuals/closePosition` - Close an existing perpetual position
- `POST /api/perpetuals/updatePosition` - Update stop loss and take profit for a position
- `GET /api/perpetuals/getPositions` - Retrieve all positions for an address

---

## POST /api/perpetuals/openPosition

Opens a new perpetual trading position (market order).

### Request Body

```typescript
{
  request: {
    address: string;              // User's wallet address
    asset: {                      // Asset to trade
      policyId: string;
      assetName: string;
    };
    assetTicker: string;          // "ADA" or "SNEK"
    collateralAmount: number;     // Amount of collateral to use
    leverage: number;             // Leverage multiplier (e.g., 2, 5, 10)
    position: "Long" | "Short";   // Position direction
    stopLossPrice?: number;       // Optional stop loss price
    takeProfitPrice?: number;     // Optional take profit price
  }
}
```

### Response

```typescript
{
  cbor: string;     // Transaction CBOR for signing
  txHash?: string;  // Transaction hash (if available)
  error?: string;   // Error message (if failed)
}
```

### Validations

- Checks liquidity availability (utilization rate must be ≤95%)
- Validates stop loss prices against liquidation price
- Calculates opening fees and hourly borrow fees
- Supports both ADA and SNEK assets with different price multipliers

---

## POST /api/perpetuals/openLimitOrder

Creates a limit order that will execute when the asset price reaches the specified limit price.

### Request Body

```typescript
{
  request: {
    address: string;              // User's wallet address
    asset: {                      // Asset to trade
      policyId: string;
      assetName: string;
    };
    assetTicker: string;          // "ADA" or "SNEK"
    collateralAmount: number;     // Amount of collateral to use
    leverage: number;             // Leverage multiplier
    position: "Long" | "Short";   // Position direction
    limitUSDPrice: number;        // Price at which order should execute
    stopLossPrice?: number;       // Optional stop loss price
    takeProfitPrice?: number;     // Optional take profit price
  }
}
```

### Response

```typescript
{
  cbor: string;     // Transaction CBOR for signing
  txHash?: string;  // Transaction hash (if available)
  error?: string;   // Error message (if failed)
}
```

### Validations

- Validates limit order conditions (Long: limit ≤ current, Short: limit ≥ current)
- Validates stop loss and take profit relative to limit price
- Checks liquidity and borrowing capacity
- Calculates liquidation price based on limit price

---

## POST /api/perpetuals/closePosition

Closes an existing perpetual position at current market price.

### Request Body

```typescript
{
  request: {
    address: string; // User's wallet address
    asset: {
      // Asset being traded
      policyId: string;
      assetName: string;
    }
    assetTicker: string; // "ADA" or "SNEK"
    outRef: {
      // Reference to the position UTXO
      txHash: string;
      outputIndex: number;
    }
  }
}
```

### Response

```typescript
{
  cbor: string;     // Transaction CBOR for signing
  error?: string;   // Error message (if failed)
}
```

---

## POST /api/perpetuals/updatePosition

Updates stop loss and take profit prices for an existing position.

### Request Body

```typescript
{
  request: {
    address: string; // User's wallet address
    asset: {
      // Asset being traded
      policyId: string;
      assetName: string;
    }
    assetTicker: string; // "ADA" or "SNEK"
    outRef: {
      // Reference to the position UTXO
      txHash: string;
      outputIndex: number;
    }
    stopLossPrice: number; // New stop loss price (0 to remove)
    takeProfitPrice: number; // New take profit price
  }
}
```

### Response

```typescript
{
  cbor: string;     // Transaction CBOR for signing
  error?: string;   // Error message (if failed)
}
```

---

## GET /api/perpetuals/getPositions

Retrieves all perpetual positions for a given address.

### Query Parameters

- `address` (required): The wallet address to query positions for

### Response

```typescript
PerpetualInfo[] | { error: string }

interface PerpetualInfo {
  position: "Long" | "Short";
  stopLoss: number;
  takeProfit: number;
  asset: {
    ticker: string;
    asset: {
      policyId: string;
      assetName: string;
    };
    type: "native" | "asset";
    url: string;
    decimals: number;
    dex: string;
    perpAuthPolicyId: string;
  };
  collateral: {
    amount: number;
    ticker: string;
  };
  positionSize: number;
  entryPrice: number;
  outRef: {
    txHash: string;
    outputIndex: number;
  };
  leverage: number;
  isPending: boolean;
  enteredPositionTime: number;
  status: string;
  liquidationPrice: number;
  hourlyBorrowFee: number;
  version: number;
  openingUSDFee?: number;
}
```

---
