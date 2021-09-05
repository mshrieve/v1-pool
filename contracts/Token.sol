// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/// @title a fake ERC20 for testing
contract Token is ERC20 {
    constructor() ERC20('token', 'TOK') {}

    /// @notice Simple minting function which will mint _amount tokens to _account
    /// @param _account The account to mint the tokens to
    /// @param _amount The amount of tokens to mint
    function mint(address _account, uint256 _amount) public {
        _mint(_account, _amount);
    }
}
