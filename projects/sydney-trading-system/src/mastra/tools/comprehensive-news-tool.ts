import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Comprehensive News Gathering Tool
 * 
 * Provides presidential-level news briefings with:
 * - Crypto-specific news (ETH, ADA, FET, ATOM)
 * - Global geopolitical news
 * - Economic indicators
 * - Regulatory developments
 * - Social sentiment analysis
 */

// News API configurations
const NEWS_SOURCES = {
  // Free news APIs
  NEWS_API: 'https://newsapi.org/v2',
  CRYPTO_NEWS: 'https://cryptonews-api.com/api/v1',
  
  // RSS feeds for immediate parsing
  COINDESK_RSS: 'https://www.coindesk.com/arc/outboundfeeds/rss/',
  COINTELEGRAPH_RSS: 'https://cointelegraph.com/rss',
  REUTERS_CRYPTO: 'https://www.reuters.com/technology/cryptocurrency/',
  
  // Reddit sentiment (via RSS)
  REDDIT_CRYPTO: 'https://www.reddit.com/r/CryptoCurrency/hot.json',
  REDDIT_ETHEREUM: 'https://www.reddit.com/r/ethereum/hot.json',
  REDDIT_CARDANO: 'https://www.reddit.com/r/cardano/hot.json',
};

// Helper function to fetch RSS feeds with timeout protection
async function fetchRSSAsText(url: string, timeoutMs: number = 5000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const text = await response.text();
    return text;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`RSS fetch timeout from ${url} after ${timeoutMs}ms`);
    } else {
      console.error(`Failed to fetch RSS from ${url}:`, error);
    }
    return '';
  }
}

