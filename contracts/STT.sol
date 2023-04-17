// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract STT is ERC20 {
    uint256 private supply = 1_000_000;
    uint256 private decimal = 1e18; // decimals();

    constructor() ERC20("STT", "STT") {
        _mint(msg.sender, supply * decimal);
    }
}
