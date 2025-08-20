import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Breaking News Monitor Tool
 * 
 * Monitors for breaking news that could impact portfolio positions
 * Provides real-time alerts for critical developments
 */

interface NewsAlert {
  id: string;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: 'REGULATORY' | 'GEOPOLITICAL' | 'MARKET' | 'CRYPTO' | 'TECHNICAL';
  title: string;
  description: string;
  impact: string;
  portfolioSymbols: string[];
  actionRequired: boolean;
  source: string;
  confidence: number;
}

// Critical keywords that trigger immediate alerts
const CRITICAL_KEYWORDS = {
  REGULATORY: [
    'sec ban', 'crypto ban', 'regulatory action', 'enforcement action',
    'trading halt', 'delisted', 'investigation', 'fine', 'penalty'
  ],
  GEOPOLITICAL: [
    'nuclear', 'missile', 'invasion', 'war declared', 'embargo',
    'sanctions', 'military action', 'attack', 'terrorism'
  ],
  MARKET: [
    'flash crash', 'circuit breaker', 'trading suspended', 'market closed',
    'liquidation', 'margin call', 'exchange hack', 'exchange down'
  ],
  CRYPTO: [
    'hard fork', 'network attack', 'consensus failure', 'double spend',
    'smart contract exploit', 'defi hack', 'whale movement'
  ]
};

// Portfolio-specific keywords for targeted monitoring
const PORTFOLIO_KEYWORDS = {
  ETH: ['ethereum', 'eth', 'ether', 'vitalik', 'ethereum 2.0', 'merge', 'beacon chain', 'pos'],
  ADA: ['cardano', 'ada', 'charles hoskinson', 'ouroboros', 'plutus', 'smart contracts'],
  FET: ['fetch.ai', 'fet', 'artificial intelligence', 'ai agents', 'machine learning'],
  ATOM: ['cosmos', 'atom', 'tendermint', 'ibc', 'interchain', 'cosmos hub']
};

// News sources for breaking news monitoring
const BREAKING_NEWS_SOURCES = [
  {
    name: 'CoinDesk Breaking',
    url: 'https://www.coindesk.com/arc/outboundfeeds/rss/sitemap/',
    type: 'rss',
    priority: 'high'
  },
  {
    name: 'CoinTelegraph Breaking',
    url: 'https://cointelegraph.com/rss',
    type: 'rss',
    priority: 'high'
  },
  {
    name: 'The Block',
    url: 'https://www.theblockcrypto.com/rss.xml',
    type: 'rss',
    priority: 'high'
  },
  {
    name: 'Decrypt',
    url: 'https://decrypt.co/feed',
    type: 'rss',
    priority: 'medium'
  }
];

// Helper function to fetch and parse RSS feeds
async function fetchRSSFeed(url: string, sourceName: string): Promise<any[]> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BreakingNewsBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const xmlText = await response.text();
    return parseRSSItems(xmlText, sourceName);
  } catch (error) {
    console.error(`Failed to fetch RSS from ${sourceName}:`, error);
    return [];
  }
}

// Parse RSS XML to extract recent news items
function parseRSSItems(xmlText: string, source: string): any[] {
  if (!xmlText) return [];
  
  try {
    const itemMatches = xmlText.match(/<item>(.*?)<\/item>/gs) || [];
    
    return itemMatches.slice(0, 20).map((item, index) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s)?.[1] || item.match(/<title>(.*?)<\/title>/s)?.[1] || 'No title';
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s)?.[1] || item.match(/<description>(.*?)<\/description>/s)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/s)?.[1] || '';
      
      const publishedTime = pubDate ? new Date(pubDate).getTime() : Date.now() - (index * 1000);
      
      return {
        id: `${source}-${publishedTime}`,
        title: title.replace(/<[^>]*>/g, '').trim(),
        description: description.replace(/<[^>]*>/g, '').trim().substring(0, 300),
        publishedAt: new Date(publishedTime).toISOString(),
        url: link.trim(),
        source,
        timestamp: Date.now()
      };
    });
  } catch (error) {
    console.error(`Failed to parse RSS from ${source}:`, error);
    return [];
  }
}

