// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';

/// @title A simple solidity implementation of a single Uniswap v1–style pool
contract Pool is ERC20 {
    IERC20 public immutable token;

    uint256 public ethPool;
    uint256 public tokenPool;

    uint256 constant eDecimals = 10**18;
    uint256 constant feeRate = (3 * eDecimals) / 100;

    event TokenPurchase(
        address indexed buyer,
        address indexed recipient,
        uint256 ethSpent,
        uint256 tokensReceived
    );
    event EthPurchase(
        address indexed buyer,
        address indexed recipient,
        uint256 tokensSpent,
        uint256 ethReceived
    );
    event AddLiquidity(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount
    );
    event RemoveLiquidity(
        address indexed provider,
        uint256 ethAmount,
        uint256 tokenAmount
    );

    /// @notice Sets up a ERC20-ETH pool
    /// @param _token The address of the ERC20 token
    constructor(address _token) ERC20('uniV1Pool', 'V1') {
        require(_token != address(0));
        token = IERC20(_token);
    }

    /// @notice Add liquidity to the pool by sending equal-valued amounts
    /// @notice of ETH and the ERC20 token
    /// @notice The amount of token transfered is determined by the amount of ETH sent,
    /// @notice so that value(tokenAmount) == value(msg.value), where value() is
    /// @notice determined by the current price of the pool.
    /// @notice Always mints 100 liquidity tokens when adding liquidity to an empty pool
    /// @notice and maxTokensIn will be transfered
    /// @param maxTokensIn The maximum token amount to be transfered to the pool.
    function addLiquidity(uint256 maxTokensIn) public payable {
        require(maxTokensIn > 0, 'maxTokensIn must be positive');
        require(msg.value > 0, 'msg.value must be positive');
        // if sender is initializing liquidity
        if (tokenPool == 0) {
            ethPool = msg.value;
            tokenPool = maxTokensIn;
            token.transferFrom(msg.sender, address(this), maxTokensIn);
            // initially mint 100 liquidity tokens
            _mint(msg.sender, 100 * eDecimals);
            emit AddLiquidity(msg.sender, msg.value, maxTokensIn);
            return;
        }

        // otherwise, there is already liquidity in the pool
        // transfer equal-valued amount of token as eth
        uint256 tokenAmount = (tokenPool * msg.value) / ethPool;
        require(
            tokenAmount <= maxTokensIn,
            'Pool: equal amount of token is greater than maxTokensIn'
        );
        uint256 amountMinted = (totalSupply() * msg.value) / ethPool;
        // increase balances
        ethPool += msg.value;
        tokenPool += tokenAmount;
        // transfer tokenAmount
        token.transferFrom(msg.sender, address(this), tokenAmount);
        // mint liquidity tokens to sender
        _mint(msg.sender, amountMinted);
        emit AddLiquidity(msg.sender, msg.value, tokenAmount);
    }

    /// @notice Remove liquidity from the pool by burning liquidity tokens,
    /// @notice and receiving equal-valued amounts of ETH and the ERC20 token
    /// @param amount The amount of liquidity tokens to burn
    function removeLiquidity(uint256 amount) public {
        uint256 ethOut = (ethPool * amount) / totalSupply();
        uint256 tokensOut = (tokenPool * amount) / totalSupply();

        // decrease ethPool and tokenPool
        ethPool -= ethOut;
        tokenPool -= tokensOut;
        // transfer tokens to sender
        token.transfer(msg.sender, tokensOut);
        // transfer eth to sender
        payable(msg.sender).transfer(ethOut);
        // burn liqiuidity tokens
        _burn(msg.sender, amount);
        emit RemoveLiquidity(msg.sender, ethOut, tokensOut);
    }

    /// @notice Swaps ETH for the token, and transfers to the sender
    function ethToTokenSwap() public payable {
        ethToTokenTransfer(msg.sender);
    }

    /// @notice Swaps the token for ETH, and transfers to the sender
    function tokenToEthSwap(uint256 tokensIn) public {
        tokenToEthTransfer(tokensIn, msg.sender);
    }

    /// @notice Swaps ETH for the token, and transfers to recipient
    /// @param recipient The recipient of the tokens
    function ethToTokenTransfer(address recipient) public payable {
        require(tokenPool > 0, 'Pool: pool has no liquidity');
        require(msg.value > 0, 'Pool: msg.value must be positive');
        require(
            msg.value < ethPool,
            'Pool: msg.value exceeds available liquidity'
        );
        // compute invariant and fee
        uint256 k = ethPool * tokenPool;
        uint256 fee = (msg.value * feeRate) / eDecimals;
        // ethPool increases by msg.value
        ethPool += msg.value;
        //  compute new token balance using new ethPool minus fee
        uint256 tokensOut = tokenPool - (k / (ethPool - fee));
        // update token balance
        tokenPool -= tokensOut;
        // transfer difference to recipient
        token.transfer(recipient, tokensOut);
        emit TokenPurchase(msg.sender, recipient, msg.value, tokensOut);
    }

    /// @notice Swaps the token for ETH, and transfers to recipient
    /// @param recipient The recipient of the ETH
    function tokenToEthTransfer(uint256 tokensIn, address recipient) public {
        require(tokenPool > 0, 'Pool: pool has no liquidity');
        require(tokensIn > 0, 'Pool: tokensIn must be positive');
        require(
            tokensIn < tokenPool,
            'Pool: tokensIn exceeds available liquidity'
        );
        // compute invariant and fee
        uint256 k = (ethPool * tokenPool);
        uint256 fee = (tokensIn * feeRate) / eDecimals;
        // tokenPool increases by tokensIn
        tokenPool += tokensIn;
        //  compute ethOut using new tokenPool minus fee
        uint256 ethOut = ethPool - (k / (tokenPool - fee));
        // update eth balance
        ethPool -= ethOut;
        // transfer tokensIn from sender
        token.transferFrom(msg.sender, address(this), tokensIn);
        // send ethOut to recipient
        payable(recipient).transfer(ethOut);
        emit EthPurchase(msg.sender, recipient, tokensIn, ethOut);
    }
}
