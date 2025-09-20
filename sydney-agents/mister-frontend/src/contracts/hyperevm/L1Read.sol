// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title L1Read
 * @notice Interface for reading data from HyperCore L1 via precompiles
 * @dev Based on official Hyperliquid L1Read.sol specification
 */
contract L1Read {
    // Precompile addresses
    address constant ORACLE_PX_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000807;
    address constant SPOT_META_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000808;
    address constant PERP_META_INFO_PRECOMPILE_ADDRESS = 0x0000000000000000000000000000000000000809;
    address constant PERP_ASSET_INFO_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080a;
    address constant USER_POSITION_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080b;
    address constant USER_SPOT_BALANCE_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080C;
    address constant USER_PERP_BALANCE_PRECOMPILE_ADDRESS = 0x000000000000000000000000000000000000080D;
    
    // Structs for asset information
    struct PerpAssetInfo {
        string name;
        uint8 szDecimals;
    }
    
    struct SpotMeta {
        string name;
        uint32 index;
        string tokenAddress;
        uint8 szDecimals;
        uint8 weiDecimals;
    }
    
    struct PerpMetaInfo {
        string name;
        uint32 index;
        uint8 szDecimals;
    }
    
    struct UserPosition {
        int256 szi;  // Signed size (positive for long, negative for short)
        uint256 entryPx;  // Entry price
        uint256 mtm;  // Mark-to-market value
        int256 pnl;  // Realized P&L
        int256 funding;  // Funding payments
    }
    
    /**
     * @notice Get oracle price for a perpetual asset
     * @param index Perpetual index
     * @return price Oracle price (scaled by 1e6)
     */
    function oraclePx(uint32 index) public view returns (uint64) {
        bool success;
        bytes memory result;
        (success, result) = ORACLE_PX_PRECOMPILE_ADDRESS.staticcall(abi.encode(index));
        require(success, "OraclePx precompile call failed");
        return abi.decode(result, (uint64));
    }
    
    /**
     * @notice Get spot metadata for an asset
     * @param index Spot asset index
     * @return meta Spot metadata
     */
    function spotMeta(uint32 index) public view returns (SpotMeta memory) {
        bool success;
        bytes memory result;
        (success, result) = SPOT_META_PRECOMPILE_ADDRESS.staticcall(abi.encode(index));
        require(success, "SpotMeta precompile call failed");
        
        (string memory name, uint32 idx, string memory tokenAddress, 
         uint8 szDecimals, uint8 weiDecimals) = abi.decode(
            result, 
            (string, uint32, string, uint8, uint8)
        );
        
        return SpotMeta({
            name: name,
            index: idx,
            tokenAddress: tokenAddress,
            szDecimals: szDecimals,
            weiDecimals: weiDecimals
        });
    }
    
    /**
     * @notice Get perpetual metadata
     * @param index Perpetual index
     * @return meta Perpetual metadata
     */
    function perpMetaInfo(uint32 index) public view returns (PerpMetaInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = PERP_META_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(index));
        require(success, "PerpMetaInfo precompile call failed");
        
        (string memory name, uint32 idx, uint8 szDecimals) = abi.decode(
            result,
            (string, uint32, uint8)
        );
        
        return PerpMetaInfo({
            name: name,
            index: idx,
            szDecimals: szDecimals
        });
    }
    
    /**
     * @notice Get perpetual asset information
     * @param index Perpetual index
     * @return info Asset information
     */
    function perpAssetInfo(uint32 index) public view returns (PerpAssetInfo memory) {
        bool success;
        bytes memory result;
        (success, result) = PERP_ASSET_INFO_PRECOMPILE_ADDRESS.staticcall(abi.encode(index));
        require(success, "PerpAssetInfo precompile call failed");
        
        (string memory name, uint8 szDecimals) = abi.decode(result, (string, uint8));
        
        return PerpAssetInfo({
            name: name,
            szDecimals: szDecimals
        });
    }
    
    /**
     * @notice Get user's position for a perpetual
     * @param user User address
     * @param perpIndex Perpetual index
     * @return position User's position data
     */
    function getUserPosition(address user, uint32 perpIndex) public view returns (UserPosition memory) {
        bool success;
        bytes memory result;
        bytes memory params = abi.encode(user, perpIndex);
        (success, result) = USER_POSITION_PRECOMPILE_ADDRESS.staticcall(params);
        require(success, "UserPosition precompile call failed");
        
        (int256 szi, uint256 entryPx, uint256 mtm, int256 pnl, int256 funding) = 
            abi.decode(result, (int256, uint256, uint256, int256, int256));
        
        return UserPosition({
            szi: szi,
            entryPx: entryPx,
            mtm: mtm,
            pnl: pnl,
            funding: funding
        });
    }
    
    /**
     * @notice Get user's spot balance
     * @param user User address
     * @param spotIndex Spot asset index
     * @return balance User's spot balance
     */
    function getUserSpotBalance(address user, uint32 spotIndex) public view returns (uint256) {
        bool success;
        bytes memory result;
        bytes memory params = abi.encode(user, spotIndex);
        (success, result) = USER_SPOT_BALANCE_PRECOMPILE_ADDRESS.staticcall(params);
        require(success, "UserSpotBalance precompile call failed");
        return abi.decode(result, (uint256));
    }
    
    /**
     * @notice Get user's perpetual balance (margin)
     * @param user User address
     * @return balance User's perpetual margin balance
     */
    function getUserPerpBalance(address user) public view returns (int256) {
        bool success;
        bytes memory result;
        (success, result) = USER_PERP_BALANCE_PRECOMPILE_ADDRESS.staticcall(abi.encode(user));
        require(success, "UserPerpBalance precompile call failed");
        return abi.decode(result, (int256));
    }
    
    /**
     * @notice Convert raw oracle price to standard format
     * @param rawPrice Raw price from oracle
     * @param szDecimals Size decimals for the asset
     * @return price Converted price (scaled by 1e18)
     */
    function convertOraclePrice(uint64 rawPrice, uint8 szDecimals) public pure returns (uint256) {
        // Oracle prices are in 1e6, convert to 1e18 and adjust for size decimals
        uint256 divisor = 10 ** (6 - szDecimals);
        return (uint256(rawPrice) * 1e18) / divisor;
    }
    
    /**
     * @notice Get all oracle prices for a list of perpetuals
     * @param indices Array of perpetual indices
     * @return prices Array of oracle prices
     */
    function batchOraclePrices(uint32[] memory indices) public view returns (uint64[] memory) {
        uint64[] memory prices = new uint64[](indices.length);
        for (uint i = 0; i < indices.length; i++) {
            prices[i] = oraclePx(indices[i]);
        }
        return prices;
    }
    
    /**
     * @notice Calculate total portfolio value for a user
     * @param user User address
     * @param perpIndices Perpetual indices to check
     * @param spotIndices Spot indices to check
     * @return totalValue Total portfolio value in USDC (1e6)
     */
    function getPortfolioValue(
        address user,
        uint32[] memory perpIndices,
        uint32[] memory spotIndices
    ) public view returns (uint256 totalValue) {
        // Add perpetual positions value
        for (uint i = 0; i < perpIndices.length; i++) {
            UserPosition memory pos = getUserPosition(user, perpIndices[i]);
            if (pos.szi != 0) {
                totalValue += pos.mtm;
            }
        }
        
        // Add spot balances value
        for (uint i = 0; i < spotIndices.length; i++) {
            uint256 balance = getUserSpotBalance(user, spotIndices[i]);
            if (balance > 0) {
                // Get spot price (assuming oracle provides it)
                uint64 price = oraclePx(spotIndices[i]);
                SpotMeta memory meta = spotMeta(spotIndices[i]);
                
                // Convert balance to value
                uint256 value = (balance * uint256(price)) / (10 ** meta.weiDecimals);
                totalValue += value;
            }
        }
        
        // Add margin balance
        int256 marginBalance = getUserPerpBalance(user);
        if (marginBalance > 0) {
            totalValue += uint256(marginBalance);
        }
        
        return totalValue;
    }
    
    /**
     * @notice Check if a position is at risk of liquidation
     * @param user User address
     * @param perpIndex Perpetual index
     * @param maintenanceMarginRate Maintenance margin rate (basis points)
     * @return atRisk Whether position is at risk
     * @return marginRatio Current margin ratio
     */
    function checkLiquidationRisk(
        address user,
        uint32 perpIndex,
        uint256 maintenanceMarginRate
    ) public view returns (bool atRisk, uint256 marginRatio) {
        UserPosition memory pos = getUserPosition(user, perpIndex);
        if (pos.szi == 0) {
            return (false, 0);
        }
        
        int256 marginBalance = getUserPerpBalance(user);
        uint256 positionValue = pos.mtm;
        
        // Calculate margin ratio
        if (marginBalance > 0 && positionValue > 0) {
            marginRatio = (uint256(marginBalance) * 10000) / positionValue;
            atRisk = marginRatio < maintenanceMarginRate;
        } else {
            atRisk = true;
            marginRatio = 0;
        }
        
        return (atRisk, marginRatio);
    }
}