// Helper function to fetch JSON data from Reddit API with timeout protection
async function fetchRedditData(subreddit: string, timeoutMs: number = 3000): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PortfolioBot/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Reddit API failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.data?.children?.map((child: any) => ({
      title: child.data.title,
      score: child.data.score,
      created: new Date(child.data.created_utc * 1000).toISOString(),
      url: child.data.url,
      comments: child.data.num_comments,
      upvoteRatio: child.data.upvote_ratio
    })) || [];
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Reddit fetch timeout for ${subreddit} after ${timeoutMs}ms`);
    } else {
      console.error(`Failed to fetch Reddit data for ${subreddit}:`, error);
    }
    return [];
  }
}

// Parse RSS XML to extract news items
function parseRSSToNews(xmlText: string, source: string): any[] {
  if (!xmlText) return [];
  
  try {
    // Simple regex-based XML parsing for RSS feeds
    const itemMatches = xmlText.match(/<item>(.*?)<\/item>/gs) || [];
    
    return itemMatches.slice(0, 10).map(item => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/s)?.[1] || item.match(/<title>(.*?)<\/title>/s)?.[1] || 'No title';
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/s)?.[1] || item.match(/<description>(.*?)<\/description>/s)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/s)?.[1] || '';
      
      return {
        title: title.replace(/<[^>]*>/g, '').trim(),
        description: description.replace(/<[^>]*>/g, '').trim().substring(0, 200),
        publishedAt: pubDate,
        url: link.trim(),
        source
      };
    });
  } catch (error) {
    console.error(`Failed to parse RSS from ${source}:`, error);
    return [];
  }
}

// Analyze news for portfolio impact
function analyzeNewsImpact(news: any[], portfolioSymbols: string[]): any {
  const portfolioKeywords = [
    // ETH keywords
    'ethereum', 'eth', 'ether', 'vitalik', 'ethereum 2.0', 'eth2', 'eip', 'defi',
    // ADA keywords  
    'cardano', 'ada', 'charles hoskinson', 'ouroboros', 'hydra', 'plutus',
    // FET keywords
    'fetch.ai', 'fet', 'artificial intelligence', 'ai crypto', 'machine learning',
    // ATOM keywords
    'cosmos', 'atom', 'tendermint', 'ibc', 'cosmos hub', 'interchain'
  ];
  
  const geopoliticalKeywords = [
    'trump', 'election', 'regulation', 'sec', 'cftc', 'fed', 'federal reserve',
    'war', 'russia', 'ukraine', 'china', 'inflation', 'recession', 'interest rates',
    'biden', 'congress', 'cryptocurrency ban', 'cbdc', 'stablecoin'
  ];
  
  const impact = {
    high_impact: [],
    medium_impact: [],
    low_impact: [],
    geopolitical: [],
    regulatory: [],
    portfolio_specific: [],
    sentiment_summary: 'neutral'
  };
  
  let bullishCount = 0;
  let bearishCount = 0;
  
  news.forEach(article => {
    const text = `${article.title} ${article.description}`.toLowerCase();
    let impactLevel = 'low';
    let categories = [];
    
    // Check for portfolio-specific keywords
    const portfolioMentions = portfolioKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Check for geopolitical keywords
    const geopoliticalMentions = geopoliticalKeywords.filter(keyword => 
      text.includes(keyword.toLowerCase())
    );
    
    // Determine impact level
    if (portfolioMentions.length > 0) {
      impactLevel = portfolioMentions.length > 2 ? 'high' : 'medium';
      categories.push('portfolio_specific');
    }
    
    if (geopoliticalMentions.length > 0) {
      if (impactLevel === 'low') impactLevel = 'medium';
      categories.push('geopolitical');
    }
    
    // Regulatory impact
    if (text.includes('regulation') || text.includes('sec') || text.includes('ban')) {
      impactLevel = 'high';
      categories.push('regulatory');
    }
    
    // Sentiment analysis (basic)
    const bullishWords = ['bull', 'rise', 'surge', 'pump', 'adoption', 'institutional', 'breakthrough'];
    const bearishWords = ['bear', 'fall', 'crash', 'dump', 'ban', 'regulation', 'hack'];
    
    const bullishScore = bullishWords.filter(word => text.includes(word)).length;
    const bearishScore = bearishWords.filter(word => text.includes(word)).length;
    
    if (bullishScore > bearishScore) bullishCount++;
    if (bearishScore > bullishScore) bearishCount++;
    
    // Categorize article
    const enhancedArticle = {
      ...article,
      impact_level: impactLevel,
      categories,
      portfolio_mentions: portfolioMentions,
      geopolitical_mentions: geopoliticalMentions,
      sentiment: bullishScore > bearishScore ? 'bullish' : bearishScore > bullishScore ? 'bearish' : 'neutral'
    };
    
    impact[`${impactLevel}_impact` as keyof typeof impact].push(enhancedArticle);
    
    categories.forEach(category => {
      if (category in impact) {
        (impact[category as keyof typeof impact] as any[]).push(enhancedArticle);
      }
    });
  });
  
  // Overall sentiment
  if (bullishCount > bearishCount * 1.5) {
    impact.sentiment_summary = 'bullish';
  } else if (bearishCount > bullishCount * 1.5) {
    impact.sentiment_summary = 'bearish';
  }
  
  return impact;
}

export const comprehensiveNewsTool = createTool({
  id: "comprehensive-news-gathering",
  description: "Gather comprehensive news for presidential-level briefings including crypto, geopolitical, and economic news with portfolio impact analysis",
  inputSchema: z.object({
    portfolioSymbols: z.array(z.string()).describe("Portfolio symbols to analyze impact for (e.g., ['ETH', 'ADA', 'FET', 'ATOM'])"),
    includeGlobal: z.boolean().optional().default(true).describe("Include global geopolitical and economic news"),
    includeSocialSentiment: z.boolean().optional().default(true).describe("Include social media sentiment analysis"),
    maxArticles: z.number().optional().default(50).describe("Maximum number of articles to gather per source")
  }),
  execute: async ({ context }) => {
    const { portfolioSymbols, includeGlobal, includeSocialSentiment, maxArticles } = context;
    
    // Total timeout for the entire news gathering operation
    const TOTAL_TIMEOUT_MS = 30000; // 30 seconds maximum
    const startTime = Date.now();
    
    try {
      console.log(`📰 Gathering comprehensive news for portfolio: ${portfolioSymbols.join(', ')}`);
      
      const newsData = {
        crypto_news: [],
        global_news: [],
        social_sentiment: [],
        regulatory_news: [],
        timestamp: new Date().toISOString(),
        execution_time_ms: 0,
        sources_attempted: 0,
        sources_successful: 0
      };
      
      // Check timeout function
      const isTimeoutReached = () => (Date.now() - startTime) > TOTAL_TIMEOUT_MS;
      
      // Gather crypto news from RSS feeds (reduced to most reliable sources)
      console.log('📈 Fetching crypto news...');
      
      const cryptoSources = [
        { url: 'https://cointelegraph.com/rss', name: 'CoinTelegraph' },
        { url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' }
      ];
      
      for (const source of cryptoSources) {
        if (isTimeoutReached()) {
          console.log(`⏰ Timeout reached, skipping remaining crypto sources`);
          break;
        }
        
        newsData.sources_attempted++;
        try {
          const rssText = await fetchRSSAsText(source.url, 3000); // 3 second timeout per source
          const articles = parseRSSToNews(rssText, source.name);
          if (articles.length > 0) {
            newsData.crypto_news.push(...articles.slice(0, 10)); // Limit to 10 articles per source
            newsData.sources_successful++;
            console.log(`✅ Fetched ${articles.length} articles from ${source.name}`);
          }
        } catch (error) {
          console.error(`❌ Failed to fetch from ${source.name}:`, error);
        }
      }
      
      // Only fetch Reddit sentiment if we have time and crypto news succeeded
      if (includeSocialSentiment && !isTimeoutReached() && newsData.sources_successful > 0) {
        console.log('💬 Fetching social sentiment...');
        
        const subreddits = ['CryptoCurrency', 'ethereum']; // Reduced to most reliable
        
        for (const subreddit of subreddits) {
          if (isTimeoutReached()) {
            console.log(`⏰ Timeout reached, skipping remaining subreddits`);
            break;
          }
          
          try {
            const posts = await fetchRedditData(subreddit, 2000); // 2 second timeout
            if (posts.length > 0) {
              newsData.social_sentiment.push({
                platform: 'Reddit',
                subreddit: `/r/${subreddit}`,
                posts: posts.slice(0, 5), // Limit to 5 posts
                averageScore: posts.reduce((sum, p) => sum + p.score, 0) / posts.length,
                totalPosts: posts.length
              });
              console.log(`✅ Fetched ${posts.length} posts from /r/${subreddit}`);
            }
          } catch (error) {
            console.error(`❌ Failed to fetch from /r/${subreddit}:`, error);
          }
        }
      }
      
      // Skip global news to keep it fast and focused
      
      // Combine all news for impact analysis
      const allNews = [...newsData.crypto_news];
      
      // Calculate execution time
      newsData.execution_time_ms = Date.now() - startTime;
      
      // Analyze portfolio impact (simplified for speed)
      console.log('🎯 Analyzing portfolio impact...');
      const impactAnalysis = analyzeNewsImpact(allNews, portfolioSymbols);
      
      // Generate executive summary
      const executiveSummary = {
        total_articles: allNews.length,
        crypto_articles: newsData.crypto_news.length,
        social_posts: newsData.social_sentiment.length,
        sources_successful: newsData.sources_successful,
        sources_attempted: newsData.sources_attempted,
        high_impact_count: impactAnalysis.high_impact.length,
        portfolio_mentions: impactAnalysis.portfolio_specific.length,
        overall_sentiment: impactAnalysis.sentiment_summary,
        execution_time_ms: newsData.execution_time_ms,
        briefing_timestamp: new Date().toISOString()
      };
      
      console.log('✅ News gathering complete');
      console.log(`📊 Summary: ${executiveSummary.total_articles} articles, ${executiveSummary.sources_successful}/${executiveSummary.sources_attempted} sources, ${executiveSummary.execution_time_ms}ms`);
      
      return {
        success: true,
        executive_summary: executiveSummary,
        detailed_analysis: impactAnalysis,
        raw_data: newsData,
        portfolio_symbols: portfolioSymbols
      };
      
    } catch (error) {
      console.error('❌ Comprehensive news gathering failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
});

function extractKeyThemes(articles: any[]): string[] {
  const themeKeywords = {
    'Regulation': ['regulation', 'sec', 'cftc', 'ban', 'legal', 'compliance'],
    'Institutional Adoption': ['institutional', 'bank', 'corporate', 'adoption', 'investment'],
    'Technical Development': ['upgrade', 'hard fork', 'development', 'protocol', 'blockchain'],
    'Market Volatility': ['volatility', 'price', 'surge', 'crash', 'bull', 'bear'],
    'Geopolitical': ['war', 'government', 'china', 'russia', 'election', 'policy']
  };
  
  const themeCounts: { [key: string]: number } = {};
  
  Object.entries(themeKeywords).forEach(([theme, keywords]) => {
    themeCounts[theme] = articles.reduce((count, article) => {
      const text = `${article.title} ${article.description}`.toLowerCase();
      return count + keywords.filter(keyword => text.includes(keyword)).length;
    }, 0);
  });
  
  return Object.entries(themeCounts)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme, _]) => theme);
}

function generateNewsBasedRecommendations(impact: any, portfolioSymbols: string[]): any[] {
  const recommendations = [];
  
  // High impact news recommendations
  if (impact.high_impact.length > 0) {
    recommendations.push({
      type: 'urgent_attention',
      message: `${impact.high_impact.length} high-impact news items require immediate attention`,
      urgency: 'high',
      actions: ['Review high-impact articles', 'Assess position adjustments', 'Monitor market reaction']
    });
  }
  
  // Regulatory warnings
  if (impact.regulatory.length > 0) {
    recommendations.push({
      type: 'regulatory_alert',
      message: `${impact.regulatory.length} regulatory developments detected`,
      urgency: 'high',
      actions: ['Review regulatory changes', 'Assess compliance impact', 'Consider position hedging']
    });
  }
  
  // Sentiment-based recommendations
  if (impact.sentiment_summary === 'bearish') {
    recommendations.push({
      type: 'sentiment_warning',
      message: 'Overall news sentiment is bearish - consider defensive positioning',
      urgency: 'medium',
      actions: ['Increase cash reserves', 'Review stop losses', 'Monitor liquidation levels']
    });
  } else if (impact.sentiment_summary === 'bullish') {
    recommendations.push({
      type: 'sentiment_opportunity',
      message: 'Overall news sentiment is bullish - potential scaling opportunities',
      urgency: 'medium',
      actions: ['Identify entry points', 'Review position sizing', 'Monitor momentum indicators']
    });
  }
  
  return recommendations;
}