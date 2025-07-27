/**
 * Transaction Status Panel
 * 
 * Displays real-time transaction status updates and position monitoring
 * from the Transaction Tracker service.
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useSignalServices } from '@/hooks/useSignalServices';

import {
  TransactionRecord,
  TransactionStatus
} from '@/types/signals';

import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

/**
 * Transaction Status Badge Component
 */
interface StatusBadgeProps {
  status: TransactionStatus;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    pending: { color: 'bg-yellow-500', icon: Clock, label: 'Pending' },
    confirmed: { color: 'bg-blue-500', icon: Loader2, label: 'Confirmed' },
    executed: { color: 'bg-green-500', icon: CheckCircle, label: 'Executed' },
    failed: { color: 'bg-red-500', icon: XCircle, label: 'Failed' },
    cancelled: { color: 'bg-gray-500', icon: XCircle, label: 'Cancelled' },
    expired: { color: 'bg-orange-500', icon: AlertTriangle, label: 'Expired' },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="secondary" className="flex items-center space-x-1">
      <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
    </Badge>
  );
}

/**
 * Transaction Item Component
 */
interface TransactionItemProps {
  transaction: TransactionRecord;
  onViewDetails?: (transaction: TransactionRecord) => void;
}

function TransactionItem({ transaction, onViewDetails }: TransactionItemProps) {
  const isLong = transaction.details.side === 'long';
  const executionTime = transaction.timestamps.executed || transaction.timestamps.confirmed;
  const duration = executionTime 
    ? new Date(executionTime).getTime() - new Date(transaction.timestamps.submitted).getTime()
    : null;

  return (
    <div className="p-3 border rounded-lg space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isLong ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
          <span className="font-medium">
            {isLong ? 'LONG' : 'SHORT'} {transaction.details.amount} ADA
          </span>
        </div>
        <StatusBadge status={transaction.status} />
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Price:</span>
          <div className="font-medium">
            {transaction.details.execution_price 
              ? `$${transaction.details.execution_price.toFixed(4)}`
              : 'Pending'
            }
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Fees:</span>
          <div className="font-medium">
            {transaction.details.fees 
              ? `${transaction.details.fees.total_fee.toFixed(2)} ADA`
              : 'Calculating...'
            }
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Submitted:</span>
          <div className="font-medium">
            {new Date(transaction.timestamps.submitted).toLocaleTimeString()}
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Duration:</span>
          <div className="font-medium">
            {duration ? `${Math.round(duration / 1000)}s` : 'In progress...'}
          </div>
        </div>
      </div>

      {/* Progress Bar for Pending/Confirmed */}
      {(transaction.status === 'pending' || transaction.status === 'confirmed') && (
        <div className="space-y-1">
          <Progress 
            value={transaction.status === 'pending' ? 33 : 66} 
            className="h-2" 
          />
          <div className="text-xs text-muted-foreground text-center">
            {transaction.status === 'pending' ? 'Awaiting confirmation...' : 'Processing execution...'}
          </div>
        </div>
      )}

      {/* Error Message */}
      {transaction.error && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
          <div className="flex items-center space-x-2">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-800">{transaction.error.message}</span>
          </div>
        </div>
      )}

      {/* Retry Info */}
      {transaction.retry_info && transaction.retry_info.attempt_count > 1 && (
        <div className="text-xs text-muted-foreground">
          Retry attempt {transaction.retry_info.attempt_count}/3
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          ID: {transaction.transaction_id.substring(0, 8)}...
        </div>
        <div className="flex space-x-2">
          {transaction.details.position_id && (
            <Button variant="ghost" size="sm" onClick={() => onViewDetails?.(transaction)}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View Position
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Active Executions Component
 */
function ActiveExecutions() {
  const { execution } = useSignalServices();

  if (execution.activeExecutions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="font-medium flex items-center space-x-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Active Executions ({execution.activeExecutions.length})</span>
      </h4>
      
      <div className="space-y-2">
        {execution.activeExecutions.map((signalId) => (
          <div key={signalId} className="p-2 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="flex items-center justify-between">
              <span>Executing signal: {signalId.substring(0, 12)}...</span>
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Transaction Statistics Component
 */
function TransactionStatistics() {
  const { tracking } = useSignalServices();

  if (!tracking.statistics) {
    return null;
  }

  const stats = tracking.statistics;

  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      <div className="p-2 bg-muted rounded">
        <div className="font-semibold">{stats.total_transactions}</div>
        <div className="text-xs text-muted-foreground">Total</div>
      </div>
      <div className="p-2 bg-muted rounded">
        <div className="font-semibold text-green-600">{stats.successful_transactions}</div>
        <div className="text-xs text-muted-foreground">Success</div>
      </div>
      <div className="p-2 bg-muted rounded">
        <div className="font-semibold text-yellow-600">{stats.pending_transactions}</div>
        <div className="text-xs text-muted-foreground">Pending</div>
      </div>
      <div className="p-2 bg-muted rounded">
        <div className="font-semibold">{stats.success_rate.toFixed(0)}%</div>
        <div className="text-xs text-muted-foreground">Rate</div>
      </div>
    </div>
  );
}

/**
 * Main Transaction Status Panel Component
 */
export default function TransactionStatusPanel() {
  const [showAll, setShowAll] = useState(false);
  const { tracking, execution } = useSignalServices();

  const recentTransactions = showAll 
    ? tracking.transactions 
    : tracking.transactions.slice(0, 3);

  const hasActiveExecutions = execution.activeExecutions.length > 0;
  const hasTransactions = tracking.transactions.length > 0;

  if (!hasActiveExecutions && !hasTransactions) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Transaction Status</span>
          </CardTitle>
          <Button variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Active Executions */}
        <ActiveExecutions />

        {/* Transaction Statistics */}
        {tracking.statistics && (
          <>
            <Separator />
            <TransactionStatistics />
          </>
        )}

        {/* Recent Transactions */}
        {hasTransactions && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Recent Transactions</h4>
                {tracking.transactions.length > 3 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll ? 'Show Less' : `Show All (${tracking.transactions.length})`}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {recentTransactions.map((transaction) => (
                  <TransactionItem
                    key={transaction.transaction_id}
                    transaction={transaction}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!hasActiveExecutions && !hasTransactions && (
          <div className="text-center py-4 text-muted-foreground">
            <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}