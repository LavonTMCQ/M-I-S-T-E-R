# Hyperliquid Vault Integration Guide for Web Applications

## Table of Contents
1. [Overview](#overview)
2. [Environment Variables](#environment-variables)
3. [Wallet Configuration](#wallet-configuration)
4. [Hyperliquid API Architecture](#hyperliquid-api-architecture)
5. [Implementation Guide](#implementation-guide)
6. [Monitoring Integration](#monitoring-integration)
7. [Strike Finance API Integration](#strike-finance-api-integration)
8. [Security Considerations](#security-considerations)
9. [Testing & Verification](#testing--verification)

---

## Overview

This document provides a complete guide for integrating Hyperliquid vault functionality and monitoring into web applications. Hyperliquid uses a native vault system with leveraged perpetual trading capabilities through their L1 blockchain.

### Key Components
- **Hyperliquid L1**: Custom blockchain for perpetual trading
- **Native Vaults**: Built-in vault infrastructure (no custom smart contracts needed)
- **Python SDK**: Primary integration method (TypeScript SDK has issues)
- **WebSocket**: Real-time price feeds and position updates

---

## Environment Variables

### Required Environment Variables (.env)

```bash
# Hyperliquid Configuration
HYPERLIQUID_PRIVATE_KEY="b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"
HYPERLIQUID_WALLET_ADDRESS="0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
HYPERLIQUID_API_URL="https://api.hyperliquid.xyz"
HYPERLIQUID_WS_URL="wss://api.hyperliquid.xyz/ws"
HYPERLIQUID_TESTNET_API_URL="https://api.hyperliquid-testnet.xyz"
HYPERLIQUID_TESTNET_WS_URL="wss://api.hyperliquid-testnet.xyz/ws"

# Trading Configuration
TRADING_ENABLED=true
POSITION_SIZE_USD=1000
LEVERAGE_MULTIPLIER=5
MAX_POSITION_SIZE_USD=5000
DEFAULT_ASSET="ADA"

# Risk Management
STOP_LOSS_PERCENTAGE=3
TAKE_PROFIT_PERCENTAGE=9
TRAILING_STOP_ACTIVATION=6
TRAILING_STOP_DISTANCE=2

# Monitoring & Alerts
DISCORD_WEBHOOK_URL="your-discord-webhook-url"
TELEGRAM_BOT_TOKEN="your-telegram-bot-token"
TELEGRAM_CHAT_ID="your-telegram-chat-id"
ALERT_THRESHOLD_PNL=-100

# Strike Finance API (Optional)
STRIKE_API_KEY="your-strike-api-key"
STRIKE_API_SECRET="your-strike-api-secret"
STRIKE_API_URL="https://api.strike.finance"
STRIKE_BRIDGE_URL="https://bridge-server-cjs-production.up.railway.app"

# Database (for state persistence)
DATABASE_URL="postgresql://user:pass@host:port/dbname"
REDIS_URL="redis://localhost:6379"

# Monitoring Dashboard
NEXT_PUBLIC_HYPERLIQUID_WALLET="0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001"
NEXT_PUBLIC_WS_URL="ws://localhost:3001"
```

---

## Wallet Configuration

### Production Wallet Details

**Main Trading Wallet:**
- **Address**: `0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74`
- **Private Key**: `b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73`
- **Network**: Hyperliquid L1 (Mainnet)
- **Current Balance**: ~$60 USDC (as of January 2025)

### Wallet Generation (For New Wallets)

```python
from eth_account import Account
import secrets

# Generate new wallet
priv_key = "0x" + secrets.token_hex(32)
account = Account.from_key(priv_key)

print(f"Address: {account.address}")
print(f"Private Key: {priv_key}")
```

### Important Notes
- Hyperliquid uses Ethereum-compatible addresses
- Private key must be 32 bytes (64 hex characters)
- Always prefix with "0x" when using in code
- **NEVER** commit private keys to version control

---

## Hyperliquid API Architecture

### How Hyperliquid Works

1. **Order Book Model**
   - Central limit order book (CLOB)
   - Off-chain matching engine
   - On-chain settlement

2. **Vault System**
   - Native vault infrastructure
   - Users deposit USDC directly
   - Performance tracking on-chain
   - No custom smart contracts needed

3. **API Structure**
   ```
   ┌─────────────────┐
   │   Info API      │  → Market data, positions, balances
   ├─────────────────┤
   │  Exchange API   │  → Place orders, cancel, modify
   ├─────────────────┤
   │  WebSocket API  │  → Real-time updates
   └─────────────────┘
   ```

### API Authentication
- Uses EIP-712 typed message signing
- Every request requires signature
- Python SDK handles this automatically
- TypeScript SDK has signing issues (avoid)

---

## Implementation Guide

### 1. Python Backend Service (Recommended)

```python
#!/usr/bin/env python3
"""
hyperliquid_service.py - Backend service for Hyperliquid integration
"""

import os
import json
import time
from typing import Dict, Any, Optional
from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Configuration
PRIVATE_KEY = os.getenv('HYPERLIQUID_PRIVATE_KEY')
API_URL = os.getenv('HYPERLIQUID_API_URL', 'https://api.hyperliquid.xyz')

# Initialize Hyperliquid clients
account = Account.from_key(PRIVATE_KEY)
exchange = Exchange(account, base_url=API_URL)
info = Info(base_url=API_URL)

class HyperliquidTrader:
    def __init__(self):
        self.account = account
        self.exchange = exchange
        self.info = info
        self.position = None
        self.orders = []
        
    def get_account_info(self) -> Dict[str, Any]:
        """Get account balance and margin info"""
        user_state = self.info.user_state(self.account.address)
        return {
            'address': self.account.address,
            'balance': float(user_state['marginSummary']['accountValue']),
            'available_balance': float(user_state['marginSummary']['availableMargin']),
            'total_pnl': float(user_state['marginSummary']['totalPnl']),
            'positions': user_state['assetPositions']
        }
    
    def get_position(self, asset: str = 'ADA') -> Optional[Dict]:
        """Get current position for asset"""
        user_state = self.info.user_state(self.account.address)
        positions = user_state['assetPositions']
        
        for pos in positions:
            if pos['position']['coin'] == asset:
                return {
                    'coin': asset,
                    'size': float(pos['position']['szi']),
                    'entry_price': float(pos['position']['entryPx']),
                    'pnl': float(pos['position']['unrealizedPnl']),
                    'margin_used': float(pos['position']['marginUsed']),
                    'leverage': float(pos['position']['leverage'])
                }
        return None
    
    def place_market_order(self, asset: str, is_buy: bool, size: float) -> Dict:
        """Place market order"""
        # Get current price
        mids = self.info.all_mids()
        price = float(mids.get(asset, 0))
        
        # Place order with slippage protection
        limit_price = price * (1.01 if is_buy else 0.99)
        
        result = self.exchange.order(
            name=asset,  # CRITICAL: Use 'name' not 'coin'
            is_buy=is_buy,
            sz=round(size, 1),  # ADA uses 1 decimal
            limit_px=round(limit_price, 4),
            order_type={"limit": {"tif": "Ioc"}},  # Immediate or cancel
            reduce_only=False
        )
        
        return {
            'success': result.get('status') == 'ok',
            'order_id': result.get('response', {}).get('data', {}).get('statuses', [{}])[0].get('resting', {}).get('oid'),
            'filled_size': size,
            'filled_price': limit_price,
            'raw_response': result
        }
    
    def place_stop_loss(self, asset: str, size: float, stop_price: float) -> Dict:
        """Place stop-loss order (visible on Hyperliquid UI)"""
        result = self.exchange.order(
            name=asset,
            is_buy=False,  # Sell to close long
            sz=round(size, 1),
            limit_px=round(stop_price * 0.99, 4),  # Slippage buffer
            order_type={
                "trigger": {
                    "triggerPx": round(stop_price, 4),
                    "isMarket": True,
                    "tpsl": "sl"  # CRITICAL: Marks as stop-loss
                }
            },
            reduce_only=True
        )
        return result
    
    def place_take_profit(self, asset: str, size: float, tp_price: float) -> Dict:
        """Place take-profit order (visible on Hyperliquid UI)"""
        result = self.exchange.order(
            name=asset,
            is_buy=False,
            sz=round(size, 1),
            limit_px=round(tp_price, 4),
            order_type={
                "trigger": {
                    "triggerPx": round(tp_price, 4),
                    "isMarket": False,
                    "tpsl": "tp"  # CRITICAL: Marks as take-profit
                }
            },
            reduce_only=True
        )
        return result
    
    def get_open_orders(self, asset: str = None) -> list:
        """Get all open orders"""
        orders = self.info.open_orders(self.account.address)
        if asset:
            return [o for o in orders if o.get('coin') == asset]
        return orders
    
    def cancel_order(self, asset: str, order_id: int) -> Dict:
        """Cancel specific order"""
        result = self.exchange.cancel(
            name=asset,  # Use 'name' not 'coin'
            oid=order_id
        )
        return result
    
    def cancel_all_orders(self, asset: str) -> Dict:
        """Cancel all orders for asset"""
        orders = self.get_open_orders(asset)
        results = []
        for order in orders:
            result = self.cancel_order(asset, order['oid'])
            results.append(result)
        return {'cancelled': len(results), 'results': results}

# Initialize trader
trader = HyperliquidTrader()

# Flask API Endpoints
@app.route('/api/account', methods=['GET'])
def get_account():
    """Get account information"""
    return jsonify(trader.get_account_info())

@app.route('/api/position/<asset>', methods=['GET'])
def get_position(asset):
    """Get position for specific asset"""
    position = trader.get_position(asset.upper())
    if position:
        return jsonify(position)
    return jsonify({'error': 'No position found'}), 404

@app.route('/api/orders', methods=['GET'])
def get_orders():
    """Get all open orders"""
    asset = request.args.get('asset')
    orders = trader.get_open_orders(asset)
    return jsonify({'orders': orders})

@app.route('/api/trade', methods=['POST'])
def place_trade():
    """Place a trade"""
    data = request.json
    result = trader.place_market_order(
        asset=data['asset'],
        is_buy=data['is_buy'],
        size=data['size']
    )
    return jsonify(result)

@app.route('/api/stop-loss', methods=['POST'])
def place_stop_loss():
    """Place stop-loss order"""
    data = request.json
    result = trader.place_stop_loss(
        asset=data['asset'],
        size=data['size'],
        stop_price=data['stop_price']
    )
    return jsonify(result)

@app.route('/api/take-profit', methods=['POST'])
def place_take_profit():
    """Place take-profit order"""
    data = request.json
    result = trader.place_take_profit(
        asset=data['asset'],
        size=data['size'],
        tp_price=data['tp_price']
    )
    return jsonify(result)

@app.route('/api/cancel/<asset>/<int:order_id>', methods=['DELETE'])
def cancel_order(asset, order_id):
    """Cancel specific order"""
    result = trader.cancel_order(asset.upper(), order_id)
    return jsonify(result)

@app.route('/api/cancel-all/<asset>', methods=['DELETE'])
def cancel_all(asset):
    """Cancel all orders for asset"""
    result = trader.cancel_all_orders(asset.upper())
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'wallet': account.address})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3001, debug=False)
```

### 2. Frontend Integration (React/Next.js)

```typescript
// hooks/useHyperliquid.ts
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

interface Position {
  coin: string;
  size: number;
  entry_price: number;
  pnl: number;
  margin_used: number;
  leverage: number;
}

interface AccountInfo {
  address: string;
  balance: number;
  available_balance: number;
  total_pnl: number;
  positions: any[];
}

export const useHyperliquid = () => {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [position, setPosition] = useState<Position | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch account info
  const fetchAccount = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/account`);
      setAccount(response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch account');
      console.error(err);
    }
  }, []);

  // Fetch position
  const fetchPosition = useCallback(async (asset: string = 'ADA') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/position/${asset}`);
      setPosition(response.data);
      return response.data;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setPosition(null);
      } else {
        setError('Failed to fetch position');
      }
    }
  }, []);

  // Fetch open orders
  const fetchOrders = useCallback(async (asset?: string) => {
    try {
      const params = asset ? { asset } : {};
      const response = await axios.get(`${API_BASE_URL}/api/orders`, { params });
      setOrders(response.data.orders);
      return response.data.orders;
    } catch (err) {
      setError('Failed to fetch orders');
      console.error(err);
    }
  }, []);

  // Place trade
  const placeTrade = async (asset: string, is_buy: boolean, size: number) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/trade`, {
        asset,
        is_buy,
        size
      });
      
      if (response.data.success) {
        // Refresh position and account after trade
        await Promise.all([
          fetchAccount(),
          fetchPosition(asset),
          fetchOrders(asset)
        ]);
      }
      
      return response.data;
    } catch (err) {
      setError('Failed to place trade');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Place stop-loss
  const placeStopLoss = async (asset: string, size: number, stop_price: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/stop-loss`, {
        asset,
        size,
        stop_price
      });
      await fetchOrders(asset);
      return response.data;
    } catch (err) {
      setError('Failed to place stop-loss');
      throw err;
    }
  };

  // Place take-profit
  const placeTakeProfit = async (asset: string, size: number, tp_price: number) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/take-profit`, {
        asset,
        size,
        tp_price
      });
      await fetchOrders(asset);
      return response.data;
    } catch (err) {
      setError('Failed to place take-profit');
      throw err;
    }
  };

  // Cancel order
  const cancelOrder = async (asset: string, orderId: number) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/cancel/${asset}/${orderId}`);
      await fetchOrders(asset);
      return response.data;
    } catch (err) {
      setError('Failed to cancel order');
      throw err;
    }
  };

  // Cancel all orders
  const cancelAllOrders = async (asset: string) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/cancel-all/${asset}`);
      await fetchOrders(asset);
      return response.data;
    } catch (err) {
      setError('Failed to cancel orders');
      throw err;
    }
  };

  // Auto-refresh data
  useEffect(() => {
    // Initial fetch
    fetchAccount();
    fetchPosition();
    fetchOrders();

    // Set up polling (every 5 seconds)
    const interval = setInterval(() => {
      fetchAccount();
      fetchPosition();
      fetchOrders();
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchAccount, fetchPosition, fetchOrders]);

  return {
    account,
    position,
    orders,
    loading,
    error,
    placeTrade,
    placeStopLoss,
    placeTakeProfit,
    cancelOrder,
    cancelAllOrders,
    refresh: () => {
      fetchAccount();
      fetchPosition();
      fetchOrders();
    }
  };
};
```

```tsx
// components/HyperliquidDashboard.tsx
import React from 'react';
import { useHyperliquid } from '@/hooks/useHyperliquid';

export const HyperliquidDashboard: React.FC = () => {
  const {
    account,
    position,
    orders,
    loading,
    placeTrade,
    placeStopLoss,
    placeTakeProfit,
    cancelOrder
  } = useHyperliquid();

  const handleOpenPosition = async () => {
    if (!account) return;
    
    const size = 154; // ADA position size
    const result = await placeTrade('ADA', true, size);
    
    if (result.success && position) {
      // Automatically place stop-loss and take-profit
      const stopPrice = position.entry_price * 0.97; // 3% stop loss
      const tpPrice = position.entry_price * 1.09;   // 9% take profit
      
      await Promise.all([
        placeStopLoss('ADA', size, stopPrice),
        placeTakeProfit('ADA', size, tpPrice)
      ]);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Hyperliquid Vault Monitor</h2>
      
      {/* Account Info */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Account</h3>
        {account && (
          <>
            <p>Wallet: {account.address}</p>
            <p>Balance: ${account.balance.toFixed(2)}</p>
            <p>Available: ${account.available_balance.toFixed(2)}</p>
            <p>Total P&L: ${account.total_pnl.toFixed(2)}</p>
          </>
        )}
      </div>

      {/* Current Position */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Position</h3>
        {position ? (
          <>
            <p>Asset: {position.coin}</p>
            <p>Size: {position.size}</p>
            <p>Entry: ${position.entry_price.toFixed(4)}</p>
            <p>P&L: ${position.pnl.toFixed(2)}</p>
            <p>Leverage: {position.leverage}x</p>
          </>
        ) : (
          <p>No open position</p>
        )}
      </div>

      {/* Open Orders */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Open Orders</h3>
        {orders.length > 0 ? (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.oid} className="flex justify-between items-center">
                <span>
                  {order.side} {order.sz} @ ${order.limitPx}
                  {order.orderType?.includes('sl') && ' (SL)'}
                  {order.orderType?.includes('tp') && ' (TP)'}
                </span>
                <button
                  onClick={() => cancelOrder(order.coin, order.oid)}
                  className="px-2 py-1 bg-red-600 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>No open orders</p>
        )}
      </div>

      {/* Trading Actions */}
      <div className="flex gap-4">
        <button
          onClick={handleOpenPosition}
          disabled={loading || !!position}
          className="px-4 py-2 bg-green-600 rounded disabled:opacity-50"
        >
          Open Position
        </button>
      </div>
    </div>
  );
};
```

### 3. WebSocket Integration for Real-time Updates

```typescript
// services/hyperliquidWebSocket.ts
export class HyperliquidWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor(url: string = 'wss://api.hyperliquid.xyz/ws') {
    this.url = url;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('Hyperliquid WebSocket connected');
        this.reconnectAttempts = 0;
        this.subscribeToChannels();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.attemptReconnect();
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      this.attemptReconnect();
    }
  }

  private subscribeToChannels() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to user events (positions, orders, fills)
    this.ws.send(JSON.stringify({
      method: 'subscribe',
      subscription: {
        type: 'userEvents',
        user: process.env.NEXT_PUBLIC_HYPERLIQUID_WALLET
      }
    }));

    // Subscribe to price updates for ADA
    this.ws.send(JSON.stringify({
      method: 'subscribe',
      subscription: {
        type: 'l2Book',
        coin: 'ADA'
      }
    }));
  }

  private handleMessage(data: any) {
    const { channel, data: payload } = data;
    
    const subscribers = this.subscribers.get(channel);
    if (subscribers) {
      subscribers.forEach(callback => callback(payload));
    }
  }

  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(channel);
      if (subscribers) {
        subscribers.delete(callback);
      }
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms...`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

---

## Monitoring Integration

### Real-time Monitoring Dashboard

```typescript
// components/MonitoringDashboard.tsx
import React, { useEffect, useState } from 'react';
import { HyperliquidWebSocket } from '@/services/hyperliquidWebSocket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface MonitoringData {
  timestamp: number;
  price: number;
  position_value: number;
  pnl: number;
  balance: number;
}

export const MonitoringDashboard: React.FC = () => {
  const [data, setData] = useState<MonitoringData[]>([]);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [ws, setWs] = useState<HyperliquidWebSocket | null>(null);

  useEffect(() => {
    const websocket = new HyperliquidWebSocket();
    websocket.connect();
    
    // Subscribe to position updates
    const unsubscribePosition = websocket.subscribe('userEvents', (event) => {
      if (event.type === 'position') {
        updateMonitoringData(event);
        checkAlerts(event);
      }
    });

    // Subscribe to price updates
    const unsubscribePrice = websocket.subscribe('l2Book', (book) => {
      updatePriceData(book);
    });

    setWs(websocket);

    return () => {
      unsubscribePosition();
      unsubscribePrice();
      websocket.disconnect();
    };
  }, []);

  const updateMonitoringData = (positionEvent: any) => {
    const newDataPoint: MonitoringData = {
      timestamp: Date.now(),
      price: positionEvent.mark_price,
      position_value: positionEvent.position_value,
      pnl: positionEvent.unrealized_pnl,
      balance: positionEvent.account_value
    };

    setData(prev => [...prev.slice(-100), newDataPoint]); // Keep last 100 points
  };

  const updatePriceData = (book: any) => {
    // Update latest price in monitoring
    const bid = parseFloat(book.levels[0][0].px);
    const ask = parseFloat(book.levels[1][0].px);
    const mid = (bid + ask) / 2;

    setData(prev => {
      const latest = prev[prev.length - 1];
      if (latest) {
        return [...prev.slice(0, -1), { ...latest, price: mid }];
      }
      return prev;
    });
  };

  const checkAlerts = (positionEvent: any) => {
    const pnl = positionEvent.unrealized_pnl;
    const alertThreshold = parseFloat(process.env.NEXT_PUBLIC_ALERT_THRESHOLD_PNL || '-100');

    if (pnl < alertThreshold) {
      const alert = `⚠️ ALERT: P&L below threshold: $${pnl.toFixed(2)}`;
      setAlerts(prev => [alert, ...prev.slice(0, 9)]);
      sendDiscordAlert(alert);
    }

    // Check for large position changes
    if (Math.abs(positionEvent.size_delta) > 1000) {
      const alert = `🔔 Large position change: ${positionEvent.size_delta} units`;
      setAlerts(prev => [alert, ...prev.slice(0, 9)]);
    }
  };

  const sendDiscordAlert = async (message: string) => {
    const webhookUrl = process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          embeds: [{
            title: 'Hyperliquid Vault Alert',
            description: message,
            color: 0xff0000,
            timestamp: new Date().toISOString()
          }]
        })
      });
    } catch (err) {
      console.error('Failed to send Discord alert:', err);
    }
  };

  return (
    <div className="p-6 bg-gray-900 text-white">
      <h2 className="text-2xl font-bold mb-4">Real-time Monitoring</h2>

      {/* P&L Chart */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">P&L Over Time</h3>
        <LineChart width={800} height={300} data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" />
          <XAxis 
            dataKey="timestamp" 
            tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
            stroke="#888"
          />
          <YAxis stroke="#888" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: 'none' }}
            labelFormatter={(ts) => new Date(ts).toLocaleString()}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="pnl" 
            stroke="#10b981" 
            name="P&L ($)"
            strokeWidth={2}
          />
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke="#3b82f6" 
            name="Price ($)"
            strokeWidth={1}
          />
        </LineChart>
      </div>

      {/* Alerts */}
      <div className="mb-6 p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Recent Alerts</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {alerts.length > 0 ? (
            alerts.map((alert, i) => (
              <div key={i} className="p-2 bg-red-900 bg-opacity-30 rounded text-sm">
                {alert}
              </div>
            ))
          ) : (
            <p className="text-gray-400">No alerts</p>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <div className="p-4 bg-gray-800 rounded">
        <h3 className="text-lg font-semibold mb-2">Connection Status</h3>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${ws ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{ws ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
    </div>
  );
};
```

---

## Strike Finance API Integration

### Strike API Configuration

```bash
# Strike Finance Environment Variables
STRIKE_API_KEY="your-api-key-here"
STRIKE_API_SECRET="your-api-secret-here"
STRIKE_API_URL="https://api.strike.finance"
STRIKE_BRIDGE_URL="https://bridge-server-cjs-production.up.railway.app"
STRIKE_WEBHOOK_URL="https://your-app.com/webhooks/strike"
```

### Strike API Service

```typescript
// services/strikeFinance.ts
import axios from 'axios';
import crypto from 'crypto';

export class StrikeFinanceAPI {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.STRIKE_API_KEY!;
    this.apiSecret = process.env.STRIKE_API_SECRET!;
    this.baseUrl = process.env.STRIKE_API_URL || 'https://api.strike.finance';
  }

  private generateSignature(timestamp: number, method: string, path: string, body?: any): string {
    const message = `${timestamp}${method}${path}${body ? JSON.stringify(body) : ''}`;
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(message)
      .digest('hex');
  }

  private async request(method: string, path: string, data?: any) {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp, method, path, data);

    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        headers: {
          'X-API-Key': this.apiKey,
          'X-API-Signature': signature,
          'X-API-Timestamp': timestamp.toString(),
          'Content-Type': 'application/json'
        },
        data
      });

      return response.data;
    } catch (error) {
      console.error('Strike API Error:', error);
      throw error;
    }
  }

  // Account Management
  async getAccount() {
    return this.request('GET', '/api/v1/account');
  }

  async getBalance() {
    return this.request('GET', '/api/v1/account/balance');
  }

  // Trading
  async getMarkets() {
    return this.request('GET', '/api/v1/markets');
  }

  async getOrderBook(market: string) {
    return this.request('GET', `/api/v1/markets/${market}/orderbook`);
  }

  async placeOrder(order: {
    market: string;
    side: 'buy' | 'sell';
    type: 'market' | 'limit';
    size: number;
    price?: number;
  }) {
    return this.request('POST', '/api/v1/orders', order);
  }

  async cancelOrder(orderId: string) {
    return this.request('DELETE', `/api/v1/orders/${orderId}`);
  }

  async getOrders(market?: string) {
    const params = market ? `?market=${market}` : '';
    return this.request('GET', `/api/v1/orders${params}`);
  }

  async getPositions() {
    return this.request('GET', '/api/v1/positions');
  }

  async getPosition(market: string) {
    return this.request('GET', `/api/v1/positions/${market}`);
  }

  // Historical Data
  async getCandles(market: string, interval: string, limit: number = 100) {
    return this.request('GET', `/api/v1/markets/${market}/candles?interval=${interval}&limit=${limit}`);
  }

  async getTrades(market: string, limit: number = 100) {
    return this.request('GET', `/api/v1/markets/${market}/trades?limit=${limit}`);
  }

  // WebSocket Authentication
  async getWebSocketToken() {
    return this.request('POST', '/api/v1/websocket/token');
  }
}

