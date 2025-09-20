'use client';

import React from 'react';
import { SingleADAChart } from '@/components/charts/SingleADAChart';

export function TradingChart() {
  return (
    <div className="w-full h-full relative">
      <SingleADAChart 
        height={580} // Adjusted to fit properly with controls visible
        showHeader={false}
        showControls={true}
        defaultTimeframe="15"
        defaultChartType="1"
      />
    </div>
  );
}
