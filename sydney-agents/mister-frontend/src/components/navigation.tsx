"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, UserPlus, BarChart3, TrendingUp, Bot, Wallet, Loader2 } from "lucide-react";

export function Navigation() {
  const pathname = usePathname();
  const [loadingPath, setLoadingPath] = useState<string | null>(null);

  // Don't show navigation on dashboard and trading pages since they have their own headers
  if (pathname === '/dashboard' || pathname === '/trading' || pathname === '/managed-dashboard' || pathname === '/managed-wallets') {
    return null;
  }

  const handleNavigation = (href: string) => {
    setLoadingPath(href);
    // Reset loading state after a short delay (navigation should complete)
    setTimeout(() => setLoadingPath(null), 1000);
  };

  const navItems = [
    { href: "/", label: "Landing", icon: Home },
    { href: "/onboarding", label: "Onboarding", icon: UserPlus },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/trading", label: "Trading", icon: TrendingUp },
    { href: "/managed-wallets", label: "Wallets", icon: Wallet },
    { href: "/managed-dashboard", label: "Managed", icon: Bot },
  ];

  return (
    <nav className="fixed top-4 left-4 z-[9999] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg p-2 shadow-lg pointer-events-auto">
      <div className="flex gap-1 sm:gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          const isLoading = loadingPath === item.href;

          return (
            <Link key={item.href} href={item.href} className="pointer-events-auto" onClick={() => handleNavigation(item.href)}>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 pointer-events-auto"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                ) : (
                  <Icon className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <span className="hidden xs:inline sm:inline">{item.label}</span>
                {isActive && <Badge variant="secondary" className="ml-1 px-1 py-0 text-xs hidden sm:inline">Active</Badge>}
              </Button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
