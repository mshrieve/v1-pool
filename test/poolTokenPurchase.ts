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

  const eDecimals = BigNumber.from(10).pow(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()

    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    PoolInterface = PoolFactory.interface
    await Pool.deployed()

    const hundred = eDecimals.mul(100).toString()
    await Token.mint(accounts[0].address, hundred)

    const ten = eDecimals.mul(10).toString()
    await Token.approve(Pool.address, ten)
    // initially add 10 ETH and 10 token
    await Pool.addLiquidity(ten, { value: ten })
  })

  it('should not allow ethToTokenSwap with a zero msg.value', async () => {
    await expect(Pool.ethToTokenSwap()).to.be.revertedWith(
      'Pool: msg.value must be positive'
    )
  })

  it('should allow ethToTokenSwap with a positive msg.value less than ethPool', async () => {
    // transfer 1 eth into the pool to receive some token
    const amount = eDecimals.mul(1)

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
    const transaction = await Pool.ethToTokenSwap({ value: amount.toString() })
    const receipt = await transaction.wait()
    const tokensAfter = await Token.balanceOf(accounts[0].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent.toString()
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived.toString()

    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(expectedTokensReceived.toString())
    expect(tokensReceived).to.equal(tokensAfter.sub(tokensBefore).toString())
  })

  it('should allow ethToTokenTransfer', async () => {
    const amount = eDecimals.mul(1)

    // compute expected received amount
    //
    let ethPool = await Pool.ethPool()
    let tokenPool = await Pool.tokenPool()
    const expectedTokensReceived = computeExpectedTokensReceived(
      ethPool,
      tokenPool,
      amount
    )

    const transaction = await Pool.ethToTokenTransfer(accounts[2].address, {
      value: amount.toString()
    })
    const receipt = await transaction.wait()
    const tokensBalance = await Token.balanceOf(accounts[2].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent.toString()
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived.toString()

    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(expectedTokensReceived.toString())
    expect(tokensReceived).to.equal(tokensBalance)
  })
})
