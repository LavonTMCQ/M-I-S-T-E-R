# Strike Finance Agent Panel - Complete Implementation Guide

## Overview

This is the definitive technical guide for recreating the exact Strike Finance Agent Panel experience. The right panel serves as an AI-powered trading assistant that provides conversational interaction, real-time trading signals, and seamless one-click trade execution through Strike Finance API integration.

## Table of Contents

1. [Right Panel Layout Architecture](#1-right-panel-layout-architecture)
2. [Chat Interface Implementation](#2-chat-interface-implementation)
3. [Signal Processing & Display](#3-signal-processing--display)
4. [One-Click Trading Flow](#4-one-click-trading-flow)
5. [State Management](#5-state-management)
6. [Visual Design System](#6-visual-design-system)
7. [Real-time Updates](#7-real-time-updates)
8. [Agent Personality](#8-agent-personality)
9. [Error Handling](#9-error-handling)
10. [Integration Points](#10-integration-points)

---

## 1. Right Panel Layout Architecture

### Core Component Structure

```tsx
// Main trading page layout
<div className="grid grid-cols-12 gap-4 h-full">
  {/* Left Panel - Signal Mode */}
  {signalMode && (
    <div className="col-span-3 flex flex-col gap-4 h-full">
      {/* Signal Trading Interface */}
    </div>
  )}

  {/* Center Panel - Chart */}
  <div className={`${vaultMode || signalMode ? 'col-span-6' : 'col-span-9'} flex flex-col gap-4`}>
    <CollapsibleChart marketData={marketData} />
    <MisterLabs220Dashboard />
  </div>

  {/* Right Panel - AI Chat (ALWAYS PRESENT) */}
  <div className="col-span-3 h-full overflow-hidden flex flex-col">
    {/* Signal Activity Panel (conditional) */}
    {signalMode && (
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Execution History</span>
            {executionHistory.length > 0 && (
              <Badge variant="secondary">{executionHistory.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Execution history display */}
        </CardContent>
      </Card>
    )}

    {/* AI Trading Chat - Main Component */}
    <div className="flex-1 overflow-hidden">
      <AITradingChat />
    </div>
  </div>
</div>
```

### CSS Layout Classes

**Container Styles:**
```css
.col-span-3 { grid-column: span 3 / span 3; }
.h-full { height: 100%; }
.overflow-hidden { overflow: hidden; }
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-4 { gap: 1rem; }
```

**Responsive Behavior:**
- Right panel always occupies exactly 3 grid columns
- Panel height matches parent container (`h-full`)
- Overflow is controlled at component level
- Gap of 1rem between sections

---

## 2. Chat Interface Implementation

### Main Chat Component Structure

```tsx
// File: /src/components/trading/AITradingChat.tsx
export function AITradingChat() {
  // Core state management
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Wallet integration
  const { mainWallet } = useWallet();

  return (
    <Card className="flex flex-col h-full">
      {/* Chat Header */}
      <ChatHeader />

      {/* Quick Commands */}
      <QuickCommands />

      {/* Messages Area */}
      <MessagesArea />

      {/* Input Area */}
      <InputArea />
    </Card>
  );
}
```

### Chat Header Implementation

```tsx
<CardHeader className="pb-2 flex-shrink-0">
  <div className="flex items-center justify-between min-w-0">
    <div className="flex items-center gap-2 min-w-0 flex-1">
      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="min-w-0">
        <CardTitle className="text-base truncate">Strike Agent</CardTitle>
        <p className="text-xs text-muted-foreground">AI Assistant</p>
      </div>
    </div>
    <div className="flex items-center gap-1 flex-shrink-0">
      <Badge variant="outline" className="flex items-center gap-1 text-xs px-2 py-1">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
        Online
      </Badge>
    </div>
  </div>

  {/* Wallet Info Display (conditional) */}
  {mainWallet && (
    <div className="mt-2 p-2 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium">
            {mainWallet.handle || 'Connected Wallet'}
          </span>
        </div>
        <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
          {mainWallet.balance.toFixed(2)} ADA
        </div>
      </div>
    </div>
  )}
</CardHeader>
```

### Quick Commands Panel

```tsx
<div className="px-6 py-2 border-b bg-gradient-to-r from-muted/20 to-muted/40 flex-shrink-0">
  <div className="flex items-center justify-between mb-2">
    <span className="text-sm font-semibold">Quick Commands</span>
    <Button variant="ghost" size="sm" onClick={() => setMessages([])}>
      <RefreshCw className="h-3 w-3 mr-1" />
      Clear Chat
    </Button>
  </div>
  <div className="grid grid-cols-3 gap-1">
    {quickCommands.slice(0, 6).map((cmd, index) => (
      <Button
        key={index}
        variant="outline"
        size="sm"
        onClick={() => setInputMessage(cmd.command)}
        className="justify-start text-xs h-6 px-2 hover:bg-primary/10 hover:border-primary/20"
      >
        {cmd.label}
      </Button>
    ))}
  </div>
</div>
```

**Quick Commands Data:**
```tsx
const quickCommands = [
  { label: 'Market Analysis', command: 'Analyze the current ADA market conditions' },
  { label: 'Long 50 ADA', command: 'Go long 50 ADA with 3x leverage' },
  { label: 'Short 50 ADA', command: 'Go short 50 ADA with 3x leverage' },
  { label: 'Close Positions', command: 'Close all my open positions' },
  { label: 'Portfolio Status', command: 'Show me my current portfolio and P&L' }
];
```

### Message Interface

```tsx
interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  tradeAction?: {
    action?: 'long' | 'short' | 'close';
    amount?: number;
    price?: number;
    type?: string;
    requiresWalletSigning?: boolean;
    transactionCbor?: string;
    tradeDetails?: any;
  };
}
```

---

## 3. Signal Processing & Display

### Signal Trading Interface (Left Panel)

```tsx
{signalMode && (
  <div className="col-span-3 flex flex-col gap-4 h-full">
    <Card className="h-full shadow-lg border-border/50 bg-gradient-to-br from-card to-card/95">
      <CardHeader className="pb-3 border-b border-border/30">
        <CardTitle className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
          <span className="font-semibold">ADA Signal Trading</span>
          <Badge variant="secondary" className="bg-green-500/10 text-green-700 border-green-500/20">
            LIVE
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto">
        {/* Performance Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted rounded">
            <div className="font-semibold">{executionStats.active_signals}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="font-semibold text-green-600">{executionStats.success_rate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Success</div>
          </div>
          <div className="p-2 bg-muted rounded">
            <div className="font-semibold">{executionStats.total_executions}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Generate Signal Button */}
        <Button
          onClick={() => generateTestSignal(marketData.price)}
          disabled={isGenerating}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing Market...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              Generate LIVE Signal
            </>
          )}
        </Button>

        {/* Active Signals Display */}
        <div className="space-y-3">
          {activeSignals.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              onExecute={executeSignal}
              onCancel={cancelSignal}
              isExecuting={isExecuting}
              canExecute={walletConnected}
              sufficientBalance={checkSufficientBalance(signal)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  </div>
)}
```

### Signal Execution Hook

```tsx
// From useSignalExecution hook
const {
  activeSignals,
  executionHistory,
  executionStats,
  isExecuting,
  isGenerating,
  generateTestSignal,
  executeSignal,
  cancelSignal,
  checkSufficientBalance,
  walletConnected
} = useSignalExecution();
```

### Execution History Display

```tsx
{signalMode && (
  <Card className="mb-4">
    <CardHeader className="pb-3">
      <CardTitle className="text-sm flex items-center space-x-2">
        <Activity className="h-4 w-4" />
        <span>Execution History</span>
        {executionHistory.length > 0 && (
          <Badge variant="secondary">{executionHistory.length}</Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {executionHistory.slice(0, 5).map((execution, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
            <div className="flex items-center space-x-2">
              {execution.success ? (
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              ) : (
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              )}
              <span className="font-medium">
                {execution.signal.type.toUpperCase()} {execution.signal.risk.position_size.toFixed(0)} ADA
              </span>
            </div>
            <span className="text-muted-foreground">
              {new Date(execution.signal.timestamp).toLocaleTimeString()}
            </span>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
)}
```

---

## 4. One-Click Trading Flow

### Step-by-Step Execution Process

#### 1. Message Processing and Trade Detection

```tsx
const handleSendMessage = async () => {
  // Validation
  if (!mainWallet && containsTradingCommand(inputMessage)) {
    displayErrorMessage('Please connect your wallet first to execute trades.');
    return;
  }

  // Send message to Mastra Strike Agent
  const response = await fetch('/api/agents/strike/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: inputMessage,
      context: 'trading_interface',
      userWallet: mainWallet ? {
        address: mainWallet.address,
        stakeAddress: mainWallet.stakeAddress,
        balance: mainWallet.balance,
        walletType: mainWallet.walletType,
        handle: mainWallet.handle
      } : null
    })
  });

  const result = await response.json();

  // Check if wallet signing is required
  if (result.success && result.data?.tradeAction?.requiresWalletSigning) {
    setTimeout(() => {
      handleWalletSigning(
        result.data.tradeAction.transactionCbor,
        result.data.tradeAction.tradeDetails
      );
    }, 1500);
  }
};
```

#### 2. Wallet Signing Process

```tsx
const handleWalletSigning = async (transactionCbor: string, tradeDetails: any) => {
  try {
    console.log('🔐 Starting wallet signing process...');

    // Get wallet API
    const walletApi = await window.cardano[mainWallet.walletType].enable();

    // Step 1: Sign transaction with wallet (partial signing)
    const witnessSetCbor = await walletApi.signTx(transactionCbor, true);

    // Step 2: Send to server for CSL combination
    const signingResponse = await fetch('/api/cardano/sign-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txCbor: transactionCbor,
        witnessSetCbor: witnessSetCbor
      })
    });

    const { success, signedTxCbor, error } = await signingResponse.json();

    if (!success || !signedTxCbor) {
      throw new Error(`CSL combination failed: ${error}`);
    }

    // Step 3: Submit to Cardano network
    const txHash = await walletApi.submitTx(signedTxCbor);

    // Display success message
    displaySuccessMessage(txHash, tradeDetails);

  } catch (error) {
    displayErrorMessage(`Transaction failed: ${error.message}`);
  }
};
```

#### 3. OneClickExecutionService Integration

```typescript
// File: /src/services/strike-finance/OneClickExecutionService.ts
export class OneClickExecutionService {
  async executeSignal(request: OneClickExecutionRequest): Promise<OneClickExecutionResponse> {
    // Step 1: Validate execution
    const validation = await this.performPreExecutionValidation(
      request.signal,
      walletAddress,
      request.position_size_override
    );

    if (!validation.can_execute) {
      return { success: false, error: validation.errors };
    }

    // Step 2: Create Strike Finance request
    const tradeRequest = signalToStrikeFinanceRequest(
      request.signal,
      walletAddress,
      clientRequestId
    );

    // Step 3: Execute on Strike Finance
    const strikeResponse = await this.strikeClient.executeTrade(tradeRequest);

    // Step 4: Update signal with execution data
    const updatedSignal = {
      ...request.signal,
      status: strikeResponse.success ? 'executed' : 'failed',
      execution: {
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        execution_price: strikeResponse.execution_price,
        transaction_id: strikeResponse.transaction_id,
        result: strikeResponse.success ? 'success' : 'failed'
      }
    };

    return {
      success: strikeResponse.success,
      strike_response: strikeResponse,
      updated_signal: updatedSignal
    };
  }
}
```

#### 4. Strike Finance API Client

```typescript
// File: /src/services/strike-finance/StrikeFinanceClient.ts
export class StrikeFinanceApiClient {
  async executeTrade(request: StrikeFinanceTradeRequest): Promise<StrikeFinanceTradeResponse> {
    // Convert to Strike Finance API format
    const strikeRequest: StrikeApiOpenPositionRequest = {
      request: {
        address: request.wallet_address,
        asset: { policyId: '', assetName: '' },
        assetTicker: 'ADA',
        collateralAmount: request.amount,
        leverage: request.leverage || 10,
        position: request.side === 'long' ? 'Long' : 'Short',
        stopLossPrice: request.stop_loss,
        takeProfitPrice: request.take_profit,
      },
    };

    // Make API request
    const response = await this.makeApiRequest<StrikeApiResponse>(
      'POST',
      '/api/perpetuals/openPosition',
      strikeRequest
    );

    if (!response.success) {
      throw new Error(`Strike Finance API error: ${response.error}`);
    }

    // Return formatted response
    return {
      success: true,
      transaction_id: `strike_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      execution_price: this.calculateExecutionPrice(request),
      executed_amount: request.amount,
      fees: {
        trading_fee: request.amount * 0.001,
        network_fee: 2,
        total_fee: (request.amount * 0.001) + 2,
      }
    };
  }
}
```

---

## 5. State Management

### Core State Structure

```tsx
// Trading Page State Management
const [signalMode, setSignalMode] = useState(false);
const [vaultMode, setVaultMode] = useState(false);
const [marketData, setMarketData] = useState({
  price: 0.80,
  change24h: 0.025,
  change24hPercent: 5.6,
  volume24h: 1250000,
  longInterest: 1777163.53,
  shortInterest: 19694.99
});

const [tradingPreferences, setTradingPreferences] = useState({
  defaultSize: 100,
  autoClose: false,
  riskLevel: 'medium',
  chartTimeframe: '15m',
  layout: 'standard'
});
```

### User Storage Integration

```tsx
// User-specific storage with secure localStorage
const {
  userStorage,
  isAuthenticated,
  getUserDisplayName,
} = useUserIdentity();

// Load preferences on authentication
useEffect(() => {
  if (isAuthenticated && userStorage && !preferencesLoadedRef.current) {
    const savedPreferences = userStorage.getItem(USER_STORAGE_KEYS.TRADING_PREFERENCES);
    const savedSignalMode = userStorage.getItem('SIGNAL_MODE');

    if (savedPreferences) {
      setTradingPreferences(prev => ({ ...prev, ...JSON.parse(savedPreferences) }));
    }

    if (savedSignalMode) {
      setSignalMode(savedSignalMode === 'true');
    }

    preferencesLoadedRef.current = true;
  }
}, [isAuthenticated, userStorage]);

// Save preferences when changed
useEffect(() => {
  if (isAuthenticated && userStorage) {
    userStorage.setItem(USER_STORAGE_KEYS.TRADING_PREFERENCES, JSON.stringify(tradingPreferences));
    userStorage.setItem('SIGNAL_MODE', signalMode.toString());
  }
}, [tradingPreferences, signalMode, isAuthenticated, userStorage]);
```

### Chat State Management

```tsx
// Chat-specific state
const [messages, setMessages] = useState<ChatMessage[]>([{
  id: '1',
  type: 'agent',
  content: mainWallet
    ? `Hello! I'm your Strike Agent. I can see you're connected with ${mainWallet.handle || 'your wallet'} (${mainWallet.balance.toFixed(2)} ADA).`
    : 'Hello! I\'m your Strike Agent. Please connect your wallet first to start trading.',
  timestamp: new Date(Date.now() - 60000)
}]);

const [inputMessage, setInputMessage] = useState('');
const [isListening, setIsListening] = useState(false);
const [isTyping, setIsTyping] = useState(false);
```

### Agent Wallet State

```tsx
// Agent Wallet Management State
const [vaultCredentials, setVaultCredentials] = useState<any>(null);
const [vaultBalance, setVaultBalance] = useState(0);
const [networkInfo, setNetworkInfo] = useState<any>(null);
const [isVaultActive, setIsVaultActive] = useState(false);
const [userVaultCount, setUserVaultCount] = useState(0);
const [maxVaultsReached, setMaxVaultsReached] = useState(false);
const [userVaults, setUserVaults] = useState<any[]>([]);
const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);
```

---

## 6. Visual Design System

### Color Palette

```css
/* Primary Colors */
--primary: 222.2 84% 4.9%;           /* Dark blue-black */
--primary-foreground: 210 40% 98%;   /* Light text */

/* Accent Colors */
--blue-500: #3b82f6;    /* Bot avatar, signal indicators */
--purple-600: #9333ea;  /* Gradients, highlights */
--green-500: #22c55e;   /* Success states, online status */
--red-500: #ef4444;     /* Error states, short positions */
--orange-500: #f97316;  /* Vault mode, warnings */

/* Background System */
--background: 0 0% 100%;              /* Main background */
--card: 0 0% 100%;                    /* Card backgrounds */
--muted: 210 40% 96%;                 /* Muted backgrounds */
--border: 214.3 31.8% 91.4%;         /* Border colors */

/* Gradients */
bg-gradient-to-br from-blue-500 to-purple-600  /* Bot avatars */
bg-gradient-to-r from-green-500 to-blue-600    /* Signal mode */
bg-gradient-to-r from-orange-500 to-red-600    /* Vault mode */
bg-gradient-to-r from-muted/20 to-muted/40     /* Quick commands */
```

### Typography Scale

```css
/* Font Sizes */
text-base     /* 16px - Main titles */
text-sm       /* 14px - Labels, secondary text */
text-xs       /* 12px - Details, timestamps */
text-[10px]   /* 10px - Badges, micro text */

/* Font Weights */
font-bold      /* 700 - Primary titles */
font-semibold  /* 600 - Section headers */
font-medium    /* 500 - Labels */
font-normal    /* 400 - Body text */
```

### Spacing System

```css
/* Padding/Margins */
p-2   /* 8px */
p-3   /* 12px */
px-2  /* horizontal 8px */
py-2  /* vertical 8px */
gap-1 /* 4px gap */
gap-2 /* 8px gap */
gap-3 /* 12px gap */
gap-4 /* 16px gap */

/* Component Sizes */
h-3 w-3   /* 12px icons (small) */
h-4 w-4   /* 16px icons (medium) */
h-5 w-5   /* 20px icons (large) */
h-6 w-6   /* 24px icons (extra large) */
h-8 w-8   /* 32px avatars (small) */
h-10 w-10 /* 40px avatars (medium) */
```

### Shadow System

```css
/* Card Shadows */
shadow-sm     /* Subtle card shadows */
shadow-lg     /* Prominent card shadows */

/* Border Radius */
rounded       /* 6px - Standard buttons */
rounded-lg    /* 8px - Cards, containers */
rounded-xl    /* 12px - Message bubbles */
rounded-full  /* 50% - Avatars, status indicators */
```

### Animation Classes

```css
/* Loading States */
animate-pulse    /* Status indicators */
animate-bounce   /* Typing dots */
animate-spin     /* Loading spinners */

/* Transitions */
transition-colors /* Color state changes */
hover:bg-primary/10 /* Subtle hover states */
```

---

## 7. Real-time Updates

### Market Data Polling

```tsx
// Market data fetching with reduced polling frequency
useEffect(() => {
  const fetchMarketData = async () => {
    try {
      const response = await fetch('/api/market-data');
      const data = await response.json();
      if (data.success && data.data) {
        setMarketData(prev => ({
          ...prev,
          price: data.data.price || prev.price,
          change24h: data.data.change24h || prev.change24h,
          change24hPercent: data.data.change24hPercentage || prev.change24hPercent,
          volume24h: data.data.volume24h || prev.volume24h
        }));
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
    }
  };

  fetchMarketData();
  const interval = setInterval(fetchMarketData, 120000); // Every 2 minutes
  return () => clearInterval(interval);
}, []);
```

### Balance Updates

```tsx
// Automatic balance checking for agent vaults
useEffect(() => {
  if (vaultCredentials?.address) {
    const interval = setInterval(checkVaultBalance, 10000); // Every 10 seconds
    checkVaultBalance(); // Initial check
    return () => clearInterval(interval);
  }
}, [vaultCredentials]);

const checkVaultBalance = async (addressOverride?: string) => {
  const targetAddress = addressOverride || vaultCredentials?.address;
  if (!targetAddress) return;

  try {
    const response = await fetch(`${CARDANO_SERVICE_URL}/check-balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: targetAddress })
    });

    const data = await response.json();
    if (data.success) {
      setVaultBalance(data.balanceAda || 0);
      // Update localStorage for persistence
      if (currentVaultId) {
        const savedVaults = JSON.parse(localStorage.getItem('mister-user-vaults') || '[]');
        const updatedVaults = savedVaults.map((vault: any) =>
          vault.id === currentVaultId
            ? { ...vault, balance: data.balanceAda || 0 }
            : vault
        );
        setUserVaults(updatedVaults);
        localStorage.setItem('mister-user-vaults', JSON.stringify(updatedVaults));
      }
    }
  } catch (err) {
    console.error('Balance check error:', err);
  }
};
```

### Real-time Chat Updates

```tsx
// Auto-scroll to bottom on new messages
useEffect(() => {
  if (scrollAreaRef.current) {
    scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
  }
}, [messages]);

// Typing indicator with realistic delays
const handleSendMessage = async () => {
  // ... message processing

  // Simulate typing delay
  setTimeout(async () => {
    const agentMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      content: result.success ? result.data.response : 'Error message',
      timestamp: new Date(),
      tradeAction: result.data?.tradeAction
    };

    setMessages(prev => [...prev, agentMessage]);
    setIsTyping(false);
  }, 1000); // 1 second realistic typing delay
};
```

### Time Updates

```tsx
// Real-time timestamp updates
const [currentTime, setCurrentTime] = useState<string>('');

useEffect(() => {
  const updateTime = () => {
    setCurrentTime(new Date().toLocaleTimeString());
  };

  updateTime(); // Set initial time
  const interval = setInterval(updateTime, 1000); // Update every second
  return () => clearInterval(interval);
}, []);

const formatTime = (date: Date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
```

---

## 8. Agent Personality

### Welcome Messages

```tsx
// Context-aware greeting based on wallet connection
const welcomeMessage = mainWallet
  ? `Hello! I'm your Strike Agent. I can see you're connected with ${mainWallet.handle || 'your wallet'} (${mainWallet.balance.toFixed(2)} ADA). I can help you execute trades, analyze market conditions, and manage your positions. Try saying "Go long 50 ADA" or "What's the market sentiment?"`
  : 'Hello! I\'m your Strike Agent. Please connect your wallet first to start trading. I can help you execute trades, analyze market conditions, and manage your positions.';
```

### Response Patterns

**Trading Commands:**
- "Go long 50 ADA" → Executes long position
- "Short 100 ADA with 5x leverage" → Executes short with leverage
- "Close all positions" → Closes all open positions
- "What's my P&L?" → Shows portfolio summary

**Market Analysis:**
- "Analyze the market" → Provides technical analysis
- "What's the sentiment?" → Shows market sentiment
- "Price prediction?" → Gives price forecast

**Helpful Responses:**
- Proactive risk warnings for large positions
- Balance insufficient notifications
- Transaction status updates
- Market condition alerts

### Markdown Formatting

```tsx
// Using MarkdownRenderer for professional formatting
<MarkdownRenderer
  content={message.content}
  className="text-xs leading-relaxed"
/>
```

**Supported Markdown:**
- **Bold text** for emphasis
- `Code snippets` for addresses and hashes
- **Transaction Hash:** with proper formatting
- Bullet points for trade details
- Links to Cardanoscan for transactions

### Trade Action Responses

```tsx
// Enhanced trade action display with visual indicators
{message.tradeAction && (
  <div className="mt-3 p-3 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-lg border border-green-200 dark:border-green-800">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        {(message.tradeAction.action === 'long') ? (
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-white" />
          </div>
        ) : (
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-white" />
          </div>
        )}
        <div>
          <div className="font-semibold text-sm">
            {message.tradeAction.action?.toUpperCase()} Position
          </div>
          <div className="text-xs text-muted-foreground">
            {message.tradeAction.amount} ADA @ ${message.tradeAction.price?.toFixed(4)}
          </div>
        </div>
      </div>
      <Badge variant="secondary" className="text-xs">
        {message.tradeAction.requiresWalletSigning ? 'Signing Required' : 'Executed'}
      </Badge>
    </div>
  </div>
)}
```

---

## 9. Error Handling

### Wallet Connection Validation

```tsx
const handleSendMessage = async () => {
  // Check if wallet is connected for trading commands
  if (!mainWallet && (inputMessage.toLowerCase().includes('trade') ||
                     inputMessage.toLowerCase().includes('long') ||
                     inputMessage.toLowerCase().includes('short'))) {
    const errorMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      type: 'agent',
      content: 'Please connect your wallet first to execute trades. I can still help with market analysis and general questions.',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, errorMessage]);
    return;
  }
};
```

### API Error Handling

```tsx
try {
  const response = await fetch('/api/agents/strike/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ /* request data */ })
  });

  const result = await response.json();
  // Process success...

} catch (error) {
  console.error('Chat error:', error);
  setIsTyping(false);

  const errorMessage: ChatMessage = {
    id: (Date.now() + 1).toString(),
    type: 'agent',
    content: 'I\'m experiencing some technical difficulties. Please try again in a moment.',
    timestamp: new Date()
  };

  setMessages(prev => [...prev, errorMessage]);
}
```

### Wallet Signing Error Handling

```tsx
const handleWalletSigning = async (transactionCbor: string, tradeDetails: any) => {
  if (!mainWallet || !window.cardano) {
    console.error('❌ Wallet not connected for signing');
    return;
  }

  try {
    // Signing process...
  } catch (error) {
    console.error('❌ Wallet signing failed:', error);

    // User-friendly error message
    const errorMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'agent',
      content: `❌ **Transaction Failed**\n\nI was unable to complete the transaction signing. Please try again.\n\n**Error:** ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, errorMessage]);
  }
};
```

### Balance Validation

```tsx
// Strike Finance Client validation
private async validateTradeRequest(request: StrikeFinanceTradeRequest): Promise<{
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate wallet address
  if (!request.wallet_address || !request.wallet_address.startsWith('addr1')) {
    errors.push('Invalid Cardano wallet address');
  }

  // Validate amount
  if (request.amount < 40) {
    errors.push('Minimum trade amount is 40 ADA for Strike Finance');
  }

  // Check balance
  try {
    const hasBalance = await this.checkBalance(request.wallet_address, request.amount + 13);
    if (!hasBalance) {
      errors.push('Insufficient wallet balance for trade execution');
    }
  } catch (error) {
    warnings.push('Could not verify wallet balance');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings,
  };
}
```

### Timeout Handling

```tsx
// API request timeout
const response = await fetch(url, {
  method,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'MISTER-Trading-Platform/1.0',
  },
  signal: AbortSignal.timeout(this.config.timeout), // 30 second timeout
});
```

### Service Health Monitoring

```tsx
// Wallet registration with timeout to prevent cold start delays
const registerWalletForTrading = async (walletInfo: WalletRegistrationInfo) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch('https://bridge-server-cjs-production.up.railway.app/api/wallet/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(walletInfo),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('✅ Wallet registered for trading');
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('⏱️ Wallet registration skipped (server cold start)');
    } else {
      console.error('❌ Failed to register wallet for trading:', error);
    }
  }
};
```

---

## 10. Integration Points

### Wallet Context Integration

```tsx
// Wallet context provides mainWallet data
const { mainWallet, isLoading: walletLoading } = useWallet();

// Wallet information structure
interface MainWallet {
  address: string;
  stakeAddress: string;
  balance: number;
  walletType: string;
  handle?: string;
}
```

### User Identity System

```tsx
// Secure user identification for localStorage
const {
  userStorage,
  isAuthenticated,
  getUserDisplayName,
} = useUserIdentity();

// User storage keys
export const USER_STORAGE_KEYS = {
  TRADING_PREFERENCES: 'TRADING_PREFERENCES',
  SIGNAL_MODE: 'SIGNAL_MODE',
  // ... other keys
};
```

### Cardano Service Integration

```tsx
// Environment configuration
const CARDANO_SERVICE_URL = process.env.NEXT_PUBLIC_CARDANO_SERVICE_URL || 'http://localhost:3001';

// Service endpoints
const endpoints = {
  health: '/health',
  generateCredentials: '/generate-credentials',
  checkBalance: '/check-balance',
  lock: '/lock',
  unlock: '/unlock',
  scriptAddress: '/script-address'
};
```

### Strike Finance API Integration

```tsx
// Strike Finance configuration
const DEFAULT_CONFIG: StrikeFinanceConfig = {
  base_url: 'https://app.strikefinance.org',
  version: 'v1',
  timeout: 30000,
  retry: {
    max_attempts: 3,
    delay_ms: 1000,
  },
};

// API endpoints
const endpoints = {
  openPosition: '/api/perpetuals/openPosition',
  closePosition: '/api/perpetuals/closePosition',
  getPositions: '/api/perpetuals/getPositions',
};
```

### Mastra Agent Integration

```tsx
// Agent API endpoint
const response = await fetch('/api/agents/strike/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: inputMessage,
    context: 'trading_interface',
    userWallet: mainWallet ? {
      address: mainWallet.address,
      stakeAddress: mainWallet.stakeAddress,
      balance: mainWallet.balance,
      walletType: mainWallet.walletType,
      handle: mainWallet.handle
    } : null
  })
});
```

### Database Integration (Railway PostgreSQL)

```tsx
// Agent wallet manager with Railway PostgreSQL
export class AgentWalletManager implements IAgentWalletManager {
  private db: DatabaseClient;

