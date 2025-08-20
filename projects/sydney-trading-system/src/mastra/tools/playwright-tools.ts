import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import path from "path";
import os from "os";
import fs from "fs";

// Persistent browser session management with user data
let globalBrowser: Browser | null = null;
let globalContext: BrowserContext | null = null;
let globalPage: Page | null = null;

// Create user data directory for persistent sessions
const getUserDataDir = (): string => {
  const userDataDir = path.join(os.homedir(), '.sone-browser-data');
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
    console.log(`[Sone] Created user data directory: ${userDataDir}`);
  }
  return userDataDir;
};

async function getOrCreateBrowser(): Promise<Browser> {
  if (!globalBrowser || !globalBrowser.isConnected()) {
    console.log('[Sone] Launching persistent browser with user data...');

    const userDataDir = getUserDataDir();

    globalBrowser = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Show the browser window
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security', // Allow cross-origin requests
        '--disable-dev-shm-usage', // Overcome limited resource problems
        '--disable-blink-features=AutomationControlled', // Hide automation detection
        '--disable-extensions-except', // Allow extensions
        '--disable-extensions', // But disable them for now
      ],
      slowMo: 500, // Slow down actions for visibility
      viewport: { width: 1920, height: 1080 }, // Set a good viewport size
      // Enable persistent storage
      acceptDownloads: true,
      // Set user agent to look more like a real browser
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    console.log(`[Sone] Persistent browser launched with data saved to: ${userDataDir}`);
    console.log('[Sone] 🔐 Your login sessions will be automatically saved and restored!');
  }
  return globalBrowser as Browser;
}

async function getOrCreatePage(): Promise<Page> {
  const browser = await getOrCreateBrowser();

  // For persistent context, the browser IS the context
  globalContext = browser as any;

  // Get existing pages or create new one
  const pages = globalContext.pages();
  if (pages.length > 0 && !pages[0].isClosed()) {
    globalPage = pages[0];
  } else {
    globalPage = await globalContext.newPage();
  }

  return globalPage;
}

