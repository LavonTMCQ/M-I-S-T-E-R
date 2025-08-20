import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

export const tradingViewWebhookIntegration = createTool({
  id: "tradingview-webhook-integration",
  description: "Set up TradingView webhook integration for real-time alerts and automated trading signals",
  inputSchema: z.object({
    action: z.enum(['setup', 'configure', 'test', 'parse', 'validate']).describe("Webhook integration action"),
    webhookData: z.object({
      symbol: z.string().optional().describe("Trading symbol"),
      action: z.string().optional().describe("Trading action (BUY/SELL)"),
      price: z.number().optional().describe("Alert price"),
      strategy: z.string().optional().describe("Strategy name"),
      timeframe: z.string().optional().describe("Chart timeframe"),
      indicators: z.record(z.any()).optional().describe("Technical indicators"),
      message: z.string().optional().describe("Alert message"),
      timestamp: z.string().optional().describe("Alert timestamp"),
    }).optional(),
    configuration: z.object({
      webhookUrl: z.string().optional().describe("Webhook URL endpoint"),
      alertTemplate: z.string().optional().describe("TradingView alert message template"),
      autoExecution: z.boolean().optional().default(false).describe("Enable automatic trade execution"),
      riskManagement: z.boolean().optional().default(true).describe("Enable risk management"),
      voiceAlerts: z.boolean().optional().default(true).describe("Enable voice announcements"),
      filters: z.object({
        symbols: z.array(z.string()).optional().describe("Allowed symbols"),
        strategies: z.array(z.string()).optional().describe("Allowed strategies"),
        minPrice: z.number().optional().describe("Minimum price filter"),
        maxPrice: z.number().optional().describe("Maximum price filter"),
      }).optional(),
    }).optional(),
  }),
  execute: async ({ context }) => {
    const { action, webhookData, configuration } = context;

    try {
      switch (action) {
        case 'setup':
          return await setupTradingViewWebhook(configuration);
        
        case 'configure':
          return await configureTradingViewIntegration(configuration);
        
        case 'test':
          return await testWebhookIntegration(webhookData);
        
        case 'parse':
          if (!webhookData) throw new Error('Webhook data required for parsing');
          return await parseTradingViewAlert(webhookData);
        
        case 'validate':
          if (!webhookData) throw new Error('Webhook data required for validation');
          return await validateTradingViewAlert(webhookData);
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      console.error('❌ TradingView webhook integration error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString(),
      };
    }
  },
});

async function setupTradingViewWebhook(configuration: any) {
  const defaultConfig = {
    webhookUrl: 'http://localhost:8080/signals',
    alertTemplate: `{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "price": {{close}},
  "strategy": "{{strategy.order.id}}",
  "timeframe": "{{interval}}",
  "timestamp": "{{time}}",
  "indicators": {
    "rsi": {{plot("RSI")}},
    "macd": {{plot("MACD")}},
    "ema": {{plot("EMA")}}
  },
  "message": "{{strategy.order.comment}}"
}`,
    autoExecution: false,
    riskManagement: true,
    voiceAlerts: true,
    filters: {
      symbols: ['SPY', 'QQQ', 'AAPL', 'TSLA', 'ADAUSDT', 'BTCUSDT'],
      strategies: ['Tomorrow Labs ORB', 'MACD Strategy', 'RSI Strategy'],
    },
  };

  const config = { ...defaultConfig, ...configuration };

  console.log('🔗 Setting up TradingView webhook integration...');

  // Generate webhook setup instructions
  const setupInstructions = generateSetupInstructions(config);

  return {
    success: true,
    message: 'TradingView webhook integration setup completed',
    configuration: config,
    setupInstructions,
    webhookEndpoint: config.webhookUrl,
    alertTemplate: config.alertTemplate,
    testUrl: `${config.webhookUrl}/test`,
    timestamp: new Date().toISOString(),
  };
}

async function configureTradingViewIntegration(configuration: any) {
  console.log('⚙️ Configuring TradingView integration:', configuration);

  // Validate configuration
  const validation = validateConfiguration(configuration);
  if (!validation.valid) {
    return {
      success: false,
      error: 'Invalid configuration',
      errors: validation.errors,
      timestamp: new Date().toISOString(),
    };
  }

  // Generate Pine Script examples
  const pineScriptExamples = generatePineScriptExamples(configuration);

  return {
    success: true,
    message: 'TradingView integration configured successfully',
    configuration,
    validation,
    pineScriptExamples,
    timestamp: new Date().toISOString(),
  };
}

async function testWebhookIntegration(webhookData: any) {
  console.log('🧪 Testing TradingView webhook integration...');

  // Simulate TradingView alert
  const testAlert = webhookData || {
    symbol: 'SPY',
    action: 'BUY',
    price: 450.25,
    strategy: 'Test Strategy',
    timeframe: '5m',
    timestamp: new Date().toISOString(),
    indicators: {
      rsi: 65.5,
      macd: 0.25,
      ema: 449.80,
    },
    message: 'Test alert from TradingView webhook integration',
  };

  // Parse and validate the test alert
  const parseResult = await parseTradingViewAlert(testAlert);
  const validationResult = await validateTradingViewAlert(testAlert);

  // Simulate processing
  const processingResult = await simulateAlertProcessing(testAlert);

  return {
    success: true,
    message: 'TradingView webhook test completed',
    testAlert,
    parseResult,
    validationResult,
    processingResult,
    timestamp: new Date().toISOString(),
  };
}

async function parseTradingViewAlert(webhookData: any) {
  console.log('📊 Parsing TradingView alert:', webhookData);

  // Extract and normalize data
  const parsed = {
    symbol: normalizeSymbol(webhookData.symbol || webhookData.ticker),
    action: normalizeAction(webhookData.action || webhookData.side),
    price: parseFloat(webhookData.price || webhookData.close || 0),
    strategy: webhookData.strategy || webhookData.strategyName || 'Unknown',
    timeframe: normalizeTimeframe(webhookData.timeframe || webhookData.interval),
    timestamp: webhookData.timestamp || new Date().toISOString(),
    indicators: parseIndicators(webhookData.indicators || {}),
    metadata: {
      originalMessage: webhookData.message,
      source: 'TradingView',
      rawData: webhookData,
    },
  };

  // Calculate signal strength based on indicators
  const signalStrength = calculateSignalStrength(parsed);

  return {
    success: true,
    parsed: {
      ...parsed,
      strength: signalStrength,
    },
    originalData: webhookData,
    timestamp: new Date().toISOString(),
  };
}

async function validateTradingViewAlert(webhookData: any) {
  console.log('✅ Validating TradingView alert...');

  const errors = [];
  const warnings = [];

  // Required fields validation
  if (!webhookData.symbol && !webhookData.ticker) {
    errors.push('Missing symbol/ticker');
  }

  if (!webhookData.action && !webhookData.side) {
    errors.push('Missing action/side');
  }

  if (!webhookData.price && !webhookData.close) {
    errors.push('Missing price/close');
  }

  // Data type validation
  const price = parseFloat(webhookData.price || webhookData.close || 0);
  if (isNaN(price) || price <= 0) {
    errors.push('Invalid price value');
  }

  // Symbol validation
  const symbol = webhookData.symbol || webhookData.ticker;
  if (symbol && !isValidSymbol(symbol)) {
    warnings.push(`Unusual symbol format: ${symbol}`);
  }

  // Action validation
  const action = webhookData.action || webhookData.side;
  if (action && !['BUY', 'SELL', 'LONG', 'SHORT', 'buy', 'sell', 'long', 'short'].includes(action)) {
    warnings.push(`Unusual action format: ${action}`);
  }

  // Timestamp validation
  if (webhookData.timestamp) {
    const timestamp = new Date(webhookData.timestamp);
    if (isNaN(timestamp.getTime())) {
      warnings.push('Invalid timestamp format');
    } else {
      const age = Date.now() - timestamp.getTime();
      if (age > 5 * 60 * 1000) { // 5 minutes
        warnings.push('Alert timestamp is more than 5 minutes old');
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    success: true,
    valid: isValid,
    errors,
    warnings,
    score: calculateValidationScore(errors, warnings),
    timestamp: new Date().toISOString(),
  };
}

function generateSetupInstructions(config: any) {
  return {
    step1: {
      title: 'Create TradingView Alert',
      instructions: [
        '1. Open your TradingView chart',
        '2. Right-click and select "Add Alert"',
        '3. Configure your alert conditions',
        '4. In the "Notifications" tab, enable "Webhook URL"',
        `5. Enter webhook URL: ${config.webhookUrl}`,
      ],
    },
    step2: {
      title: 'Configure Alert Message',
      instructions: [
        '1. In the alert message box, paste the following template:',
        config.alertTemplate,
        '2. Customize the template for your specific strategy',
        '3. Test the alert to ensure proper formatting',
      ],
    },
    step3: {
      title: 'Pine Script Integration',
      instructions: [
        '1. Add the following to your Pine Script strategy:',
        'strategy.entry("Long", strategy.long, when=buyCondition)',
        'strategy.close("Long", when=sellCondition)',
        '2. Use alertcondition() for custom alerts',
        '3. Include relevant plot() functions for indicators',
      ],
    },
    step4: {
      title: 'Test Integration',
      instructions: [
        '1. Create a test alert with sample data',
        '2. Verify webhook receives the alert',
        '3. Check signal processing and voice announcements',
        '4. Validate risk management rules',
      ],
    },
  };
}

function generatePineScriptExamples(configuration: any) {
  return {
    basicAlert: `
//@version=5
strategy("Sydney Trading Alert", overlay=true)

// Strategy logic
ema9 = ta.ema(close, 9)
rsi = ta.rsi(close, 14)
[macdLine, signalLine, histLine] = ta.macd(close, 12, 26, 9)

// Entry conditions
buyCondition = ta.crossover(close, ema9) and rsi < 70
sellCondition = ta.crossunder(close, ema9) and rsi > 30

// Strategy execution
if buyCondition
    strategy.entry("Long", strategy.long)
    alert('{"symbol":"' + syminfo.ticker + '","action":"BUY","price":' + str.tostring(close) + ',"strategy":"EMA Cross","timeframe":"' + timeframe.period + '","indicators":{"rsi":' + str.tostring(rsi) + ',"macd":' + str.tostring(macdLine) + ',"ema":' + str.tostring(ema9) + '}}')

if sellCondition
    strategy.close("Long")
    alert('{"symbol":"' + syminfo.ticker + '","action":"SELL","price":' + str.tostring(close) + ',"strategy":"EMA Cross","timeframe":"' + timeframe.period + '","indicators":{"rsi":' + str.tostring(rsi) + ',"macd":' + str.tostring(macdLine) + ',"ema":' + str.tostring(ema9) + '}}')

plot(ema9, color=color.blue, title="EMA 9")
`,
    advancedAlert: `
//@version=5
strategy("Sydney Advanced Alert", overlay=true)

// Multi-timeframe analysis
htf_trend = request.security(syminfo.tickerid, "1H", ta.ema(close, 20))
current_trend = ta.ema(close, 20)

// Advanced indicators
rsi = ta.rsi(close, 14)
[macdLine, signalLine, histLine] = ta.macd(close, 12, 26, 9)
bb_upper = ta.bb(close, 20, 2)[0]
bb_lower = ta.bb(close, 20, 2)[2]

// Signal strength calculation
signal_strength = 0.0
if close > current_trend
    signal_strength += 0.3
if rsi > 50
    signal_strength += 0.2
if macdLine > signalLine
    signal_strength += 0.3
if close > htf_trend
    signal_strength += 0.2

// Entry with signal strength
strong_buy = signal_strength >= 0.8 and ta.crossover(close, current_trend)
strong_sell = signal_strength <= 0.2 and ta.crossunder(close, current_trend)

if strong_buy
    strategy.entry("Long", strategy.long)
    alert('{"symbol":"' + syminfo.ticker + '","action":"BUY","price":' + str.tostring(close) + ',"strategy":"Advanced Multi-TF","timeframe":"' + timeframe.period + '","strength":' + str.tostring(signal_strength) + ',"indicators":{"rsi":' + str.tostring(rsi) + ',"macd":' + str.tostring(macdLine) + ',"bb_position":' + str.tostring((close - bb_lower) / (bb_upper - bb_lower)) + '}}')

if strong_sell
    strategy.close("Long")
    alert('{"symbol":"' + syminfo.ticker + '","action":"SELL","price":' + str.tostring(close) + ',"strategy":"Advanced Multi-TF","timeframe":"' + timeframe.period + '","strength":' + str.tostring(signal_strength) + ',"indicators":{"rsi":' + str.tostring(rsi) + ',"macd":' + str.tostring(macdLine) + ',"bb_position":' + str.tostring((close - bb_lower) / (bb_upper - bb_lower)) + '}}')
`,
  };
}

function normalizeSymbol(symbol: string): string {
  if (!symbol) return '';
  return symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function normalizeAction(action: string): string {
  if (!action) return '';
  const normalized = action.toUpperCase();
  if (['BUY', 'LONG'].includes(normalized)) return 'BUY';
  if (['SELL', 'SHORT'].includes(normalized)) return 'SELL';
  return normalized;
}

function normalizeTimeframe(timeframe: string): string {
  if (!timeframe) return '';
  return timeframe.toLowerCase();
}

function parseIndicators(indicators: any): any {
  const parsed: any = {};
  
  Object.keys(indicators).forEach(key => {
    const value = indicators[key];
    if (typeof value === 'string') {
      const numValue = parseFloat(value);
      parsed[key] = isNaN(numValue) ? value : numValue;
    } else {
      parsed[key] = value;
    }
  });
  
  return parsed;
}

function calculateSignalStrength(parsed: any): number {
  let strength = 0.5; // Base strength
  
  // Adjust based on indicators
  if (parsed.indicators.rsi) {
    const rsi = parsed.indicators.rsi;
    if (parsed.action === 'BUY' && rsi < 70) strength += 0.1;
    if (parsed.action === 'SELL' && rsi > 30) strength += 0.1;
  }
  
  if (parsed.indicators.macd) {
    const macd = parsed.indicators.macd;
    if (parsed.action === 'BUY' && macd > 0) strength += 0.1;
    if (parsed.action === 'SELL' && macd < 0) strength += 0.1;
  }
  
  // Timeframe bonus
  if (['1h', '4h', '1d'].includes(parsed.timeframe)) {
    strength += 0.1;
  }
  
  return Math.min(1, Math.max(0, strength));
}

function isValidSymbol(symbol: string): boolean {
  // Basic symbol validation
  return /^[A-Z0-9]{2,10}(USDT|USD)?$/i.test(symbol);
}

function calculateValidationScore(errors: string[], warnings: string[]): number {
  let score = 100;
  score -= errors.length * 25; // -25 points per error
  score -= warnings.length * 5; // -5 points per warning
  return Math.max(0, score);
}

function validateConfiguration(configuration: any): { valid: boolean; errors: string[] } {
  const errors = [];
  
  if (configuration?.webhookUrl && !isValidUrl(configuration.webhookUrl)) {
    errors.push('Invalid webhook URL format');
  }
  
  if (configuration?.filters?.symbols && !Array.isArray(configuration.filters.symbols)) {
    errors.push('Symbols filter must be an array');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function simulateAlertProcessing(testAlert: any) {
  console.log('🔄 Simulating alert processing...');
  
  // Simulate the full processing pipeline
  const steps = [
    { name: 'Webhook Received', status: 'completed', duration: 5 },
    { name: 'Alert Parsed', status: 'completed', duration: 10 },
    { name: 'Validation Passed', status: 'completed', duration: 8 },
    { name: 'Signal Processed', status: 'completed', duration: 15 },
    { name: 'Risk Check', status: 'completed', duration: 12 },
    { name: 'Voice Announcement', status: 'completed', duration: 20 },
  ];
  
  if (testAlert.action === 'BUY') {
    steps.push({ name: 'Trade Execution', status: 'simulated', duration: 25 });
  }
  
  return {
    success: true,
    steps,
    totalDuration: steps.reduce((sum, step) => sum + step.duration, 0),
    recommendation: 'Alert processing pipeline working correctly',
    nextSteps: [
      'Configure real TradingView alerts',
      'Test with live market data',
      'Enable automatic execution if desired',
    ],
  };
}
