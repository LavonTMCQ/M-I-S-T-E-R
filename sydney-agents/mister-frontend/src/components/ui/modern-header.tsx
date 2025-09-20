'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Activity, 
  Bell, 
  ChevronRight, 
  Home, 
  Settings, 
  User, 
  LogOut,
  Wallet,
  TrendingUp,
  BarChart3,
  Command
} from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface HeaderProps {
  className?: string;
}

export function ModernHeader({ className }: HeaderProps) {
  const pathname = usePathname();
  
  // Generate breadcrumbs from pathname
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const paths = pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/' }
    ];
    
    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        label,
        href: index === paths.length - 1 ? undefined : currentPath
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = generateBreadcrumbs();
  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.label || 'Home';

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-[90]",
      "bg-background/80 backdrop-blur-xl border-b border-border/50",
      "relative",
      className
    )}>
      {/* Subtle gradient glow at the top */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
      <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left Section - Logo and Breadcrumbs */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600/30 to-blue-600/30 border border-purple-500/30 flex items-center justify-center relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 to-blue-600/20 animate-pulse" />
                <span className="font-bold text-sm bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent relative z-10">M</span>
              </motion.div>
              <motion.span 
                className="font-bold text-lg hidden sm:block bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400 bg-clip-text text-transparent relative"
                style={{
                  backgroundSize: '200% 100%',
                }}
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                MISTER
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-blue-600/20 to-purple-600/20 blur-lg opacity-50 -z-10 animate-pulse" />
              </motion.span>
            </Link>
            
            <Separator orientation="vertical" className="h-6" />
            
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-sm">
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  {index > 0 && (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  )}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          {/* Center Section - Current Page Title */}
          <div className="hidden lg:flex items-center gap-3">
            <div className="flex items-center gap-2">
              {pathname === '/trading' && (
                <>
                  <Activity className="h-4 w-4 text-green-500" />
                  <Badge variant="outline" className="text-xs">
                    Live Trading
                  </Badge>
                </>
              )}
              {pathname === '/dashboard' && (
                <>
                  <BarChart3 className="h-4 w-4 text-blue-500" />
                  <Badge variant="outline" className="text-xs">
                    Analytics
                  </Badge>
                </>
              )}
            </div>
          </div>

          {/* Right Section - Quick Actions and User Menu */}
          <div className="flex items-center gap-3">
            {/* Quick Actions */}
            <div className="hidden md:flex items-center gap-2">
              {/* Command Palette */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
                onClick={() => {
                  // TODO: Implement command palette
                  console.log('Open command palette');
                }}
              >
                <Command className="h-3 w-3" />
                <span className="hidden lg:inline">Quick Actions</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            </Button>

            {/* Wallet Connection Status */}
            <Button variant="outline" size="sm" className="gap-2">
              <Wallet className="h-3 w-3" />
              <span className="hidden sm:inline text-xs">Connect</span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatar.png" alt="User" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xs">
                      U
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">User</p>
                    <p className="text-xs text-muted-foreground">
                      user@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2">
                  <User className="h-3 w-3" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <TrendingUp className="h-3 w-3" />
                  Portfolio
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2">
                  <Settings className="h-3 w-3" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2 text-red-600">
                  <LogOut className="h-3 w-3" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}