  constructor() {
    this.db = getRailwayDB(); // Railway PostgreSQL client
  }

  async generateWallet(request: WalletGenerationRequest): Promise<WalletGenerationResult> {
    // Store in Railway PostgreSQL database
    const result = await this.db.insert('agent_wallets', dbWalletData);
    return result;
  }
}
```

### Environment Variables

```bash
# Required environment variables
NEXT_PUBLIC_CARDANO_SERVICE_URL=https://friendly-reprieve-production.up.railway.app
NEXT_PUBLIC_API_URL=https://bridge-server-cjs-production.up.railway.app
NEXT_PUBLIC_MASTRA_API_URL=https://substantial-scarce-magazin.mastra.cloud
NEXT_PUBLIC_CNT_API_URL=https://cnt-trading-api-production.up.railway.app
NEXT_PUBLIC_STRIKE_API_URL=https://bridge-server-cjs-production.up.railway.app
NEXT_PUBLIC_BLOCKFROST_PROJECT_ID=mainnetKDR7gGfvHy85Mqr4nYtfjoXq7fX8R1Bu
```

---

## Deployment Checklist

### Required Components

- [x] **AITradingChat Component** - Main chat interface
- [x] **OneClickExecutionService** - Trading execution logic
- [x] **StrikeFinanceClient** - API integration
- [x] **AgentWalletManager** - Wallet management
- [x] **WalletContext** - Wallet connection
- [x] **UserIdentity Hook** - User identification
- [x] **Railway PostgreSQL** - Database integration

### API Endpoints Required

- [x] `/api/agents/strike/chat` - Mastra Strike Agent
- [x] `/api/cardano/sign-transaction` - Transaction signing
- [x] `/api/market-data` - Real-time market data
- [x] Cardano Service endpoints (Railway deployed)
- [x] Strike Finance API endpoints

### Environment Setup

- [x] All required environment variables configured
- [x] Railway PostgreSQL database connected
- [x] Cardano service deployed and accessible
- [x] Strike Finance API credentials configured

### Testing Scenarios

- [x] Wallet connection/disconnection
- [x] Chat message sending/receiving
- [x] Trading command execution
- [x] Transaction signing flow
- [x] Error handling (network, wallet, API)
- [x] Balance checking and validation
- [x] Signal generation and execution
- [x] Real-time updates

This guide provides the complete implementation details needed to recreate the exact Strike Finance Agent Panel experience. The modular architecture ensures maintainability while the comprehensive error handling and real-time updates provide a professional user experience.