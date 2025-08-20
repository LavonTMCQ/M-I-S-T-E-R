'use client';

import React, { useState, useEffect } from 'react';
import { SignalData } from '@/types/tradingview';
import { signalAnalyticsService } from '@/services/signalAnalyticsService';

interface SignalQualityIndicatorProps {
  signal: SignalData | null;
  className?: string;
}

/**
 * Signal Quality Indicator Component
 * Displays real-time quality score for trading signals based on historical performance
 */
export default function SignalQualityIndicator({ 
  signal, 
  className = '' 
}: SignalQualityIndicatorProps) {
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    if (!signal) {
      setQualityScore(0);
      return;
    }

    setIsCalculating(true);
    
    // Calculate quality score
    const score = signalAnalyticsService.calculateSignalQualityScore(signal);
    setQualityScore(score);
    setIsCalculating(false);
  }, [signal]);

  const getQualityLevel = (score: number): { level: string; color: string; description: string } => {
    if (score >= 0.8) {
      return {
        level: 'EXCELLENT',
        color: 'text-green-400 bg-green-900/30 border-green-500',
        description: 'High probability of success based on historical data'
      };
    } else if (score >= 0.65) {
      return {
        level: 'GOOD',
        color: 'text-blue-400 bg-blue-900/30 border-blue-500',
        description: 'Above average performance expected'
      };
    } else if (score >= 0.5) {
      return {
        level: 'AVERAGE',
        color: 'text-yellow-400 bg-yellow-900/30 border-yellow-500',
        description: 'Neutral signal with mixed historical results'
      };
    } else if (score >= 0.35) {
      return {
        level: 'POOR',
        color: 'text-orange-400 bg-orange-900/30 border-orange-500',
        description: 'Below average performance expected'
      };
    } else {
      return {
        level: 'VERY POOR',
        color: 'text-red-400 bg-red-900/30 border-red-500',
        description: 'Low probability of success - consider avoiding'
      };
    }
  };

  const getScoreBarWidth = (score: number): string => {
    return `${Math.max(score * 100, 5)}%`; // Minimum 5% for visibility
  };

  const getScoreBarColor = (score: number): string => {
    if (score >= 0.8) return 'bg-green-500';
    if (score >= 0.65) return 'bg-blue-500';
    if (score >= 0.5) return 'bg-yellow-500';
    if (score >= 0.35) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (!signal) {
    return (
      <div className={`bg-gray-800 rounded-lg border border-gray-600 p-4 ${className}`}>
        <div className="text-center text-gray-500">
          <div className="text-sm font-medium mb-2">Signal Quality</div>
          <div className="text-xs">No active signal</div>
        </div>
      </div>
    );
  }

  const quality = getQualityLevel(qualityScore);

  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-600 p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-white font-semibold text-sm">🎯 Signal Quality</h4>
        {isCalculating && (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        )}
      </div>

      {/* Signal Info */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-xs">Signal Type:</span>
          <span className={`px-2 py-1 rounded text-xs font-semibold ${
            signal.type === 'long' 
              ? 'bg-green-900 text-green-300' 
              : 'bg-red-900 text-red-300'
          }`}>
            {signal.type.toUpperCase()}
          </span>
        </div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-xs">Price:</span>
          <span className="text-white font-mono text-xs">${signal.price.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-xs">Confidence:</span>
          <span className="text-yellow-400 font-mono text-xs">{signal.confidence.toFixed(1)}</span>
        </div>
      </div>

      {/* Quality Score */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-xs">Quality Score:</span>
          <span className="text-white font-mono text-sm font-bold">
            {(qualityScore * 100).toFixed(0)}%
          </span>
        </div>
        
        {/* Score Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${getScoreBarColor(qualityScore)}`}
            style={{ width: getScoreBarWidth(qualityScore) }}
          ></div>
        </div>
        
        {/* Quality Level */}
        <div className={`text-center py-2 px-3 rounded border text-xs font-semibold ${quality.color}`}>
          {quality.level}
        </div>
      </div>

      {/* Description */}
      <div className="text-xs text-gray-400 text-center leading-relaxed">
        {quality.description}
      </div>

      {/* Additional Metrics */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-center">
            <div className="text-gray-400">MACD</div>
            <div className="text-white font-mono">{signal.macdValue.toFixed(4)}</div>
          </div>
          <div className="text-center">
            <div className="text-gray-400">EMA-9</div>
            <div className="text-blue-400 font-mono">${signal.emaValue.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-2">Risk Assessment:</div>
        <div className="space-y-1">
          {qualityScore >= 0.7 && (
            <div className="flex items-center text-xs">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-gray-300">Strong historical performance</span>
            </div>
          )}
          {signal.confidence > 500 && (
            <div className="flex items-center text-xs">
              <span className="text-green-400 mr-2">✓</span>
              <span className="text-gray-300">High confidence signal</span>
            </div>
          )}
          {qualityScore < 0.4 && (
            <div className="flex items-center text-xs">
              <span className="text-red-400 mr-2">⚠</span>
              <span className="text-gray-300">Weak historical performance</span>
            </div>
          )}
          {signal.confidence < 200 && (
            <div className="flex items-center text-xs">
              <span className="text-yellow-400 mr-2">⚠</span>
              <span className="text-gray-300">Low confidence signal</span>
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400 mb-1">Recommendation:</div>
        <div className="text-xs">
          {qualityScore >= 0.7 ? (
            <span className="text-green-400">✅ Consider taking this signal</span>
          ) : qualityScore >= 0.5 ? (
            <span className="text-yellow-400">⚠️ Proceed with caution</span>
          ) : (
            <span className="text-red-400">❌ Consider avoiding this signal</span>
          )}
        </div>
      </div>
    </div>
  );
}
