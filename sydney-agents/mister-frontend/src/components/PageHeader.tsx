'use client';

import React from 'react';
import Link from 'next/link';
import { MisterLogo } from '@/components/ui/mister-logo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Home } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({ 
  title, 
  subtitle, 
  showBackButton = false, 
  backHref = '/',
  children,
  className = ''
}: PageHeaderProps) {
  return (
    <div className={`bg-background border-b border-border/50 ${className}`}>
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          {/* Left side: Logo and navigation */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <MisterLogo size="lg" />
              <Badge variant="outline" className="text-xs">
                Beta
              </Badge>
            </Link>
            
            {showBackButton && (
              <div className="flex items-center gap-2">
                <div className="w-px h-6 bg-border" />
                <Link href={backHref}>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Right side: Additional content */}
          {children && (
            <div className="flex items-center gap-4">
              {children}
            </div>
          )}
        </div>

        {/* Page title and subtitle */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            {title}
          </h1>
          {subtitle && (
            <p className="text-lg text-muted-foreground max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
