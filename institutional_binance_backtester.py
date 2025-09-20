import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import warnings
import os
import json
warnings.filterwarnings('ignore')

# Import your Binance strategy class
try:
    from fixed_binance_nike_rocket import NikesMassiveRocketBinance
    print("✅ Successfully imported NikesMassiveRocketBinance")
except ImportError as e:
    print(f"❌ Import error: {e}")
    exit(1)

class InstitutionalBacktester:
    """Institutional-grade backtester with comprehensive analytics"""
    
    def __init__(self, initial_capital=10000):
        self.initial_capital = initial_capital
        self.current_capital = initial_capital
        self.strategy = NikesMassiveRocketBinance(testnet=True)
        self.max_risk_per_trade = 0.02
        self.max_leverage = 10
        self.trading_fee = 0.0004
        self.trades = []
        self.equity_curve = []
        
    def load_data(self, filepath='BINANCE_ADAUSDT_ALL.csv'):
        """Load data with validation"""
        print(f"📂 Loading data from {filepath}...")
        
        df = pd.read_csv(filepath, header=None)
        
        if len(df.columns) == 6:
            df.columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume']
        elif len(df.columns) == 7:
            df.columns = ['timestamp', 'open', 'high', 'low', 'close', 'volume', 'count']
        
        df['datetime'] = pd.to_datetime(df['timestamp'], unit='s')
        df = df.sort_values('datetime').reset_index(drop=True)
        df = df.drop_duplicates(subset=['datetime']).reset_index(drop=True)
        df = df[['datetime', 'open', 'high', 'low', 'close', 'volume']]
        
        print(f"✅ Loaded {len(df):,} rows of ADA/USDT data")
        print(f"📅 Date range: {df['datetime'].min()} to {df['datetime'].max()}")
        
        return df
    
    def prepare_data(self, df):
        """Prepare multi-timeframe data"""
        print("🔄 Preparing multi-timeframe data...")
        daily_df, four_hour_df, hourly_df = self.strategy.prepare_multi_timeframe_data(df)
        combined_df = self.strategy.combine_timeframes(daily_df, four_hour_df, hourly_df)
        print(f"✅ Prepared {len(combined_df):,} rows with indicators")
        return combined_df
    
    def generate_signal(self, row):
        """Generate trading signal"""
        try:
            if pd.isna(row.get('combined_trend', np.nan)) or pd.isna(row.get('timeframe_alignment', np.nan)):
                return None
            
            combined_trend = row['combined_trend']
            alignment = row['timeframe_alignment']
            vol_percentile = row.get('vol_percentile', 50)
            
            abs_trend = abs(combined_trend)
            trend_direction = np.sign(combined_trend)
            
            confidence = abs_trend
            score = self.strategy.confidence_mode_selector(confidence, vol_percentile)
            mode = 'aggressive' if score >= 0.5 else 'conservative'
            params = self.strategy.params[mode]
            
            signal = 'NEUTRAL'
            if (abs_trend >= params['trend_strength_threshold'] and
                abs_trend <= params['max_trend_strength_threshold'] and
                params['min_volatility_percentile'] <= vol_percentile <= 90 and
                alignment > 0.3):
                signal = 'BUY' if trend_direction > 0 else 'SELL'
            
            entry_price = row['close']
            atr = row.get('atr14', entry_price * 0.02)
            
            if signal == 'BUY':
                stop_loss = entry_price - atr * 1.5
                take_profit = entry_price + atr * params['profit_target_multiplier']
            elif signal == 'SELL':
                stop_loss = entry_price + atr * 1.5
                take_profit = entry_price - atr * params['profit_target_multiplier']
            else:
                stop_loss = take_profit = entry_price
            
            return {
                'signal': signal,
                'confidence': confidence,
                'mode': mode,
                'entry_price': entry_price,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'atr': atr,
                'risk_per_trade': params['risk_per_trade']
            }
        except:
            return None
    
    def simulate_trade(self, signal_data, current_price, current_time):
        """Simulate trade execution"""
        if not signal_data or signal_data['signal'] not in ['BUY', 'SELL']:
            return None
        
        risk_amount = self.current_capital * signal_data['risk_per_trade']
        entry_price = signal_data['entry_price']
        stop_loss = signal_data['stop_loss']
        
        risk_per_unit = abs(entry_price - stop_loss)
        if risk_per_unit <= 0:
            return None
        
        position_size = risk_amount / risk_per_unit
        position_value = position_size * entry_price
        leverage = min(position_value / self.current_capital, self.max_leverage)
        if leverage < 1:
            leverage = 1
        
        entry_fee = position_value * self.trading_fee
        
        return {
            'entry_time': current_time,
            'side': signal_data['signal'],
            'entry_price': entry_price,
            'position_size': position_size,
            'leverage': leverage,
            'stop_loss': stop_loss,
            'take_profit': signal_data['take_profit'],
            'entry_fee': entry_fee,
            'mode': signal_data['mode'],
            'confidence': signal_data['confidence']
        }
    
    def run_backtest(self, data_file='BINANCE_ADAUSDT_ALL.csv', start_date=None, end_date=None):
        """Run complete backtest"""
        print("🏛️  INSTITUTIONAL-GRADE BINANCE BACKTEST")
        print("=" * 60)
        
        df = self.load_data(data_file)
        
        if start_date:
            df = df[df['datetime'] >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df['datetime'] <= pd.to_datetime(end_date)]
        
        print(f"📅 Testing period: {df['datetime'].min()} to {df['datetime'].max()}")
        print(f"💰 Initial capital: ${self.initial_capital:,.2f}")
        print(f"📊 Data points: {len(df):,}")
        
        prepared_df = self.prepare_data(df)
        current_position = None
        trade_count = 0
        
        print("🔄 Running simulation...")
        
        for i, (idx, row) in enumerate(prepared_df.iterrows()):
            if i < 250:
                continue
            
            current_time = row['datetime']
            current_price = row['close']
            
            if i % 5000 == 0:
                progress = (i / len(prepared_df)) * 100
                print(f"📊 Progress: {progress:.1f}% | Trades: {trade_count} | Capital: ${self.current_capital:,.2f}")
            
            self.equity_curve.append({
                'datetime': current_time,
                'equity': self.current_capital,
                'price': current_price
            })
            
            # Handle existing position
            if current_position:
                exit_triggered = False
                exit_reason = ""
                exit_price = current_price
                
                if current_position['side'] == 'BUY':
                    if current_price <= current_position['stop_loss']:
                        exit_triggered, exit_reason = True, "Stop Loss"
                        exit_price = current_position['stop_loss']
                    elif current_price >= current_position['take_profit']:
                        exit_triggered, exit_reason = True, "Take Profit"
                        exit_price = current_position['take_profit']
                else:
                    if current_price >= current_position['stop_loss']:
                        exit_triggered, exit_reason = True, "Stop Loss"
                        exit_price = current_position['stop_loss']
                    elif current_price <= current_position['take_profit']:
                        exit_triggered, exit_reason = True, "Take Profit"
                        exit_price = current_position['take_profit']
                
                if exit_triggered:
                    if current_position['side'] == 'BUY':
                        price_change = (exit_price - current_position['entry_price']) / current_position['entry_price']
                    else:
                        price_change = (current_position['entry_price'] - exit_price) / current_position['entry_price']
                    
                    leveraged_return = price_change * current_position['leverage']
                    pnl_dollar = self.current_capital * leveraged_return
                    
                    exit_fee = current_position['position_size'] * exit_price * self.trading_fee
                    total_fees = current_position['entry_fee'] + exit_fee
                    pnl_dollar -= total_fees
                    
                    self.current_capital += pnl_dollar
                    
                    trade = current_position.copy()
                    trade.update({
                        'exit_time': current_time,
                        'exit_price': exit_price,
                        'exit_reason': exit_reason,
                        'pnl_dollar': pnl_dollar,
                        'pnl_percent': leveraged_return * 100,
                        'total_fees': total_fees,
                        'capital_after': self.current_capital
                    })
                    
                    self.trades.append(trade)
                    current_position = None
                    trade_count += 1
                    
                    if trade_count <= 10 or trade_count % 25 == 0:
                        print(f"💼 Trade #{trade_count}: {exit_reason} | P&L: ${pnl_dollar:.2f}")
            
            # Check for new entries
            if current_position is None:
                signal_data = self.generate_signal(row)
                if signal_data and signal_data['signal'] in ['BUY', 'SELL']:
                    position = self.simulate_trade(signal_data, current_price, current_time)
                    if position:
                        current_position = position
        
        # Close final position
        if current_position:
            final_price = prepared_df.iloc[-1]['close']
            if current_position['side'] == 'BUY':
                pnl_pct = (final_price - current_position['entry_price']) / current_position['entry_price']
            else:
                pnl_pct = (current_position['entry_price'] - final_price) / current_position['entry_price']
            
            leveraged_return = pnl_pct * current_position['leverage']
            pnl_dollar = self.current_capital * leveraged_return
            self.current_capital += pnl_dollar
            
            final_trade = current_position.copy()
            final_trade.update({
                'exit_time': prepared_df.iloc[-1]['datetime'],
                'exit_price': final_price,
                'exit_reason': 'End of Data',
                'pnl_dollar': pnl_dollar,
                'pnl_percent': leveraged_return * 100,
                'capital_after': self.current_capital
            })
            self.trades.append(final_trade)
        
        print(f"\n✅ Backtest completed! Total trades: {len(self.trades):,}")
        return self.analyze_results()
    
    def calculate_institutional_metrics(self, trades_df, equity_df):
        """Calculate institutional-grade metrics (simplified)"""
        
        # Basic performance
        total_return = (self.current_capital / self.initial_capital - 1) * 100
        
        # Daily returns for risk analysis
        equity_df_copy = equity_df.copy()
        equity_df_copy['date'] = pd.to_datetime(equity_df_copy['datetime']).dt.date
        daily_equity = equity_df_copy.groupby('date')['equity'].last().reset_index()
        daily_equity['daily_return'] = daily_equity['equity'].pct_change()
        daily_returns = daily_equity['daily_return'].dropna()
        
        # Time period analysis
        days_total = len(daily_equity)
        years_total = days_total / 252 if days_total > 0 else 1
        
        # Annualized return
        if years_total > 0:
            annualized_return = ((self.current_capital / self.initial_capital) ** (1 / years_total) - 1) * 100
        else:
            annualized_return = total_return
        
        # Volatility (annualized)
        if len(daily_returns) > 1:
            daily_vol = daily_returns.std() * np.sqrt(252) * 100
        else:
            daily_vol = 0
        
        # Sharpe Ratio
        risk_free_rate = 4.5  # 4.5% annual risk-free rate
        if daily_vol > 0:
            sharpe_ratio = (annualized_return - risk_free_rate) / daily_vol
        else:
            sharpe_ratio = 0
        
        # Sortino Ratio (downside deviation)
        downside_returns = daily_returns[daily_returns < 0]
        if len(downside_returns) > 0:
            downside_deviation = downside_returns.std() * np.sqrt(252) * 100
            sortino_ratio = (annualized_return - risk_free_rate) / downside_deviation if downside_deviation > 0 else 0
        else:
            sortino_ratio = sharpe_ratio
        
        # Maximum Drawdown
        equity_df_copy['peak'] = equity_df_copy['equity'].expanding().max()
        equity_df_copy['drawdown'] = (equity_df_copy['equity'] - equity_df_copy['peak']) / equity_df_copy['peak']
        max_drawdown = abs(equity_df_copy['drawdown'].min()) * 100
        
        # Calmar Ratio
        calmar_ratio = annualized_return / max_drawdown if max_drawdown > 0 else 0
        
        # Trade-level metrics
        if len(trades_df) > 0:
            win_rate = (len(trades_df[trades_df['pnl_dollar'] > 0]) / len(trades_df)) * 100
            
            gross_profit = trades_df[trades_df['pnl_dollar'] > 0]['pnl_dollar'].sum()
            gross_loss = abs(trades_df[trades_df['pnl_dollar'] < 0]['pnl_dollar'].sum())
            profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
            
            avg_win = trades_df[trades_df['pnl_dollar'] > 0]['pnl_dollar'].mean() if len(trades_df[trades_df['pnl_dollar'] > 0]) > 0 else 0
            avg_loss = trades_df[trades_df['pnl_dollar'] < 0]['pnl_dollar'].mean() if len(trades_df[trades_df['pnl_dollar'] < 0]) > 0 else 0
            
            # Consecutive wins/losses
            trades_df_copy = trades_df.copy()
            trades_df_copy['win'] = (trades_df_copy['pnl_dollar'] > 0).astype(int)
            trades_df_copy['streak_id'] = (trades_df_copy['win'] != trades_df_copy['win'].shift()).cumsum()
            streak_counts = trades_df_copy.groupby(['streak_id', 'win']).size()
            
            max_consecutive_wins = streak_counts[streak_counts.index.get_level_values(1) == 1].max() if len(streak_counts[streak_counts.index.get_level_values(1) == 1]) > 0 else 0
            max_consecutive_losses = streak_counts[streak_counts.index.get_level_values(1) == 0].max() if len(streak_counts[streak_counts.index.get_level_values(1) == 0]) > 0 else 0
            
            # Value at Risk (95th percentile)
            var_95 = np.percentile(daily_returns, 5) * self.current_capital if len(daily_returns) > 0 else 0
            
            # Expected Shortfall (mean of worst 5%)
            worst_5_percent = daily_returns[daily_returns <= np.percentile(daily_returns, 5)]
            expected_shortfall = worst_5_percent.mean() * self.current_capital if len(worst_5_percent) > 0 else 0
            
        else:
            win_rate = profit_factor = avg_win = avg_loss = 0
            max_consecutive_wins = max_consecutive_losses = 0
            var_95 = expected_shortfall = 0
        
        return {
            'total_return': total_return,
            'annualized_return': annualized_return,
            'volatility': daily_vol,
            'sharpe_ratio': sharpe_ratio,
            'sortino_ratio': sortino_ratio,
            'calmar_ratio': calmar_ratio,
            'max_drawdown': max_drawdown,
            'win_rate': win_rate,
            'profit_factor': profit_factor,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'max_consecutive_wins': max_consecutive_wins,
            'max_consecutive_losses': max_consecutive_losses,
            'var_95': var_95,
            'expected_shortfall': expected_shortfall,
            'total_trades': len(trades_df),
            'years_tested': years_total
        }
    
    def analyze_results(self):
        """Comprehensive institutional analysis"""
        if not self.trades:
            print("❌ No trades executed")
            return None
        
        trades_df = pd.DataFrame(self.trades)
        equity_df = pd.DataFrame(self.equity_curve)
        
        # Calculate all metrics
        metrics = self.calculate_institutional_metrics(trades_df, equity_df)
        
        # Buy & Hold comparison
        buy_hold_return = ((equity_df['price'].iloc[-1] / equity_df['price'].iloc[0]) - 1) * 100
        alpha = metrics['total_return'] - buy_hold_return
        
        # Risk Rating
        if metrics['sharpe_ratio'] > 2.0:
            risk_rating = "EXCELLENT"
        elif metrics['sharpe_ratio'] > 1.5:
            risk_rating = "VERY GOOD"
        elif metrics['sharpe_ratio'] > 1.0:
            risk_rating = "GOOD"
        elif metrics['sharpe_ratio'] > 0.5:
            risk_rating = "FAIR"
        else:
            risk_rating = "POOR"
        
        # Print institutional results
        print("\n" + "="*80)
        print("🏛️  INSTITUTIONAL INVESTMENT PERFORMANCE REPORT")
        print("="*80)
        
        print(f"\n📊 EXECUTIVE SUMMARY")
        print("-" * 50)
        print(f"💰 Initial Capital: ${self.initial_capital:,.2f}")
        print(f"💰 Final Capital: ${self.current_capital:,.2f}")
        print(f"📈 Total Return: {metrics['total_return']:.2f}%")
        print(f"📈 Annualized Return: {metrics['annualized_return']:.2f}%")
        print(f"⏱️  Testing Period: {metrics['years_tested']:.2f} years")
        print(f"📊 Total Trades: {metrics['total_trades']:,}")
        
        print(f"\n🎯 RISK-ADJUSTED PERFORMANCE")
        print("-" * 50)
        print(f"🏆 Sharpe Ratio: {metrics['sharpe_ratio']:.3f}")
        print(f"🏆 Sortino Ratio: {metrics['sortino_ratio']:.3f}")
        print(f"🏆 Calmar Ratio: {metrics['calmar_ratio']:.3f}")
        print(f"📊 Annualized Volatility: {metrics['volatility']:.2f}%")
        print(f"📉 Maximum Drawdown: {metrics['max_drawdown']:.2f}%")
        
        print(f"\n⚠️  RISK MEASURES")
        print("-" * 50)
        print(f"📉 Value at Risk (95%): ${metrics['var_95']:,.2f}")
        print(f"💀 Expected Shortfall (95%): ${metrics['expected_shortfall']:,.2f}")
        print(f"🔄 Max Consecutive Wins: {int(metrics['max_consecutive_wins'])}")
        print(f"🔄 Max Consecutive Losses: {int(metrics['max_consecutive_losses'])}")
        
        print(f"\n💼 TRADE PERFORMANCE")
        print("-" * 50)
        print(f"✅ Win Rate: {metrics['win_rate']:.1f}%")
        print(f"⚡ Profit Factor: {metrics['profit_factor']:.3f}")
        print(f"💚 Average Win: ${metrics['avg_win']:,.2f}")
        print(f"🔴 Average Loss: ${metrics['avg_loss']:,.2f}")
        
        print(f"\n📈 BENCHMARK COMPARISON")
        print("-" * 50)
        print(f"📊 Buy & Hold ADA Return: {buy_hold_return:.2f}%")
        print(f"🚀 Strategy Return: {metrics['total_return']:.2f}%")
        print(f"✨ Alpha Generated: {alpha:.2f}%")
        if buy_hold_return > 0:
            print(f"🎯 Outperformance Factor: {metrics['total_return'] / buy_hold_return:.2f}x")
        
        print(f"\n🏛️  INSTITUTIONAL ASSESSMENT")
        print("-" * 50)
        print(f"🏆 Overall Risk Rating: {risk_rating}")
        print(f"📊 Strategy Classification: {'High-Frequency' if metrics['total_trades'] > 1000 else 'Medium-Frequency'} Trend Following")
        print(f"💹 Volatility Classification: {'High' if metrics['volatility'] > 50 else 'Medium' if metrics['volatility'] > 25 else 'Low'} Volatility")
        
        # Institutional suitability
        print(f"\n💼 SUITABILITY ASSESSMENT")
        print("-" * 50)
        if metrics['sharpe_ratio'] > 1.0 and metrics['max_drawdown'] < 50:
            print("✅ SUITABLE for Institutional Investors")
        else:
            print("⚠️  HIGH RISK - Requires sophisticated risk management")
        
        if metrics['max_drawdown'] < 30:
            print("✅ SUITABLE for High Net Worth individuals")
        else:
            print("⚠️  HIGH VOLATILITY - Advanced investors only")
        
        # Mode analysis
        if 'mode' in trades_df.columns:
            print(f"\n🎛️  STRATEGY MODE ANALYSIS")
            print("-" * 50)
            mode_stats = trades_df.groupby('mode').agg({
                'pnl_dollar': ['count', 'sum', 'mean']
            }).round(2)
            
            for mode in mode_stats.index:
                count = int(mode_stats.loc[mode, ('pnl_dollar', 'count')])
                total = mode_stats.loc[mode, ('pnl_dollar', 'sum')]
                avg = mode_stats.loc[mode, ('pnl_dollar', 'mean')]
                pct_of_trades = (count / len(trades_df)) * 100
                
                print(f"{mode.upper()} MODE:")
                print(f"  📊 Trades: {count:,} ({pct_of_trades:.1f}% of total)")
                print(f"  💰 Total P&L: ${total:,.2f}")
                print(f"  💰 Average P&L: ${avg:,.2f}")
                print()
        
        return {
            'success': True,
            'trades_df': trades_df,
            'equity_df': equity_df,
            'metrics': metrics,
            'alpha': alpha,
            'risk_rating': risk_rating,
            'buy_hold_return': buy_hold_return
        }
    
    def create_institutional_plots(self, results):
        """Create institutional-grade visualizations"""
        if not results or not results['success']:
            return
        
        trades_df = results['trades_df']
        equity_df = results['equity_df']
        
        fig, axes = plt.subplots(3, 3, figsize=(20, 15))
        binance_yellow = '#F0B90B'
        
        # 1. Equity Curve (Log Scale)
        equity_df['datetime'] = pd.to_datetime(equity_df['datetime'])
        axes[0,0].plot(equity_df['datetime'], equity_df['equity'], color=binance_yellow, linewidth=2)
        axes[0,0].axhline(y=self.initial_capital, color='gray', linestyle='--', alpha=0.7)
        axes[0,0].set_title('Portfolio Equity Curve', fontweight='bold')
        axes[0,0].set_ylabel('Capital ($)')
        axes[0,0].set_yscale('log')
        axes[0,0].grid(True, alpha=0.3)
        
        # 2. Strategy vs Buy & Hold
        portfolio_norm = (equity_df['equity'] / equity_df['equity'].iloc[0]) * 100
        price_norm = (equity_df['price'] / equity_df['price'].iloc[0]) * 100
        
        axes[0,1].plot(equity_df['datetime'], portfolio_norm, color=binance_yellow, linewidth=2, label='Strategy')
        axes[0,1].plot(equity_df['datetime'], price_norm, color='orange', linewidth=2, label='Buy & Hold')
        axes[0,1].set_title('Strategy vs Buy & Hold Performance', fontweight='bold')
        axes[0,1].set_ylabel('Normalized Return (%)')
        axes[0,1].set_yscale('log')
        axes[0,1].legend()
        axes[0,1].grid(True, alpha=0.3)
        
        # 3. Drawdown Analysis
        equity_df['peak'] = equity_df['equity'].expanding().max()
        equity_df['drawdown'] = (equity_df['equity'] - equity_df['peak']) / equity_df['peak'] * 100
        axes[0,2].fill_between(equity_df['datetime'], equity_df['drawdown'], 0, alpha=0.7, color='red')
        axes[0,2].set_title('Drawdown Analysis', fontweight='bold')
        axes[0,2].set_ylabel('Drawdown (%)')
        axes[0,2].grid(True, alpha=0.3)
        
        # 4. Return Distribution
        axes[1,0].hist(trades_df['pnl_percent'], bins=50, alpha=0.7, color=binance_yellow, edgecolor='black')
        axes[1,0].axvline(x=0, color='red', linestyle='--', alpha=0.7)
        axes[1,0].axvline(x=trades_df['pnl_percent'].mean(), color='blue', linestyle='-', alpha=0.7, label='Mean')
        axes[1,0].set_title('Trade Return Distribution', fontweight='bold')
        axes[1,0].set_xlabel('Return (%)')
        axes[1,0].legend()
        axes[1,0].grid(True, alpha=0.3)
        
        # 5. Cumulative P&L
        trades_df['cumulative_pnl'] = trades_df['pnl_dollar'].cumsum()
        axes[1,1].plot(trades_df['cumulative_pnl'], color=binance_yellow, linewidth=2)
        axes[1,1].set_title('Cumulative P&L', fontweight='bold')
        axes[1,1].set_ylabel('Cumulative P&L ($)')
        axes[1,1].grid(True, alpha=0.3)
        
        # 6. Rolling Win Rate
        if len(trades_df) > 50:
            trades_df['win'] = (trades_df['pnl_dollar'] > 0).astype(int)
            rolling_winrate = trades_df['win'].rolling(50).mean() * 100
            axes[1,2].plot(range(len(rolling_winrate)), rolling_winrate, color='green', linewidth=2)
            axes[1,2].axhline(y=50, color='gray', linestyle='--', alpha=0.7, label='50% Win Rate')
            axes[1,2].set_title('Rolling 50-Trade Win Rate', fontweight='bold')
            axes[1,2].set_ylabel('Win Rate (%)')
            axes[1,2].legend()
            axes[1,2].grid(True, alpha=0.3)
        
        # 7. Monthly Performance
        trades_df['month'] = pd.to_datetime(trades_df['entry_time']).dt.to_period('M')
        monthly_pnl = trades_df.groupby('month')['pnl_dollar'].sum()
        colors = [binance_yellow if x > 0 else 'red' for x in monthly_pnl.values]
        axes[2,0].bar(range(len(monthly_pnl)), monthly_pnl.values, color=colors, alpha=0.7)
        axes[2,0].set_title('Monthly P&L', fontweight='bold')
        axes[2,0].set_ylabel('P&L ($)')
        axes[2,0].grid(True, alpha=0.3)
        
        # 8. Mode Performance
        if 'mode' in trades_df.columns:
            mode_performance = trades_df.groupby('mode')['pnl_dollar'].sum()
            colors = [binance_yellow if x > 0 else 'red' for x in mode_performance.values]
            axes[2,1].bar(mode_performance.index, mode_performance.values, color=colors, alpha=0.7)
            axes[2,1].set_title('Performance by Strategy Mode', fontweight='bold')
            axes[2,1].set_ylabel('Total P&L ($)')
            axes[2,1].grid(True, alpha=0.3)
        
        # 9. Risk-Return Scatter (Monthly)
        if len(monthly_pnl) > 12:
            monthly_returns = (monthly_pnl / self.initial_capital) * 100
            monthly_vol = trades_df.groupby('month')['pnl_percent'].std()
            
            scatter = axes[2,2].scatter(monthly_vol, monthly_returns, c=monthly_returns, 
                                      cmap='RdYlGn', alpha=0.7, s=50)
            axes[2,2].set_xlabel('Monthly Volatility (%)')
            axes[2,2].set_ylabel('Monthly Return (%)')
            axes[2,2].set_title('Risk vs Return Profile', fontweight='bold')
            axes[2,2].grid(True, alpha=0.3)
            plt.colorbar(scatter, ax=axes[2,2], label='Return (%)')
        
        plt.tight_layout()
        plt.suptitle('Nike\'s Massive Rocket - Institutional Analysis Dashboard', 
                     y=0.98, fontsize=16, fontweight='bold')
        plt.show()
    
    def export_institutional_results(self, results):
        """Export institutional-grade results"""
        if not results or not results['success']:
            return
        
        # Create institutional reports folder
        os.makedirs("institutional_reports", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Export enhanced trades data
        trades_file = f"institutional_reports/institutional_trades_{timestamp}.csv"
        equity_file = f"institutional_reports/institutional_equity_{timestamp}.csv"
        metrics_file = f"institutional_reports/institutional_metrics_{timestamp}.json"
        report_file = f"institutional_reports/institutional_report_{timestamp}.txt"
        
        # Export data
        results['trades_df'].to_csv(trades_file, index=False)
        results['equity_df'].to_csv(equity_file, index=False)
        
        # Export metrics as JSON
        with open(metrics_file, 'w') as f:
            json.dump(results['metrics'], f, indent=2, default=str)
        
        # Generate detailed text report
        report_content = f"""
INSTITUTIONAL INVESTMENT STRATEGY PERFORMANCE REPORT
{'='*80}

STRATEGY: Nike's Massive Rocket Algorithm
EXCHANGE: Binance Futures  
ASSET: ADA/USDT Perpetual Futures
TESTING PERIOD: {results['trades_df']['entry_time'].min()} to {results['trades_df']['exit_time'].max()}
REPORT GENERATED: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

{'='*80}
EXECUTIVE SUMMARY
{'='*80}

Total Return: {results['metrics']['total_return']:.2f}%
Annualized Return: {results['metrics']['annualized_return']:.2f}%
Testing Period: {results['metrics']['years_tested']:.2f} years
Total Trades: {results['metrics']['total_trades']:,}
Win Rate: {results['metrics']['win_rate']:.1f}%

RISK-ADJUSTED PERFORMANCE:
- Sharpe Ratio: {results['metrics']['sharpe_ratio']:.3f} ({results['risk_rating']} rating)
- Sortino Ratio: {results['metrics']['sortino_ratio']:.3f}
- Calmar Ratio: {results['metrics']['calmar_ratio']:.3f}
- Maximum Drawdown: {results['metrics']['max_drawdown']:.2f}%

BENCHMARK COMPARISON:
- Buy & Hold Return: {results['buy_hold_return']:.2f}%
- Alpha Generated: {results['alpha']:.2f}%
- Strategy Classification: {'High-Frequency' if results['metrics']['total_trades'] > 1000 else 'Medium-Frequency'} Trend Following

RISK ASSESSMENT:
- Overall Rating: {results['risk_rating']}
- Value at Risk (95%): ${results['metrics']['var_95']:,.2f}
- Expected Shortfall: ${results['metrics']['expected_shortfall']:,.2f}
- Volatility Level: {'High' if results['metrics']['volatility'] > 50 else 'Medium' if results['metrics']['volatility'] > 25 else 'Low'}

INSTITUTIONAL SUITABILITY:
{'SUITABLE for institutional investors' if results['metrics']['sharpe_ratio'] > 1.0 and results['metrics']['max_drawdown'] < 50 else 'HIGH RISK - Requires sophisticated risk management'}

{'='*80}
DISCLAIMER
{'='*80}

This analysis is based on historical data and does not guarantee future performance.
Past performance is not indicative of future results. Cryptocurrency trading involves
substantial risk of loss. This report is for informational purposes only.

Report generated by Nike's Massive Rocket Institutional Backtesting Engine
{'='*80}
"""
        
        with open(report_file, 'w') as f:
            f.write(report_content)
        
        print(f"\n📋 INSTITUTIONAL REPORTS GENERATED:")
        print(f"   📊 Enhanced Trades: {trades_file}")
        print(f"   📈 Equity Curve: {equity_file}")
        print(f"   🏛️  Metrics JSON: {metrics_file}")
        print(f"   📄 Full Report: {report_file}")


# Execution functions
def run_institutional_backtest(data_file='BINANCE_ADAUSDT_ALL.csv', initial_capital=10000, 
                              start_date=None, end_date=None):
    """Run institutional-grade backtest"""
    backtester = InstitutionalBacktester(initial_capital=initial_capital)
    results = backtester.run_backtest(data_file, start_date, end_date)
    
    if results and results['success']:
        backtester.create_institutional_plots(results)
        backtester.export_institutional_results(results)
        return results, backtester
    
    return None, None

def institutional_full_test():
    """Full institutional test"""
    print("🏛️  Running INSTITUTIONAL FULL backtest...")
    return run_institutional_backtest()

# Main execution
if __name__ == "__main__":
    print("🏛️  NIKE'S MASSIVE ROCKET - INSTITUTIONAL BACKTESTING SUITE")
    print("=" * 80)
    print("Professional-grade analytics for institutional evaluation")
    print("=" * 80)
    
    print("\nOptions:")
    print("1. Quick institutional test (last 6 months)")
    print("2. Full institutional backtest (all data)")
    print("3. Custom institutional analysis")
    print("4. Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        months = int(input("Months back (default 6): ") or "6")
        end_date = datetime.now()
        start_date = end_date - timedelta(days=months * 30)
        
        print(f"🏛️  Running institutional test - Last {months} months...")
        results, backtester = run_institutional_backtest(
            start_date=start_date.strftime('%Y-%m-%d')
        )
        
    elif choice == "2":
        results, backtester = institutional_full_test()
        
    elif choice == "3":
        capital = float(input("Initial capital (default 10000): ") or "10000")
        start = input("Start date (YYYY-MM-DD, or Enter): ").strip() or None
        end = input("End date (YYYY-MM-DD, or Enter): ").strip() or None
        
        results, backtester = run_institutional_backtest(
            initial_capital=capital,
            start_date=start,
            end_date=end
        )
        
    elif choice == "4":
        print("👋 Goodbye!")
    else:
        print("Invalid choice. Running full institutional test...")
        results, backtester = institutional_full_test()