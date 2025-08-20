'use client';

import { Button } from '@/components/ui/button';
import { 
  TrendingUpIcon, 
  AlertTriangleIcon, 
  NewspaperIcon, 
  BarChart3Icon,
  DollarSignIcon,
  ActivityIcon,
  PieChartIcon
} from 'lucide-react';

interface QuickActionButtonsProps {
  onQuickAction: (question: string) => void;
  isLoading?: boolean;
  isConnected?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  question: string;
  icon: React.ReactNode;
  variant: 'default' | 'destructive' | 'outline' | 'secondary';
  description: string;
}

export function QuickActionButtons({ 
  onQuickAction, 
  isLoading = false, 
  isConnected = true 
}: QuickActionButtonsProps) {
  const quickActions: QuickAction[] = [
    {
      id: 'pnl',
      label: 'P&L Check',
      question: 'Show me my current P&L and position summary',
      icon: <TrendingUpIcon className="h-4 w-4" />,
      variant: 'default',
      description: 'Current portfolio performance'
    },
    {
      id: 'risk',
      label: 'Risk Analysis',
      question: 'Analyze my liquidation risk and margin status for all positions',
      icon: <AlertTriangleIcon className="h-4 w-4" />,
      variant: 'destructive',
      description: 'Liquidation proximity check'
    },
    {
      id: 'briefing',
      label: 'Presidential Briefing',
      question: 'Give me a presidential briefing for today - I need comprehensive analysis for ADA and ETH',
      icon: <NewspaperIcon className="h-4 w-4" />,
      variant: 'outline',
      description: 'Daily market intelligence'
    },
    {
      id: 'market',
      label: 'Market Character',
      question: 'Analyze market character across all my positions with multi-timeframe analysis',
      icon: <BarChart3Icon className="h-4 w-4" />,
      variant: 'secondary',
      description: 'Technical analysis overview'
    },
    {
      id: 'shorts',
      label: 'Short Strategy',
      question: 'Should I add to my shorts? Show me optimal entry points and scaling opportunities',
      icon: <ActivityIcon className="h-4 w-4" />,
      variant: 'outline',
      description: 'Position scaling advice'
    },
    {
      id: 'funding',
      label: 'Fund Injection',
      question: 'Do I need fund injection? Analyze optimal timing and amounts for account stabilization',
      icon: <DollarSignIcon className="h-4 w-4" />,
      variant: 'secondary',
      description: 'Capital management analysis'
    },
    {
      id: 'news',
      label: 'Breaking News',
      question: 'What breaking news is affecting my positions? Any regulatory or market-moving developments?',
      icon: <NewspaperIcon className="h-4 w-4" />,
      variant: 'outline',
      description: 'Real-time news impact'
    },
    {
      id: 'correlation',
      label: 'Portfolio Analysis',
      question: 'Analyze my portfolio correlation and provide recommendations for risk diversification',
      icon: <PieChartIcon className="h-4 w-4" />,
      variant: 'default',
      description: 'Portfolio-wide insights'
    }
  ];

  return (
    <div className="py-3 px-4">
      <div className="flex flex-wrap gap-1.5">
        <span className="text-xs text-muted-foreground mr-2 flex items-center">Quick:</span>
        {quickActions.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs hover:bg-accent transition-colors flex items-center gap-1 border border-border/50"
            onClick={() => onQuickAction(action.question)}
            disabled={!isConnected || isLoading}
            title={action.description}
          >
            <span className="flex-shrink-0 opacity-70">{action.icon}</span>
            <span className="font-normal">{action.label}</span>
          </Button>
        ))}
      </div>

      {!isConnected && (
        <div className="mt-2 text-xs text-red-400">
          Quick actions unavailable - Agent disconnected
        </div>
      )}
    </div>
  );
}