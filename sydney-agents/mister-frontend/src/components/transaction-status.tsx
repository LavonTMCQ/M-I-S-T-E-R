'use client';

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ExternalLink,
  Copy,
  Loader2
} from 'lucide-react';

interface TransactionStatusProps {
  txHash?: string | null;
  error?: string | null;
  isLoading?: boolean;
  onDismiss?: () => void;
}

export function TransactionStatus({ txHash, error, isLoading, onDismiss }: TransactionStatusProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInExplorer = (hash: string) => {
    window.open(`https://cardanoscan.io/transaction/${hash}`, '_blank');
  };

  if (isLoading) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium text-blue-800 dark:text-blue-200">
              Transaction in progress...
            </span>
            <p className="text-sm text-blue-600 dark:text-blue-300 mt-1">
              Please confirm the transaction in your wallet and wait for blockchain confirmation.
            </p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="relative">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium">Transaction Failed</span>
            <p className="text-sm mt-1">{error}</p>
          </div>
          {onDismiss && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="ml-4 text-red-600 hover:text-red-700"
            >
              Dismiss
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  if (txHash) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="font-medium text-green-800 dark:text-green-200">
                Transaction Successful!
              </span>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-green-700 border-green-300 font-mono text-xs">
                  {txHash.substring(0, 8)}...{txHash.substring(txHash.length - 8)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(txHash)}
                  className="h-6 px-2 text-green-600 hover:text-green-700"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openInExplorer(txHash)}
                  className="h-6 px-2 text-green-600 hover:text-green-700"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="ml-4 text-green-600 hover:text-green-700"
              >
                Dismiss
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