// Analyze news item for severity and portfolio impact
function analyzeNewsItem(item: any, portfolioSymbols: string[]): NewsAlert | null {
  const text = `${item.title} ${item.description}`.toLowerCase();
  let severity: NewsAlert['severity'] = 'LOW';
  let category: NewsAlert['category'] = 'MARKET';
  let impactedSymbols: string[] = [];
  let confidence = 0.5;
  let actionRequired = false;
  
  // Check for critical keywords
  for (const [cat, keywords] of Object.entries(CRITICAL_KEYWORDS)) {
    const matches = keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    if (matches.length > 0) {
      severity = 'CRITICAL';
      category = cat as NewsAlert['category'];
      actionRequired = true;
      confidence = 0.9;
      break;
    }
  }
  
  // Check for portfolio-specific impacts
  for (const symbol of portfolioSymbols) {
    const symbolKeywords = PORTFOLIO_KEYWORDS[symbol as keyof typeof PORTFOLIO_KEYWORDS] || [symbol.toLowerCase()];
    const symbolMentions = symbolKeywords.filter(keyword => text.includes(keyword));
    
    if (symbolMentions.length > 0) {
      impactedSymbols.push(symbol);
      if (severity === 'LOW') {
        severity = symbolMentions.length > 2 ? 'HIGH' : 'MEDIUM';
        confidence = Math.min(0.8, confidence + 0.2);
      }
    }
  }
  
  // High-impact regulatory keywords
  const regulatoryKeywords = ['sec', 'cftc', 'regulation', 'ban', 'legal', 'court'];
  const regulatoryMentions = regulatoryKeywords.filter(keyword => text.includes(keyword));
  
  if (regulatoryMentions.length > 0) {
    if (severity === 'LOW') severity = 'HIGH';
    category = 'REGULATORY';
    confidence = Math.min(0.9, confidence + 0.3);
    actionRequired = true;
  }
  
  // Market volatility keywords
  const volatilityKeywords = ['crash', 'surge', 'pump', 'dump', 'volatility', 'liquidation'];
  const volatilityMentions = volatilityKeywords.filter(keyword => text.includes(keyword));
  
  if (volatilityMentions.length > 0) {
    if (severity === 'LOW') severity = 'MEDIUM';
    confidence = Math.min(0.8, confidence + 0.2);
  }
  
  // Skip low-impact news unless it affects portfolio
  if (severity === 'LOW' && impactedSymbols.length === 0) {
    return null;
  }
  
  // Generate impact assessment
  let impact = 'Potential market impact';
  if (impactedSymbols.length > 0) {
    impact = `Direct impact on ${impactedSymbols.join(', ')} positions`;
  }
  if (category === 'REGULATORY') {
    impact += ' - regulatory compliance review required';
  }
  if (category === 'GEOPOLITICAL') {
    impact += ' - risk-off sentiment expected';
  }
  
  const publishedTime = new Date(item.publishedAt).getTime();
  const currentTime = Date.now();
  const ageMinutes = (currentTime - publishedTime) / (1000 * 60);
  
  // Only alert on recent news (last 30 minutes for critical, 2 hours for others)
  const maxAge = severity === 'CRITICAL' ? 30 : severity === 'HIGH' ? 120 : 240;
  if (ageMinutes > maxAge) {
    return null;
  }
  
  return {
    id: item.id,
    timestamp: new Date().toISOString(),
    severity,
    category,
    title: item.title,
    description: item.description,
    impact,
    portfolioSymbols: impactedSymbols,
    actionRequired,
    source: item.source,
    confidence
  };
}

// Generate voice announcement for breaking news
function generateVoiceAlert(alerts: NewsAlert[]): string {
  if (alerts.length === 0) return '';
  
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  const highAlerts = alerts.filter(a => a.severity === 'HIGH');
  
  if (criticalAlerts.length > 0) {
    const alert = criticalAlerts[0];
    return `CRITICAL ALERT: ${alert.category.toLowerCase()} development detected. ${alert.title}. Immediate review required for ${alert.portfolioSymbols.join(' and ')} positions.`;
  }
  
  if (highAlerts.length > 0) {
    const alert = highAlerts[0];
    return `HIGH PRIORITY ALERT: ${alert.category.toLowerCase()} news affecting ${alert.portfolioSymbols.join(' and ')}. ${alert.title}. Review recommended.`;
  }
  
  return `${alerts.length} news alerts detected affecting portfolio positions. Review breaking news analysis.`;
}