// Navigate to URL tool
export const navigateToUrlTool = createTool({
  id: "navigate-to-url",
  description: "Navigate to a specific URL and return page information",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to navigate to"),
    waitForSelector: z.string().optional().describe("Optional CSS selector to wait for"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
  }),
  outputSchema: z.object({
    title: z.string(),
    url: z.string(),
    content: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { url, waitForSelector, timeout } = context;

    try {
      console.log(`[Sone] Navigating to: ${url}`);
      const page = await getOrCreatePage();

      await page.goto(url, { waitUntil: 'networkidle', timeout });

      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, { timeout });
      }

      const title = await page.title();
      const content = await page.textContent('body') || '';
      const currentUrl = page.url();

      console.log(`[Sone] Successfully navigated to: ${currentUrl}`);

      // Keep browser open for manual interaction
      console.log(`[Sone] Browser window is open for your use. You can manually navigate and then ask me to continue.`);

      return {
        title,
        url: currentUrl,
        content: content.substring(0, 5000), // Limit content length
        success: true,
      };
    } catch (error) {
      console.error(`[Sone] Navigation failed:`, error);

      return {
        title: "",
        url,
        content: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Click element tool
export const clickElementTool = createTool({
  id: "click-element",
  description: "Click on an element specified by CSS selector. Works with the currently open browser window.",
  inputSchema: z.object({
    selector: z.string().describe("CSS selector of the element to click"),
    waitAfterClick: z.number().default(1000).describe("Time to wait after clicking (ms)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    newUrl: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { selector, waitAfterClick } = context;

    try {
      console.log(`[Sone] Clicking element: ${selector}`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          message: "No browser window is currently open. Please navigate to a page first.",
          error: "No active browser session",
        };
      }

      const page = globalPage;

      await page.waitForSelector(selector, { timeout: 10000 });
      await page.click(selector);
      await page.waitForTimeout(waitAfterClick);

      const newUrl = page.url();
      console.log(`[Sone] Successfully clicked element, current URL: ${newUrl}`);

      return {
        success: true,
        message: `Successfully clicked element: ${selector}`,
        newUrl,
      };
    } catch (error) {
      console.error(`[Sone] Click failed:`, error);
      return {
        success: false,
        message: `Failed to click element: ${selector}`,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Fill form tool
export const fillFormTool = createTool({
  id: "fill-form",
  description: "Fill out form fields on the currently open webpage",
  inputSchema: z.object({
    fields: z.array(z.object({
      selector: z.string().describe("CSS selector of the input field"),
      value: z.string().describe("Value to enter in the field"),
    })).describe("Array of form fields to fill"),
    submitSelector: z.string().optional().describe("CSS selector of submit button"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    filledFields: z.number(),
    submitted: z.boolean(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { fields, submitSelector } = context;

    try {
      console.log(`[Sone] Filling ${fields.length} form fields`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          message: "No browser window is currently open. Please navigate to a page first.",
          filledFields: 0,
          submitted: false,
          error: "No active browser session",
        };
      }

      const page = globalPage;

      let filledFields = 0;
      for (const field of fields) {
        try {
          await page.waitForSelector(field.selector, { timeout: 5000 });
          await page.fill(field.selector, field.value);
          filledFields++;
          console.log(`[Sone] Filled field ${field.selector} with: ${field.value}`);
        } catch (fieldError) {
          console.warn(`[Sone] Failed to fill field ${field.selector}:`, fieldError);
        }
      }

      let submitted = false;
      if (submitSelector) {
        try {
          await page.click(submitSelector);
          await page.waitForTimeout(2000);
          submitted = true;
          console.log(`[Sone] Form submitted using: ${submitSelector}`);
        } catch (submitError) {
          console.warn(`[Sone] Failed to submit form:`, submitError);
        }
      }

      return {
        success: true,
        message: `Filled ${filledFields}/${fields.length} fields${submitted ? ' and submitted form' : ''}`,
        filledFields,
        submitted,
      };
    } catch (error) {
      console.error(`[Sone] Form filling failed:`, error);
      return {
        success: false,
        message: "Failed to fill form",
        filledFields: 0,
        submitted: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Take screenshot tool
export const takeScreenshotTool = createTool({
  id: "take-screenshot",
  description: "Take a screenshot of the currently open webpage",
  inputSchema: z.object({
    selector: z.string().optional().describe("CSS selector to screenshot specific element"),
    fullPage: z.boolean().default(false).describe("Take full page screenshot"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    screenshotPath: z.string().optional(),
    base64: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { selector, fullPage } = context;

    try {
      console.log(`[Sone] Taking screenshot${selector ? ` of element: ${selector}` : ''}`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          message: "No browser window is currently open. Please navigate to a page first.",
          error: "No active browser session",
        };
      }

      const page = globalPage;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const screenshotPath = `./screenshots/sone-${timestamp}.png`;

      let screenshotBuffer: Buffer;

      if (selector) {
        const element = await page.locator(selector);
        screenshotBuffer = await element.screenshot();
        console.log(`[Sone] Screenshot taken of element: ${selector}`);
      } else {
        screenshotBuffer = await page.screenshot({
          fullPage,
          path: screenshotPath
        });
        console.log(`[Sone] ${fullPage ? 'Full page' : 'Viewport'} screenshot taken`);
      }

      const base64 = screenshotBuffer.toString('base64');

      return {
        success: true,
        message: `Screenshot taken successfully`,
        screenshotPath,
        base64,
      };
    } catch (error) {
      console.error(`[Sone] Screenshot failed:`, error);
      return {
        success: false,
        message: "Failed to take screenshot",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Extract data tool - simplified version
export const extractDataTool = createTool({
  id: "extract-data",
  description: "Extract text content from the currently open webpage using CSS selectors",
  inputSchema: z.object({
    selector: z.string().describe("CSS selector to extract text from (e.g., 'h1', '.price', '#title')"),
    multiple: z.boolean().optional().default(false).describe("Extract from multiple matching elements"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any(),
    count: z.number(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { selector, multiple } = context;

    try {
      console.log(`[Sone] Extracting data using selector: ${selector}`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          data: null,
          count: 0,
          error: "No browser window is currently open. Please navigate to a page first.",
        };
      }

      const page = globalPage;

      if (multiple) {
        // Extract from multiple elements
        const data = await page.evaluate((selector) => {
          const elements = document.querySelectorAll(selector);
          return Array.from(elements).map(el => el.textContent?.trim() || '');
        }, selector);

        console.log(`[Sone] Extracted ${data.length} items from multiple elements`);

        return {
          success: true,
          data,
          count: data.length,
        };
      } else {
        // Extract from single element
        const data = await page.evaluate((selector) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        }, selector);

        console.log(`[Sone] Extracted data from single element: ${data.substring(0, 100)}...`);

        return {
          success: true,
          data,
          count: 1,
        };
      }
    } catch (error) {
      console.error(`[Sone] Data extraction failed:`, error);
      return {
        success: false,
        data: null,
        count: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Wait for element tool
export const waitForElementTool = createTool({
  id: "wait-for-element",
  description: "Wait for an element to appear on the currently open page",
  inputSchema: z.object({
    selector: z.string().describe("CSS selector to wait for"),
    timeout: z.number().default(30000).describe("Timeout in milliseconds"),
    state: z.enum(['visible', 'hidden', 'attached', 'detached']).default('visible').describe("Element state to wait for"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    elementFound: z.boolean(),
    elementText: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { selector, timeout, state } = context;

    try {
      console.log(`[Sone] Waiting for element: ${selector} (state: ${state})`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          message: "No browser window is currently open. Please navigate to a page first.",
          elementFound: false,
          error: "No active browser session",
        };
      }

      const page = globalPage;

      await page.waitForSelector(selector, { state, timeout });

      const element = await page.locator(selector);
      const elementText = await element.textContent();

      console.log(`[Sone] Element found: ${selector}`);

      return {
        success: true,
        message: `Element found: ${selector}`,
        elementFound: true,
        elementText: elementText || undefined,
      };
    } catch (error) {
      console.error(`[Sone] Wait for element failed:`, error);
      return {
        success: false,
        message: `Element not found or timeout: ${selector}`,
        elementFound: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Get current page info tool
export const getCurrentPageInfoTool = createTool({
  id: "get-current-page-info",
  description: "Get information about the currently open page in the browser",
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    url: z.string(),
    title: z.string(),
    isLoggedIn: z.boolean().optional(),
    error: z.string().optional(),
  }),
  execute: async () => {
    try {
      console.log(`[Sone] Getting current page info`);

      // Check if we have an active page
      if (!globalPage || globalPage.isClosed()) {
        return {
          success: false,
          url: "",
          title: "",
          error: "No browser window is currently open. Please navigate to a page first.",
        };
      }

      const page = globalPage;
      const url = page.url();
      const title = await page.title();

      // Check if user appears to be logged into Google
      const isLoggedIn = await page.evaluate(() => {
        // Look for common Google login indicators
        const indicators = [
          'document.querySelector("[data-ogsr-up]")', // Google account menu
          'document.querySelector(".gb_A")', // Google apps menu
          'document.querySelector("[aria-label*=Account]")', // Account button
        ];
        return indicators.some(indicator => {
          try {
            return eval(indicator);
          } catch {
            return false;
          }
        });
      });

      console.log(`[Sone] Current page: ${title} (${url}), Logged in: ${isLoggedIn}`);

      return {
        success: true,
        url,
        title,
        isLoggedIn,
      };
    } catch (error) {
      console.error(`[Sone] Get page info failed:`, error);
      return {
        success: false,
        url: "",
        title: "",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Session management tool
export const manageSessionTool = createTool({
  id: "manage-session",
  description: "Manage browser sessions - check login status, clear sessions, or get session info",
  inputSchema: z.object({
    action: z.enum(['status', 'clear', 'info']).describe("Action to perform: status (check login), clear (logout/clear data), info (show session details)"),
    site: z.string().optional().describe("Specific site to check (e.g., 'tradingview.com', 'google.com')"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    message: z.string(),
    sessionInfo: z.any().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { action, site } = context;

    try {
      const userDataDir = getUserDataDir();

      switch (action) {
        case 'info':
          const stats = fs.statSync(userDataDir);
          const size = fs.readdirSync(userDataDir).length;

          return {
            success: true,
            message: `Session data directory: ${userDataDir}`,
            sessionInfo: {
              dataDirectory: userDataDir,
              created: stats.birthtime,
              lastModified: stats.mtime,
              filesCount: size,
              sizeOnDisk: `${(stats.size / 1024).toFixed(2)} KB`,
            }
          };

        case 'clear':
          console.log('[Sone] Clearing all session data...');

          // Close browser first
          await closeBrowser();

          // Remove user data directory
          if (fs.existsSync(userDataDir)) {
            fs.rmSync(userDataDir, { recursive: true, force: true });
            console.log('[Sone] Session data cleared');
          }

          return {
            success: true,
            message: 'All session data cleared. You will need to log in again to all sites.',
          };

        case 'status':
          if (!globalPage || globalPage.isClosed()) {
            return {
              success: true,
              message: 'No active browser session. Navigate to a site to check login status.',
              sessionInfo: { hasActiveBrowser: false }
            };
          }

          const currentUrl = globalPage.url();
          const title = await globalPage.title();

          // Check for common login indicators
          const loginStatus = await globalPage.evaluate(() => {
            const indicators = {
              google: [
                'document.querySelector("[data-ogsr-up]")', // Google account menu
                'document.querySelector(".gb_A")', // Google apps menu
                'document.querySelector("[aria-label*=Account]")', // Account button
              ],
              tradingview: [
                'document.querySelector("[data-name=header-user-menu]")', // TradingView user menu
                'document.querySelector(".tv-header__user-menu")', // User menu
                'document.querySelector(".js-header__user-menu")', // Alternative user menu
              ],
              general: [
                'document.querySelector("[class*=user]")',
                'document.querySelector("[class*=profile]")',
                'document.querySelector("[class*=account]")',
              ]
            };

            const results: any = {};

            for (const [siteName, siteIndicators] of Object.entries(indicators)) {
              results[siteName] = siteIndicators.some(indicator => {
                try {
                  return eval(indicator);
                } catch {
                  return false;
                }
              });
            }

            return results;
          });

          return {
            success: true,
            message: `Current page: ${title} (${currentUrl})`,
            sessionInfo: {
              currentUrl,
              title,
              loginStatus,
              hasActiveBrowser: true,
            }
          };

        default:
          return {
            success: false,
            message: 'Invalid action. Use: status, clear, or info',
            error: 'Invalid action parameter'
          };
      }
    } catch (error) {
      console.error(`[Sone] Session management failed:`, error);
      return {
        success: false,
        message: 'Session management failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

// Cleanup function to close browser
export async function closeBrowser() {
  if (globalPage && !globalPage.isClosed()) {
    await globalPage.close();
    globalPage = null;
  }
  if (globalContext) {
    await globalContext.close();
    globalContext = null;
  }
  if (globalBrowser) {
    await globalBrowser.close();
    globalBrowser = null;
  }
}
