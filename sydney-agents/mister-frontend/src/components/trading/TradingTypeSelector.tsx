"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  TrendingUp, 
  Coins, 
  Zap, 
  Shield, 
  Bot,
  AlertTriangle,
  Info
} from "lucide-react";

export interface TradingTypeConfig {
  type: 'strike' | 'cnt';
  isActive: boolean;
  settings: {
    maxDailyTrades: number;
    maxPositionSize: number;
    riskLevel: 'conservative' | 'moderate' | 'aggressive';
  };
}

interface TradingTypeSelectorProps {
  walletId: string;
  currentConfig?: TradingTypeConfig;
  onConfigChange: (config: TradingTypeConfig) => void;
  onStartTrading: (type: 'strike' | 'cnt') => void;
  onStopTrading: (type: 'strike' | 'cnt') => void;
  isLoading?: boolean;
}

export function TradingTypeSelector({
  walletId,
  currentConfig,
  onConfigChange,
  onStartTrading,
  onStopTrading,
  isLoading = false
}: TradingTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<'strike' | 'cnt'>(
    currentConfig?.type || 'cnt'
  );

  const handleTypeSelection = (type: 'strike' | 'cnt') => {
    setSelectedType(type);
    
    const newConfig: TradingTypeConfig = {
      type,
      isActive: false,
      settings: {
        maxDailyTrades: type === 'strike' ? 5 : 10,
        maxPositionSize: type === 'strike' ? 200 : 100,
        riskLevel: 'moderate'
      }
    };
    
    onConfigChange(newConfig);
  };

  const handleToggleTrading = () => {
    if (currentConfig?.isActive) {
      onStopTrading(selectedType);
    } else {
      onStartTrading(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Trading Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Select Trading Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            
            {/* Strike Finance Trading */}
            <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === 'strike' ? 'ring-2 ring-primary border-primary' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Strike Finance</CardTitle>
                    <Badge variant="secondary" className="mt-1">Leveraged</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Trade perpetual swaps with leverage on Strike Finance platform.
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Zap className="w-3 h-3 text-green-500" />
                    <span>Up to 10x leverage</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <TrendingUp className="w-3 h-3 text-green-500" />
                    <span>Long/Short positions</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span>Advanced risk management</span>
                  </div>
                </div>

                <Button 
                  variant={selectedType === 'strike' ? 'default' : 'outline'}
                  className="w-full" 
                  onClick={() => handleTypeSelection('strike')}
                  disabled={isLoading}
                >
                  {selectedType === 'strike' ? 'Selected' : 'Select Strike'}
                </Button>
              </CardContent>
            </Card>

            {/* CNT Trading */}
            <Card className={`cursor-pointer transition-all duration-300 hover:shadow-lg ${
              selectedType === 'cnt' ? 'ring-2 ring-primary border-primary' : ''
            }`}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Coins className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Cardano Tokens</CardTitle>
                    <Badge variant="outline" className="mt-1">Spot Trading</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-4">
                  Trade Cardano native tokens directly using MISTER AI analysis.
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs">
                    <Coins className="w-3 h-3 text-green-500" />
                    <span>Native token trading</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Bot className="w-3 h-3 text-green-500" />
                    <span>AI-powered analysis</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Shield className="w-3 h-3 text-green-500" />
                    <span>No liquidation risk</span>
                  </div>
                </div>

                <Button 
                  variant={selectedType === 'cnt' ? 'default' : 'outline'}
                  className="w-full" 
                  onClick={() => handleTypeSelection('cnt')}
                  disabled={isLoading}
                >
                  {selectedType === 'cnt' ? 'Selected' : 'Select CNT'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Important Notice */}
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800 mb-1">Important Notice</h4>
                <p className="text-sm text-amber-700">
                  Each managed wallet can only run <strong>one trading type at a time</strong>. 
                  You cannot run Strike Finance and CNT trading simultaneously on the same wallet.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trading Control */}
      {currentConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Trading Control
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <h3 className="font-medium">
                  {selectedType === 'strike' ? 'Strike Finance' : 'Cardano Tokens'} Trading
                </h3>
                <p className="text-sm text-muted-foreground">
                  {currentConfig.isActive ? 'Agent is actively trading' : 'Trading is paused'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <Badge variant={currentConfig.isActive ? "default" : "secondary"}>
                  {currentConfig.isActive ? "Active" : "Paused"}
                </Badge>
                
                <Button
                  onClick={handleToggleTrading}
                  disabled={isLoading}
                  variant={currentConfig.isActive ? "destructive" : "default"}
                >
                  {isLoading ? (
                    "Processing..."
                  ) : currentConfig.isActive ? (
                    "Stop Trading"
                  ) : (
                    "Start Trading"
                  )}
                </Button>
              </div>
            </div>

            {/* Trading Settings Preview */}
            <div className="mt-4 grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Max Daily Trades</div>
                <div className="text-lg font-bold text-primary">
                  {currentConfig.settings.maxDailyTrades}
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Max Position</div>
                <div className="text-lg font-bold text-primary">
                  {currentConfig.settings.maxPositionSize} ADA
                </div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium">Risk Level</div>
                <div className="text-lg font-bold text-primary capitalize">
                  {currentConfig.settings.riskLevel}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
