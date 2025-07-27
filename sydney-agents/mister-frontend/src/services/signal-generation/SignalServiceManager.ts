/**
 * Signal Service Manager
 * 
 * Advanced management and monitoring for the signal generation service.
 * Provides configuration management, health monitoring, and service coordination.
 */

import { 
  SignalGenerationService, 
  getSignalGenerationService 
} from './SignalGenerationService';

import { 
  TradingSignal, 
  SignalServiceConfig, 
  SignalServiceStatus,
  SignalGenerationResponse
} from '@/types/signals';

/**
 * Service health metrics
 */
export interface ServiceHealthMetrics {
  /** Service uptime in seconds */
  uptime_seconds: number;
  
  /** Total signals generated */
  total_signals_generated: number;
  
  /** Signals generated today */
  signals_today: number;
  
  /** Success rate percentage */
  success_rate: number;
  
  /** Average response time in ms */
  avg_response_time_ms: number;
  
  /** Current error count */
  error_count: number;
  
  /** Last successful signal time */
  last_success_time: string | null;
  
  /** Memory usage */
  memory_usage: {
    cache_size: number;
    listeners_count: number;
  };
}

/**
 * Service performance metrics
 */
export interface ServicePerformanceMetrics {
  /** Signals by hour (last 24 hours) */
  signals_by_hour: { hour: string; count: number }[];
  
  /** Success rate by hour */
  success_rate_by_hour: { hour: string; rate: number }[];
  
  /** Response times (last 100 requests) */
  response_times: number[];
  
  /** Error distribution */
  error_distribution: { error_type: string; count: number }[];
  
  /** Pattern distribution */
  pattern_distribution: { pattern: string; count: number }[];
}

/**
 * Signal Service Manager
 */
export class SignalServiceManager {
  private service: SignalGenerationService;
  private healthMetrics: ServiceHealthMetrics;
  private performanceMetrics: ServicePerformanceMetrics;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsHistory: Map<string, any> = new Map();

  constructor() {
    this.service = getSignalGenerationService();
    this.healthMetrics = this.initializeHealthMetrics();
    this.performanceMetrics = this.initializePerformanceMetrics();
    
    // Set up signal listener for metrics tracking
    this.service.addSignalListener(this.onSignalGenerated.bind(this));
    
    console.log('📊 Signal Service Manager initialized');
  }

  /**
   * Start health monitoring
   */
  public startHealthMonitoring(intervalSeconds: number = 60): void {
    if (this.healthCheckInterval) {
      console.log('⚠️ Health monitoring already running');
      return;
    }

    console.log(`🏥 Starting health monitoring (${intervalSeconds}s interval)`);
    
    this.healthCheckInterval = setInterval(() => {
      this.updateHealthMetrics();
      this.checkServiceHealth();
    }, intervalSeconds * 1000);
  }

