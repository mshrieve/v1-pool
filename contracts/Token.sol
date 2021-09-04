// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/// @title a fake ERC20 for testing
contract Token is ERC20 {
    constructor() ERC20('token', 'TOK') {}

    /// @notice Simple minting function which will mint amount tokens to account
    /// @param account The account to mint the tokens to
    /// @param amount The amount of tokens to mint
    function mint(address account, uint256 amount) public {
        _mint(account, amount);
    }
}
