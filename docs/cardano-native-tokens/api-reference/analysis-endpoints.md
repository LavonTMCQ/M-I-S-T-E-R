# Analysis API Endpoints

## 📊 **Overview**

The Analysis API provides real-time token analysis data for Cardano native tokens. These endpoints serve cached analysis results to prevent API abuse and ensure consistent data across all users.

**Base URL:** `http://localhost:4114`

## 🔍 **Current Analysis**

### `GET /api/analysis/current`

Returns the latest token analysis with complete technical indicators, sentiment data, and trading decision.

#### **Response Format:**
```json
{
  "success": true,
  "data": {
    "ticker": "SNEK",
    "timestamp": "2025-01-08T10:30:00.000Z",
    "currentPrice": 0.001234,
    "priceChange24h": 5.67,
    
    "technicalAnalysis": {
      "rsi": {
        "15m": 56.8,
        "1h": 73.2,
        "4h": 68.9,
        "signal": "neutral"
      },
      "macd": {
        "signal": "bullish",
        "histogram": 0.0023
      },
      "bollinger": {
        "position": "middle",
        "squeeze": false
      },
      "support": 0.001180,
      "resistance": 0.001290
    },
    
    "sentiment": {
      "twitter": {
        "score": 0.72,
        "volume": 156,
        "trending": true
      },
      "overall": "bullish"
    },
    
    "decision": {
      "action": "BUY",
      "confidence": 8,
      "reasoning": [
        "RSI showing neutral to bullish momentum across timeframes",
        "MACD crossover indicates bullish trend continuation",
        "Strong Twitter sentiment with increasing volume",
        "Price holding above key support level",
        "Good liquidity for position entry"
      ],
      "targetPrice": 0.001350,
      "stopLoss": 0.001150,
      "positionSize": 75
    },
    
    "risk": {
      "level": "medium",
      "factors": [
        "Moderate volatility in recent sessions",
        "Some resistance at current levels"
      ],
      "liquidityScore": 78
    }
  },
  "metadata": {
    "lastUpdated": "2025-01-08T10:30:00.000Z",
    "nextUpdate": "2025-01-08T11:30:00.000Z",
    "fromCache": true
  }
}
```

#### **Error Response:**
```json
{
  "success": false,
  "error": "No analysis data available. Please wait for next analysis run.",
  "nextUpdate": "2025-01-08T11:30:00.000Z"
}
```

#### **Usage Example:**
```javascript
const response = await fetch('http://localhost:4114/api/analysis/current');
const data = await response.json();

if (data.success) {
  console.log(`Current analysis: ${data.data.ticker} - ${data.data.decision.action}`);
  console.log(`Confidence: ${data.data.decision.confidence}/10`);
  console.log(`Next update: ${data.metadata.nextUpdate}`);
}
```

## 📈 **Analysis History**

### `GET /api/analysis/history`

Returns historical analysis data for the last 50 analysis runs.

#### **Response Format:**
```json
{
  "success": true,
  "data": [
    {
      "ticker": "WMTX",
      "timestamp": "2025-01-08T10:00:00.000Z",
      "currentPrice": 0.002456,
      "priceChange24h": -2.34,
      "decision": {
        "action": "HOLD",
        "confidence": 6,
        "positionSize": 50
      }
    },
    {
      "ticker": "HOSKY",
      "timestamp": "2025-01-08T09:30:00.000Z",
      "currentPrice": 0.000789,
      "priceChange24h": 12.45,
      "decision": {
        "action": "BUY",
        "confidence": 9,
        "positionSize": 100
      }
    }
  ],
  "metadata": {
    "totalRecords": 45,
    "fromCache": true
  }
}
```

#### **Usage Example:**
```javascript
const response = await fetch('http://localhost:4114/api/analysis/history');
const data = await response.json();

if (data.success) {
  console.log(`Found ${data.data.length} historical analyses`);
  
  // Display recent decisions
  data.data.slice(0, 5).forEach(analysis => {
    console.log(`${analysis.ticker}: ${analysis.decision.action} (${analysis.decision.confidence}/10)`);
  });
}
```

