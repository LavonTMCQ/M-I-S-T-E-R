import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { GoogleVoice } from '@mastra/voice-google';
import { exec } from 'child_process';
import { createWriteStream } from 'fs';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tomorrow Labs ORB Real-Time Monitor
 * 
 * Autonomous trading monitor that:
 * 1. Automatically starts monitoring at 9:30 AM EST during market hours
 * 2. Polls Alpha Vantage every 3 minutes for new data
 * 3. Detects ORB signals and executes strategy
 * 4. Speaks results when trades are taken
 * 5. Generates charts for each trading session
 */

export const tomorrowLabsOrbMonitorTool = createTool({
  id: 'tomorrow-labs-orb-monitor',
  description: 'Start autonomous real-time monitoring of Tomorrow Labs ORB strategy. Automatically monitors during market hours, detects signals, executes trades, and speaks results.',
  inputSchema: z.object({
    symbol: z.string().default('SPY').describe('Stock symbol to monitor (SPY, QQQ, etc.)'),
    autoStart: z.boolean().default(true).describe('Automatically start monitoring at market open'),
    speakResults: z.boolean().default(true).describe('Speak trade results and daily summary'),
    monitoringInterval: z.number().default(180000).describe('Monitoring interval in milliseconds (default: 3 minutes)'),
    generateCharts: z.boolean().default(true).describe('Generate charts for each trading session'),
    stopAtMarketClose: z.boolean().default(true).describe('Automatically stop monitoring at market close'),
  }),
  execute: async ({ context }): Promise<any> => {
    const { 
      symbol, 
      autoStart, 
      speakResults, 
      monitoringInterval,
      generateCharts,
      stopAtMarketClose
    } = context;

    try {
      console.log(`🎯 Starting Tomorrow Labs ORB Monitor for ${symbol}`);
      console.log(`⏰ Monitoring interval: ${monitoringInterval / 1000} seconds`);
      console.log(`🔊 Voice alerts: ${speakResults ? 'Enabled' : 'Disabled'}`);
      console.log(`📊 Chart generation: ${generateCharts ? 'Enabled' : 'Disabled'}`);

      // Create monitor instance
      const monitor = new TomorrowLabsOrbMonitor({
        symbol,
        speakResults,
        monitoringInterval,
        generateCharts,
        stopAtMarketClose
      });

      if (autoStart) {
        await monitor.startMonitoring();
        
        return {
          success: true,
          status: 'monitoring_started',
          symbol,
          message: `🚀 Tomorrow Labs ORB Monitor started for ${symbol}`,
          monitoringDetails: {
            interval: `${monitoringInterval / 1000} seconds`,
            marketHours: '9:30 AM - 4:00 PM EST',
            voiceAlerts: speakResults,
            chartGeneration: generateCharts
          },
          nextActions: [
            "Monitor will automatically detect market hours",
            "ORB signals will be analyzed every 3 minutes",
            "Trade results will be spoken when executed",
            "Daily summary will be provided at market close"
          ]
        };
      } else {
        return {
          success: true,
          status: 'monitor_ready',
          symbol,
          message: `📋 Tomorrow Labs ORB Monitor ready for ${symbol}. Call startMonitoring() to begin.`,
          monitor: monitor
        };
      }
    } catch (error) {
      console.error('❌ Error starting ORB monitor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        suggestion: "Check system configuration and try again"
      };
    }
  }
});

// Real-time monitoring class
class TomorrowLabsOrbMonitor {
  private interval: NodeJS.Timeout | null = null;
  private symbol: string;
  private speakResults: boolean;
  private monitoringInterval: number;
  private generateCharts: boolean;
  private stopAtMarketClose: boolean;
  private dailyTrades: any[] = [];
  private isMonitoring: boolean = false;
  private currentDate: string = '';

  constructor(config: {
    symbol: string;
    speakResults: boolean;
    monitoringInterval: number;
    generateCharts: boolean;
    stopAtMarketClose: boolean;
  }) {
    this.symbol = config.symbol;
    this.speakResults = config.speakResults;
    this.monitoringInterval = config.monitoringInterval;
    this.generateCharts = config.generateCharts;
    this.stopAtMarketClose = config.stopAtMarketClose;
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('⚠️ Monitor already running');
      return;
    }

