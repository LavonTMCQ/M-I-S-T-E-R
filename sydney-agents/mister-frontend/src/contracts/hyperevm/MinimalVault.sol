// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title MinimalVault
 * @notice Ultra-minimal vault for HyperEVM's 2M gas limit
 * @dev Stripped down to absolute essentials for deployment
 */
contract MinimalVault {
    address public owner;
    address public aiAgent;
    mapping(address => uint256) public balances;
    
    uint256 public totalDeposits;
    bool public tradingAuthorized;
    
    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event TradeAuthorized(uint256 amount);
    event TradeExecuted(bool success);
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAI() {
        require(msg.sender == aiAgent, "Not AI");
        _;
    }
    
    constructor(address _aiAgent) {
        owner = msg.sender;
        aiAgent = _aiAgent;
    }
    
    // Deposit HYPE
    function deposit() external payable {
        require(msg.value > 0, "Zero deposit");
        balances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        emit Deposit(msg.sender, msg.value);
    }
    
    // Withdraw HYPE
    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        totalDeposits -= amount;
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        emit Withdraw(msg.sender, amount);
    }
    
    // AI authorizes trade
    function authorizeTrade(uint256 amount) external onlyAI {
        require(amount <= totalDeposits, "Exceeds deposits");
        tradingAuthorized = true;
        emit TradeAuthorized(amount);
    }
    
    // Execute authorized trade
    function executeTrade(address target, bytes calldata data) external onlyOwner {
        require(tradingAuthorized, "Not authorized");
        tradingAuthorized = false;
        
        (bool success, ) = target.call(data);
        emit TradeExecuted(success);
    }
    
    // Emergency withdrawal by owner
    function emergencyWithdraw() external onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    // Update AI agent
    function updateAI(address newAI) external onlyOwner {
        aiAgent = newAI;
    }
    
    receive() external payable {}
}