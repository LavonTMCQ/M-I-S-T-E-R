"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Newspaper, 
  ExternalLink, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Globe,
  Zap
} from 'lucide-react';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  timestamp: string;
  category: 'market' | 'cardano' | 'defi' | 'general';
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'high' | 'medium' | 'low';
}

interface NewsWidgetProps {
  className?: string;
}

export function NewsWidget({ className = "" }: NewsWidgetProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Mock news data - will be replaced with real news API
  useEffect(() => {
    const mockNews: NewsItem[] = [
      {
        id: '1',
        title: 'Cardano ADA Shows Strong Recovery After Market Dip',
        summary: 'ADA price rebounds 15% following oversold conditions and increased DeFi activity on the network.',
        url: 'https://example.com/news/1',
        source: 'CryptoNews',
        timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
        category: 'cardano',
        sentiment: 'bullish',
        impact: 'high'
      },
      {
        id: '2',
        title: 'DeFi TVL Reaches New All-Time High on Cardano',
        summary: 'Total Value Locked in Cardano DeFi protocols surpasses $500M, driven by Minswap and SundaeSwap growth.',
        url: 'https://example.com/news/2',
        source: 'DeFi Pulse',
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        category: 'defi',
        sentiment: 'bullish',
        impact: 'medium'
      },
      {
        id: '3',
        title: 'Market Analysis: Altcoin Season Indicators Flash Green',
        summary: 'Technical indicators suggest altcoin season may be beginning as Bitcoin dominance shows signs of decline.',
        url: 'https://example.com/news/3',
        source: 'Market Watch',
        timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
        category: 'market',
        sentiment: 'bullish',
        impact: 'medium'
      },
      {
        id: '4',
        title: 'Regulatory Clarity Boosts Crypto Market Confidence',
        summary: 'New regulatory framework provides clearer guidelines for DeFi protocols and token trading.',
        url: 'https://example.com/news/4',
        source: 'Regulatory Times',
        timestamp: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
        category: 'general',
        sentiment: 'bullish',
        impact: 'high'
      }
    ];

    setTimeout(() => {
      setNews(mockNews);
      setIsLoading(false);
    }, 800);
  }, []);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'cardano': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'defi': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'market': return 'bg-green-100 text-green-800 border-green-200';
      case 'general': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'bullish': return 'text-green-600';
      case 'bearish': return 'text-red-600';
      case 'neutral': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getImpactIcon = (impact: string) => {
    switch (impact) {
      case 'high': return <AlertCircle className="w-3 h-3 text-red-500" />;
      case 'medium': return <TrendingUp className="w-3 h-3 text-yellow-500" />;
      case 'low': return <Globe className="w-3 h-3 text-gray-500" />;
      default: return <Globe className="w-3 h-3 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const filteredNews = selectedCategory === 'all' 
    ? news 
    : news.filter(item => item.category === selectedCategory);

  const categories = [
    { id: 'all', label: 'All', count: news.length },
    { id: 'cardano', label: 'Cardano', count: news.filter(n => n.category === 'cardano').length },
    { id: 'defi', label: 'DeFi', count: news.filter(n => n.category === 'defi').length },
    { id: 'market', label: 'Market', count: news.filter(n => n.category === 'market').length }
  ];

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-orange-600" />
            Crypto News
            <Badge variant="outline" className="ml-2">
              <Zap className="w-3 h-3 mr-1" />
              Live
            </Badge>
          </CardTitle>
        </div>
        
        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap mt-4">
          {categories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="text-xs"
            >
              {category.label}
              {category.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {category.count}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {filteredNews.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.open(item.url, '_blank')}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getCategoryColor(item.category)}>
                        {item.category}
                      </Badge>
                      {getImpactIcon(item.impact)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(item.timestamp)}
                    </div>
                  </div>
                  
                  <h4 className="font-semibold text-sm mb-2 line-clamp-2">
                    {item.title}
                  </h4>
                  
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {item.summary}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.source}</span>
                      <span className={`text-xs font-medium ${getSentimentColor(item.sentiment)}`}>
                        {item.sentiment}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 px-2">
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
