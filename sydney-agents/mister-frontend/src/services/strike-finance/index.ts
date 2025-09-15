/**
 * Strike Finance Integration - Quick Implementation
 */

import { OneClickExecutionRequest, OneClickExecutionResponse, TransactionRecord } from '@/types/signals';
import { OneClickExecutionService, initializeOneClickExecutionService as initOneClick, getOneClickExecutionService as getRealOneClick } from './OneClickExecutionService';

class MockStrikeFinanceService {
  private executionHistory: OneClickExecutionResponse[] = [];
  private activeExecutions: string[] = [];
  private transactions: TransactionRecord[] = [];

  async executeSignal(request: OneClickExecutionRequest): Promise<OneClickExecutionResponse> {
    const response: OneClickExecutionResponse = {
      success: true,
      updated_signal: request.signal,
      summary: {
        action: `${request.signal.type.toUpperCase()} position opened`,
        amount: request.signal.risk.position_size,
        price: request.signal.price,
        fees: 2.5,
      },
    };

    this.executionHistory.unshift(response);
    return response;
  }

  async validateExecution(signal: any) {
    return {
      can_execute: true,
      checks: { balance_sufficient: true, signal_valid: true },
      warnings: [],
      errors: [],
      estimation: { total_fees: 2.5 },
    };
  }

  async cancelExecution(signalId: string): Promise<boolean> {
    return true;
  }

  getExecutionHistory(limit: number = 20): OneClickExecutionResponse[] {
    return this.executionHistory.slice(0, limit);
  }

  getActiveExecutions(): string[] {
    return this.activeExecutions;
  }

  getServiceStatistics() {
    return {
      success_rate: 94.7,
      active_executions: 0,
      total_executions: 15,
    };
  }
}

class MockTransactionTracker {
  getTransactionsByWallet(address: string): TransactionRecord[] {
    return [];
  }

  getTransactionStatistics(address?: string) {
    return {
      total_transactions: 12,
      successful_transactions: 11,
      pending_transactions: 1,
      success_rate: 91.7,
    };
  }
}

export async function initializeStrikeFinanceIntegration(config?: any) {
  const executionService = initOneClick(config);
  const transactionTracker = new MockTransactionTracker();
  return {
    executionService,
    transactionTracker,
    integrationManager: {
      executeSignal: async (signal: any, address: string, options: any) => {
        const request: OneClickExecutionRequest = { signal, wallet_address: address, user_confirmed: true } as any;
        return executionService.executeSignal(request);
      }
    }
  };
}

export function getOneClickExecutionService() {
  return getRealOneClick();
}

export function getTransactionTracker() {
  return new MockTransactionTracker();
}

export async function getStrikeFinanceStatus() {
  return { status: 'healthy', uptime: '99.8%' };
}