/**
 * Strike Finance Browser Automation Service
 * 
 * Uses Puppeteer to bypass Vercel security checkpoint and interact with Strike Finance
 * as if it were a real user browsing the site.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

interface StrikeSession {
  browser: Browser;
  page: Page;
  sessionActive: boolean;
  cookies: any[];
  userAgent: string;
}

export class StrikeBrowserService {
  private static instance: StrikeBrowserService;
  private session: StrikeSession | null = null;
  private readonly baseUrl = 'https://app.strikefinance.org';
  
  static getInstance(): StrikeBrowserService {
    if (!StrikeBrowserService.instance) {
      StrikeBrowserService.instance = new StrikeBrowserService();
    }
    return StrikeBrowserService.instance;
  }

  private constructor() {}

  /**
   * Initialize browser session and bypass security checkpoint
   */
  async initializeSession(): Promise<boolean> {
    try {
      console.log('🚀 Launching browser to bypass Strike Finance security checkpoint...');
      
      // Launch browser with realistic configuration
      const browser = await puppeteer.launch({
        headless: 'new', // Use new headless mode
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--window-size=1920,1080'
        ]
      });

      const page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      
      const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      await page.setUserAgent(userAgent);

      // Set additional browser headers
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"macOS"',
        'Upgrade-Insecure-Requests': '1'
      });

      console.log('🌐 Navigating to Strike Finance homepage...');
      
      // Navigate to main page to establish session
      await page.goto(this.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait a bit for any security checks to complete
      await page.waitForTimeout(3000);

      // Check if we're still on a security checkpoint page
      const pageContent = await page.content();
      const isSecurityCheckpoint = pageContent.includes('Security Checkpoint') || 
                                  pageContent.includes('Vercel') ||
                                  pageContent.includes('checking your browser');

      if (isSecurityCheckpoint) {
        console.log('⏳ Security checkpoint detected, waiting for completion...');
        
        // Wait for redirect or page change
        try {
          await page.waitForNavigation({ 
            waitUntil: 'networkidle2',
            timeout: 15000 
          });
        } catch (e) {
          console.log('⚠️ Navigation timeout, checking if we can proceed...');
        }
      }

      // Collect session cookies
      const cookies = await page.cookies();
      
      this.session = {
        browser,
        page,
        sessionActive: true,
        cookies,
        userAgent
      };

      console.log('✅ Browser session initialized successfully');
      console.log(`🍪 Collected ${cookies.length} cookies`);
      
      return true;

    } catch (error) {
      console.error('❌ Failed to initialize browser session:', error);
      
      if (this.session?.browser) {
        await this.session.browser.close();
      }
      
      this.session = null;
      return false;
    }
  }

  /**
   * Make API request using the browser session
   */
  async makeApiRequest(endpoint: string, options: {
    method?: string;
    body?: any;
    timeout?: number;
  } = {}): Promise<any> {
    if (!this.session || !this.session.sessionActive) {
      const initialized = await this.initializeSession();
      if (!initialized) {
        throw new Error('Failed to initialize browser session');
      }
    }

    const { method = 'GET', body, timeout = 10000 } = options;
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;

    console.log(`🔄 Browser API Request: ${method} ${url}`);

    try {
      // Use page.evaluate to make the request from within the browser context
      const result = await this.session!.page.evaluate(
        async (url, method, body, timeout) => {
          const fetchOptions: RequestInit = {
            method,
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json, text/plain, */*',
              'X-Requested-With': 'XMLHttpRequest'
            }
          };

          if (body && method !== 'GET') {
            fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);

          try {
            const response = await fetch(url, {
              ...fetchOptions,
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = response.headers.get('content-type') || '';
            let data;

            if (contentType.includes('application/json')) {
              data = await response.json();
            } else {
              data = await response.text();
            }

            return {
              ok: response.ok,
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              data
            };

          } catch (error) {
            clearTimeout(timeoutId);
            return {
              ok: false,
              error: error.message || 'Request failed'
            };
          }
        },
        url,
        method,
        body,
        timeout
      );

      if (!result.ok) {
        throw new Error(`API request failed: ${result.status} ${result.statusText || result.error}`);
      }

      console.log(`✅ Browser API request completed: ${result.status}`);
      return result.data;

    } catch (error) {
      console.error(`❌ Browser API request failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Test Strike Finance API connectivity
   */
  async testConnectivity(): Promise<{
    success: boolean;
    overallInfo?: any;
    error?: string;
  }> {
    try {
      console.log('🧪 Testing Strike Finance API connectivity...');
      
      const overallInfo = await this.makeApiRequest('/api/perpetuals/getOverallInfo');
      
      return {
        success: true,
        overallInfo
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Open trading position using browser session
   */
  async openPosition(request: {
    address: string;
    asset: { policyId: string; assetName: string };
    assetTicker: string;
    collateralAmount: number;
    leverage: number;
    position: 'Long' | 'Short';
    stopLossPrice?: number;
    takeProfitPrice?: number;
  }): Promise<{
    success: boolean;
    cbor?: string;
    error?: string;
  }> {
    try {
      console.log(`🎯 Opening ${request.position} position via browser...`);
      console.log(`💰 Collateral: ${request.collateralAmount} ${request.assetTicker}`);
      
      const result = await this.makeApiRequest('/api/perpetuals/openPosition', {
        method: 'POST',
        body: { request },
        timeout: 15000
      });

      if (result.success === false) {
        throw new Error(result.error || 'Strike API returned error');
      }

      if (!result.cbor) {
        throw new Error('Strike API did not return CBOR transaction');
      }

      console.log('✅ Position opened successfully via browser');
      
      return {
        success: true,
        cbor: result.cbor
      };

    } catch (error) {
      console.error('❌ Failed to open position via browser:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Close trading position using browser session
   */
  async closePosition(request: {
    address: string;
    asset: { policyId: string; assetName: string };
    assetTicker: string;
    outRef: {
      txHash: string;
      outputIndex: number;
    };
  }): Promise<{
    success: boolean;
    cbor?: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 Closing position via browser...`);
      
      const result = await this.makeApiRequest('/api/perpetuals/closePosition', {
        method: 'POST',
        body: { request },
        timeout: 15000
      });

      if (result.success === false) {
        throw new Error(result.error || 'Strike API returned error');
      }

      if (!result.cbor) {
        throw new Error('Strike API did not return CBOR transaction');
      }

      console.log('✅ Position closed successfully via browser');
      
      return {
        success: true,
        cbor: result.cbor
      };

    } catch (error) {
      console.error('❌ Failed to close position via browser:', error);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Keep session alive by periodically checking the main page
   */
  async keepAlive(): Promise<void> {
    if (!this.session || !this.session.sessionActive) {
      return;
    }

    try {
      await this.session.page.reload({ waitUntil: 'networkidle2' });
      console.log('🔄 Browser session kept alive');
    } catch (error) {
      console.error('⚠️ Failed to keep session alive:', error);
      this.session.sessionActive = false;
    }
  }

  /**
   * Clean up browser session
   */
  async cleanup(): Promise<void> {
    if (this.session?.browser) {
      console.log('🧹 Closing browser session...');
      
      try {
        await this.session.browser.close();
      } catch (error) {
        console.error('⚠️ Error closing browser:', error);
      }
      
      this.session = null;
    }
  }

  /**
   * Get current session status
   */
  getSessionStatus(): {
    active: boolean;
    cookieCount: number;
    userAgent?: string;
  } {
    if (!this.session) {
      return { active: false, cookieCount: 0 };
    }

    return {
      active: this.session.sessionActive,
      cookieCount: this.session.cookies.length,
      userAgent: this.session.userAgent
    };
  }
}

// Export singleton instance
export const strikeBrowserService = StrikeBrowserService.getInstance();

// Cleanup on process exit
process.on('exit', () => {
  strikeBrowserService.cleanup();
});

process.on('SIGINT', async () => {
  await strikeBrowserService.cleanup();
  process.exit();
});

process.on('SIGTERM', async () => {
  await strikeBrowserService.cleanup();
  process.exit();
});