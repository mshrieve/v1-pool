// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Pool is ERC20 {
  ERC20 immutable token;

  // eth balance
  uint256 ethBalance;
  // token balance
  uint256 tokenBalance;

  uint256 constant decimals = 18;
  uint256 constant eDecimals = 10**decimals;
  uint256 constant feeRate = (3 * eDecimals) / 100;

  // event ASwappedForB( uint256 received, uint256 spent, address account);
  // event BSwappedForA( uint256 received, uint256 spent, address account);
  // event LiquidityAdded( uint256 a, uint256 b, address account);
  // event LiquidityRemoved( uint256)

  constructor(address _token) {
    assert(_token != address(0));
    token = ERC20(_token);
  }

  function addLiquidity(uint256 tokensIn) public payable {
    require(tokensIn > 0);
    require(msg.value > 0);
    //   if user is initializing liquidity
    if (tokenBalance == 0) {
      ethBalance = msg.value;
      token.transferFrom(msg.sender, address(this), tokensIn);
      tokenBalance = tokensIn;
      // emit addLiqiduity
      return;
    }

    // transfer equal amount of token as eth
    uint256 tokenAmount = (msg.value * tokenBalance) / ethBalance;
    require(tokenAmount < tokensIn);
    token.transferFrom(msg.sender, address(this), tokenAmount);
    // increase balances
    ethBalance += msg.value;
    tokenBalance += tokenAmount;
    // emit addLiqiduity
  }

  //   function removeLiquidity() public

  function ethToTokenSwap() public payable {
    require(msg.value > 0, "no eth sent");
    require(tokenBalance > 0, "pool has no liquidity");

    uint256 fee = (msg.value * feeRate) / eDecimals;
    uint256 k = (ethBalance * tokenBalance) / eDecimals;
    // ethBalance increases by msg.value
    ethBalance += msg.value;
    //  compute new token balance using new ethBalance minus fee
    uint256 _tokenBalance = (k * eDecimals) / (ethBalance - fee);
    // transfer difference to sender
    token.transfer(msg.sender, tokenBalance - _tokenBalance);
    // update token balance
    tokenBalance = _tokenBalance;
    // emit Transfer event
  }

  function tokenToEthSwap(uint256 tokensIn) public {
    require(tokenBalance > 0, "pool has no liquidity");
    require(tokensIn > 0, "no tokens sent");

    token.transferFrom(msg.sender, address(this), tokensIn);

    uint256 fee = (tokensIn * feeRate) / eDecimals;
    uint256 k = (ethBalance * tokenBalance) / eDecimals;
    // tokenBalance increases by tokensIn
    tokenBalance += tokensIn;
    //  compute new ethBalance using new tokenBalance minus fee
    uint256 _ethBalance = (k * eDecimals) / (tokenBalance - fee);
    // send difference to sender
    payable(msg.sender).transfer(ethBalance - _ethBalance);
    // update eth balance
    ethBalance = _ethBalance;
    // emit Transfer event
  }
}
