import axios from 'axios';
import dotenv from 'dotenv';
import { RateLimiter } from './rate-limiter.js';

dotenv.config();

export class PolygonDataProvider {
  constructor() {
    this.apiKey = process.env.POLYGON_API_KEY;
    this.baseUrl = 'https://api.polygon.io';
    this.rateLimiter = new RateLimiter(5); // Free tier: 5 requests per minute
    this.cache = new Map(); // Simple cache to avoid repeated requests
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes cache
  }

  async getOptionsChain(symbol, date) {
    const cacheKey = `chain_${symbol}_${date}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log('📦 Using cached options chain data');
        return cached.data;
      }
    }
    
    try {
      await this.rateLimiter.throttle();
      
      const url = `${this.baseUrl}/v3/options/contracts`;
      const params = {
        underlying_ticker: symbol,
        expiration_date: date,
        limit: 250,
        apiKey: this.apiKey
      };

      console.log(`🔍 Fetching options chain for ${symbol} on ${date}...`);
      const response = await axios.get(url, { params });
      
      const processed = this.processOptionsChain(response.data.results);
      
      // Cache the result
      this.cache.set(cacheKey, {
        data: processed,
        timestamp: Date.now()
      });
      
      return processed;
    } catch (error) {
      console.error('Error fetching options chain:', error.message);
      return [];
    }
  }

  async getHistoricalOptionsData(contract, from, to, interval = '1Min') {
    try {
      const url = `${this.baseUrl}/v2/aggs/ticker/${contract}/range/${interval}/${from}/${to}`;
      const params = {
        adjusted: true,
        sort: 'asc',
        apiKey: this.apiKey
      };

      const response = await axios.get(url, { params });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  async getOptionsSnapshot(symbol) {
    try {
      const url = `${this.baseUrl}/v3/snapshot/options/${symbol}`;
      const params = { apiKey: this.apiKey };

      const response = await axios.get(url, { params });
      return response.data.results || [];
    } catch (error) {
      console.error('Error fetching snapshot:', error);
      return [];
    }
  }

  processOptionsChain(data) {
    if (!data) return [];
    
    return data.map(contract => ({
      symbol: contract.ticker,
      strike: contract.strike_price,
      expiry: contract.expiration_date,
      type: contract.contract_type,
      bid: contract.day?.close || 0,
      ask: contract.day?.close || 0,
      volume: contract.day?.volume || 0,
      openInterest: contract.open_interest || 0,
      impliedVolatility: contract.implied_volatility || 0,
      delta: contract.greeks?.delta || 0,
      gamma: contract.greeks?.gamma || 0,
      theta: contract.greeks?.theta || 0,
      vega: contract.greeks?.vega || 0
    }));
  }

  async detectGaps(symbol, lookbackDays = 5) {
    const gaps = [];
    const today = new Date();
    
    for (let i = 0; i < lookbackDays; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const chain = await this.getOptionsChain(symbol, dateStr);
      
      for (const contract of chain) {
        if (contract.type === 'put') {
          const history = await this.getHistoricalOptionsData(
            contract.symbol,
            dateStr,
            dateStr,
            '1Min'
          );
          
          if (history.length > 0) {
            const gap = this.calculateGap(history);
            if (gap) {
              gaps.push({
                ...gap,
                contract: contract.symbol,
                strike: contract.strike,
                expiry: contract.expiry
              });
            }
          }
        }
      }
    }
    
    return gaps;
  }

  calculateGap(data) {
    if (data.length < 2) return null;
    
    const prevClose = data[data.length - 1].c;
    const todayOpen = data[0].o;
    const gapPercent = ((todayOpen - prevClose) / prevClose) * 100;
    
    if (Math.abs(gapPercent) > 1) {
      return {
        gapSize: gapPercent,
        gapType: gapPercent > 0 ? 'UP' : 'DOWN',
        prevClose,
        todayOpen,
        filled: this.checkIfGapFilled(data, prevClose, gapPercent > 0)
      };
    }
    
    return null;
  }

  checkIfGapFilled(data, target, isUpGap) {
    for (const bar of data) {
      if (isUpGap && bar.l <= target) return true;
      if (!isUpGap && bar.h >= target) return true;
    }
    return false;
  }
}