// Strike WebSocket for real-time data
export class StrikeWebSocket {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private api: StrikeFinanceAPI;

  constructor() {
    this.api = new StrikeFinanceAPI();
  }

  async connect() {
    // Get authentication token
    const tokenResponse = await this.api.getWebSocketToken();
    this.token = tokenResponse.token;

    // Connect to WebSocket
    this.ws = new WebSocket(`wss://api.strike.finance/ws?token=${this.token}`);

    this.ws.onopen = () => {
      console.log('Strike WebSocket connected');
      this.subscribe();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error('Strike WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Strike WebSocket disconnected');
      setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
    };
  }

  private subscribe() {
    if (!this.ws) return;

    // Subscribe to relevant channels
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      channels: [
        'account',
        'orders',
        'positions',
        'ticker.ADA-PERP'
      ]
    }));
  }

  private handleMessage(data: any) {
    switch (data.channel) {
      case 'account':
        this.handleAccountUpdate(data.data);
        break;
      case 'orders':
        this.handleOrderUpdate(data.data);
        break;
      case 'positions':
        this.handlePositionUpdate(data.data);
        break;
      case 'ticker':
        this.handleTickerUpdate(data.data);
        break;
    }
  }

  private handleAccountUpdate(data: any) {
    console.log('Account update:', data);
    // Update UI or trigger actions
  }

  private handleOrderUpdate(data: any) {
    console.log('Order update:', data);
    // Update orders list
  }

  private handlePositionUpdate(data: any) {
    console.log('Position update:', data);
    // Update position display
  }

  private handleTickerUpdate(data: any) {
    console.log('Ticker update:', data);
    // Update price displays
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

### Strike Bridge Service Integration

```typescript
// services/strikeBridge.ts
import axios from 'axios';

const BRIDGE_URL = process.env.STRIKE_BRIDGE_URL || 'https://bridge-server-cjs-production.up.railway.app';

export class StrikeBridge {
  // Get market data through bridge
  async getMarketData(symbol: string) {
    const response = await axios.get(`${BRIDGE_URL}/api/market/${symbol}`);
    return response.data;
  }

  // Execute trade through bridge
  async executeTrade(params: {
    symbol: string;
    side: 'buy' | 'sell';
    size: number;
    type: 'market' | 'limit';
    price?: number;
  }) {
    const response = await axios.post(`${BRIDGE_URL}/api/trade`, params);
    return response.data;
  }

  // Get positions through bridge
  async getPositions() {
    const response = await axios.get(`${BRIDGE_URL}/api/positions`);
    return response.data;
  }

  // Get account info through bridge
  async getAccountInfo() {
    const response = await axios.get(`${BRIDGE_URL}/api/account`);
    return response.data;
  }

  // Subscribe to real-time updates
  subscribeToUpdates(callback: (data: any) => void) {
    const ws = new WebSocket(`${BRIDGE_URL.replace('https', 'wss')}/ws`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    return () => ws.close();
  }
}
```

---

## Security Considerations

### 1. Private Key Management

```typescript
// NEVER expose private keys in frontend code
// Always use backend services for signing

// Bad ❌
const PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73";

// Good ✅
const response = await fetch('/api/sign-transaction', {
  method: 'POST',
  body: JSON.stringify({ transaction })
});
```

### 2. Environment Variable Security

```bash
# Use different keys for different environments
HYPERLIQUID_PRIVATE_KEY_DEV="dev-key-here"
HYPERLIQUID_PRIVATE_KEY_STAGING="staging-key-here"
HYPERLIQUID_PRIVATE_KEY_PROD="prod-key-here"

# Use secret management services
# - AWS Secrets Manager
# - HashiCorp Vault
# - Azure Key Vault
# - Google Secret Manager
```

### 3. API Authentication

```typescript
// Implement API key authentication for your backend
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.INTERNAL_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  next();
});
```

### 4. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Testing & Verification

### 1. Test Connection

```bash
# Test Hyperliquid connection
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "wallet": "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74"
}
```

### 2. Test Account Balance

```bash
# Get account info
curl http://localhost:3001/api/account

# Expected response:
{
  "address": "0x8B25b3c7CDB6d38C82BC0460cc7902168B705A74",
  "balance": 60.47,
  "available_balance": 60.47,
  "total_pnl": 0,
  "positions": []
}
```

### 3. Test Trading (Small Amount)

```python
# test_trade.py
from hyperliquid.exchange import Exchange
from hyperliquid.info import Info
from eth_account import Account

PRIVATE_KEY = "b51f849e6551e2c8e627a663f2ee2439b1e17760d7a4de340c913bbfbd572f73"

account = Account.from_key(PRIVATE_KEY)
exchange = Exchange(account, base_url="https://api.hyperliquid.xyz")
info = Info(base_url="https://api.hyperliquid.xyz")

# Get price
mids = info.all_mids()
ada_price = float(mids.get("ADA", 0))
print(f"ADA Price: ${ada_price}")

# Place small test order
result = exchange.order(
    name="ADA",
    is_buy=True,
    sz=10.0,  # Small test size
    limit_px=round(ada_price * 1.01, 4),
    order_type={"limit": {"tif": "Ioc"}},
    reduce_only=False
)
print(f"Order Result: {result}")
```

### 4. Monitor WebSocket Connection

```javascript
// test_websocket.js
const WebSocket = require('ws');

const ws = new WebSocket('wss://api.hyperliquid.xyz/ws');

ws.on('open', () => {
  console.log('Connected to Hyperliquid WebSocket');
  
  // Subscribe to ADA price updates
  ws.send(JSON.stringify({
    method: 'subscribe',
    subscription: {
      type: 'l2Book',
      coin: 'ADA'
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log('Received:', msg);
});

ws.on('error', (err) => {
  console.error('WebSocket error:', err);
});
```

---

## Troubleshooting

### Common Issues and Solutions

1. **Authentication Errors**
   - Verify private key format (64 hex chars, no 0x prefix in some cases)
   - Check EIP-712 signature implementation
   - Ensure account has sufficient balance

2. **Order Failures**
   - Use correct decimal places (ADA = 1 decimal)
   - Use 'name' parameter, not 'coin'
   - Check minimum order sizes

3. **WebSocket Disconnections**
   - Implement exponential backoff for reconnection
   - Handle network interruptions gracefully
   - Monitor connection status

4. **Rate Limiting**
   - Implement request queuing
   - Add delays between requests
   - Use WebSocket for real-time data instead of polling

---

## Production Deployment Checklist

- [ ] Environment variables configured
- [ ] Private keys secured (never in code)
- [ ] API authentication implemented
- [ ] Rate limiting configured
- [ ] Error handling comprehensive
- [ ] Monitoring/alerting setup
- [ ] Database for state persistence
- [ ] WebSocket reconnection logic
- [ ] Position size limits enforced
- [ ] Stop-loss/take-profit automation
- [ ] Audit logging enabled
- [ ] Backup wallet configured
- [ ] Discord/Telegram alerts working
- [ ] Health check endpoints active
- [ ] Graceful shutdown handling

---

## Support & Resources

- **Hyperliquid Docs**: https://docs.hyperliquid.xyz
- **Python SDK**: https://github.com/hyperliquid-dex/hyperliquid-python-sdk
- **API Reference**: https://api.hyperliquid.xyz/docs
- **Discord**: https://discord.gg/hyperliquid
- **Strike Finance**: https://docs.strike.finance

---

**Last Updated**: January 2025
**Version**: 1.0.0
**Author**: MISTERLABS Development Team