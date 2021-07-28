import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Pool Liquidity Tokens', () => {
  let Pool: Contract
  let Token: Contract

  let accounts: SignerWithAddress[]

  const eDecimals = new BigNumber(10).exponentiatedBy(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()
    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    await Pool.deployed()

    const amount = eDecimals.times(100).toString()
    await Token.mint(accounts[0].address, amount)
    await Token.mint(accounts[1].address, amount)
  })

  it('should add initial liquidity', async () => {
    // initially put 10 eth and 10 tokens in the pool
    const amount = eDecimals.times(10).toString()

    await expect(
      Pool.addLiquidity(amount, { value: amount })
    ).to.be.revertedWith('ERC20: transfer amount exceeds allowance')

    const tokenBalanceBefore = await Token.balanceOf(accounts[0].address)
    await Token.approve(Pool.address, amount)

    const ethBalanceBefore = await accounts[0].getBalance()
    const addLiquidityTransaction = await Pool.addLiquidity(amount, {
      value: amount
    })

    const addLiquidityReceipt = await addLiquidityTransaction.wait()

    const tokenBalanceAfter = await Token.balanceOf(accounts[0].address)
    const ethBalanceAfter = await accounts[0].getBalance()

    const expectedSupply = eDecimals.times(100).toString()
    const supply = (await Pool.totalSupply()).toString()

    expect(supply).to.equal(expectedSupply)
    expect(tokenBalanceBefore.sub(tokenBalanceAfter).toString()).to.equal(
      amount
    )

    const transactionCost = addLiquidityReceipt.gasUsed.mul(
      addLiquidityTransaction.gasPrice
    )

    expect(
      ethBalanceBefore.sub(ethBalanceAfter).sub(transactionCost).toString()
    ).to.equal(amount)
  })

  it('should have minted account0 all the supply', async () => {
    const expectedBalance = eDecimals.times(100).toString()

    const balance = (await Pool.balanceOf(accounts[0].address)).toString()

    expect(balance).to.equal(expectedBalance)
  })

  it('should not allow account1 to add liquidity if maxTokensIn is too low', async () => {
    const ethAmount = eDecimals.times(10).toString()
    const tokenAmount = eDecimals.times(9).toString()

    await Token.connect(accounts[1]).approve(Pool.address, tokenAmount)

    await expect(
      Pool.connect(accounts[1]).addLiquidity(tokenAmount, {
        value: ethAmount
      })
    ).to.be.revertedWith('Pool: equal amount of token is less than maxTokensIn')
  })

  it('should allow account1 to add liquidity if maxTokensIn high enough', async () => {
    const amount = eDecimals.times(10).toString()

    await Token.connect(accounts[1]).approve(Pool.address, amount)
    await Pool.connect(accounts[1]).addLiquidity(amount, { value: amount })

    const expectedSupply = eDecimals.times(200).toString()
    const supply = (await Pool.totalSupply()).toString()

    expect(supply).to.equal(expectedSupply)
  })

  it('should have minted account1 100 liquidity tokens', async () => {
    const expectedBalance = eDecimals.times(100).toString()

    const balance = (await Pool.balanceOf(accounts[1].address)).toString()

    expect(balance).to.equal(expectedBalance)
  })

  it('should not allow account 1 to remove more liquidity tokens than they have', async () => {
    const amount = eDecimals.times(200).toString()

    await expect(
      Pool.connect(accounts[1]).removeLiquidity(amount)
    ).to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('should allow account 1 to remove liquidity tokens', async () => {
    const amount = eDecimals.times(100).toString()

    await Pool.connect(accounts[1]).removeLiquidity(amount)
    const balance = (await Pool.balanceOf(accounts[1].address)).toString()

    expect(balance).to.equal('0')
  })
})
