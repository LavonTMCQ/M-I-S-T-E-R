// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./AIAgentVault.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title VaultFactory
 * @notice Factory contract for deploying AI Agent Vaults with performance tracking
 * @dev Manages vault creation, registry, and on-chain performance leaderboard
 */
contract VaultFactory is Ownable {
    // Registry of all deployed vaults
    address[] public allVaults;
    mapping(address => address[]) public userVaults;
    mapping(address => bool) public isVault;
    mapping(address => VaultMetadata) public vaultMetadata;
    
    // Performance tracking
    mapping(address => PerformanceRecord) public vaultPerformance;
    address[] public leaderboard; // Sorted by performance
    
    // Factory configuration
    uint256 public maxVaultsPerUser = 10;
    uint256 public vaultCreationFee = 0.1 ether; // In HYPE
    address public feeRecipient;
    address public defaultDepositToken; // USDC on HyperEVM
    
    // Vault metadata
    struct VaultMetadata {
        string name;
        string description;
        address creator;
        uint256 createdAt;
        bool isActive;
        string strategyType; // "momentum", "arbitrage", "market-making", etc.
        uint256 targetAUM; // Target assets under management
    }
    
    // Performance record for leaderboard
    struct PerformanceRecord {
        uint256 totalReturn; // Percentage return (basis points)
        uint256 sharpeRatio; // Scaled by 1e18
        uint256 maxDrawdown; // Maximum drawdown (basis points)
        uint256 winRate; // Win rate (basis points)
        uint256 totalVolume; // Total trading volume
        uint256 aum; // Current assets under management
        uint256 lastUpdated;
        uint256 rank; // Position in leaderboard
    }
    
    // Events
    event VaultCreated(
        address indexed vault,
        address indexed creator,
        string name,
        address aiAgent,
        address keeperBot
    );
    event PerformanceUpdated(
        address indexed vault,
        uint256 totalReturn,
        uint256 sharpeRatio,
        uint256 aum
    );
    event LeaderboardUpdated(address[] topVaults);
    
    constructor(address _defaultDepositToken, address _feeRecipient) Ownable(msg.sender) {
        defaultDepositToken = _defaultDepositToken;
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @notice Create a new AI Agent Vault
     * @param name Vault name
     * @param description Vault description
     * @param strategyType Trading strategy type
     * @param aiAgent AI agent address
     * @param keeperBot Keeper bot address
     * @param tradingConfig Initial trading configuration
     * @return vault Address of the deployed vault
     */
    function createVault(
        string memory name,
        string memory description,
        string memory strategyType,
        address aiAgent,
        address keeperBot,
        AIAgentVault.TradingConfig memory tradingConfig
    ) external payable returns (address vault) {
        require(msg.value >= vaultCreationFee, "Insufficient creation fee");
        require(userVaults[msg.sender].length < maxVaultsPerUser, "Max vaults reached");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name length");
        
        // Deploy new vault
        vault = address(new AIAgentVault(
            defaultDepositToken,
            keeperBot,
            aiAgent
        ));
        
        // Configure vault
        AIAgentVault(vault).updateTradingConfig(tradingConfig);
        
        // Transfer ownership to creator
        AIAgentVault(vault).transferOwnership(msg.sender);
        
        // Update registry
        allVaults.push(vault);
        userVaults[msg.sender].push(vault);
        isVault[vault] = true;
        
        // Store metadata
        vaultMetadata[vault] = VaultMetadata({
            name: name,
            description: description,
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true,
            strategyType: strategyType,
            targetAUM: 0
        });
        
        // Initialize performance record
        vaultPerformance[vault] = PerformanceRecord({
            totalReturn: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            winRate: 0,
            totalVolume: 0,
            aum: 0,
            lastUpdated: block.timestamp,
            rank: allVaults.length
        });
        
        // Send creation fee to recipient
        if (msg.value > 0) {
            (bool sent, ) = feeRecipient.call{value: msg.value}("");
            require(sent, "Fee transfer failed");
        }
        
        emit VaultCreated(vault, msg.sender, name, aiAgent, keeperBot);
        
        return vault;
    }
    
    /**
     * @notice Update performance metrics for a vault
     * @param vault Vault address
     * @dev Can only be called by the vault's keeper bot
     */
    function updatePerformance(address vault) external {
        require(isVault[vault], "Not a registered vault");
        
        AIAgentVault vaultContract = AIAgentVault(vault);
        require(msg.sender == vaultContract.keeperBot(), "Only keeper bot");
        
        // Get performance data from vault
        uint256 vaultValue = vaultContract.getVaultValue();
        uint256 totalDeposits = vaultContract.totalDeposits();
        (uint256 totalPnL, uint256 winCount, uint256 lossCount, uint256 totalVolume, uint256 sharpeRatio, uint256 maxDrawdown, uint256 lastUpdate) = vaultContract.performance();
        
        // Calculate total return
        uint256 totalReturn = 0;
        if (totalDeposits > 0) {
            if (vaultValue > totalDeposits) {
                totalReturn = ((vaultValue - totalDeposits) * 10000) / totalDeposits;
            }
        }
        
        // Calculate win rate
        uint256 totalTrades = winCount + lossCount;
        uint256 winRateCalc = totalTrades > 0 ? (winCount * 10000) / totalTrades : 0;
        
        // Update performance record
        PerformanceRecord storage record = vaultPerformance[vault];
        record.totalReturn = totalReturn;
        record.sharpeRatio = sharpeRatio;
        record.maxDrawdown = maxDrawdown;
        record.winRate = winRateCalc;
        record.totalVolume = totalVolume;
        record.aum = vaultValue;
        record.lastUpdated = block.timestamp;
        
        emit PerformanceUpdated(vault, totalReturn, sharpeRatio, vaultValue);
        
        // Update leaderboard
        _updateLeaderboard();
    }
    
    /**
     * @notice Update the performance leaderboard
     * @dev Sorts vaults by composite score
     */
    function _updateLeaderboard() private {
        // Simple bubble sort for small arrays
        // In production, use more efficient sorting
        uint256 n = allVaults.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (_comparePerformance(allVaults[j], allVaults[j + 1]) < 0) {
                    address temp = allVaults[j];
                    allVaults[j] = allVaults[j + 1];
                    allVaults[j + 1] = temp;
                }
            }
        }
        
        // Update ranks
        for (uint256 i = 0; i < n; i++) {
            vaultPerformance[allVaults[i]].rank = i + 1;
        }
        
        // Copy top vaults to leaderboard
        delete leaderboard;
        uint256 leaderboardSize = n < 100 ? n : 100; // Top 100
        for (uint256 i = 0; i < leaderboardSize; i++) {
            leaderboard.push(allVaults[i]);
        }
        
        emit LeaderboardUpdated(leaderboard);
    }
    
    /**
     * @notice Compare performance of two vaults
     * @param vaultA First vault
     * @param vaultB Second vault
     * @return comparison 1 if A > B, -1 if A < B, 0 if equal
     */
    function _comparePerformance(address vaultA, address vaultB) private view returns (int256) {
        PerformanceRecord memory perfA = vaultPerformance[vaultA];
        PerformanceRecord memory perfB = vaultPerformance[vaultB];
        
        // Composite score: 40% return, 30% Sharpe, 20% AUM, 10% volume
        uint256 scoreA = (perfA.totalReturn * 40) / 100 +
                         (perfA.sharpeRatio * 30) / 1e18 / 100 +
                         (perfA.aum * 20) / 1e6 / 100 +
                         (perfA.totalVolume * 10) / 1e6 / 100;
                         
        uint256 scoreB = (perfB.totalReturn * 40) / 100 +
                         (perfB.sharpeRatio * 30) / 1e18 / 100 +
                         (perfB.aum * 20) / 1e6 / 100 +
                         (perfB.totalVolume * 10) / 1e6 / 100;
        
        if (scoreA > scoreB) return 1;
        if (scoreA < scoreB) return -1;
        return 0;
    }
    
    /**
     * @notice Get top performing vaults
     * @param count Number of vaults to return
     * @return vaults Array of vault addresses
     * @return performances Array of performance records
     */
    function getTopVaults(uint256 count) 
        external 
        view 
        returns (
            address[] memory vaults,
            PerformanceRecord[] memory performances
        ) 
    {
        uint256 returnCount = count < leaderboard.length ? count : leaderboard.length;
        vaults = new address[](returnCount);
        performances = new PerformanceRecord[](returnCount);
        
        for (uint256 i = 0; i < returnCount; i++) {
            vaults[i] = leaderboard[i];
            performances[i] = vaultPerformance[leaderboard[i]];
        }
        
        return (vaults, performances);
    }
    
    /**
     * @notice Get all vaults created by a user
     * @param user User address
     * @return Array of vault addresses
     */
    function getUserVaults(address user) external view returns (address[] memory) {
        return userVaults[user];
    }
    
    /**
     * @notice Get detailed vault information
     * @param vault Vault address
     * @return metadata Vault metadata
     * @return performance Performance record
     */
    function getVaultDetails(address vault)
        external
        view
        returns (
            VaultMetadata memory metadata,
            PerformanceRecord memory performance
        )
    {
        require(isVault[vault], "Not a registered vault");
        return (vaultMetadata[vault], vaultPerformance[vault]);
    }
    
    /**
     * @notice Search vaults by strategy type
     * @param strategyType Strategy type to search for
     * @return Array of matching vault addresses
     */
    function searchVaultsByStrategy(string memory strategyType) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 count = 0;
        
        // Count matching vaults
        for (uint256 i = 0; i < allVaults.length; i++) {
            if (keccak256(bytes(vaultMetadata[allVaults[i]].strategyType)) == 
                keccak256(bytes(strategyType))) {
                count++;
            }
        }
        
        // Collect matching vaults
        address[] memory matches = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allVaults.length; i++) {
            if (keccak256(bytes(vaultMetadata[allVaults[i]].strategyType)) == 
                keccak256(bytes(strategyType))) {
                matches[index++] = allVaults[i];
            }
        }
        
        return matches;
    }
    
    /**
     * @notice Deactivate a vault
     * @param vault Vault address
     * @dev Can only be called by vault creator
     */
    function deactivateVault(address vault) external {
        require(isVault[vault], "Not a registered vault");
        require(vaultMetadata[vault].creator == msg.sender, "Not vault creator");
        
        vaultMetadata[vault].isActive = false;
    }
    
    /**
     * @notice Update factory configuration
     * @param _maxVaultsPerUser New maximum vaults per user
     * @param _vaultCreationFee New vault creation fee
     */
    function updateConfig(
        uint256 _maxVaultsPerUser,
        uint256 _vaultCreationFee
    ) external onlyOwner {
        maxVaultsPerUser = _maxVaultsPerUser;
        vaultCreationFee = _vaultCreationFee;
    }
    
    /**
     * @notice Update fee recipient
     * @param _feeRecipient New fee recipient address
     */
    function updateFeeRecipient(address _feeRecipient) external onlyOwner {
        feeRecipient = _feeRecipient;
    }
    
    /**
     * @notice Get total number of vaults
     * @return Total vault count
     */
    function getTotalVaults() external view returns (uint256) {
        return allVaults.length;
    }
    
    /**
     * @notice Get aggregate statistics across all vaults
     * @return totalAUM Total assets under management
     * @return totalVolume Total trading volume
     * @return averageReturn Average return across all vaults
     */
    function getAggregateStats() 
        external 
        view 
        returns (
            uint256 totalAUM,
            uint256 totalVolume,
            uint256 averageReturn
        ) 
    {
        uint256 sumReturns = 0;
        uint256 activeVaults = 0;
        
        for (uint256 i = 0; i < allVaults.length; i++) {
            address vault = allVaults[i];
            if (vaultMetadata[vault].isActive) {
                totalAUM += vaultPerformance[vault].aum;
                totalVolume += vaultPerformance[vault].totalVolume;
                sumReturns += vaultPerformance[vault].totalReturn;
                activeVaults++;
            }
        }
        
        averageReturn = activeVaults > 0 ? sumReturns / activeVaults : 0;
        
        return (totalAUM, totalVolume, averageReturn);
    }
}