## 🎯 **Data Models**

### **TokenAnalysis Interface:**
```typescript
interface TokenAnalysis {
  ticker: string;                    // Token symbol (SNEK, WMTX, etc.)
  timestamp: string;                 // ISO timestamp of analysis
  currentPrice: number;              // Current token price in USD
  priceChange24h: number;            // 24h price change percentage
  
  technicalAnalysis: {
    rsi: {
      '15m': number;                 // 15-minute RSI (0-100)
      '1h': number;                  // 1-hour RSI (0-100)
      '4h': number;                  // 4-hour RSI (0-100)
      signal: 'oversold' | 'neutral' | 'overbought';
    };
    macd: {
      signal: 'bullish' | 'bearish' | 'neutral';
      histogram: number;             // MACD histogram value
    };
    bollinger: {
      position: 'upper' | 'middle' | 'lower';
      squeeze: boolean;              // Bollinger Band squeeze indicator
    };
    support: number;                 // Support level price
    resistance: number;              // Resistance level price
  };
  
  sentiment: {
    twitter: {
      score: number;                 // Sentiment score (0-1)
      volume: number;                // Number of tweets analyzed
      trending: boolean;             // Whether token is trending
    };
    overall: 'bullish' | 'bearish' | 'neutral';
  };
  
  decision: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;              // Confidence level (1-10)
    reasoning: string[];             // Array of decision reasons
    targetPrice?: number;            // Optional target price
    stopLoss?: number;               // Optional stop loss price
    positionSize: number;            // Recommended position size in ADA
  };
  
  risk: {
    level: 'low' | 'medium' | 'high';
    factors: string[];               // Array of risk factors
    liquidityScore: number;          // Liquidity score (0-100)
  };
}
```

## 🔄 **Caching Strategy**

### **Cache Behavior:**
- **Update Frequency:** Analysis runs every 60 minutes by default
- **Cache Duration:** Results cached until next analysis run
- **Fallback:** Previous analysis served if current run fails
- **Rate Limiting:** Prevents excessive API calls to external services

### **Cache Metadata:**
- `lastUpdated`: When analysis was last generated
- `nextUpdate`: When next analysis is scheduled
- `fromCache`: Always true for user-facing endpoints

## 🚨 **Error Handling**

### **Common Error Responses:**

#### **No Data Available:**
```json
{
  "success": false,
  "error": "No analysis data available. Please wait for next analysis run.",
  "nextUpdate": "2025-01-08T11:30:00.000Z"
}
```

#### **Server Error:**
```json
{
  "success": false,
  "error": "Failed to fetch analysis data"
}
```

### **Error Handling Best Practices:**
```javascript
async function fetchAnalysis() {
  try {
    const response = await fetch('http://localhost:4114/api/analysis/current');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      console.warn('Analysis not available:', data.error);
      return null;
    }
    
    return data.data;
    
  } catch (error) {
    console.error('Failed to fetch analysis:', error);
    return null;
  }
}
```

## 📱 **Frontend Integration**

### **React Hook Example:**
```typescript
import { useState, useEffect } from 'react';

interface UseAnalysisResult {
  currentAnalysis: TokenAnalysis | null;
  analysisHistory: TokenAnalysis[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAnalysis(): UseAnalysisResult {
  const [currentAnalysis, setCurrentAnalysis] = useState<TokenAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<TokenAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch current analysis
      const currentResponse = await fetch('/api/analysis/current');
      const currentData = await currentResponse.json();
      
      if (currentData.success) {
        setCurrentAnalysis(currentData.data);
      }
      
      // Fetch history
      const historyResponse = await fetch('/api/analysis/history');
      const historyData = await historyResponse.json();
      
      if (historyData.success) {
        setAnalysisHistory(historyData.data);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAnalysis, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    currentAnalysis,
    analysisHistory,
    isLoading,
    error,
    refresh: fetchAnalysis
  };
}
```

---

**Next:** [Trading Endpoints](./trading-endpoints.md) - Trading execution API documentation
