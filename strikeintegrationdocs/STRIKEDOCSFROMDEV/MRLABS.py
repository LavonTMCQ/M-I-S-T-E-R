import logging
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple, Optional

logger = logging.getLogger(__name__)

class NikesMassiveRocket:
    """
    Nike's Massive Rocket - Multi-timeframe model with dynamic confidence/volatility mode selection, compounding risk management, and signal reversal exit. (No trailing stop)
    """

    def __init__(self):
        # Default parameters for both modes; will be selected per trade
        self.params = {
            'aggressive': {
                'trend_strength_threshold': 0.4,
                'min_volatility_percentile': 15,
                'profit_target_multiplier': 3.5,
                'risk_per_trade': 0.04,
            },
            'conservative': {
                'trend_strength_threshold': 0.2,
                'min_volatility_percentile': 15,  # Lowered from 25 to 15
                'profit_target_multiplier': 2.5,
                'risk_per_trade': 0.02,
            },
        }
        self.timeframe_weights = {
            'daily': 0.5,
            'medium': 0.3,
            'lower': 0.2
        }

    @staticmethod
    def confidence_mode_selector(confidence, vol_percentile):
        vol_factor = 1.0 - (vol_percentile / 100.0)
        score = 0.5 * confidence + 0.5 * vol_factor
        return score  # Use score >= 0.5 for aggressive mode, else conservative

    def calculate_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        required_columns = ['open', 'high', 'low', 'close', 'volume']
        if not all(col in df.columns for col in required_columns):
            logger.error(f"Missing required columns. Available: {df.columns.tolist()}")
            return df

        df['ema9'] = df['close'].ewm(span=9, adjust=False).mean()
        df['ema21'] = df['close'].ewm(span=21, adjust=False).mean()
        df['ema50'] = df['close'].ewm(span=50, adjust=False).mean()
        df['ema100'] = df['close'].ewm(span=100, adjust=False).mean()
        df['ema200'] = df['close'].ewm(span=200, adjust=False).mean()

        df['ema_aligned_bull'] = ((df['ema9'] > df['ema21']) &
                                  (df['ema21'] > df['ema50']) &
                                  (df['ema50'] > df['ema100']) &
                                  (df['ema100'] > df['ema200'])).astype(int)
        df['ema_aligned_bear'] = ((df['ema9'] < df['ema21']) &
                                  (df['ema21'] < df['ema50']) &
                                  (df['ema50'] < df['ema100']) &
                                  (df['ema100'] < df['ema200'])).astype(int)

        df['ema12'] = df['close'].ewm(span=12, adjust=False).mean()
        df['ema26'] = df['close'].ewm(span=26, adjust=False).mean()
        df['macd'] = df['ema12'] - df['ema26']
        df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
        df['macd_hist'] = df['macd'] - df['macd_signal']

        delta = df['close'].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_gain = gain.rolling(window=14).mean()
        avg_loss = loss.rolling(window=14).mean()
        rs = avg_gain / avg_loss
        df['rsi'] = 100 - (100 / (1 + rs))

        plus_dm = df['high'].diff()
        minus_dm = df['low'].diff(-1).abs()
        plus_dm[plus_dm < 0] = 0
        minus_dm[minus_dm < 0] = 0
        plus_dm[(df['high'] <= df['high'].shift()) | (df['low'] <= df['low'].shift())] = 0
        minus_dm[(df['high'] >= df['high'].shift()) | (df['low'] >= df['low'].shift())] = 0
        tr = pd.DataFrame([
            df['high'] - df['low'],
            (df['high'] - df['close'].shift()).abs(),
            (df['low'] - df['close'].shift()).abs()
        ]).max()
        atr14 = tr.rolling(window=14).mean()
        plus_di14 = 100 * (plus_dm.rolling(window=14).mean() / atr14)
        minus_di14 = 100 * (minus_dm.rolling(window=14).mean() / atr14)
        dx = 100 * ((plus_di14 - minus_di14).abs() / (plus_di14 + minus_di14).abs())
        df['adx'] = dx.rolling(window=14).mean()

        high_low = df['high'] - df['low']
        high_close = (df['high'] - df['close'].shift()).abs()
        low_close = (df['low'] - df['close'].shift()).abs()
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        df['atr14'] = true_range.rolling(window=14).mean()
        df['atr_pct'] = df['atr14'] / df['close'] * 100
        df['vol_percentile'] = df['atr_pct'].rolling(window=100).apply(
            lambda x: pd.Series(x).rank(pct=True).iloc[-1] * 100
        )

        df['bb_middle'] = df['close'].rolling(window=20).mean()
        df['bb_std'] = df['close'].rolling(window=20).std()
        df['bb_upper'] = df['bb_middle'] + 2 * df['bb_std']
        df['bb_lower'] = df['bb_middle'] - 2 * df['bb_std']
        df['bb_width'] = (df['bb_upper'] - df['bb_lower']) / df['bb_middle']

        df['price_above_ema50'] = (df['close'] > df['ema50']).astype(int) * 2 - 1
        df['price_above_ema200'] = (df['close'] > df['ema200']).astype(int) * 2 - 1
        df['macd_above_signal'] = (df['macd'] > df['macd_signal']).astype(int) * 2 - 1
        df['rsi_trend'] = ((df['rsi'] > 50).astype(int) * 2 - 1)

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

    def combine_timeframes(self, daily_df: pd.DataFrame, medium_df: pd.DataFrame, lower_df: pd.DataFrame) -> pd.DataFrame:
        result_df = lower_df.copy()
        result_df['daily_trend'] = np.nan
        result_df['medium_trend'] = np.nan
        result_df['lower_trend'] = result_df['trend_strength']
        result_df['combined_trend'] = np.nan
        result_df['timeframe_alignment'] = np.nan
        for i in range(len(result_df)):
            current_time = result_df['datetime'].iloc[i]
            daily_idx = daily_df[daily_df['datetime'] <= current_time].index[-1] if len(daily_df[daily_df['datetime'] <= current_time]) > 0 else None
            medium_idx = medium_df[medium_df['datetime'] <= current_time].index[-1] if len(medium_df[medium_df['datetime'] <= current_time]) > 0 else None
            if daily_idx is not None:
                result_df.at[result_df.index[i], 'daily_trend'] = daily_df.at[daily_idx, 'trend_strength']
            if medium_idx is not None:
                result_df.at[result_df.index[i], 'medium_trend'] = medium_df.at[medium_idx, 'trend_strength']
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

    def generate_signals_with_compounding_and_reversal(self, df: pd.DataFrame, initial_equity: float) -> pd.DataFrame:
        df = df.copy()
        df['signal'] = 'NEUTRAL'
        df['confidence'] = 0.0
        df['mode_used'] = ''
        df['mode_score'] = 0.0
        df['position_size'] = 0.0
        df['leverage'] = 1.0
        df['stop_loss'] = 0.0
        df['take_profit'] = 0.0
        df['exit_signal'] = np.nan
        df['equity'] = initial_equity

        current_equity = initial_equity
        in_position = False
        entry_price = None
        stop_loss = None
        take_profit = None
        trade_direction = None
        current_params = self.params['conservative']  # Start as conservative

        for i in range(200, len(df)):
            row = df.iloc[i]

            if pd.isna(row['combined_trend']) or pd.isna(row['timeframe_alignment']):
                df.at[df.index[i], 'equity'] = current_equity
                continue

            # Signal generation using conservative thresholds (for scoring)
            signal = 'NEUTRAL'
            confidence = 0.0
            abs_trend = abs(row['combined_trend'])
            trend_direction = np.sign(row['combined_trend'])
            vol_percentile = row['vol_percentile']

            # Use conservative threshold for signal scoring
            if abs_trend >= self.params['conservative']['trend_strength_threshold']:
                signal = 'BUY' if trend_direction > 0 else 'SELL'
                confidence = min(abs_trend, 0.99)
            else:
                signal = 'NEUTRAL'
                confidence = 0.0
            if vol_percentile < self.params['conservative']['min_volatility_percentile'] or vol_percentile > 90:
                signal = 'NEUTRAL'
                confidence = 0.0

            # Determine which mode to use based on selector
            score = self.confidence_mode_selector(confidence, vol_percentile)
            mode = 'aggressive' if score >= 0.5 else 'conservative'
            current_params = self.params[mode]

            df.at[df.index[i], 'mode_used'] = mode
            df.at[df.index[i], 'mode_score'] = score

            # Now recheck signal with selected mode's thresholds
            signal = 'NEUTRAL'
            confidence = 0.0
            if abs_trend >= current_params['trend_strength_threshold']:
                signal = 'BUY' if trend_direction > 0 else 'SELL'
                confidence = min(abs_trend, 0.99)
            else:
                signal = 'NEUTRAL'
                confidence = 0.0
            if vol_percentile < current_params['min_volatility_percentile'] or vol_percentile > 90:
                signal = 'NEUTRAL'
                confidence = 0.0

            # Manage trade exit and equity update for compounding logic
            if in_position:
                current_price = row['close']
                reversal = False
                if (trade_direction == 'BUY' and signal == 'SELL') or (trade_direction == 'SELL' and signal == 'BUY'):
                    reversal = True
                if trade_direction == 'BUY':
                    if row['low'] <= stop_loss:
                        pnl = -current_params['risk_per_trade'] * current_equity
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'STOP_LOSS'
                        in_position = False
                    elif row['high'] >= take_profit:
                        reward = (take_profit - entry_price)
                        risk = (entry_price - stop_loss)
                        pnl = current_params['risk_per_trade'] * current_equity * (reward / risk)
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'TAKE_PROFIT'
                        in_position = False
                    elif reversal:
                        pnl = (current_price - entry_price) / (entry_price - stop_loss) * current_params['risk_per_trade'] * current_equity
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'SIGNAL_REVERSAL'
                        in_position = False
                elif trade_direction == 'SELL':
                    if row['high'] >= stop_loss:
                        pnl = -current_params['risk_per_trade'] * current_equity
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'STOP_LOSS'
                        in_position = False
                    elif row['low'] <= take_profit:
                        reward = (entry_price - take_profit)
                        risk = (stop_loss - entry_price)
                        pnl = current_params['risk_per_trade'] * current_equity * (reward / risk)
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'TAKE_PROFIT'
                        in_position = False
                    elif reversal:
                        pnl = (entry_price - current_price) / (stop_loss - entry_price) * current_params['risk_per_trade'] * current_equity
                        current_equity += pnl
                        df.at[df.index[i], 'exit_signal'] = 'SIGNAL_REVERSAL'
                        in_position = False
                if not in_position:
                    entry_price = None
                    stop_loss = None
                    take_profit = None
                    trade_direction = None
                df.at[df.index[i], 'equity'] = current_equity
                continue
            # Only enter new trade if flat
            if not in_position and signal in ['BUY', 'SELL']:
                atr = row['atr14']
                entry_price = row['close']
                if signal == 'BUY':
                    stop_loss = entry_price - atr * 1.5
                    take_profit = entry_price + atr * current_params['profit_target_multiplier']
                    risk_per_unit = abs(entry_price - stop_loss)
                else:
                    stop_loss = entry_price + atr * 1.5
                    take_profit = entry_price - atr * current_params['profit_target_multiplier']
                    risk_per_unit = abs(entry_price - stop_loss)
                position_size = (current_params['risk_per_trade'] * current_equity) / risk_per_unit
                leverage = (position_size * entry_price) / current_equity
                df.at[df.index[i], 'signal'] = signal
                df.at[df.index[i], 'confidence'] = confidence
                df.at[df.index[i], 'position_size'] = position_size
                df.at[df.index[i], 'leverage'] = leverage
                df.at[df.index[i], 'stop_loss'] = stop_loss
                df.at[df.index[i], 'take_profit'] = take_profit
                in_position = True
                trade_direction = signal
            df.at[df.index[i], 'equity'] = current_equity
        return df