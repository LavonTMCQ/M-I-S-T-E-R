'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  Home,
  LayoutDashboard,
  TrendingUp,
  Vault,
  MessageSquare,
  Settings,
  ChartBar,
} from 'lucide-react';

interface DockItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const dockItems: DockItem[] = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Trading', href: '/trading', icon: TrendingUp, badge: 'Live' },
  { name: 'Agent Vault', href: '/agent-vault-v2', icon: Vault },
  { name: 'Chat', href: '/chat', icon: MessageSquare },
];

export function FloatingDock() {
  const pathname = usePathname();
  const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
        }}
        className="flex items-center gap-1 p-2 bg-background/80 backdrop-blur-xl border border-border/50 rounded-full shadow-2xl"
      >
        {dockItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="relative"
            >
              <motion.div
                whileHover={{ scale: 1.2, y: -5 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                
                {/* Badge */}
                {item.badge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-500 text-white rounded-full"
                  >
                    {item.badge}
                  </motion.span>
                )}
                
                {/* Tooltip */}
                <AnimatePresence>
                  {hoveredIndex === index && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute bottom-full mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs font-medium rounded-md shadow-md border border-border whitespace-nowrap"
                    >
                      {item.name}
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-r border-b border-border rotate-45" />
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </motion.div>
    </div>
  );
}