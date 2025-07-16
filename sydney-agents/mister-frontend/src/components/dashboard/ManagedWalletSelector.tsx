"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wallet, 
  Plus, 
  Settings, 
  Eye, 
  EyeOff,
  CheckCircle,
  Circle,
  TrendingUp,
  TrendingDown,
  DollarSign
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ManagedWallet {
  id: string;
  name: string;
  address: string;
  balance: number;
  isActive: boolean;
  performance: {
    totalPnL: number;
    dailyPnL: number;
    winRate: number;
    totalTrades: number;
  };
  strategy: string;
  lastActivity: string;
}

interface ManagedWalletSelectorProps {
  className?: string;
  onWalletSelect?: (wallet: ManagedWallet) => void;
}

export function ManagedWalletSelector({ className = "", onWalletSelect }: ManagedWalletSelectorProps) {
  const [wallets, setWallets] = useState<ManagedWallet[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalances, setShowBalances] = useState(true);

  // Mock data - will be replaced with real managed wallet API
  useEffect(() => {
    const mockWallets: ManagedWallet[] = [
      {
        id: '1',
        name: 'Main Trading Wallet',
        address: 'addr1qxtkdjl87894tg6juz20jzyjqy3uyn02pr9xtq7mlh0gm2ss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qh5unyc',
        balance: 129.45,
        isActive: true,
        performance: {
          totalPnL: 45.67,
          dailyPnL: -2.34,
          winRate: 68.5,
          totalTrades: 23
        },
        strategy: 'CNT + Strike Finance',
        lastActivity: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: '2',
        name: 'Conservative Portfolio',
        address: 'addr1q9ryamhgnuz6lau86sqytte2gz5rlktv2yce05e0h3207qss5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qrgyf48',
        balance: 250.80,
        isActive: false,
        performance: {
          totalPnL: 12.34,
          dailyPnL: 1.23,
          winRate: 72.1,
          totalTrades: 15
        },
        strategy: 'Low Risk DeFi',
        lastActivity: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: '3',
        name: 'Aggressive Growth',
        address: 'addr1z8p79rpkcdz8x9d6tft0x0dx5mwuzac2sa4gm8cvkw5hcnqs5dpkcny95dktp5qmyyrx82t68sge4m94qwxyrfr8f86qnwcwrm',
        balance: 89.12,
        isActive: false,
        performance: {
          totalPnL: -8.45,
          dailyPnL: 3.21,
          winRate: 55.2,
          totalTrades: 31
        },
        strategy: 'High Frequency',
        lastActivity: new Date(Date.now() - 7200000).toISOString()
      }
    ];

    setTimeout(() => {
      setWallets(mockWallets);
      setSelectedWallet(mockWallets.find(w => w.isActive)?.id || null);
      setIsLoading(false);
    }, 600);
  }, []);

  const formatAddress = (address: string) => {
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const handleWalletSelect = (walletId: string) => {
    setSelectedWallet(walletId);
    const wallet = wallets.find(w => w.id === walletId);
    if (wallet && onWalletSelect) {
      onWalletSelect(wallet);
    }
  };

  const totalBalance = wallets.reduce((sum, wallet) => sum + wallet.balance, 0);
  const totalPnL = wallets.reduce((sum, wallet) => sum + wallet.performance.totalPnL, 0);

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-purple-600" />
            Managed Wallets
            <Badge variant="outline" className="ml-2">
              {wallets.length} Active
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
            >
              {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Wallet
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
              <div className="text-center">
                <div className="text-lg font-bold">
                  {showBalances ? `${totalBalance.toFixed(2)} ADA` : '••••••'}
                </div>
                <div className="text-xs text-muted-foreground">Total Balance</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-bold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {showBalances ? `${totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)} ADA` : '••••••'}
                </div>
                <div className="text-xs text-muted-foreground">Total P&L</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{wallets.filter(w => w.isActive).length}</div>
                <div className="text-xs text-muted-foreground">Active Strategies</div>
              </div>
            </div>

            {/* Wallet Selector */}
            <div className="mb-4">
              <Select value={selectedWallet || ''} onValueChange={handleWalletSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a wallet" />
                </SelectTrigger>
                <SelectContent>
                  {wallets.map((wallet) => (
                    <SelectItem key={wallet.id} value={wallet.id}>
                      <div className="flex items-center gap-2">
                        {wallet.isActive ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-400" />
                        )}
                        <span>{wallet.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {wallet.strategy}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Wallet Details */}
            <div className="space-y-3">
              {wallets.map((wallet, index) => (
                <motion.div
                  key={wallet.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={`border rounded-lg p-4 transition-all cursor-pointer ${
                    selectedWallet === wallet.id 
                      ? 'border-purple-300 bg-purple-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleWalletSelect(wallet.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {wallet.isActive ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Circle className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="font-medium">{wallet.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {wallet.strategy}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-2 font-mono">
                    {formatAddress(wallet.address)}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                      <div className="font-medium">
                        {showBalances ? `${wallet.balance.toFixed(2)} ADA` : '••••••'}
                      </div>
                      <div className="text-muted-foreground">Balance</div>
                    </div>
                    <div>
                      <div className={`font-medium flex items-center gap-1 ${
                        wallet.performance.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {wallet.performance.totalPnL >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {showBalances ? `${wallet.performance.totalPnL >= 0 ? '+' : ''}${wallet.performance.totalPnL.toFixed(2)}` : '••••'}
                      </div>
                      <div className="text-muted-foreground">P&L</div>
                    </div>
                    <div>
                      <div className="font-medium">{wallet.performance.winRate.toFixed(1)}%</div>
                      <div className="text-muted-foreground">Win Rate</div>
                    </div>
                    <div>
                      <div className="font-medium">{wallet.performance.totalTrades}</div>
                      <div className="text-muted-foreground">Trades</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Last activity: {formatTimeAgo(wallet.lastActivity)}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
