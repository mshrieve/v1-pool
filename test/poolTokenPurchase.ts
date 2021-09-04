import { ethers } from 'hardhat'
import { Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Interface } from 'ethers/lib/utils'
import { computeExpectedTokensReceived } from '../util'

describe('Pool Token Purchase', () => {
  let Token: Contract
  let Pool: Contract
  let PoolInterface: Interface

  let accounts: SignerWithAddress[]

  const one = BigNumber.from(10).pow(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()

    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    PoolInterface = PoolFactory.interface
    await Pool.deployed()

    const hundred = one.mul(100)
    await Token.mint(accounts[0].address, hundred)

    const ten = one.mul(10)
    await Token.approve(Pool.address, ten)
    // initially add 10 ETH and 10 token
    await Pool.addLiquidity(ten, { value: ten })
  })

  it('should not allow ethToTokenSwap with a zero msg.value', async () => {
    await expect(Pool.ethToTokenSwap(0)).to.be.revertedWith(
      'Pool: msg.value must be positive'
    )
  })

  it('should not allow ethToTokenSwap with tokens received less than minimum', async () => {
    await expect(Pool.ethToTokenSwap(one, { value: one })).to.be.revertedWith(
      'Pool: tokensOut < minTokensToReceive'
    )
  })

  it('should allow ethToTokenSwap with a positive msg.value', async () => {
    // transfer 1 eth into the pool to receive some token
    const amount = one.mul(1)

    // compute expected received amount
    //
    let ethPool = await Pool.ethPool()
    let tokenPool = await Pool.tokenPool()
    const expectedTokensReceived = computeExpectedTokensReceived(
      ethPool,
      tokenPool,
      amount
    )

    const tokensBefore = await Token.balanceOf(accounts[0].address)
    const transaction = await Pool.ethToTokenSwap(0, {
      value: amount
    })
    const receipt = await transaction.wait()
    const tokensAfter = await Token.balanceOf(accounts[0].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived

    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(expectedTokensReceived)
    expect(tokensReceived).to.equal(tokensAfter.sub(tokensBefore))
  })

  it('should allow ethToTokenTransfer', async () => {
    const amount = one.mul(1)

    // compute expected received amount
    //
    let ethPool = await Pool.ethPool()
    let tokenPool = await Pool.tokenPool()
    const expectedTokensReceived = computeExpectedTokensReceived(
      ethPool,
      tokenPool,
      amount
    )

    const transaction = await Pool.ethToTokenTransfer(0, accounts[2].address, {
      value: amount
    })
    const receipt = await transaction.wait()
    const tokensBalance = await Token.balanceOf(accounts[2].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived

    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(expectedTokensReceived)
    expect(tokensReceived).to.equal(tokensBalance)
  })
})
