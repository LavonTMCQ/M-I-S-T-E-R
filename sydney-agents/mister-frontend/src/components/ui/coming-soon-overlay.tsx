/**
 * Coming Soon Overlay Component
 * Shows "Coming Soon" overlay in production to protect users
 */

'use client';

import React from 'react';
import { Card, CardContent } from './card';
import { Badge } from './badge';
import { Clock, Shield, Wrench } from 'lucide-react';

interface ComingSoonOverlayProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  showInDevelopment?: boolean;
}

export function ComingSoonOverlay({ 
  children, 
  title = "Coming Soon",
  description = "This feature is currently in development and will be available soon.",
  showInDevelopment = false 
}: ComingSoonOverlayProps) {
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production' || 
                      process.env.VERCEL_ENV === 'production' ||
                      typeof window !== 'undefined' && window.location.hostname.includes('vercel.app');
  
  // Check if we should show the overlay
  const shouldShowOverlay = isProduction || showInDevelopment;

  if (!shouldShowOverlay) {
    // Development mode - show full functionality
    return <>{children}</>;
  }

  // Production mode - show coming soon overlay
  return (
    <div className="relative">
      {/* Original content (dimmed) */}
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
      
      {/* Coming Soon Overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-lg border-2 border-dashed border-gray-300">
        <Card className="max-w-sm mx-4 shadow-lg">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <Clock className="h-12 w-12 text-blue-500" />
                <Shield className="h-6 w-6 text-green-500 absolute -top-1 -right-1 bg-white rounded-full p-1" />
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600">{description}</p>
            </div>
            
            <div className="flex justify-center space-x-2">
              <Badge variant="outline" className="text-blue-600 border-blue-200">
                <Wrench className="h-3 w-3 mr-1" />
                In Development
              </Badge>
              <Badge variant="outline" className="text-green-600 border-green-200">
                <Shield className="h-3 w-3 mr-1" />
                Safety First
              </Badge>
            </div>
            
            <div className="text-xs text-gray-500 mt-4">
              Full functionality available in development mode
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ComingSoonOverlay;
