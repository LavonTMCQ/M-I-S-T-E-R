#!/usr/bin/env python3
"""
HyperEVM Vault Bridge for Hyperliquid Trading Bot
Connects your existing Python trading bot to the AIAgentVault smart contracts
"""

from web3 import Web3
from eth_account import Account
import json
import time
from typing import Dict, Any, Optional
import os
from datetime import datetime

class VaultBridge:
    """Bridge between Hyperliquid trading bot and HyperEVM vault contracts"""
    
    def __init__(self, 
                 rpc_url: str,
                 vault_address: str,
                 ai_agent_private_key: str,
                 testnet: bool = True):
        """
        Initialize vault bridge
        
        Args:
            rpc_url: HyperEVM RPC endpoint
            vault_address: Deployed AIAgentVault contract address
            ai_agent_private_key: Private key for AI agent (authorizes trades)
            testnet: Whether using testnet or mainnet
        """
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        self.vault_address = Web3.to_checksum_address(vault_address)
        self.account = Account.from_key(ai_agent_private_key)
        self.testnet = testnet
        
        # Load contract ABI
        abi_path = '../artifacts/src/contracts/hyperevm/AIAgentVault.sol/AIAgentVault.json'
        with open(abi_path, 'r') as f:
            contract_json = json.load(f)
            self.vault_abi = contract_json['abi']
        
        # Create contract instance
        self.vault = self.w3.eth.contract(
            address=self.vault_address,
            abi=self.vault_abi
        )
        
        print(f"✅ Vault Bridge initialized")
        print(f"   Network: {'Testnet' if testnet else 'Mainnet'}")
        print(f"   Vault: {vault_address}")
        print(f"   AI Agent: {self.account.address}")
    
    def get_perp_index(self, symbol: str) -> int:
        """
        Convert symbol to perpetual index
        
        Args:
            symbol: Trading symbol (e.g., "BTC", "ETH", "SOL")
            
        Returns:
            Perpetual index for Hyperliquid
        """
        # Map symbols to Hyperliquid perpetual indices
        perp_map = {
            "BTC": 0,
            "ETH": 1,
            "SOL": 8,
            "ARB": 6,
            "MATIC": 22,
            "AVAX": 19,
            "ATOM": 24,
            "OP": 34,
            "INJ": 36,
            "SUI": 44,
            "TIA": 48,
            "SEI": 52,
            "MEME": 64,
            "ADA": 67,
            # Add more as needed
        }
        
        if symbol not in perp_map:
            raise ValueError(f"Unknown symbol: {symbol}")
        
        return perp_map[symbol]
    
    def authorize_trade(self,
                       symbol: str,
                       is_long: bool,
                       size_usdc: float,
                       leverage: float = 2.0,
                       max_slippage_bps: int = 100,
                       stop_loss: float = 0,
                       take_profit: float = 0) -> Dict[str, Any]:
        """
        Authorize a trade through the vault contract
        
        Args:
            symbol: Trading symbol (e.g., "SOL")
            is_long: True for long, False for short
            size_usdc: Position size in USDC
            leverage: Leverage multiplier (e.g., 2.0 for 2x)
            max_slippage_bps: Maximum slippage in basis points (100 = 1%)
            stop_loss: Stop loss price (0 for none)
            take_profit: Take profit price (0 for none)
            
        Returns:
            Transaction receipt with signal ID
        """
        try:
            perp_index = self.get_perp_index(symbol)
            
            # Convert values to Wei (USDC has 6 decimals on HyperEVM)
            size_wei = int(size_usdc * 10**6)
            leverage_int = int(leverage)
            stop_loss_wei = int(stop_loss * 10**6) if stop_loss > 0 else 0
            take_profit_wei = int(take_profit * 10**6) if take_profit > 0 else 0
            
            print(f"\n📊 Authorizing trade:")
            print(f"   Symbol: {symbol} (index: {perp_index})")
            print(f"   Direction: {'LONG' if is_long else 'SHORT'}")
            print(f"   Size: ${size_usdc} USDC")
            print(f"   Leverage: {leverage}x")
            
            # Build transaction
            nonce = self.w3.eth.get_transaction_count(self.account.address)
            
            tx = self.vault.functions.authorizeTrade(
                perp_index,
                is_long,
                size_wei,
                leverage_int,
                max_slippage_bps,
                stop_loss_wei,
                take_profit_wei
            ).build_transaction({
                'from': self.account.address,
                'nonce': nonce,
                'gas': 300000,
                'gasPrice': self.w3.eth.gas_price,
                'chainId': 998 if self.testnet else 1337
            })
            
            # Sign transaction
            signed_tx = self.account.sign_transaction(tx)
            
            # Send transaction
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
            print(f"   TX Hash: {tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
            
            if receipt['status'] == 1:
                # Parse events to get signal ID
                logs = self.vault.events.TradeAuthorized().process_receipt(receipt)
                if logs:
                    signal_id = logs[0]['args']['signalId']
                    print(f"   ✅ Trade authorized! Signal ID: {signal_id.hex()}")
                    
                    return {
                        'success': True,
                        'tx_hash': tx_hash.hex(),
                        'signal_id': signal_id.hex(),
                        'gas_used': receipt['gasUsed']
                    }
                else:
                    print("   ⚠️ Trade authorized but no signal ID found")
                    return {
                        'success': True,
                        'tx_hash': tx_hash.hex(),
                        'signal_id': None,
                        'gas_used': receipt['gasUsed']
                    }
            else:
                print(f"   ❌ Transaction failed")
                return {
                    'success': False,
                    'tx_hash': tx_hash.hex(),
                    'error': 'Transaction reverted'
                }
                
        except Exception as e:
            print(f"   ❌ Authorization failed: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_vault_stats(self) -> Dict[str, Any]:
        """Get current vault statistics"""
        try:
            total_deposits = self.vault.functions.totalDeposits().call()
            total_shares = self.vault.functions.totalShares().call()
            
            # Get performance data
            performance = self.vault.functions.performance().call()
            
            stats = {
                'total_deposits': total_deposits / 10**6,  # Convert from Wei to USDC
                'total_shares': total_shares / 10**6,
                'total_pnl': performance[0] / 10**6,
                'win_count': performance[1],
                'loss_count': performance[2],
                'total_volume': performance[3] / 10**6,
                'sharpe_ratio': performance[4] / 10**18,
                'max_drawdown': performance[5] / 100,  # Convert from basis points
            }
            
            return stats
            
        except Exception as e:
            print(f"Error getting vault stats: {e}")
            return {}
    
    def check_authorization_status(self, signal_id: str) -> bool:
        """Check if a trade authorization has been executed"""
        try:
            auth = self.vault.functions.tradeAuthorizations(signal_id).call()
            return auth[9]  # 'executed' field
        except:
            return False


class TradingBotIntegration:
    """Integration layer for existing Hyperliquid trading bot"""
    
    def __init__(self, vault_bridge: VaultBridge):
        self.vault = vault_bridge
        self.pending_authorizations = []
    
    def on_trading_signal(self, signal: Dict[str, Any]) -> Optional[str]:
        """
        Called when your trading bot generates a signal
        
        Args:
            signal: Trading signal from your bot
                {
                    'symbol': 'SOL',
                    'action': 'long',  # or 'short'
                    'size_usdc': 100,
                    'leverage': 2,
                    'confidence': 0.85
                }
        
        Returns:
            Signal ID if authorized, None otherwise
        """
        # Only authorize high confidence trades
        if signal.get('confidence', 0) < 0.7:
            print(f"⚠️ Skipping low confidence signal: {signal['confidence']}")
            return None
        
        # Authorize through vault
        result = self.vault.authorize_trade(
            symbol=signal['symbol'],
            is_long=(signal['action'] == 'long'),
            size_usdc=signal['size_usdc'],
            leverage=signal.get('leverage', 1),
            max_slippage_bps=100,  # 1% slippage
            stop_loss=signal.get('stop_loss', 0),
            take_profit=signal.get('take_profit', 0)
        )
        
        if result['success']:
            self.pending_authorizations.append({
                'signal_id': result['signal_id'],
                'timestamp': datetime.now(),
                'signal': signal
            })
            return result['signal_id']
        
        return None
    
    def check_pending_executions(self):
        """Check if pending authorizations have been executed"""
        for auth in self.pending_authorizations[:]:
            if self.vault.check_authorization_status(auth['signal_id']):
                print(f"✅ Trade executed: {auth['signal_id']}")
                self.pending_authorizations.remove(auth)
            elif (datetime.now() - auth['timestamp']).seconds > 300:
                print(f"⏰ Authorization expired: {auth['signal_id']}")
                self.pending_authorizations.remove(auth)


# Example usage
if __name__ == "__main__":
    # Configuration
    TESTNET = True
    
    if TESTNET:
        RPC_URL = "https://rpc.hyperliquid-testnet.xyz/evm"
        VAULT_ADDRESS = "0x..."  # Your deployed vault address
    else:
        RPC_URL = "https://api.hyperliquid.xyz/evm"
        VAULT_ADDRESS = "0x..."  # Mainnet vault address
    
    # Use environment variable or config file for private key
    AI_AGENT_PRIVATE_KEY = os.getenv("AI_AGENT_PRIVATE_KEY", "your_private_key_here")
    
    # Initialize bridge
    bridge = VaultBridge(
        rpc_url=RPC_URL,
        vault_address=VAULT_ADDRESS,
        ai_agent_private_key=AI_AGENT_PRIVATE_KEY,
        testnet=TESTNET
    )
    
    # Get vault stats
    stats = bridge.get_vault_stats()
    print(f"\n📊 Vault Statistics:")
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # Example: Authorize a test trade
    if input("\nAuthorize test trade? (y/n): ").lower() == 'y':
        result = bridge.authorize_trade(
            symbol="SOL",
            is_long=True,
            size_usdc=10,  # Small test size
            leverage=2
        )
        
        if result['success']:
            print(f"\n🎉 Test trade authorized successfully!")
            print(f"   Signal ID: {result['signal_id']}")
            print(f"   Monitor keeper bot for execution...")