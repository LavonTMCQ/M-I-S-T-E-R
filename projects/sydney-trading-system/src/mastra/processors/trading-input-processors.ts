/**
 * Trading Input Processors
 * 
 * Advanced filtering and validation system for trading agent inputs.
 * Provides security, market-awareness, and message enrichment capabilities.
 */

import type { InputProcessor, MastraMessageV2, TripWire } from '@mastra/core/agent';

/**
 * Market Hours Validator
 * 
 * Blocks or modifies requests during market closures,
 * weekends, and major holidays when trading actions are not possible.
 */
export class MarketHoursValidator implements InputProcessor {
  readonly name = 'market-hours-validator';

  process({ messages, abort }: { 
    messages: MastraMessageV2[]; 
    abort: (reason?: string) => never 
  }): MastraMessageV2[] {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = currentDay === 0 || currentDay === 6;
    
    // Crypto markets are 24/7, but traditional market correlations matter
    // Block during likely low-liquidity periods for major actions
    const isLowLiquidityPeriod = currentHour >= 2 && currentHour <= 6; // 2 AM - 6 AM UTC
    
    // Check for high-risk actions during low liquidity periods
    const hasHighRiskAction = messages.some(message => {
      const messageText = this.extractTextFromMessage(message);
      return /urgent|emergency|liquidation|inject.*fund|add.*position|close.*position/i.test(messageText);
    });
    
    if (hasHighRiskAction && (isLowLiquidityPeriod || isWeekend)) {
      abort(`High-risk trading actions are restricted during low liquidity periods (weekends and 2-6 AM UTC) unless truly emergency situations. Current time: ${now.toISOString()}`);
    }
    
    // Add market context to messages if during low liquidity
    if (isLowLiquidityPeriod || isWeekend) {
      return this.addMarketContext(messages, {
        isWeekend,
        isLowLiquidityPeriod,
        currentTime: now.toISOString()
      });
    }
    
    return messages;
  }

  private extractTextFromMessage(message: MastraMessageV2): string {
    return message.content.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ');
  }

  private addMarketContext(messages: MastraMessageV2[], context: any): MastraMessageV2[] {
    const warningText = `⚠️ Market Context: Low liquidity period detected (${context.isWeekend ? 'Weekend' : 'Early Hours'}). Exercise extra caution with trading decisions.\n\n`;
    
    return messages.map(message => {
      if (message.role === 'user') {
        const textParts = message.content.parts.filter(part => part.type === 'text');
        if (textParts.length > 0) {
          (textParts[0] as any).text = warningText + (textParts[0] as any).text;
        }
      }
      return message;
    });
  }
}

/**
 * Risk Level Filter
 * 
 * Filters and validates high-risk requests, requiring explicit confirmation
 * for dangerous actions like large fund injections or position closures.
 */
export class RiskLevelFilter implements InputProcessor {
  readonly name = 'risk-level-filter';

  process({ messages, abort }: { 
    messages: MastraMessageV2[]; 
    abort: (reason?: string) => never 
  }): MastraMessageV2[] {
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const message of userMessages) {
      const messageText = this.extractTextFromMessage(message);
      
      // Detect high-risk keywords and patterns
      const highRiskPatterns = [
        /inject.*(\$?\d+,?\d*k|\$?\d+,?\d*,?\d*)/i, // Large fund injections
        /close.*all.*position/i, // Close all positions
        /liquidat/i, // Liquidation-related
        /emergency.*sell|sell.*emergency/i, // Emergency selling
        /margin.*call/i, // Margin calls
        /stop.*loss.*remove|remove.*stop.*loss/i, // Remove stop losses
        /leverage.*\d+x/i, // High leverage requests
        /all.*in|yolo/i, // All-in requests
      ];
      
      const detectedRisks = highRiskPatterns.filter(pattern => pattern.test(messageText));
      
      if (detectedRisks.length > 0) {
        // Check for explicit confirmation
        const hasConfirmation = /confirm|confirmed|yes.*proceed|acknowledge.*risk|i understand/i.test(messageText);
        
        if (!hasConfirmation) {
          // Extract monetary amounts for more specific error
          const amountMatches = messageText.match(/\$?\d+,?\d*k|\$?\d+,?\d*,?\d*/g) || [];
          const amounts = amountMatches.map(amount => {
            const cleanAmount = amount.replace(/[$,]/g, '');
            if (cleanAmount.includes('k')) {
              return parseFloat(cleanAmount) * 1000;
            }
            return parseFloat(cleanAmount);
          });
          
          const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 0;
          const amountText = maxAmount > 0 ? `, Amount: $${maxAmount.toLocaleString()}` : '';
          
          abort(`🚨 HIGH-RISK REQUEST BLOCKED: High-risk trading action detected${amountText}. To proceed, please confirm by saying: "I confirm this high-risk action and understand the consequences."`);
        }
        
        // Add risk warning to confirmed requests
        this.addRiskWarning(message, detectedRisks.length);
      }
    }
    
    return messages;
  }

  private extractTextFromMessage(message: MastraMessageV2): string {
    return message.content.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ');
  }

  private addRiskWarning(message: MastraMessageV2, riskCount: number): void {
    const warningText = `🚨 HIGH-RISK REQUEST CONFIRMED (${riskCount} risk indicators detected)\n\n`;
    
    const textParts = message.content.parts.filter(part => part.type === 'text');
    if (textParts.length > 0) {
      (textParts[0] as any).text = warningText + (textParts[0] as any).text;
    }
  }
}

/**
 * News Context Enricher
 * 
 * Enriches trading queries with relevant breaking news and market context
 * to improve the quality of agent responses.
 */
