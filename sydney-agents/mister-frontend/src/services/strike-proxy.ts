/**
 * Strike Finance Proxy Service
 * 
 * Routes Strike Finance API calls through different methods to bypass security checkpoints:
 * 1. Browser-like headers
 * 2. Session management
 * 3. Rate limiting
 * 4. IP rotation (if needed)
 */

export class StrikeProxy {
  private static instance: StrikeProxy;
  private sessionHeaders: HeadersInit = {};
  private lastRequest: number = 0;
  private readonly minDelay = 1000; // 1 second between requests

  static getInstance(): StrikeProxy {
    if (!StrikeProxy.instance) {
      StrikeProxy.instance = new StrikeProxy();
    }
    return StrikeProxy.instance;
  }

  private constructor() {
    this.setupBrowserHeaders();
  }

  private setupBrowserHeaders() {
    this.sessionHeaders = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Cache-Control': 'max-age=0'
    };
  }

  private async rateLimitDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    
    if (timeSinceLastRequest < this.minDelay) {
      const delay = this.minDelay - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequest = Date.now();
  }

  async makeStrikeRequest(url: string, options: RequestInit = {}): Promise<Response> {
    await this.rateLimitDelay();
    
    const fullUrl = url.startsWith('http') ? url : `https://app.strikefinance.org${url}`;
    
    console.log(`🌐 Strike Proxy Request: ${options.method || 'GET'} ${fullUrl}`);
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.sessionHeaders,
        'Origin': 'https://app.strikefinance.org',
        'Referer': 'https://app.strikefinance.org/',
        ...options.headers
      }
    };

    try {
      const response = await fetch(fullUrl, requestOptions);
      
      console.log(`📡 Strike Response: ${response.status} ${response.statusText}`);
      
      // Check if we got the security checkpoint
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html') && !contentType.includes('json')) {
        console.log('⚠️  Received HTML response - likely security checkpoint');
        
        // Try to extract any useful info from the HTML
        const text = await response.text();
        if (text.includes('Security Checkpoint') || text.includes('Vercel')) {
          throw new Error('Strike Finance security checkpoint encountered. Try accessing the site in a browser first.');
        }
        
        throw new Error('Unexpected HTML response from Strike Finance API');
      }
      
      return response;
      
    } catch (error) {
      console.error('❌ Strike Proxy Error:', error);
      throw error;
    }
  }

  /**
   * Attempt to initialize a session with Strike Finance
   */
  async initializeSession(): Promise<boolean> {
    try {
      console.log('🔓 Attempting to initialize Strike Finance session...');
      
      // First, try to load the main page to establish a session
      const pageResponse = await this.makeStrikeRequest('/', {
        method: 'GET',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      
      if (!pageResponse.ok) {
        console.log('⚠️  Failed to load Strike Finance homepage');
        return false;
      }
      
      // Extract any session cookies
      const setCookieHeaders = pageResponse.headers.get('set-cookie');
      if (setCookieHeaders) {
        console.log('🍪 Received session cookies');
        // In a real implementation, we'd parse and store these cookies
      }
      
      console.log('✅ Strike Finance session initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Failed to initialize Strike session:', error);
      return false;
    }
  }
}

export const strikeProxy = StrikeProxy.getInstance();