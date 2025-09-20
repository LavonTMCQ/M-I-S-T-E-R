import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional
import ccxt
import time
import os
from datetime import datetime, timedelta

def setup_logging():
    """Setup comprehensive logging for Phemex trading bot"""
    if not os.path.exists('logs'):
        os.makedirs('logs')
    
    log_filename = f"logs/phemex_bot_{datetime.now().strftime('%Y%m%d')}.log"
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_filename),
            logging.StreamHandler()
        ]
    )
    
    trade_logger = logging.getLogger('TRADE')
    signal_logger = logging.getLogger('SIGNAL')
    error_logger = logging.getLogger('ERROR')
    
    return trade_logger, signal_logger, error_logger

trade_logger, signal_logger, error_logger = setup_logging()
logger = logging.getLogger('MAIN')

class NikesMassiveRocketPhemex:
    """
    Nike's Massive Rocket - Phemex Perpetual Futures Implementation
    Exact copy of Binance logic adapted for Phemex
    
    SECURITY NOTICE: 
    - NEVER put API keys directly in code
    - Use environment variables: PHEMEX_API_KEY and PHEMEX_SECRET
    - Set these in Linux: export PHEMEX_API_KEY=your_key_here
    """

    def __init__(self, api_key: str = None, api_secret: str = None, testnet: bool = False):
        # Exact same strategy parameters as Binance version
        self.params = {
            'aggressive': {
                'trend_strength_threshold': 0.2,
                'max_trend_strength_threshold': 0.9,
                'min_volatility_percentile': 15,
                'profit_target_multiplier': 3.5,
                'risk_per_trade': 0.04,
            },
            'conservative': {
                'trend_strength_threshold': 0.2,
                'max_trend_strength_threshold': 1,
                'min_volatility_percentile': 15,
                'profit_target_multiplier': 2.5,
                'risk_per_trade': 0.02,
            },
        }
        
        self.timeframe_weights = {
            'daily': 0.5,
            'medium': 0.3,
            'lower': 0.2
        }
        
        self.timeframes = {
            'daily': '1d',    # Phemex timeframe format
            'medium': '4h',   
            'lower': '1h'     
        }
        
        # Phemex specific parameters
        self.min_leverage = 1
        self.max_leverage = 100  # Phemex allows up to 100x
        
        # Initialize Phemex exchange
        self.exchange = self._initialize_phemex(api_key, api_secret, testnet)

    def _initialize_phemex(self, api_key: str, api_secret: str, testnet: bool) -> ccxt.phemex:
        """Initialize Phemex futures connection"""
        
        # Get credentials from environment variables (SECURE!)
        if not api_key:
            api_key = os.getenv('PHEMEX_API_KEY')
        if not api_secret:
            api_secret = os.getenv('PHEMEX_SECRET')
        
        if not api_key or not api_secret:
            raise ValueError("API credentials not found! Set PHEMEX_API_KEY and PHEMEX_SECRET environment variables")
        
        exchange_config = {
            'apiKey': api_key,
            'secret': api_secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'swap',  # Perpetual futures
            }
        }
        
        if testnet:
            exchange_config['urls'] = {
                'api': {
                    'public': 'https://testnet-api.phemex.com',
                    'private': 'https://testnet-api.phemex.com',
                }
            }
        
        return ccxt.phemex(exchange_config)

    def get_current_equity(self, symbol: str = 'USDT') -> float:
        """Get current futures account equity from Phemex"""
        try:
            balance = self.exchange.fetch_balance()
            
            # For Phemex futures, get USDT balance
            if 'USDT' in balance['total']:
                return float(balance['total']['USDT'])
            else:
                logger.warning("USDT balance not found, returning 0")
                return 0.0
                
        except Exception as e:
            logger.error(f"Error fetching account equity: {e}")
            raise

    def fetch_ohlcv_data(self, symbol: str, timeframe: str, limit: int = 500) -> pd.DataFrame:
        """Fetch OHLCV data from Phemex futures"""
        try:
            ohlcv = self.exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
            
            df = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df['datetime'] = pd.to_datetime(df['timestamp'], unit='ms')
            df = df.sort_values('datetime')
            
            return df
            
        except Exception as e:
            logger.error(f"Error fetching OHLCV data: {e}")
            raise

    def place_order_phemex(self, symbol: str, signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Place bracket order on Phemex futures based on signal
        
        Parameters:
        - symbol: Trading pair (e.g., 'ADA/USDT:USDT')
        - signal: Signal dictionary from generate_signals_live
        """
        try:
            if signal['signal'] not in ['BUY', 'SELL']:
                logger.info("No valid signal, skipping order placement")
                return None
            
            # Set leverage for the symbol
            self.exchange.set_leverage(int(signal['leverage_rounded']), symbol)
            
            # Determine order side
            side = 'buy' if signal['signal'] == 'BUY' else 'sell'
            
            # Create market order with bracket (stop loss and take profit)
            # Phemex supports this through the params
            # Convert numpy types to Python types for JSON serialization
            order = self.exchange.create_order(
                symbol=symbol,
                type='market',
                side=side,
                amount=float(signal['position_size']),
                params={
                    'stopLoss': {
                        'type': 'market',
                        'stopPrice': float(signal['stop_loss']),
                        'triggerDirection': 'descending' if side == 'buy' else 'ascending'
                    },
                    'takeProfit': {
                        'type': 'limit',
                        'price': float(signal['take_profit']),
                        'triggerPrice': float(signal['take_profit']),
                        'triggerDirection': 'ascending' if side == 'buy' else 'descending'
                    }
                }
            )

            
            trade_logger.info(f"✅ BRACKET ORDER PLACED:")
            trade_logger.info(f"   Position: {side.upper()} {signal['position_size']:.4f}")
            trade_logger.info(f"   Entry: Market")
            trade_logger.info(f"   Stop Loss: ${signal['stop_loss']:.6f}")
            trade_logger.info(f"   Take Profit: ${signal['take_profit']:.6f}")
            trade_logger.info(f"   Order ID: {order.get('id', 'N/A')}")
            
            return {
                'bracket_order': order,
                'side': side,
                'size': signal['position_size'],
                'stop_loss': signal['stop_loss'],
                'take_profit': signal['take_profit']
            }
            
        except Exception as e:
            logger.error(f"Error placing bracket order: {e}")
            raise

    def get_open_positions(self, symbol: str = None) -> List[Dict]:
        """Get open positions from Phemex futures"""
        try:
            positions = self.exchange.fetch_positions()
            
            logger.info(f"🔍 Fetched {len(positions)} total positions from Phemex")
            
            # Filter only TRULY open positions
            open_positions = []
            for pos in positions:
                # Check contracts field specifically for Phemex
                contracts = float(pos.get('contracts', 0))
                
                # Only consider it open if contracts is not zero
                if contracts != 0:
                    open_positions.append(pos)
                    logger.info(f"🔍 Found open position: {pos.get('symbol', 'unknown')} contracts: {contracts}")
            
            logger.info(f"📊 Found {len(open_positions)} actual open positions")
            
            if symbol and open_positions:
                # Filter for specific symbol
                filtered = [p for p in open_positions if p.get('symbol') == symbol]
                return filtered
                
            return open_positions
            
        except Exception as e:
            logger.error(f"Error fetching positions: {e}")
            raise

    def close_position(self, symbol: str) -> Dict[str, Any]:
        """Close position for a specific symbol on Phemex"""
        try:
            positions = self.get_open_positions(symbol)
            
            if not positions:
                logger.info(f"No open position found for {symbol}")
                return None
            
            position = positions[0]
            size = abs(float(position['contracts']))
            side = 'sell' if float(position['contracts']) > 0 else 'buy'
            
            # Create market order to close position
            order = self.exchange.create_order(
                symbol=symbol,
                type='market',
                side=side,
                amount=size,
                params={'reduceOnly': True}
            )
            
            logger.info(f"Position closed successfully: {order}")
            return order
            
        except Exception as e:
            logger.error(f"Error closing position: {e}")
            raise

    @staticmethod
    def confidence_mode_selector(confidence, vol_percentile):
        vol_factor = 1.0 - (vol_percentile / 100.0)
        score = 0.5 * confidence + 0.5 * vol_factor
        return score

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Exact same indicator calculations as Binance version"""
        df = df.copy()
        required_columns = ['open', 'high', 'low', 'close', 'volume']
        if not all(col in df.columns for col in required_columns):
            logger.error(f"Missing required columns. Available: {df.columns.tolist()}")
            return df

        # EMA calculations
        df['ema9'] = df['close'].ewm(span=9, adjust=False).mean()
        df['ema21'] = df['close'].ewm(span=21, adjust=False).mean()
        df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()
        df['ema100'] = df['close'].ewm(span=100, adjust=False).mean()
        df['ema200'] = df['close'].ewm(span=200, adjust=False).mean()

        # EMA alignment
        df['ema_aligned_bull'] = ((df['ema9'] > df['ema21']) &
                                  (df['ema21'] > df['ema50']) &
                                  (df['ema50'] > df['ema100']) &
                                  (df['ema100'] > df['ema200'])).astype(int)
        df['ema_aligned_bear'] = ((df['ema9'] < df['ema21']) &
                                  (df['ema21'] < df['ema50']) &
                                  (df['ema50'] < df['ema100']) &
                                  (df['ema100'] < df['ema200'])).astype(int)

        # MACD
        df['ema12'] = df['close'].ewm(span=12, adjust=False).mean()
        df['ema26'] = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = df['ema12'] - df['ema26']
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']

        # RSI with Wilder's smoothing
        def wilder_smooth(series, period):
            alpha = 1.0 / period
            return series.ewm(alpha=alpha, adjust=False).mean()

        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)

        avg_gain = wilder_smooth(gain, 14)
        avg_loss = wilder_smooth(loss, 14)

        rs = avg_gain / avg_loss
        df['rsi'] = np.where(avg_loss == 0, 100, 
                            np.where(avg_gain == 0, 0, 
                                    100 - (100 / (1 + rs))))
        df['rsi'] = df['rsi'].fillna(50)

        # FIXED ADX calculation - Exact TradingView match
        def calculate_tradingview_adx(high, low, close, dilen=14, adxlen=14):
            """Calculate ADX exactly matching TradingView's formula"""
            # Step 1: Calculate price changes
            up = high.diff()
            down = -low.diff()
            
            # Step 2: Calculate directional movements
            plusDM = np.where(pd.isna(up), np.nan, 
                             np.where((up > down) & (up > 0), up, 0))
            minusDM = np.where(pd.isna(down), np.nan,
                              np.where((down > up) & (down > 0), down, 0))
            
            plusDM = pd.Series(plusDM, index=df.index)
            minusDM = pd.Series(minusDM, index=df.index)
            
            # Step 3: Calculate True Range
            prev_close = close.shift(1)
            tr1 = high - low
            tr2 = (high - prev_close).abs()
            tr3 = (low - prev_close).abs()
            
            tr2.iloc[0] = 0
            tr3.iloc[0] = 0
            
            true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
            
            # Step 4: Apply RMA smoothing
            truerange_rma = wilder_smooth(true_range, dilen)
            plusDM_rma = wilder_smooth(plusDM, dilen)
            minusDM_rma = wilder_smooth(minusDM, dilen)
            
            # Step 5: Calculate DI+ and DI-
            plus_di = 100 * (plusDM_rma / truerange_rma)
            minus_di = 100 * (minusDM_rma / truerange_rma)
            
            plus_di = plus_di.fillna(0)
            minus_di = minus_di.fillna(0)
            
            # Step 6: Calculate DX and ADX
            di_sum = plus_di + minus_di
            dx = 100 * (plus_di - minus_di).abs() / np.where(di_sum == 0, 1, di_sum)
            adx = wilder_smooth(pd.Series(dx, index=df.index), adxlen)
            
            return adx.fillna(0)
        
        # Calculate ADX using the fixed method
        df['adx'] = calculate_tradingview_adx(df['high'], df['low'], df['close'])
        
        # ATR and volatility - using same True Range calculation for consistency
        prev_close = df['close'].shift(1)
        tr1 = df['high'] - df['low']
        tr2 = (df['high'] - prev_close).abs()
        tr3 = (df['low'] - prev_close).abs()
        
        tr2.iloc[0] = 0
        tr3.iloc[0] = 0
        
        true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
        df['atr14'] = wilder_smooth(true_range, 14)
        df['atr_pct'] = df['atr14'] / df['close'] * 100
        df['vol_percentile'] = df['atr_pct'].rolling(window=100).apply(
            lambda x: pd.Series(x).rank(pct=True).iloc[-1] * 100
        )

        # Bollinger Bands
        df['bb_middle'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + 2 * df['bb_std']
        df['bb_lower'] = df['bb_middle'] - 2 * df['bb_std']
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']

        # Trend components
        df['price_above_ema50'] = (df['close'] > df['ema50']).astype(int) * 2 - 1
        df['price_above_ema200'] = (df['close'] > df['ema200']).astype(int) * 2 - 1
        df['macd_above_signal'] = (df['macd'] > df['macd_signal']).astype(int) * 2 - 1
        df['rsi_trend'] = ((df['rsi'] > 50).astype(int) * 2 - 1)

        # Combined trend strength
        df['trend_strength'] = (
            df['ema_aligned_bull'].astype(float) * 0.3 -
            df['ema_aligned_bear'].astype(float) * 0.3 +
            df['price_above_ema50'] * 0.15 +
            df['price_above_ema200'] * 0.15 +
            df['macd_above_signal'] * 0.2 +
            df['rsi_trend'] * 0.2
        )

        df['strong_trend'] = (df['adx'] > 25).astype(int)
        df['trend_strength'] = df['trend_strength'] * (0.5 + 0.5 * df['strong_trend'])
        
        return df

    def resample_to_timeframe(self, df: pd.DataFrame, timeframe: str) -> pd.DataFrame:
        """Resample data to specified timeframe"""
        df = df.copy()
        df.set_index('datetime', inplace=True)
        
        if timeframe == '1d':
            rule = 'D'
        elif timeframe == '4h':
            rule = '4H'
        else:
            raise ValueError(f"Unsupported timeframe: {timeframe}")
        
        resampled = pd.DataFrame()
        resampled['open'] = df['open'].resample(rule).first()
        resampled['high'] = df['high'].resample(rule).max()
        resampled['low'] = df['low'].resample(rule).min()
        resampled['close'] = df['close'].resample(rule).last()
        resampled['volume'] = df['volume'].resample(rule).sum()
        
        resampled.reset_index(inplace=True)
        resampled.dropna(inplace=True)
        
        return resampled

    def prepare_multi_timeframe_data(self, hourly_df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Prepare data for all three timeframes"""
        daily_df = self.resample_to_timeframe(hourly_df, '1d')
        four_hour_df = self.resample_to_timeframe(hourly_df, '4h')
        
        daily_df = self.calculate_indicators(daily_df)
        four_hour_df = self.calculate_indicators(four_hour_df)
        hourly_df = self.calculate_indicators(hourly_df)
        
        return daily_df, four_hour_df, hourly_df

    def combine_timeframes(self, daily_df: pd.DataFrame, medium_df: pd.DataFrame, lower_df: pd.DataFrame) -> pd.DataFrame:
        """Combine signals from three timeframes"""
        result_df = lower_df.copy()
        result_df['daily_trend'] = np.nan
        result_df['medium_trend'] = np.nan
        result_df['lower_trend'] = result_df['trend_strength']
        result_df['combined_trend'] = np.nan
        result_df['timeframe_alignment'] = np.nan
        
        for i in range(len(result_df)):
            current_time = result_df['datetime'].iloc[i]
            
            # Find corresponding daily and medium timeframe values
            daily_idx = daily_df[daily_df['datetime'] <= current_time].index[-1] if len(daily_df[daily_df['datetime'] <= current_time]) > 0 else None
            medium_idx = medium_df[medium_df['datetime'] <= current_time].index[-1] if len(medium_df[medium_df['datetime'] <= current_time]) > 0 else None
            
            if daily_idx is not None:
                result_df.at[result_df.index[i], 'daily_trend'] = daily_df.at[daily_idx, 'trend_strength']
            if medium_idx is not None:
                result_df.at[result_df.index[i], 'medium_trend'] = medium_df.at[medium_idx, 'trend_strength']
        
        # Calculate combined trend and alignment
        for i in range(len(result_df)):
            daily_trend = result_df['daily_trend'].iloc[i]
            medium_trend = result_df['medium_trend'].iloc[i]
            lower_trend = result_df['lower_trend'].iloc[i]
            
            if pd.isna(daily_trend) or pd.isna(medium_trend) or pd.isna(lower_trend):
                continue
                
            combined_trend = (
                daily_trend * self.timeframe_weights['daily'] +
                medium_trend * self.timeframe_weights['medium'] +
                lower_trend * self.timeframe_weights['lower']
            )
            
            alignment = 1.0 - (
                abs(daily_trend - medium_trend) * 0.4 +
                abs(daily_trend - lower_trend) * 0.4 +
                abs(medium_trend - lower_trend) * 0.2
            ) / 2.0
            
            result_df.at[result_df.index[i], 'combined_trend'] = combined_trend
            result_df.at[result_df.index[i], 'timeframe_alignment'] = alignment
            
        return result_df

    def generate_signals_live(self, symbol: str = 'ADA/USDT:USDT', lookback_hours: int = 500) -> Dict[str, Any]:
        """Generate trading signals for Phemex futures"""
        # Get current account equity (will be 0 for empty account)
        try:
            current_equity = self.get_current_equity()
            if current_equity == 0:
                logger.warning("No USDT balance found, bot will not trade")
                return {
                    'timestamp': pd.Timestamp.now(),
                    'signal': 'NEUTRAL',
                    'confidence': 0.0,
                    'mode_used': 'no_funds',
                    'mode_score': 0.0,
                    'position_size': 0.0,
                    'leverage_raw': 0.0,
                    'leverage_rounded': 1,
                    'allocated_capital': 0.0,
                    'stop_loss': 0.0,
                    'take_profit': 0.0,
                    'current_equity': 0.0,
                    'combined_trend': 0.0,
                    'timeframe_alignment': 0.0,
                    'symbol': symbol,
                    'error': 'No funds available'
                }
        except Exception as e:
            logger.error(f"Could not fetch equity: {e}, bot will not trade")
            return {
                'timestamp': pd.Timestamp.now(),
                'signal': 'NEUTRAL',
                'confidence': 0.0,
                'mode_used': 'error',
                'mode_score': 0.0,
                'position_size': 0.0,
                'leverage_raw': 0.0,
                'leverage_rounded': 1,
                'allocated_capital': 0.0,
                'stop_loss': 0.0,
                'take_profit': 0.0,
                'current_equity': 0.0,
                'combined_trend': 0.0,
                'timeframe_alignment': 0.0,
                'symbol': symbol,
                'error': 'Could not fetch balance'
            }
        
        # Fetch hourly data from Phemex
        hourly_data = self.fetch_ohlcv_data(symbol, '1h', limit=lookback_hours)
        
        # Prepare multi-timeframe data
        daily_df, four_hour_df, hourly_df = self.prepare_multi_timeframe_data(hourly_data)
        
        # Combine timeframes
        combined_df = self.combine_timeframes(daily_df, four_hour_df, hourly_df)
        
        # Get latest signal
        latest_row = combined_df.iloc[-1]
        
        signal_output = {
            'timestamp': latest_row['datetime'],
            'signal': 'NEUTRAL',
            'confidence': 0.0,
            'mode_used': '',
            'mode_score': 0.0,
            'position_size': 0.0,
            'leverage_raw': 0.0,
            'leverage_rounded': 1,
            'allocated_capital': 0.0,
            'stop_loss': 0.0,
            'take_profit': 0.0,
            'current_equity': current_equity,
            'combined_trend': latest_row['combined_trend'],
            'timeframe_alignment': latest_row['timeframe_alignment'],
            'symbol': symbol
        }
        
        if pd.isna(latest_row['combined_trend']) or pd.isna(latest_row['timeframe_alignment']):
            return signal_output
        
        # Signal generation logic (exact same as Binance)
        abs_trend = abs(latest_row['combined_trend'])
        trend_direction = np.sign(latest_row['combined_trend'])
        vol_percentile = latest_row['vol_percentile']
        
        score = self.confidence_mode_selector(abs_trend, vol_percentile)
        mode = 'aggressive' if score >= 0.5 else 'conservative'
        current_params = self.params[mode]
        
        signal_output['mode_used'] = mode
        signal_output['mode_score'] = score
        
        signal = 'NEUTRAL'
        confidence = 0.0
        
        # Check trend strength is within valid range (not too weak, not too strong)
        if (abs_trend >= current_params['trend_strength_threshold'] and 
            abs_trend <= current_params['max_trend_strength_threshold']):
            
            signal = 'BUY' if trend_direction > 0 else 'SELL'
            confidence = min(abs_trend, 0.99)
            
            logger.info(f"🎯 Trend strength: {abs_trend:.3f} (range: {current_params['trend_strength_threshold']:.1f} - {current_params['max_trend_strength_threshold']:.1f}) = VALID")
            
        else:
            # Log why we're rejecting the trade
            if abs_trend < current_params['trend_strength_threshold']:
                logger.info(f"😴 Trend too weak: {abs_trend:.3f} < {current_params['trend_strength_threshold']:.1f}")
            elif abs_trend > current_params['max_trend_strength_threshold']:
                logger.info(f"⚠️ Trend TOO STRONG: {abs_trend:.3f} > {current_params['max_trend_strength_threshold']:.1f} (likely too late)")

        # Volatility filter (unchanged)
        if vol_percentile < current_params['min_volatility_percentile'] or vol_percentile > 90:
            signal = 'NEUTRAL'
            confidence = 0.0
            logger.info(f"🌪️ Volatility filter triggered: {vol_percentile:.1f}%")
        
        signal_output['signal'] = signal
        signal_output['confidence'] = confidence
        
        # Position sizing
        if signal in ['BUY', 'SELL']:
            atr = latest_row['atr14']
            entry_price = latest_row['close']
            
            # 🐛 DEBUG LOGGING - Add before TP calculation
            logger.info(f"🐛 DEBUG TP calc: entry={entry_price}, atr={atr}, multiplier={current_params['profit_target_multiplier']}")
            logger.info(f"🐛 DEBUG: mode={mode}, params={current_params}")

            if signal == 'BUY':
                stop_loss = entry_price - atr * 1.5
                take_profit = entry_price + atr * current_params['profit_target_multiplier']
            else:
                stop_loss = entry_price + atr * 1.5
                take_profit = entry_price - atr * current_params['profit_target_multiplier']
            
            # 🐛 DEBUG LOGGING - Add after TP calculation
            logger.info(f"🐛 DEBUG: atr * multiplier = {atr * current_params['profit_target_multiplier']}")
            logger.info(f"🐛 DEBUG: Final TP = {take_profit}")
            logger.info(f"🐛 DEBUG: Final SL = {stop_loss}")

            risk_per_unit = abs(entry_price - stop_loss)
            position_size = (current_params['risk_per_trade'] * current_equity) / risk_per_unit
            
            position_value = position_size * entry_price
            calculated_leverage = position_value / current_equity
            
            if calculated_leverage < self.min_leverage:
                rounded_leverage = self.min_leverage
            else:
                rounded_leverage = min(np.ceil(calculated_leverage), self.max_leverage)
            
            signal_output.update({
                'position_size': position_size,
                'leverage_raw': calculated_leverage,
                'leverage_rounded': int(rounded_leverage),
                'allocated_capital': position_value / rounded_leverage,
                'stop_loss': stop_loss,
                'take_profit': take_profit
            })
        
        return signal_output

    def run_live_trading_loop(self, symbol: str = 'ADA/USDT:USDT', check_interval_minutes: int = 60):
        """Run continuous trading loop for Phemex futures"""
        logger.info(f"🚀 Starting Nike's Massive Rocket on Phemex for {symbol}")
        logger.info(f"⏰ Check interval: {check_interval_minutes} minutes")
        
        try:
            current_equity = self.get_current_equity()
            logger.info(f"💰 Current equity: ${current_equity:.2f}")
        except:
            logger.warning("Could not fetch equity - will use market data only")
        
        while True:
            try:
                start_time = datetime.now()
                logger.info(f"📊 Signal check started at {start_time.strftime('%H:%M:%S')}")
                
                # Check existing positions
                try:
                    positions = self.get_open_positions(symbol)
                    
                    if positions:
                        pos = positions[0]  # ✅ CORRECT INDENTATION
                        trade_logger.info(f"📈 Open position: {pos['side']} {abs(float(pos['contracts']))} contracts")
                        logger.info("⚠️  Position exists - skipping new signal generation")
                        pass  # Just skip signal generation but continue to sleep
                    else:
                        logger.info("💼 No open positions - checking for signals...")
                        
                        # Generate signal
                        signal = self.generate_signals_live(symbol)
                        
                        # Log signal details
                        signal_logger.info(f"🎯 Signal: {signal['signal']} | Confidence: {signal['confidence']:.3f}")
                        signal_logger.info(f"📈 Trend: {signal['combined_trend']:.3f} | Alignment: {signal['timeframe_alignment']:.3f}")
                        signal_logger.info(f"⚙️  Mode: {signal['mode_used']} | Equity: ${signal['current_equity']:.2f}")
                        
                        # Execute trade if signal is valid
                        if signal['signal'] in ['BUY', 'SELL']:
                            trade_logger.warning(f"🔥 TRADE SIGNAL: {signal['signal']} detected!")
                            trade_logger.info(f"💰 Position size: {signal['position_size']:.4f} ADA")
                            trade_logger.info(f"🎚️  Leverage: {signal['leverage_rounded']}x")
                            trade_logger.info(f"🛑 Stop loss: ${signal['stop_loss']:.6f}")
                            trade_logger.info(f"🎯 Take profit: ${signal['take_profit']:.6f}")
                            
                            try:
                                orders = self.place_order_phemex(symbol, signal)
                                trade_logger.info(f"✅ ORDERS PLACED SUCCESSFULLY")
                            except Exception as e:
                                error_logger.error(f"❌ Order placement failed: {e}")
                        else:
                            logger.info("😴 No trade - waiting for stronger signals")
                
                except Exception as e:
                    logger.error(f"Error in position check: {e}")
                
                # Wait for next check
                logger.info(f"💤 Sleeping for {check_interval_minutes} minutes...")
                time.sleep(check_interval_minutes * 60)
                
            except KeyboardInterrupt:
                logger.warning("🛑 Trading loop interrupted by user")
                break
            except Exception as e:
                error_logger.error(f"💥 Error in trading loop: {e}")
                time.sleep(60)


# SECURE SETUP FUNCTIONS
def setup_phemex_credentials():
    """
    Guide for setting up Phemex API credentials securely
    """
    print("🔐 PHEMEX API SETUP GUIDE")
    print("=" * 40)
    print("1. Go to Phemex.com → Account → API Management")
    print("2. Create new API Key with permissions:")
    print("   ✅ Spot Trading")
    print("   ✅ Contract Trading")
    print("   ✅ Wallet")
    print("3. Restrict to your IP address if possible")
    print("4. Set environment variables (SECURE METHOD):")
    print("")
    print("Linux Commands:")
    print('export PHEMEX_API_KEY="your_api_key_here"')
    print('export PHEMEX_SECRET="your_secret_here"')
    print("")
    print("Or create a .env file:")
    print("PHEMEX_API_KEY=your_api_key_here")
    print("PHEMEX_SECRET=your_secret_here")


def test_phemex_connection():
    """Test Phemex connection for live trading readiness"""
    try:
        strategy = NikesMassiveRocketPhemex(testnet=False)
        
        print("🔄 Testing Phemex connection...")
        balance = strategy.get_current_equity()
        print(f"✅ Connection successful! Balance: ${balance:.2f}")
        
        # Test data fetch
        print("📊 Testing data fetch...")
        data = strategy.fetch_ohlcv_data('ADA/USDT:USDT', '1h', 10)
        print(f"✅ Data fetch successful! Got {len(data)} candles")
        
        return True
        
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
        return False


# LIVE TRADING FUNCTIONS


def start_live_trading(symbol='ADA/USDT:USDT', check_interval=60, max_leverage=10):
    """
    Start LIVE trading on Phemex (REAL MONEY!)
    """
    print("🚨 LIVE TRADING MODE - REAL MONEY AT RISK!")
    print("=" * 60)
    
    # Multiple safety confirmations
    print("⚠️  WARNING: This will trade with REAL MONEY on your Phemex account!")
    print("⚠️  Make sure you understand the risks and have set appropriate limits!")
    print("⚠️  The bot will place market orders with stop losses and take profits!")
    print("")
    
    confirm1 = input("Type 'I UNDERSTAND THE RISKS' to continue: ")
    if confirm1 != 'I UNDERSTAND THE RISKS':
        print("❌ Live trading cancelled for safety")
        return
    
    confirm2 = input(f"Confirm trading {symbol} with max {max_leverage}x leverage? (type 'YES'): ")
    if confirm2 != 'YES':
        print("❌ Live trading cancelled")
        return
    
    confirm3 = input("Final confirmation - START LIVE TRADING? (type 'START'): ")
    if confirm3 != 'START':
        print("❌ Live trading cancelled")
        return
    
    try:
        # Initialize live strategy
        print("🔌 Connecting to Phemex...")
        strategy = NikesMassiveRocketPhemex(testnet=False)  # LIVE TRADING!
        strategy.max_leverage = max_leverage  # Override with user's max leverage
        
        # Test connection and get balance
        print("💰 Checking account balance...")
        balance = strategy.get_current_equity()
        print(f"💰 Current account balance: ${balance:.2f}")
        
        if balance < 50:
            print("❌ Insufficient balance for live trading (minimum $50 recommended)")
            return
        
        # Show risk information
        print(f"\n📊 TRADING PARAMETERS:")
        print(f"   Symbol: {symbol}")
        print(f"   Check interval: {check_interval} minutes")
        print(f"   Max leverage: {max_leverage}x")
        print(f"   Risk per trade: 2-4% of account")
        print(f"   Account balance: ${balance:.2f}")
        print("")
        
        # Final go/no-go
        final_confirm = input("Ready to start live trading? (type 'GO'): ")
        if final_confirm != 'GO':
            print("❌ Live trading cancelled")
            return
        
        print(f"🚀 STARTING LIVE TRADING ON {symbol}...")
        print("🛑 Press Ctrl+C to stop safely (will finish current cycle)")
        print("📝 All trades will be logged to the logs/ directory")
        print("=" * 60)
        
        # Start live trading loop
        strategy.run_live_trading_loop(symbol, check_interval)
        
    except Exception as e:
        print(f"❌ Live trading setup failed: {e}")
        print("Check your API credentials and network connection")


def quick_balance_check():
    """
    Quick balance and connection check
    """
    try:
        strategy = NikesMassiveRocketPhemex(testnet=False)
        balance = strategy.get_current_equity()
        
        print(f"✅ Phemex Connection: SUCCESS")
        print(f"💰 Account Balance: ${balance:.2f} USDT")
        
        if balance > 0:
            print(f"🟢 Ready for live trading")
        else:
            print(f"🔴 No funds available for trading")
        
        return balance > 0
        
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("💡 Make sure your API credentials are set correctly:")
        print("   export PHEMEX_API_KEY='your_key'")
        print("   export PHEMEX_SECRET='your_secret'")
        return False


if __name__ == "__main__":
    print("🚀 NIKE'S MASSIVE ROCKET - PHEMEX LIVE TRADING")
    print("=" * 60)
    print("⚠️  LIVE TRADING ONLY - REAL MONEY AT RISK!")
    print("⚠️  Make sure your API credentials are set as environment variables!")
    print("=" * 60)
    
    # Check if API credentials are set
    api_key = os.getenv('PHEMEX_API_KEY')
    api_secret = os.getenv('PHEMEX_SECRET')
    
    if not api_key or not api_secret:
        print("❌ API CREDENTIALS NOT FOUND!")
        print("\n🔐 Set your Phemex API credentials:")
        print("Linux/Mac:")
        print("export PHEMEX_API_KEY='your_api_key_here'")
        print("export PHEMEX_SECRET='your_secret_here'")
        print("\nWindows:")
        print("set PHEMEX_API_KEY=your_api_key_here")
        print("set PHEMEX_SECRET=your_secret_here")
        exit(1)
    
    print("\nOptions:")
    print("1. Check account balance & connection")
    print("2. Start LIVE trading (REAL MONEY!)")
    print("3. Setup API credentials guide")
    print("4. Exit")
    
    choice = input("\nEnter choice (1-4): ").strip()
    
    if choice == "1":
        print("\n🔍 CHECKING PHEMEX CONNECTION...")
        print("=" * 40)
        success = quick_balance_check()
        if success:
            print("✅ Ready for live trading!")
        else:
            print("❌ Fix connection issues before trading")
            
    elif choice == "2":
        print("\n🚨 LIVE TRADING SETUP")
        print("=" * 30)
        
        # Get trading parameters
        symbol = input("Enter symbol (default ADA/USDT:USDT): ").strip()
        if not symbol:
            symbol = "ADA/USDT:USDT"
        
        try:
            interval = int(input("Check interval in minutes (default 60): ") or "60")
            if interval < 5:
                print("⚠️  Minimum interval is 5 minutes for safety")
                interval = 5
        except:
            interval = 60
            
        try:
            max_lev = int(input("Maximum leverage (default 10, max 100): ") or "10")
            if max_lev > 100:
                print("⚠️  Phemex max leverage is 100x")
                max_lev = 100
            elif max_lev < 1:
                max_lev = 1
        except:
            max_lev = 10
        
        # Show final parameters
        print(f"\n📋 FINAL TRADING PARAMETERS:")
        print(f"   Symbol: {symbol}")
        print(f"   Check Interval: {interval} minutes")
        print(f"   Max Leverage: {max_lev}x")
        print(f"   Risk Per Trade: 2-4% of account balance")
        
        start_live_trading(symbol, interval, max_lev)
        
    elif choice == "3":
        setup_phemex_credentials()
        
    elif choice == "4":
        print("👋 Goodbye! Trade safely!")
        
    else:
        print("❌ Invalid choice. Please select 1-4.")