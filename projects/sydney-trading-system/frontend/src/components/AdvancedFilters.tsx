'use client';

import React, { useState, useEffect } from 'react';
import { SignalFilter } from '@/types/tradingview';

interface AdvancedFiltersProps {
  className?: string;
  onFilterChange: (filter: SignalFilter) => void;
  initialFilter?: SignalFilter;
}

/**
 * Advanced Filters Component
 * Provides comprehensive filtering options for signal analytics
 */
export default function AdvancedFilters({ 
  className = '', 
  onFilterChange,
  initialFilter = {}
}: AdvancedFiltersProps) {
  const [filter, setFilter] = useState<SignalFilter>(initialFilter);
  const [isExpanded, setIsExpanded] = useState(false);

  // Update parent when filter changes
  useEffect(() => {
    onFilterChange(filter);
  }, [filter, onFilterChange]);

  const updateFilter = (updates: Partial<SignalFilter>) => {
    setFilter(prev => ({ ...prev, ...updates }));
  };

  const clearFilter = () => {
    setFilter({});
  };

  const hasActiveFilters = () => {
    return Object.keys(filter).some(key => {
      const value = filter[key as keyof SignalFilter];
      if (key === 'dateRange') return value !== undefined;
      return value !== undefined && value !== 'all';
    });
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filter.type && filter.type !== 'all') count++;
    if (filter.outcome && filter.outcome !== 'all') count++;
    if (filter.minConfidence !== undefined) count++;
    if (filter.maxConfidence !== undefined) count++;
    if (filter.minPnL !== undefined) count++;
    if (filter.maxPnL !== undefined) count++;
    if (filter.dateRange) count++;
    return count;
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const parseInputDate = (dateString: string) => {
    return new Date(dateString + 'T00:00:00');
  };

  return (
    <div className={`bg-gray-900 rounded-lg border border-gray-700 p-4 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-lg font-bold text-white">🔍 Advanced Filters</h3>
          {hasActiveFilters() && (
            <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              {getActiveFilterCount()}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters() && (
            <button
              onClick={clearFilter}
              className="text-gray-400 hover:text-white text-sm transition-colors"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            {isExpanded ? '▼' : '▶'}
          </button>
        </div>
      </div>

      {/* Quick Filters (Always Visible) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Signal Type */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Signal Type</label>
          <select
            value={filter.type || 'all'}
            onChange={(e) => updateFilter({ type: e.target.value as any })}
            className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
          >
            <option value="all">All Types</option>
            <option value="long">Long Only</option>
            <option value="short">Short Only</option>
          </select>
        </div>

        {/* Outcome */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Outcome</label>
          <select
            value={filter.outcome || 'all'}
            onChange={(e) => updateFilter({ outcome: e.target.value as any })}
            className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
          >
            <option value="all">All Outcomes</option>
            <option value="win">Winners</option>
            <option value="loss">Losers</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Quick Date Range */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Time Period</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const now = new Date();
                const days = parseInt(e.target.value);
                updateFilter({
                  dateRange: {
                    start: new Date(now.getTime() - days * 24 * 60 * 60 * 1000),
                    end: now
                  }
                });
              }
            }}
            className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
          >
            <option value="">Select Period</option>
            <option value="1">Last 24 Hours</option>
            <option value="3">Last 3 Days</option>
            <option value="7">Last Week</option>
            <option value="14">Last 2 Weeks</option>
            <option value="30">Last Month</option>
          </select>
        </div>

        {/* Quick Confidence */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Confidence</label>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const [min, max] = e.target.value.split('-').map(Number);
                updateFilter({ 
                  minConfidence: min || undefined, 
                  maxConfidence: max || undefined 
                });
              }
            }}
            className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
          >
            <option value="">All Confidence</option>
            <option value="800-">High (800+)</option>
            <option value="600-800">Medium (600-800)</option>
            <option value="-600">Low (&lt;600)</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters (Expandable) */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-700">
          {/* Custom Date Range */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Custom Date Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filter.dateRange?.start ? formatDateForInput(filter.dateRange.start) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateFilter({
                        dateRange: {
                          start: parseInputDate(e.target.value),
                          end: filter.dateRange?.end || new Date()
                        }
                      });
                    } else {
                      updateFilter({ dateRange: undefined });
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={filter.dateRange?.end ? formatDateForInput(filter.dateRange.end) : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      updateFilter({
                        dateRange: {
                          start: filter.dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                          end: parseInputDate(e.target.value)
                        }
                      });
                    } else {
                      updateFilter({ dateRange: undefined });
                    }
                  }}
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Confidence Range */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Confidence Range</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min Confidence</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="10"
                  value={filter.minConfidence || ''}
                  onChange={(e) => updateFilter({ 
                    minConfidence: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  placeholder="0"
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max Confidence</label>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  step="10"
                  value={filter.maxConfidence || ''}
                  onChange={(e) => updateFilter({ 
                    maxConfidence: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  placeholder="1000"
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* P&L Range */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">P&L Range ($)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Min P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={filter.minPnL || ''}
                  onChange={(e) => updateFilter({ 
                    minPnL: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  placeholder="No minimum"
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Max P&L</label>
                <input
                  type="number"
                  step="0.01"
                  value={filter.maxPnL || ''}
                  onChange={(e) => updateFilter({ 
                    maxPnL: e.target.value ? Number(e.target.value) : undefined 
                  })}
                  placeholder="No maximum"
                  className="w-full bg-gray-800 border border-gray-600 text-white px-2 py-1 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Preset Filters */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Preset Filters</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                onClick={() => updateFilter({ 
                  type: 'all', 
                  outcome: 'win', 
                  minConfidence: 600 
                })}
                className="px-3 py-2 bg-green-700 hover:bg-green-600 text-white rounded text-sm transition-colors"
              >
                High Quality Winners
              </button>
              <button
                onClick={() => updateFilter({ 
                  type: 'all', 
                  outcome: 'loss', 
                  maxConfidence: 400 
                })}
                className="px-3 py-2 bg-red-700 hover:bg-red-600 text-white rounded text-sm transition-colors"
              >
                Low Quality Losers
              </button>
              <button
                onClick={() => updateFilter({ 
                  type: 'long', 
                  outcome: 'all',
                  dateRange: {
                    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    end: new Date()
                  }
                })}
                className="px-3 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm transition-colors"
              >
                Recent Longs
              </button>
              <button
                onClick={() => updateFilter({ 
                  outcome: 'pending' 
                })}
                className="px-3 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded text-sm transition-colors"
              >
                Active Signals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters() && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 mb-2">Active Filters:</div>
          <div className="flex flex-wrap gap-2">
            {filter.type && filter.type !== 'all' && (
              <span className="bg-blue-600 text-white px-2 py-1 rounded text-xs">
                Type: {filter.type.toUpperCase()}
              </span>
            )}
            {filter.outcome && filter.outcome !== 'all' && (
              <span className="bg-green-600 text-white px-2 py-1 rounded text-xs">
                Outcome: {filter.outcome.toUpperCase()}
              </span>
            )}
            {filter.minConfidence !== undefined && (
              <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                Min Confidence: {filter.minConfidence}
              </span>
            )}
            {filter.maxConfidence !== undefined && (
              <span className="bg-yellow-600 text-white px-2 py-1 rounded text-xs">
                Max Confidence: {filter.maxConfidence}
              </span>
            )}
            {filter.dateRange && (
              <span className="bg-purple-600 text-white px-2 py-1 rounded text-xs">
                Date Range: {filter.dateRange.start.toLocaleDateString()} - {filter.dateRange.end.toLocaleDateString()}
              </span>
            )}
            {filter.minPnL !== undefined && (
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                Min P&L: ${filter.minPnL}
              </span>
            )}
            {filter.maxPnL !== undefined && (
              <span className="bg-red-600 text-white px-2 py-1 rounded text-xs">
                Max P&L: ${filter.maxPnL}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
