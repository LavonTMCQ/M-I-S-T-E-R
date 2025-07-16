'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wallet, RefreshCw, LogOut, X } from 'lucide-react';

export function WalletHeader() {
  const { mainWallet, refreshWalletData, disconnectWallet, isLoading } = useWallet();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Auto-hide after 5 seconds on page load (reduced from 8)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  // Show/hide on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show when scrolling up, hide when scrolling down
      if (currentScrollY < lastScrollY) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Don't show if no wallet connected
  if (!mainWallet) {
    return null;
  }

  const handleDisconnect = () => {
    // Clear ALL stored data to ensure complete logout
    localStorage.clear();
    sessionStorage.clear();

    // Clear wallet context
    disconnectWallet();

    // Force page reload to clear any cached state
    window.location.href = '/';
    window.location.reload();
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-3 shadow-lg pointer-events-auto transition-all duration-300 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Wallet Info */}
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-muted-foreground" />
          <div className="text-right">
            <div className="text-sm font-medium">
              {mainWallet.handle || mainWallet.displayName}
            </div>
            <div className="text-xs text-muted-foreground">
              {isLoading ? (
                <span className="flex items-center gap-1">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                `${mainWallet.balance.toFixed(2)} ADA`
              )}
            </div>
          </div>
        </div>

        {/* Wallet Type Badge */}
        <Badge variant="outline" className="text-xs">
          {mainWallet.walletType}
        </Badge>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshWalletData}
            disabled={isLoading}
            className="h-8 w-8 p-0"
            title="Refresh wallet data"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-8 w-8 p-0"
            title="Hide wallet display"
          >
            <X className="w-3 h-3" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleDisconnect}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            title="Disconnect wallet"
          >
            <LogOut className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
