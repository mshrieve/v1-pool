import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Interface } from 'ethers/lib/utils'

describe('Pool Token Purchase', () => {
  let Token: Contract

  let Pool: Contract
  let PoolInterface: Interface

  let accounts: SignerWithAddress[]

  const eDecimals = new BigNumber(10).exponentiatedBy(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()

    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    PoolInterface = PoolFactory.interface
    await Pool.deployed()

    const hundred = eDecimals.times(100).toString()
    await Token.mint(accounts[0].address, hundred)

    const ten = eDecimals.times(10).toString()
    await Token.approve(Pool.address, ten)
    await Pool.addLiquidity(ten, { value: ten })
  })

  it('should not allow ethToTokenSwap with a zero msg.value', async () => {
    await expect(Pool.ethToTokenSwap()).to.be.revertedWith(
      'Pool: msg.value must be positive'
    )
  })

  it('should not allow ethToTokenSwap with msg.value greater than ethPool', async () => {
    const amount = eDecimals.times(11).toString()

    await expect(Pool.ethToTokenSwap({ value: amount })).to.be.revertedWith(
      'Pool: msg.value exceeds available liquidity'
    )
  })

  it('should allow ethToTokenSwap with a positive msg.value less than ethPool', async () => {
    const amount = eDecimals.times(1).toString()

    const tokensBefore = await Token.balanceOf(accounts[0].address)
    const transaction = await Pool.ethToTokenSwap({ value: amount })
    const receipt = await transaction.wait()
    const tokensAfter = await Token.balanceOf(accounts[0].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent.toString()
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived.toString()

    // i did not compute the actual amount expected ...
    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(tokensAfter.sub(tokensBefore).toString())
  })

  it('should allow ethToTokenTransfer', async () => {
    const amount = eDecimals.times(1).toString()

    const transaction = await Pool.ethToTokenTransfer(accounts[2].address, {
      value: amount
    })
    const receipt = await transaction.wait()
    const tokensBalance = await Token.balanceOf(accounts[2].address)
    const tokenPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[1]).args
    const ethSpent = tokenPurchaseLogArgs.ethSpent.toString()
    const tokensReceived = tokenPurchaseLogArgs.tokensReceived.toString()

    // i did not compute the actual amount expected ...
    expect(ethSpent).to.equal(amount)
    expect(tokensReceived).to.equal(tokensBalance)
  })
})