export const breakingNewsMonitor = createTool({
  id: "breaking-news-monitor",
  description: "Monitor breaking news for immediate portfolio impact assessment and alerts",
  inputSchema: z.object({
    portfolioSymbols: z.array(z.string()).describe("Portfolio symbols to monitor for news impact"),
    alertThreshold: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM').describe("Minimum severity level for alerts"),
    includeVoiceAlert: z.boolean().optional().default(true).describe("Whether to generate voice alerts for critical news"),
    maxArticlesPerSource: z.number().optional().default(20).describe("Maximum articles to fetch per news source")
  }),
  execute: async ({ context, mastra }) => {
    const { portfolioSymbols, alertThreshold, includeVoiceAlert, maxArticlesPerSource } = context;
    
    try {
      console.log(`🚨 Monitoring breaking news for portfolio: ${portfolioSymbols.join(', ')}`);
      console.log(`📊 Alert threshold: ${alertThreshold}`);
      
      const allNewsItems: any[] = [];
      const alerts: NewsAlert[] = [];
      
      // Fetch from all breaking news sources
      for (const source of BREAKING_NEWS_SOURCES) {
        try {
          console.log(`📡 Fetching from ${source.name}...`);
          const items = await fetchRSSFeed(source.url, source.name);
          allNewsItems.push(...items);
          console.log(`✅ Retrieved ${items.length} items from ${source.name}`);
        } catch (error) {
          console.error(`❌ Failed to fetch from ${source.name}:`, error);
        }
      }
      
      console.log(`📰 Analyzing ${allNewsItems.length} total news items...`);
      
      // Analyze each news item for alerts
      for (const item of allNewsItems) {
        const alert = analyzeNewsItem(item, portfolioSymbols);
        if (alert) {
          // Check if alert meets threshold
          const severityLevels = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3, 'CRITICAL': 4 };
          if (severityLevels[alert.severity] >= severityLevels[alertThreshold]) {
            alerts.push(alert);
          }
        }
      }
      
      // Sort alerts by severity and time
      alerts.sort((a, b) => {
        const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
      
      console.log(`🚨 Generated ${alerts.length} alerts (threshold: ${alertThreshold})`);
      
      // Generate voice alert if requested and critical/high alerts exist
      let voiceAlertMade = false;
      if (includeVoiceAlert && alerts.length > 0) {
        const urgentAlerts = alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH');
        if (urgentAlerts.length > 0) {
          try {
            const voiceMessage = generateVoiceAlert(urgentAlerts);
            
            await mastra?.getAgent('phemexPortfolioAgent')?.tools?.speakAdvice?.execute({
              context: {
                message: voiceMessage,
                priority: 'URGENT'
              }
            });
            voiceAlertMade = true;
            console.log('🔊 Voice alert delivered');
          } catch (voiceError) {
            console.error('❌ Voice alert failed:', voiceError);
          }
        }
      }
      
      // Generate summary statistics
      const summary = {
        total_articles_scanned: allNewsItems.length,
        alerts_generated: alerts.length,
        critical_alerts: alerts.filter(a => a.severity === 'CRITICAL').length,
        high_alerts: alerts.filter(a => a.severity === 'HIGH').length,
        medium_alerts: alerts.filter(a => a.severity === 'MEDIUM').length,
        low_alerts: alerts.filter(a => a.severity === 'LOW').length,
        impacted_symbols: [...new Set(alerts.flatMap(a => a.portfolioSymbols))],
        action_required_count: alerts.filter(a => a.actionRequired).length,
        voice_alert_made: voiceAlertMade,
        scan_timestamp: new Date().toISOString()
      };
      
      // Generate recommendations based on alerts
      const recommendations = [];
      
      const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
      if (criticalAlerts.length > 0) {
        recommendations.push({
          priority: 'URGENT',
          action: 'Immediate review of critical alerts required',
          details: `${criticalAlerts.length} critical alerts detected`,
          timeline: 'immediate'
        });
      }
      
      const regulatoryAlerts = alerts.filter(a => a.category === 'REGULATORY');
      if (regulatoryAlerts.length > 0) {
        recommendations.push({
          priority: 'HIGH',
          action: 'Review regulatory developments',
          details: `${regulatoryAlerts.length} regulatory alerts affecting portfolio`,
          timeline: 'within_1_hour'
        });
      }
      
      const portfolioSpecificAlerts = alerts.filter(a => a.portfolioSymbols.length > 0);
      if (portfolioSpecificAlerts.length > 0) {
        recommendations.push({
          priority: 'MEDIUM',
          action: 'Assess position adjustments',
          details: `News affecting ${[...new Set(portfolioSpecificAlerts.flatMap(a => a.portfolioSymbols))].join(', ')}`,
          timeline: 'within_4_hours'
        });
      }
      
      console.log(`✅ Breaking news monitoring complete`);
      console.log(`📊 Summary: ${summary.alerts_generated} alerts, ${summary.action_required_count} requiring action`);
      
      return {
        success: true,
        summary,
        alerts: alerts.slice(0, 50), // Limit to top 50 alerts
        recommendations,
        monitoring_status: 'active',
        next_scan_recommended: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      };
      
    } catch (error) {
      console.error('❌ Breaking news monitoring failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        summary: {
          total_articles_scanned: 0,
          alerts_generated: 0,
          scan_timestamp: new Date().toISOString()
        }
      };
    }
  }
});

// Helper tool for continuous monitoring
export const startBreakingNewsMonitoring = createTool({
  id: "start-breaking-news-monitoring",
  description: "Start continuous breaking news monitoring with periodic scans",
  inputSchema: z.object({
    portfolioSymbols: z.array(z.string()).describe("Portfolio symbols to monitor"),
    scanIntervalMinutes: z.number().optional().default(15).describe("Minutes between news scans"),
    alertThreshold: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional().default('MEDIUM').describe("Alert threshold")
  }),
  execute: async ({ context }) => {
    const { portfolioSymbols, scanIntervalMinutes, alertThreshold } = context;
    
    console.log(`🚨 Starting continuous breaking news monitoring...`);
    console.log(`📊 Portfolio: ${portfolioSymbols.join(', ')}`);
    console.log(`⏱️ Scan interval: ${scanIntervalMinutes} minutes`);
    console.log(`🎯 Alert threshold: ${alertThreshold}`);
    
    return {
      success: true,
      monitoring_started: true,
      portfolio_symbols: portfolioSymbols,
      scan_interval_minutes: scanIntervalMinutes,
      alert_threshold: alertThreshold,
      next_scan: new Date(Date.now() + scanIntervalMinutes * 60 * 1000).toISOString(),
      instructions: `Continuous monitoring active. Run breaking-news-monitor tool every ${scanIntervalMinutes} minutes for updates.`
    };
  }
});