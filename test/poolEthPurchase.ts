import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Interface } from 'ethers/lib/utils'

describe('Pool Eth Purchase', () => {
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

  it('should not allow tokenToEthSwap with a zero tokensIn', async () => {
    await expect(Pool.tokenToEthSwap('0')).to.be.revertedWith(
      'Pool: tokensIn must be positive'
    )
  })

  it('should not allow tokenToEthSwap with tokensIn greater than tokenPool', async () => {
    const amount = eDecimals.times(11).toString()

    await expect(Pool.tokenToEthSwap(amount)).to.be.revertedWith(
      'Pool: tokensIn exceeds available liquidity'
    )
  })

  it('should allow tokenToEthSwap with valid tokensIn', async () => {
    const amount = eDecimals.times(1).toString()
    await Token.approve(Pool.address, amount)

    const ethBefore = await accounts[0].getBalance()
    const transaction = await Pool.tokenToEthSwap(amount)
    const receipt = await transaction.wait()
    const ethAfter = await accounts[0].getBalance()

    const transactionCost = receipt.gasUsed.mul(transaction.gasPrice)

    const ethPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[2]).args
    const tokensSpent = ethPurchaseLogArgs.tokensSpent.toString()
    const ethReceived = ethPurchaseLogArgs.ethReceived.toString()

    // i did not compute the actual amount expected ...
    expect(tokensSpent).to.equal(amount)
    expect(ethReceived).to.equal(
      ethAfter.sub(ethBefore).add(transactionCost).toString()
    )
  })

  it('should allow tokenToEthTransfer', async () => {
    const amount = eDecimals.times(1).toString()
    await Token.approve(Pool.address, amount)

    const ethBefore = await accounts[2].getBalance()
    const transaction = await Pool.tokenToEthTransfer(
      amount,
      accounts[2].address
    )
    const receipt = await transaction.wait()
    const ethAfter = await accounts[2].getBalance()

    const ethPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[2]).args
    const ethReceived = ethPurchaseLogArgs.ethReceived.toString()

    // i did not compute the actual amount expected ...
    expect(ethReceived).to.equal(ethAfter.sub(ethBefore).toString())
  })
})
