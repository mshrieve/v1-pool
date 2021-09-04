import { ethers } from 'hardhat'
import { Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Interface } from 'ethers/lib/utils'
import { computeExpectedEthReceived } from '../util'

describe('Pool Eth Purchase', () => {
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
    await Pool.addLiquidity(ten, { value: ten })
  })

  it('should not allow tokenToEthSwap with a zero tokensIn', async () => {
    await expect(Pool.tokenToEthSwap(0, 0)).to.be.revertedWith(
      'Pool: _tokensIn must be positive'
    )
  })

  it('should not allow tokenToEthSwap with ETH received less than minimum', async () => {
    await expect(Pool.tokenToEthSwap(1, one)).to.be.revertedWith(
      'Pool: ethOut < _minEthToReceive'
    )
  })

  it('should allow tokenToEthSwap with valid tokensIn', async () => {
    const amount = one.mul(1)

    // compute expected received amount
    //
    let ethPool = await Pool.ethPool()
    let tokenPool = await Pool.tokenPool()
    const expectedEthReceived = computeExpectedEthReceived(
      ethPool,
      tokenPool,
      amount
    )

    await Token.approve(Pool.address, amount)

    const ethBefore = await accounts[0].getBalance()
    const transaction = await Pool.tokenToEthSwap(amount, 0)
    const receipt = await transaction.wait()
    const ethAfter = await accounts[0].getBalance()

    const transactionCost = receipt.gasUsed.mul(transaction.gasPrice)

    const ethPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[2]).args
    const tokensSpent = ethPurchaseLogArgs.tokensSpent
    const ethReceived = ethPurchaseLogArgs.ethReceived

    expect(tokensSpent).to.equal(amount)
    expect(ethReceived).to.equal(expectedEthReceived)
    expect(ethReceived).to.equal(ethAfter.sub(ethBefore).add(transactionCost))
  })

  it('should allow tokenToEthTransfer', async () => {
    const amount = one.mul(1)

    // compute expected received amount
    //
    let ethPool = await Pool.ethPool()
    let tokenPool = await Pool.tokenPool()
    const expectedEthReceived = computeExpectedEthReceived(
      ethPool,
      tokenPool,
      amount
    )

    await Token.approve(Pool.address, amount)

    const ethBefore = await accounts[2].getBalance()
    const transaction = await Pool.tokenToEthTransfer(
      amount,
      0,
      accounts[2].address
    )
    const receipt = await transaction.wait()
    const ethAfter = await accounts[2].getBalance()

    const ethPurchaseLogArgs = PoolInterface.parseLog(receipt.logs[2]).args
    const ethReceived = ethPurchaseLogArgs.ethReceived

    expect(ethReceived).to.equal(expectedEthReceived)
    expect(ethReceived).to.equal(ethAfter.sub(ethBefore))
  })
})
