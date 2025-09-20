// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AIAgentVault
 * @notice Trustless vault for AI-managed trading on Hyperliquid
 * @dev Integrates with HyperCore precompiles for oracle prices and trading
 */
contract AIAgentVault is Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // HyperCore Precompile Addresses
    address constant ORACLE_PX_PRECOMPILE = 0x0000000000000000000000000000000000000807;
    address constant PERP_ASSET_INFO_PRECOMPILE = 0x000000000000000000000000000000000000080a;
    address constant USER_POSITION_PRECOMPILE = 0x000000000000000000000000000000000000080b;
    address constant SPOT_META_PRECOMPILE = 0x0000000000000000000000000000000000000808;
    
    // Vault Configuration
    IERC20 public immutable depositToken; // USDC on HyperEVM
    address public keeperBot; // Authorized keeper bot address
    address public aiAgent; // AI agent that generates signals
    
    // Vault State
    uint256 public totalDeposits;
    uint256 public totalWithdrawals;
    uint256 public highWaterMark;
    uint256 public lastPerformanceUpdate;
    
    // User Balances
    mapping(address => uint256) public userDeposits;
    mapping(address => uint256) public userShares;
    uint256 public totalShares;
    
    // Trading Parameters
    struct TradingConfig {
        uint256 maxPositionSize; // Maximum position size in USDC
        uint256 maxLeverage; // Maximum leverage (10 = 10x)
        uint256 maxDrawdown; // Maximum drawdown before pause (basis points)
        uint256 performanceFee; // Performance fee (basis points)
        uint256 managementFee; // Annual management fee (basis points)
        uint32[] allowedAssets; // Allowed perpetual indices
    }
    TradingConfig public tradingConfig;
    
    // Trading Authorization
    struct TradeAuthorization {
        uint32 perpIndex; // Perpetual index to trade
        bool isLong; // Direction
        uint256 size; // Position size in USDC
        uint256 leverage; // Leverage amount
        uint256 maxSlippage; // Maximum allowed slippage (basis points)
        uint256 stopLoss; // Stop loss price (0 for none)
        uint256 takeProfit; // Take profit price (0 for none)
        uint256 expiry; // Authorization expiry timestamp
        bytes32 signalId; // Unique signal identifier
        bool executed; // Whether trade was executed
    }
    
    mapping(bytes32 => TradeAuthorization) public tradeAuthorizations;
    bytes32[] public pendingAuthorizations;
    
    // Performance Tracking
    struct Performance {
        uint256 totalPnL; // Total profit/loss
        uint256 winCount; // Number of winning trades
        uint256 lossCount; // Number of losing trades
        uint256 totalVolume; // Total trading volume
        uint256 sharpeRatio; // Sharpe ratio (scaled by 1e18)
        uint256 maxDrawdown; // Maximum drawdown experienced
        uint256 lastUpdate; // Last performance update
    }
    Performance public performance;
    
    // Events
    event Deposit(address indexed user, uint256 amount, uint256 shares);
    event Withdrawal(address indexed user, uint256 amount, uint256 shares);
    event TradeAuthorized(
        bytes32 indexed signalId,
        uint32 perpIndex,
        bool isLong,
        uint256 size,
        uint256 leverage
    );
    event TradeExecuted(
        bytes32 indexed signalId,
        uint256 executionPrice,
        uint256 actualSize
    );
    event PerformanceUpdated(
        uint256 totalPnL,
        uint256 sharpeRatio,
        uint256 timestamp
    );
    event EmergencyStop(string reason, uint256 timestamp);
    
    // Modifiers
    modifier onlyKeeperBot() {
        require(msg.sender == keeperBot, "Only keeper bot");
        _;
    }
    
    modifier onlyAIAgent() {
        require(msg.sender == aiAgent, "Only AI agent");
        _;
    }
    
    /**
     * @notice Initialize the vault
     * @param _depositToken USDC token address on HyperEVM
     * @param _keeperBot Keeper bot address
     * @param _aiAgent AI agent address
     */
    constructor(
        address _depositToken,
        address _keeperBot,
        address _aiAgent
    ) Ownable(msg.sender) {
        depositToken = IERC20(_depositToken);
        keeperBot = _keeperBot;
        aiAgent = _aiAgent;
        
        // Default trading configuration
        tradingConfig = TradingConfig({
            maxPositionSize: 100000 * 1e6, // 100k USDC
            maxLeverage: 10, // 10x max
            maxDrawdown: 2000, // 20% max drawdown
            performanceFee: 2000, // 20% performance fee
            managementFee: 200, // 2% annual management fee
            allowedAssets: new uint32[](0)
        });
        
        lastPerformanceUpdate = block.timestamp;
    }
    
    /**
     * @notice Deposit USDC into the vault
     * @param amount Amount of USDC to deposit
     */
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        
        // Calculate shares
        uint256 shares;
        if (totalShares == 0) {
            shares = amount; // First deposit, 1:1 ratio
        } else {
            shares = (amount * totalShares) / getVaultValue();
        }
        
        // Update state
        userDeposits[msg.sender] += amount;
        userShares[msg.sender] += shares;
        totalShares += shares;
        totalDeposits += amount;
        
        // Transfer tokens
        depositToken.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposit(msg.sender, amount, shares);
    }
    
    /**
     * @notice Withdraw USDC from the vault
     * @param shares Number of shares to redeem
     */
    function withdraw(uint256 shares) external nonReentrant {
        require(shares > 0 && shares <= userShares[msg.sender], "Invalid shares");
        
        // Calculate withdrawal amount
        uint256 amount = (shares * getVaultValue()) / totalShares;
        
        // Apply fees if in profit
        if (amount > userDeposits[msg.sender]) {
            uint256 profit = amount - userDeposits[msg.sender];
            uint256 performanceFeeAmount = (profit * tradingConfig.performanceFee) / 10000;
            amount -= performanceFeeAmount;
        }
        
        // Update state
        userShares[msg.sender] -= shares;
        totalShares -= shares;
        totalWithdrawals += amount;
        
        // Proportionally reduce user deposits
        userDeposits[msg.sender] = (userDeposits[msg.sender] * userShares[msg.sender]) / 
                                    (userShares[msg.sender] + shares);
        
        // Transfer tokens
        depositToken.safeTransfer(msg.sender, amount);
        
        emit Withdrawal(msg.sender, amount, shares);
    }
    
    /**
     * @notice Authorize a trade (called by AI agent)
     * @param perpIndex Perpetual index to trade
     * @param isLong Trade direction
     * @param size Position size in USDC
     * @param leverage Leverage amount
     * @param maxSlippage Maximum allowed slippage
     * @param stopLoss Stop loss price
     * @param takeProfit Take profit price
     */
    function authorizeTrade(
        uint32 perpIndex,
        bool isLong,
        uint256 size,
        uint256 leverage,
        uint256 maxSlippage,
        uint256 stopLoss,
        uint256 takeProfit
    ) external onlyAIAgent returns (bytes32) {
        // Validate parameters
        require(size <= tradingConfig.maxPositionSize, "Position too large");
        require(leverage <= tradingConfig.maxLeverage, "Leverage too high");
        require(isAllowedAsset(perpIndex), "Asset not allowed");
        
        // Check vault has sufficient capital
        uint256 requiredCapital = size / leverage; // Initial margin
        require(getAvailableCapital() >= requiredCapital, "Insufficient capital");
        
        // Generate unique signal ID
        bytes32 signalId = keccak256(
            abi.encodePacked(perpIndex, isLong, size, block.timestamp, block.number)
        );
        
        // Create authorization
        tradeAuthorizations[signalId] = TradeAuthorization({
            perpIndex: perpIndex,
            isLong: isLong,
            size: size,
            leverage: leverage,
            maxSlippage: maxSlippage,
            stopLoss: stopLoss,
            takeProfit: takeProfit,
            expiry: block.timestamp + 5 minutes, // 5 minute expiry
            signalId: signalId,
            executed: false
        });
        
        pendingAuthorizations.push(signalId);
        
        emit TradeAuthorized(signalId, perpIndex, isLong, size, leverage);
        
        return signalId;
    }
    
    /**
     * @notice Execute an authorized trade (called by keeper bot)
     * @param signalId Signal ID of the authorized trade
     * @param executionPrice Actual execution price from L1
     * @param actualSize Actual executed size
     */
    function executeTradeConfirmation(
        bytes32 signalId,
        uint256 executionPrice,
        uint256 actualSize
    ) external onlyKeeperBot {
        TradeAuthorization storage auth = tradeAuthorizations[signalId];
        
        require(!auth.executed, "Already executed");
        require(block.timestamp <= auth.expiry, "Authorization expired");
        require(actualSize <= auth.size, "Size exceeds authorization");
        
        // Mark as executed
        auth.executed = true;
        
        // Remove from pending
        _removePendingAuthorization(signalId);
        
        // Update trading volume
        performance.totalVolume += actualSize;
        
        emit TradeExecuted(signalId, executionPrice, actualSize);
    }
    
    /**
     * @notice Update performance metrics (called by keeper bot)
     * @param totalPnL Current total P&L
     * @param sharpeRatio Current Sharpe ratio
     */
    function updatePerformance(
        uint256 totalPnL,
        uint256 sharpeRatio
    ) external onlyKeeperBot {
        performance.totalPnL = totalPnL;
        performance.sharpeRatio = sharpeRatio;
        performance.lastUpdate = block.timestamp;
        
        // Update high water mark for performance fees
        uint256 currentValue = getVaultValue();
        if (currentValue > highWaterMark) {
            highWaterMark = currentValue;
        }
        
        // Check drawdown and pause if necessary
        if (highWaterMark > 0) {
            uint256 drawdown = ((highWaterMark - currentValue) * 10000) / highWaterMark;
            if (drawdown > tradingConfig.maxDrawdown) {
                _pause();
                emit EmergencyStop("Max drawdown exceeded", block.timestamp);
            }
            
            if (drawdown > performance.maxDrawdown) {
                performance.maxDrawdown = drawdown;
            }
        }
        
        lastPerformanceUpdate = block.timestamp;
        
        emit PerformanceUpdated(totalPnL, sharpeRatio, block.timestamp);
    }
    
    /**
     * @notice Get current oracle price from HyperCore
     * @param perpIndex Perpetual index
     * @return price Oracle price (scaled by 1e6)
     */
    function getOraclePrice(uint32 perpIndex) public view returns (uint64) {
        (bool success, bytes memory result) = ORACLE_PX_PRECOMPILE.staticcall(
            abi.encode(perpIndex)
        );
        require(success, "Oracle price fetch failed");
        return abi.decode(result, (uint64));
    }
    
    /**
     * @notice Get current vault value in USDC
     * @return Total vault value
     */
    function getVaultValue() public view returns (uint256) {
        uint256 balance = depositToken.balanceOf(address(this));
        // Add unrealized P&L from open positions (would be tracked by keeper bot)
        return balance + performance.totalPnL;
    }
    
    /**
     * @notice Get available capital for trading
     * @return Available capital in USDC
     */
    function getAvailableCapital() public view returns (uint256) {
        uint256 balance = depositToken.balanceOf(address(this));
        // Reserve 10% for withdrawals
        uint256 reserved = (balance * 1000) / 10000;
        return balance > reserved ? balance - reserved : 0;
    }
    
    /**
     * @notice Check if an asset is allowed for trading
     * @param perpIndex Perpetual index to check
     * @return Whether the asset is allowed
     */
    function isAllowedAsset(uint32 perpIndex) public view returns (bool) {
        for (uint i = 0; i < tradingConfig.allowedAssets.length; i++) {
            if (tradingConfig.allowedAssets[i] == perpIndex) {
                return true;
            }
        }
        return tradingConfig.allowedAssets.length == 0; // Allow all if none specified
    }
    
    /**
     * @notice Remove a signal from pending authorizations
     * @param signalId Signal ID to remove
     */
    function _removePendingAuthorization(bytes32 signalId) private {
        for (uint i = 0; i < pendingAuthorizations.length; i++) {
            if (pendingAuthorizations[i] == signalId) {
                pendingAuthorizations[i] = pendingAuthorizations[pendingAuthorizations.length - 1];
                pendingAuthorizations.pop();
                break;
            }
        }
    }
    
    // Admin functions
    
    /**
     * @notice Update trading configuration
     * @param config New trading configuration
     */
    function updateTradingConfig(TradingConfig memory config) external onlyOwner {
        tradingConfig = config;
    }
    
    /**
     * @notice Update keeper bot address
     * @param _keeperBot New keeper bot address
     */
    function updateKeeperBot(address _keeperBot) external onlyOwner {
        keeperBot = _keeperBot;
    }
    
    /**
     * @notice Update AI agent address
     * @param _aiAgent New AI agent address
     */
    function updateAIAgent(address _aiAgent) external onlyOwner {
        aiAgent = _aiAgent;
    }
    
    /**
     * @notice Emergency pause
     */
    function emergencyPause() external onlyOwner {
        _pause();
        emit EmergencyStop("Manual pause", block.timestamp);
    }
    
    /**
     * @notice Resume operations
     */
    function resume() external onlyOwner {
        _unpause();
    }
}