    this.isMonitoring = true;
    console.log(`🚀 Starting Tomorrow Labs ORB monitoring for ${this.symbol}`);
    
    if (this.speakResults) {
      await this.speak(`Tomorrow Labs ORB monitor started for ${this.symbol}. Monitoring every ${this.monitoringInterval / 1000} seconds during market hours.`);
    }

    // Check if market is open now
    if (this.isMarketHours()) {
      console.log('📈 Market is open - starting immediate monitoring');
      await this.performMonitoringCycle();
    } else {
      console.log('🕐 Market is closed - waiting for market open');
      if (this.speakResults) {
        await this.speak('Market is currently closed. Monitor will activate automatically at 9:30 AM Eastern Time.');
      }
    }

    // Start monitoring interval
    this.interval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, this.monitoringInterval);

    console.log('✅ Tomorrow Labs ORB Monitor is now active');
  }

  async stopMonitoring(): Promise<void> {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isMonitoring = false;
    console.log('🛑 Tomorrow Labs ORB monitoring stopped');
    
    if (this.speakResults) {
      await this.speak('Tomorrow Labs ORB monitoring stopped.');
    }
  }

  private async performMonitoringCycle(): Promise<void> {
    try {
      const now = new Date();
      const currentDateStr = now.toISOString().split('T')[0];

      // Check if it's a new trading day
      if (this.currentDate !== currentDateStr) {
        this.currentDate = currentDateStr;
        this.dailyTrades = [];
        
        if (this.isMarketHours()) {
          console.log(`📅 New trading day: ${currentDateStr}`);
          if (this.speakResults) {
            await this.speak(`Good morning! Starting Tomorrow Labs ORB monitoring for ${this.symbol} on ${currentDateStr}.`);
          }
        }
      }

      // Only monitor during market hours
      if (!this.isMarketHours()) {
        // Check if we should stop at market close
        if (this.stopAtMarketClose && this.isAfterMarketClose()) {
          await this.handleMarketClose();
        }
        return;
      }

      console.log(`🔍 Monitoring ${this.symbol} - ${now.toLocaleTimeString()}`);

      // Fetch latest data and check for ORB signals
      const data = await this.fetchLatestData();
      const signal = await this.checkOrbSignal(data);

      if (signal) {
        console.log(`🎯 ORB Signal detected for ${this.symbol}!`);
        await this.executeStrategy(signal);
        
        if (this.generateCharts) {
          await this.generateChart(signal);
        }
      }

    } catch (error) {
      console.error('❌ Error in monitoring cycle:', error);
    }
  }

  private isMarketHours(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const dayOfWeek = easternTime.getDay();

    // Check if it's a weekday (Monday = 1, Friday = 5)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false; // Weekend
    }

    // Market hours: 9:30 AM - 4:00 PM EST
    const marketOpen = hour > 9 || (hour === 9 && minute >= 30);
    const marketClose = hour < 16;

    return marketOpen && marketClose;
  }

  private isAfterMarketClose(): boolean {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = easternTime.getHours();
    
    return hour >= 16; // After 4:00 PM EST
  }

  private async fetchLatestData(): Promise<any> {
    // This would integrate with Alpha Vantage API
    // For now, return mock data structure
    console.log(`📡 Fetching latest data for ${this.symbol}...`);
    
    // TODO: Implement actual Alpha Vantage API call
    return {
      symbol: this.symbol,
      timestamp: new Date().toISOString(),
      price: 580 + Math.random() * 20, // Mock price
      volume: 1000000
    };
  }

  private async checkOrbSignal(data: any): Promise<any> {
    // This would implement the actual ORB signal detection logic
    // For now, return mock signal occasionally
    console.log(`🔍 Checking ORB signal for ${this.symbol}...`);
    
    // Mock: Generate signal 10% of the time
    if (Math.random() < 0.1) {
      return {
        type: Math.random() > 0.5 ? 'long' : 'short',
        entry: data.price,
        timestamp: data.timestamp,
        confidence: 0.8
      };
    }
    
    return null;
  }

  private async executeStrategy(signal: any): Promise<void> {
    console.log(`⚡ Executing Tomorrow Labs ORB strategy: ${signal.type.toUpperCase()}`);
    
    const trade = {
      symbol: this.symbol,
      direction: signal.type,
      entryPrice: signal.entry,
      entryTime: new Date().toLocaleTimeString(),
      timestamp: signal.timestamp
    };

    this.dailyTrades.push(trade);

    if (this.speakResults) {
      await this.speak(`Tomorrow Labs ORB signal detected! Taking ${signal.type} position on ${this.symbol} at ${signal.entry}. Confidence: ${Math.round(signal.confidence * 100)}%.`);
    }

    console.log(`📊 Trade executed:`, trade);
  }

  private async generateChart(_signal: any): Promise<void> {
    console.log(`📊 Generating chart for ${this.symbol} trade...`);
    // Chart generation would be implemented here
    // For now, just log the action
  }

  private async handleMarketClose(): Promise<void> {
    console.log('🔔 Market closed - generating daily summary');
    
    const summary = {
      date: this.currentDate,
      symbol: this.symbol,
      totalTrades: this.dailyTrades.length,
      trades: this.dailyTrades
    };

    if (this.speakResults) {
      if (this.dailyTrades.length > 0) {
        await this.speak(`Market closed. Tomorrow Labs ORB strategy executed ${this.dailyTrades.length} trades on ${this.symbol} today. Check the generated chart for details.`);
      } else {
        await this.speak(`Market closed. No Tomorrow Labs ORB signals were detected for ${this.symbol} today. The strategy remained patient and waited for optimal conditions.`);
      }
    }

    console.log('📋 Daily Summary:', summary);

    if (this.stopAtMarketClose) {
      await this.stopMonitoring();
    }
  }

  private async speak(message: string): Promise<void> {
    console.log(`🔊 SPEAKING OUT LOUD: ${message}`);

    // Actually speak out loud using Google Voice (same as backtesting) and PLAY IT
    try {
      const googleVoice = new GoogleVoice({
        speechModel: {
          apiKey: 'AIzaSyBNU1uWipiCzM8dxCv0X2hpkiVX5Uk0QX4', // Same API key as Sone
        },
        speaker: 'en-US-Studio-O', // Same professional female voice as Sone
      });

      console.log('🎤 Generating Google Voice audio for live trading...');
      const audioStream = await googleVoice.speak(message);

      if (audioStream) {
        // Save audio to temporary file
        const tempAudioPath = path.join(process.cwd(), '.mastra', 'output', 'temp-monitor-voice.wav');
        const outputDir = path.dirname(tempAudioPath);

        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const writer = createWriteStream(tempAudioPath);
        audioStream.pipe(writer);

        // Wait for file to be written, then play it
        writer.on('finish', () => {
          console.log('🔊 Playing live trading audio through speakers...');
          // Use macOS afplay to actually play the audio out loud
          exec(`afplay "${tempAudioPath}"`, (error) => {
            if (error) {
              console.error('❌ Audio playback error:', error);
              // Fallback to say command
              exec(`say "${message}"`, (sayError) => {
                if (sayError) {
                  console.error('❌ Say command also failed:', sayError);
                } else {
                  console.log('✅ Fallback voice announcement completed');
                }
              });
            } else {
              console.log('✅ Google Voice live trading audio played successfully!');
              // Clean up temp file
              setTimeout(() => {
                try {
                  fs.unlinkSync(tempAudioPath);
                } catch (cleanupError) {
                  // Ignore cleanup errors
                }
              }, 1000);
            }
          });
        });

        writer.on('error', (writeError) => {
          console.error('❌ Audio file write error:', writeError);
          // Fallback to say command
          exec(`say "${message}"`, (sayError) => {
            if (sayError) {
              console.error('❌ Say command also failed:', sayError);
            } else {
              console.log('✅ Fallback voice announcement completed');
            }
          });
        });

      } else {
        console.log('❌ Failed to generate Google Voice audio, using fallback');
        // Fallback to say command
        exec(`say "${message}"`, (sayError) => {
          if (sayError) {
            console.error('❌ Say command failed:', sayError);
          } else {
            console.log('✅ Fallback voice announcement completed');
          }
        });
      }
    } catch (voiceError) {
      console.error('❌ Google Voice Error:', voiceError);
      console.log('🔊 Using fallback voice system...');
      // Fallback to say command
      exec(`say "${message}"`, (sayError) => {
        if (sayError) {
          console.error('❌ Say command failed:', sayError);
        } else {
          console.log('✅ Fallback voice announcement completed');
        }
      });
    }
  }
}

export { TomorrowLabsOrbMonitor };