export class NewsContextEnricher implements InputProcessor {
  readonly name = 'news-context-enricher';

  process({ messages, abort }: { 
    messages: MastraMessageV2[]; 
    abort: (reason?: string) => never 
  }): MastraMessageV2[] {
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const message of userMessages) {
      const messageText = this.extractTextFromMessage(message);
      
      // Detect if request would benefit from news context
      const newsRelevantPatterns = [
        /market.*condition/i,
        /what.*happening/i,
        /analysis|analyze/i,
        /recommend|advice/i,
        /ETH|ADA|FET|ATOM|ethereum|cardano|fetch|cosmos/i,
        /crypto|bitcoin|regulation/i,
        /sentiment/i,
        /briefing/i
      ];
      
      const needsNewsContext = newsRelevantPatterns.some(pattern => pattern.test(messageText));
      
      if (needsNewsContext) {
        // Extract relevant symbols mentioned
        const mentionedSymbols = [];
        if (/ETH|ethereum/i.test(messageText)) mentionedSymbols.push('ETH');
        if (/ADA|cardano/i.test(messageText)) mentionedSymbols.push('ADA');
        if (/FET|fetch/i.test(messageText)) mentionedSymbols.push('FET');
        if (/ATOM|cosmos/i.test(messageText)) mentionedSymbols.push('ATOM');
        
        this.addNewsContext(message, mentionedSymbols);
      }
    }
    
    return messages;
  }

  private extractTextFromMessage(message: MastraMessageV2): string {
    return message.content.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ');
  }

  private addNewsContext(message: MastraMessageV2, mentionedSymbols: string[]): void {
    // Simulate news context enrichment
    // In a real implementation, this would call actual news APIs
    const mockNewsContext = {
      marketSentiment: "NEUTRAL",
      breakingNewsCount: 2,
      relevantNews: [
        "Federal Reserve maintains current interest rates",
        "Ethereum network upgrade scheduled for next month"
      ],
      portfolioRelevantNews: mentionedSymbols.length > 0 ? 
        `Recent developments affecting ${mentionedSymbols.join(', ')}` : null,
      lastUpdated: new Date().toISOString()
    };
    
    const contextString = `\n\n📰 CURRENT MARKET CONTEXT:\n` +
      `• Sentiment: ${mockNewsContext.marketSentiment}\n` +
      `• Breaking News: ${mockNewsContext.breakingNewsCount} items\n` +
      (mockNewsContext.portfolioRelevantNews ? `• Portfolio News: ${mockNewsContext.portfolioRelevantNews}\n` : '') +
      `• Last Updated: ${new Date(mockNewsContext.lastUpdated).toLocaleTimeString()}\n\n` +
      `ORIGINAL REQUEST: `;
    
    const textParts = message.content.parts.filter(part => part.type === 'text');
    if (textParts.length > 0) {
      (textParts[0] as any).text = contextString + (textParts[0] as any).text;
    }
  }
}

/**
 * Trading Security Processor
 * 
 * Comprehensive security processor that combines multiple security checks
 * specifically designed for trading environments.
 */
export class TradingSecurityProcessor implements InputProcessor {
  readonly name = 'trading-security-processor';

  process({ messages, abort }: { 
    messages: MastraMessageV2[]; 
    abort: (reason?: string) => never 
  }): MastraMessageV2[] {
    const userMessages = messages.filter(m => m.role === 'user');
    
    for (const message of userMessages) {
      const messageText = this.extractTextFromMessage(message);
      
      // Check for potential prompt injection attempts
      const injectionPatterns = [
        /ignore.*previous.*instruction/i,
        /forget.*everything.*above/i,
        /you.*are.*now/i,
        /system.*prompt/i,
        /jailbreak/i,
        /override.*safety/i,
        /pretend.*you.*are/i,
        /new.*role.*you.*are/i
      ];
      
      const hasInjection = injectionPatterns.some(pattern => pattern.test(messageText));
      
      if (hasInjection) {
        abort(`🛡️ SECURITY BLOCK: Potential prompt injection detected. Please rephrase your request focusing on legitimate trading questions.`);
      }
      
      // Check for attempts to bypass trading restrictions
      const bypassPatterns = [
        /bypass.*restriction/i,
        /ignore.*trading.*rule/i,
        /override.*safety.*check/i,
        /execute.*trade.*anyway/i,
        /force.*position.*close/i,
        /admin.*mode/i,
        /developer.*access/i
      ];
      
      const hasBypass = bypassPatterns.some(pattern => pattern.test(messageText));
      
      if (hasBypass) {
        abort(`🚨 SECURITY ALERT: Attempt to bypass trading safety restrictions detected. This system maintains read-only access to protect your account.`);
      }
    }
    
    return messages;
  }

  private extractTextFromMessage(message: MastraMessageV2): string {
    return message.content.parts
      .filter(part => part.type === 'text')
      .map(part => (part as any).text)
      .join(' ');
  }
}

/**
 * Pre-configured processor chains for different security levels
 */
export const tradingProcessorConfigs = {
  // High security - all processors active
  secure: [
    new TradingSecurityProcessor(),
    new MarketHoursValidator(),
    new RiskLevelFilter(),
    new NewsContextEnricher()
  ],
  
  // Medium security - skip market hours for 24/7 crypto trading
  medium: [
    new TradingSecurityProcessor(),
    new RiskLevelFilter(),
    new NewsContextEnricher()
  ],
  
  // Light security - only news enrichment and basic security
  light: [
    new TradingSecurityProcessor(),
    new NewsContextEnricher()
  ],
  
  // No processing - direct pass-through
  none: []
};

// Individual processors are already exported with their class declarations above