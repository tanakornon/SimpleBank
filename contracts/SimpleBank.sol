// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract SimpleBank {
    uint256 public constant INTEREST_RATE = 1; // 0.01% per block
    uint256 public constant LOAN_INTEREST_RATE = 10; // 0.1% per block
    uint256 public constant RESERVE_RATIO = 50; // 50%

    IERC20 public token;

    struct Account {
        uint256 balance;
        uint256 lastBalanceBlock;
        uint256 loan;
        uint256 baseLoan;
        uint256 lastLoanBlock;
    }

    mapping(address => Account) public accounts;

    uint256 public totalDeposits;
    uint256 public totalLoans;

    event Deposit(address indexed account, uint256 amount);
    event Withdrawal(address indexed account, uint256 amount);
    event Borrow(address indexed account, uint256 amount);
    event Repayment(address indexed account, uint256 amount);

    constructor(address tokenAddress) {
        token = IERC20(tokenAddress);
    }

    function deposit(uint256 amount) external {
        Account storage account = accounts[msg.sender];

        require(amount > 0, "Invalid deposit amount");
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        uint256 interest = calculateBalanceInterest(msg.sender);

        account.balance += interest;
        account.balance += amount;
        account.lastBalanceBlock = block.number;

        totalDeposits += interest;
        totalDeposits += amount;

        emit Deposit(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        Account storage account = accounts[msg.sender];

        uint256 reserveBalance = (totalDeposits * RESERVE_RATIO) / 100;
        uint256 interest = calculateBalanceInterest(msg.sender);

        require(amount > 0, "Invalid withdrawal amount");
        require(account.balance + interest >= amount, "Insufficient balance");
        require(reserveBalance >= amount, "Bank run!!!");
        require(token.transfer(msg.sender, amount), "Transfer failed");

        account.balance += interest;
        account.balance -= amount;
        account.lastBalanceBlock = block.number;

        totalDeposits += interest;
        totalDeposits -= amount;

        emit Withdrawal(msg.sender, amount);
    }

    function borrow(uint256 amount) external {
        Account storage account = accounts[msg.sender];

        uint256 reserveBalance = (totalDeposits * RESERVE_RATIO) / 100;

        require(amount > 0, "Invalid borrow amount");
        require(account.loan == 0, "You already have a loan");
        require(reserveBalance >= amount, "Bank run!!!");
        require(token.transfer(msg.sender, amount), "Transfer failed");

        account.loan = amount;
        account.baseLoan = amount;
        account.lastLoanBlock = block.number;

        totalDeposits -= amount;

        emit Borrow(msg.sender, amount);
    }

    function repay(uint256 amount) external {
        Account storage account = accounts[msg.sender];

        uint256 interest = calculateLoanInterest(msg.sender);

        require(account.loan > 0, "You don't have a loan");
        require(amount > 0, "Invalid repay amount");
        require(
            amount <= account.loan + interest,
            "Repay amount must lesser than or equal loan amount"
        );
        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        account.loan += interest;
        account.loan -= amount;
        account.lastLoanBlock = block.number;

        if (account.loan == 0) {
            account.baseLoan = 0;
        }

        totalDeposits += amount;

        emit Repayment(msg.sender, amount);
    }

    function calculateBalanceInterest(
        address user
    ) public view returns (uint256) {
        Account storage account = accounts[user];

        if (account.lastBalanceBlock == 0) {
            return 0;
        }

        // Lazy compounding :)
        uint256 elapsedBlocks = block.number - account.lastBalanceBlock;
        uint256 totalBalance = account.balance;
        for (uint256 i = 0; i < elapsedBlocks; i++) {
            totalBalance *= (10_000 + INTEREST_RATE);
            totalBalance /= 10_000;
        }
        uint256 interest = totalBalance - account.balance;
        return interest;
    }

    function calculateLoanInterest(address user) public view returns (uint256) {
        Account storage account = accounts[user];

        if (account.lastLoanBlock == 0) {
            return 0;
        }

        uint256 elapsedBlocks = block.number - account.lastLoanBlock;
        uint256 interest = (account.baseLoan *
            LOAN_INTEREST_RATE *
            elapsedBlocks) / 10_000;
        return interest;
    }

    function getBlock() public view returns (uint256) {
        return block.number;
    }
}
