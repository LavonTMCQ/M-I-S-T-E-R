/**
 * Execution Confirmation Dialog
 * 
 * Shows pre-execution validation results and allows users to confirm
 * or modify signal execution parameters before final execution.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  TradingSignal,
  PreExecutionValidation
} from '@/types/signals';

import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Shield,
  Target,
  Loader2,
  Edit3
} from 'lucide-react';

interface ExecutionConfirmationDialogProps {
  signal: TradingSignal;
  validation: PreExecutionValidation;
  onConfirm: (
    signal: TradingSignal,
    overrides?: {
      position_size?: number;
      stop_loss?: number;
      take_profit?: number;
    }
  ) => void;
  onCancel: () => void;
  isExecuting: boolean;
}

export default function ExecutionConfirmationDialog({
  signal,
  validation,
  onConfirm,
  onCancel,
  isExecuting
}: ExecutionConfirmationDialogProps) {
  const [customPositionSize, setCustomPositionSize] = useState(signal.risk.position_size);
  const [customStopLoss, setCustomStopLoss] = useState(signal.risk.stop_loss);
  const [customTakeProfit, setCustomTakeProfit] = useState(signal.risk.take_profit);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const isLong = signal.type === 'long';
  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  // Calculate updated values when overrides are applied
  const finalPositionSize = customPositionSize;
  const finalStopLoss = customStopLoss;
  const finalTakeProfit = customTakeProfit;
  const totalCost = finalPositionSize + validation.estimation.total_fees;

  // Calculate potential P&L with overrides
  const potentialProfit = Math.abs(finalTakeProfit - signal.price) * finalPositionSize;
  const potentialLoss = Math.abs(signal.price - finalStopLoss) * finalPositionSize;

  const handleConfirm = () => {
    const hasOverrides = 
      customPositionSize !== signal.risk.position_size ||
      customStopLoss !== signal.risk.stop_loss ||
      customTakeProfit !== signal.risk.take_profit;

    onConfirm(
      signal,
      hasOverrides ? {
        position_size: customPositionSize,
        stop_loss: customStopLoss,
        take_profit: customTakeProfit,
      } : undefined
    );
  };

  return (
    <Dialog open={true} onOpenChange={() => !isExecuting && onCancel()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {isLong ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span>Confirm {isLong ? 'LONG' : 'SHORT'} Execution</span>
          </DialogTitle>
          <DialogDescription>
            Review the signal details and execution parameters before confirming.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Validation Status */}
          <div className="space-y-2">
            {hasErrors && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Execution Blocked</div>
                  <ul className="text-sm space-y-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {hasWarnings && !hasErrors && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium mb-1">Warnings</div>
                  <ul className="text-sm space-y-1">
                    {validation.warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {validation.can_execute && !hasWarnings && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  All validation checks passed. Ready for execution.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Signal Summary */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Signal Details</span>
              <Badge variant="secondary">{signal.confidence}% Confidence</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Pattern:</span>
                <div className="font-medium">{signal.pattern.replace(/_/g, ' ')}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Entry Price:</span>
                <div className="font-medium">${signal.price.toFixed(4)}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Execution Parameters */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Execution Parameters</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                <Edit3 className="h-4 w-4 mr-1" />
                {showAdvanced ? 'Hide' : 'Customize'}
              </Button>
            </div>

            {showAdvanced ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="position-size">Position Size (ADA)</Label>
                  <Input
                    id="position-size"
                    type="number"
                    value={customPositionSize}
                    onChange={(e) => setCustomPositionSize(Number(e.target.value))}
                    min="40"
                    max="1000"
                    step="1"
                  />
                </div>
                <div>
                  <Label htmlFor="stop-loss">Stop Loss ($)</Label>
                  <Input
                    id="stop-loss"
                    type="number"
                    value={customStopLoss}
                    onChange={(e) => setCustomStopLoss(Number(e.target.value))}
                    step="0.0001"
                  />
                </div>
                <div>
                  <Label htmlFor="take-profit">Take Profit ($)</Label>
                  <Input
                    id="take-profit"
                    type="number"
                    value={customTakeProfit}
                    onChange={(e) => setCustomTakeProfit(Number(e.target.value))}
                    step="0.0001"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Position Size:</span>
                  <span className="font-medium">{finalPositionSize} ADA</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Stop Loss:</span>
                  <span className="font-medium">${finalStopLoss.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Take Profit:</span>
                  <span className="font-medium text-green-600">${finalTakeProfit.toFixed(4)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Max Risk:</span>
                  <span className="font-medium text-red-600">{potentialLoss.toFixed(1)} ADA</span>
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Cost Breakdown */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <DollarSign className="h-4 w-4" />
              <span>Cost Breakdown</span>
            </h4>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Position Size:</span>
                <span>{finalPositionSize} ADA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trading Fee:</span>
                <span>{(finalPositionSize * 0.001).toFixed(2)} ADA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network Fee:</span>
                <span>2.00 ADA</span>
              </div>
              <Separator />
              <div className="flex justify-between font-medium">
                <span>Total Cost:</span>
                <span>{totalCost.toFixed(2)} ADA</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Risk/Reward Analysis */}
          <div className="space-y-3">
            <h4 className="font-medium flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Risk/Reward Analysis</span>
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <div className="text-red-600 font-semibold">
                  -{potentialLoss.toFixed(1)} ADA
                </div>
                <div className="text-xs text-red-600">Max Loss</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-green-600 font-semibold">
                  +{potentialProfit.toFixed(1)} ADA
                </div>
                <div className="text-xs text-green-600">Max Profit</div>
              </div>
            </div>
            
            <div className="text-center text-sm text-muted-foreground">
              Risk/Reward Ratio: 1:{(potentialProfit / potentialLoss).toFixed(2)}
            </div>
          </div>

          {/* Validation Checks */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <span>Safety Checks</span>
            </h4>
            
            <div className="space-y-1 text-sm">
              {Object.entries(validation.checks).map(([check, passed]) => (
                <div key={check} className="flex items-center space-x-2">
                  {passed ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <span className={passed ? 'text-green-700' : 'text-red-700'}>
                    {check.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.can_execute || isExecuting}
            className={isLong ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
          >
            {isExecuting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                Execute {isLong ? 'LONG' : 'SHORT'} ({finalPositionSize} ADA)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}