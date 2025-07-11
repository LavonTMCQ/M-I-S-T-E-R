import React from 'react';

interface MisterLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MisterLogo({ size = 'md', className = '' }: MisterLogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <div className={`font-bold tracking-tight ${sizeClasses[size]} ${className}`}>
      <span 
        className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 bg-clip-text text-transparent"
        style={{
          background: 'linear-gradient(90deg, #3B82F6 0%, #2563EB 50%, #9333EA 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      >
        MISTER
      </span>
    </div>
  );
}