  /**
   * Stop health monitoring
   */
  public stopHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log('🏥 Health monitoring stopped');
    }
  }

  /**
   * Get current health metrics
   */
  public getHealthMetrics(): ServiceHealthMetrics {
    this.updateHealthMetrics();
    return { ...this.healthMetrics };
  }

  /**
   * Get performance metrics
   */
  public getPerformanceMetrics(): ServicePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get comprehensive service status
   */
  public getComprehensiveStatus(): {
    service_status: SignalServiceStatus;
    health_metrics: ServiceHealthMetrics;
    performance_metrics: ServicePerformanceMetrics;
  } {
    return {
      service_status: this.service.getStatus(),
      health_metrics: this.getHealthMetrics(),
      performance_metrics: this.getPerformanceMetrics(),
    };
  }

  /**
   * Restart service with new configuration
   */
  public restartService(newConfig?: Partial<SignalServiceConfig>): void {
    console.log('🔄 Restarting signal generation service...');
    
    this.service.stop();
    
    if (newConfig) {
      // Create new service with updated config
      const { SignalGenerationService } = require('./SignalGenerationService');
      this.service = new SignalGenerationService(newConfig);
      this.service.addSignalListener(this.onSignalGenerated.bind(this));
    }
    
    this.service.start();
    
    // Reset metrics
    this.healthMetrics = this.initializeHealthMetrics();
    this.performanceMetrics = this.initializePerformanceMetrics();
    
    console.log('✅ Signal generation service restarted');
  }

  /**
   * Force health check
   */
  public async performHealthCheck(): Promise<{
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check service status
    const status = this.service.getStatus();
    
    if (!status.running) {
      issues.push('Service is not running');
      recommendations.push('Start the signal generation service');
    }

    if (status.errors.length > 0) {
      issues.push(`${status.errors.length} active errors`);
      recommendations.push('Check error logs and resolve issues');
    }

    // Check signal generation frequency
    const hoursSinceLastSignal = status.last_signal_time 
      ? (Date.now() - new Date(status.last_signal_time).getTime()) / (1000 * 60 * 60)
      : 24;

    if (hoursSinceLastSignal > 2) {
      issues.push('No signals generated in the last 2 hours');
      recommendations.push('Check Railway API connectivity and algorithm status');
    }

    // Check success rate
    if (this.healthMetrics.success_rate < 80) {
      issues.push(`Low success rate: ${this.healthMetrics.success_rate.toFixed(1)}%`);
      recommendations.push('Review signal validation criteria and API reliability');
    }

    // Check response times
    if (this.healthMetrics.avg_response_time_ms > 30000) {
      issues.push(`High response times: ${this.healthMetrics.avg_response_time_ms}ms`);
      recommendations.push('Check Railway API performance and network connectivity');
    }

    const healthy = issues.length === 0;

    console.log(`🏥 Health check completed: ${healthy ? 'HEALTHY' : 'ISSUES FOUND'}`);
    if (issues.length > 0) {
      console.log('Issues:', issues);
      console.log('Recommendations:', recommendations);
    }

    return { healthy, issues, recommendations };
  }

  /**
   * Generate test signal (for debugging)
   */
  public async generateTestSignal(): Promise<SignalGenerationResponse> {
    console.log('🧪 Generating test signal...');
    return await this.service.generateSignalNow();
  }

  /**
   * Export service metrics for analysis
   */
  public exportMetrics(): {
    timestamp: string;
    service_status: SignalServiceStatus;
    health_metrics: ServiceHealthMetrics;
    performance_metrics: ServicePerformanceMetrics;
    configuration: any;
  } {
    return {
      timestamp: new Date().toISOString(),
      service_status: this.service.getStatus(),
      health_metrics: this.getHealthMetrics(),
      performance_metrics: this.getPerformanceMetrics(),
      configuration: {
        // Add configuration details here if needed
      },
    };
  }

  /**
   * Initialize health metrics
   */
  private initializeHealthMetrics(): ServiceHealthMetrics {
    return {
      uptime_seconds: 0,
      total_signals_generated: 0,
      signals_today: 0,
      success_rate: 100,
      avg_response_time_ms: 0,
      error_count: 0,
      last_success_time: null,
      memory_usage: {
        cache_size: 0,
        listeners_count: 1, // This manager is a listener
      },
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): ServicePerformanceMetrics {
    return {
      signals_by_hour: [],
      success_rate_by_hour: [],
      response_times: [],
      error_distribution: [],
      pattern_distribution: [],
    };
  }

  /**
   * Update health metrics
   */
  private updateHealthMetrics(): void {
    const status = this.service.getStatus();
    
    this.healthMetrics.uptime_seconds = status.uptime_seconds;
    this.healthMetrics.signals_today = status.signals_today;
    this.healthMetrics.error_count = status.errors.length;
    this.healthMetrics.last_success_time = status.last_signal_time;
    
    // Calculate success rate from stored metrics
    const totalAttempts = this.metricsHistory.get('total_attempts') || 0;
    const successfulAttempts = this.metricsHistory.get('successful_attempts') || 0;
    
    if (totalAttempts > 0) {
      this.healthMetrics.success_rate = (successfulAttempts / totalAttempts) * 100;
    }
    
    // Update memory usage
    this.healthMetrics.memory_usage.cache_size = this.metricsHistory.size;
  }

  /**
   * Check service health and log warnings
   */
  private checkServiceHealth(): void {
    const status = this.service.getStatus();
    
    // Log health status
    if (status.health === 'error') {
      console.warn('⚠️ Signal service health: ERROR');
      console.warn('Errors:', status.errors);
    } else if (status.health === 'warning') {
      console.warn('⚠️ Signal service health: WARNING');
    } else {
      console.log('✅ Signal service health: HEALTHY');
    }
    
    // Log performance metrics
    console.log(`📊 Service metrics: ${status.signals_today} signals today, ${status.uptime_seconds}s uptime`);
  }

  /**
   * Handle signal generation events
   */
  private onSignalGenerated(signal: TradingSignal): void {
    // Update metrics
    this.healthMetrics.total_signals_generated++;
    
    // Track successful generation
    const totalAttempts = this.metricsHistory.get('total_attempts') || 0;
    const successfulAttempts = this.metricsHistory.get('successful_attempts') || 0;
    
    this.metricsHistory.set('total_attempts', totalAttempts + 1);
    this.metricsHistory.set('successful_attempts', successfulAttempts + 1);
    
    // Track pattern distribution
    const patternCount = this.metricsHistory.get(`pattern_${signal.pattern}`) || 0;
    this.metricsHistory.set(`pattern_${signal.pattern}`, patternCount + 1);
    
    // Update performance metrics
    this.updatePatternDistribution();
    
    console.log('📊 Signal metrics updated:', {
      total_generated: this.healthMetrics.total_signals_generated,
      pattern: signal.pattern,
      confidence: signal.confidence,
    });
  }

  /**
   * Update pattern distribution metrics
   */
  private updatePatternDistribution(): void {
    const patterns: { pattern: string; count: number }[] = [];
    
    for (const [key, value] of this.metricsHistory.entries()) {
      if (key.startsWith('pattern_')) {
        const pattern = key.replace('pattern_', '');
        patterns.push({ pattern, count: value as number });
      }
    }
    
    this.performanceMetrics.pattern_distribution = patterns.sort((a, b) => b.count - a.count);
  }
}

/**
 * Singleton instance
 */
let serviceManagerInstance: SignalServiceManager | null = null;

/**
 * Get or create service manager instance
 */
export function getSignalServiceManager(): SignalServiceManager {
  if (!serviceManagerInstance) {
    serviceManagerInstance = new SignalServiceManager();
  }
  return serviceManagerInstance;
}

/**
 * Initialize service manager with health monitoring
 */
export function initializeServiceManager(healthCheckIntervalSeconds: number = 60): SignalServiceManager {
  const manager = getSignalServiceManager();
  manager.startHealthMonitoring(healthCheckIntervalSeconds);
  return manager;
}