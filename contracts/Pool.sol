// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import 'hardhat/console.sol';

contract Pool is ERC20 {
    ERC20 public immutable token;

    uint256 private ethPool;
    uint256 private tokenPool;

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

    // event TokenPurchase( uint256 received, uint256 spent, address account);
    // event EthPurchase( uint256 received, uint256 spent, address account);
    // event AddLiquidity( uint256 a, uint256 b, address account);
    // event RemoveLiquidity( uint256)

    constructor(address _token) ERC20('uniV1Pool', 'V1') {
        assert(_token != address(0));
        token = ERC20(_token);
    }

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

        // transfer equal amount of token as eth
        uint256 tokenAmount = (tokenPool * msg.value) / ethPool;
        require(
            tokenAmount <= maxTokensIn,
            'Pool: equal amount of token is less than maxTokensIn'
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

    function ethToTokenSwap() public payable {
        ethToTokenTransfer(msg.sender);
    }

    function tokenToEthSwap(uint256 tokensIn) public {
        tokenToEthTransfer(tokensIn, msg.sender);
    }

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
        // emit Transfer event
        emit EthPurchase(msg.sender, recipient, tokensIn, ethOut);
    }
}
