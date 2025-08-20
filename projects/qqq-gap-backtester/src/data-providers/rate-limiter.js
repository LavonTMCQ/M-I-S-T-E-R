export class RateLimiter {
  constructor(requestsPerMinute = 5) {
    this.requestsPerMinute = requestsPerMinute;
    this.minInterval = 60000 / requestsPerMinute; // Milliseconds between requests
    this.lastRequestTime = 0;
    this.requestQueue = [];
    this.requestCount = 0;
    this.windowStart = Date.now();
  }

  async throttle() {
    const now = Date.now();
    
    // Reset counter if we're in a new minute window
    if (now - this.windowStart > 60000) {
      this.requestCount = 0;
      this.windowStart = now;
    }
    
    // If we've hit the limit for this minute, wait
    if (this.requestCount >= this.requestsPerMinute) {
      const waitTime = 60000 - (now - this.windowStart);
      console.log(`⏳ Rate limit reached. Waiting ${(waitTime / 1000).toFixed(1)}s...`);
      await this.sleep(waitTime);
      
      // Reset for new window
      this.requestCount = 0;
      this.windowStart = Date.now();
    }
    
    // Ensure minimum interval between requests
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minInterval) {
      await this.sleep(this.minInterval - timeSinceLastRequest);
    }
    
    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getStatus() {
    const now = Date.now();
    const timeInWindow = now - this.windowStart;
    const remainingRequests = this.requestsPerMinute - this.requestCount;
    const resetIn = Math.max(0, 60000 - timeInWindow);
    
    return {
      requestsUsed: this.requestCount,
      requestsRemaining: remainingRequests,
      resetInSeconds: (resetIn / 1000).toFixed(1)
    };
  }
}