import { ethers } from 'hardhat'
import { Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Pool Liquidity Tokens', () => {
  let Pool: Contract
  let Token: Contract

  let accounts: SignerWithAddress[]

  const one = BigNumber.from(10).pow(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()
    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    await Pool.deployed()

    const amount = one.mul(100)
    await Token.mint(accounts[0].address, amount)
    await Token.mint(accounts[1].address, amount)
  })

  it('should add initial liquidity', async () => {
    // initially put 10 eth and 10 tokens in the pool
    const amount = one.mul(10)

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

    const expectedSupply = one.mul(100)
    const supply = await Pool.totalSupply()

    expect(supply).to.equal(expectedSupply)
    expect(tokenBalanceBefore.sub(tokenBalanceAfter)).to.equal(amount)

    const transactionCost = addLiquidityReceipt.gasUsed.mul(
      addLiquidityTransaction.gasPrice
    )

    expect(ethBalanceBefore.sub(ethBalanceAfter).sub(transactionCost)).to.equal(
      amount
    )
  })

  it('should have minted account0 all the supply', async () => {
    const expectedBalance = one.mul(100)

    const balance = await Pool.balanceOf(accounts[0].address)

    expect(balance).to.equal(expectedBalance)
  })

  it('should not allow account1 to add liquidity if maxTokensIn is too low', async () => {
    const ethAmount = one.mul(10)
    const tokenAmount = one.mul(9)

    await Token.connect(accounts[1]).approve(Pool.address, tokenAmount)

    await expect(
      Pool.connect(accounts[1]).addLiquidity(tokenAmount, {
        value: ethAmount
      })
    ).to.be.revertedWith(
      'Pool: equal amount of token is greater than maxTokensIn'
    )
  })

  it('should allow account1 to add liquidity if maxTokensIn high enough', async () => {
    const amount = one.mul(10)

    await Token.connect(accounts[1]).approve(Pool.address, amount)
    await Pool.connect(accounts[1]).addLiquidity(amount, { value: amount })

    const expectedSupply = one.mul(200)
    const supply = await Pool.totalSupply()

    expect(supply).to.equal(expectedSupply)
  })

  it('should have minted account1 100 liquidity tokens', async () => {
    const expectedBalance = one.mul(100)

    const balance = await Pool.balanceOf(accounts[1].address)

    expect(balance).to.equal(expectedBalance)
  })

  it('should not allow account 1 to remove more liquidity tokens than they have', async () => {
    const amount = one.mul(200)

    await expect(
      Pool.connect(accounts[1]).removeLiquidity(amount, 0, 0)
    ).to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('should not allow removing liquidity if they receive less than the minimum tokens', async () => {
    const amount = one

    await expect(
      Pool.connect(accounts[1]).removeLiquidity(amount, 0, amount.mul(20))
    ).to.be.revertedWith('Pool: tokensOut < minTokensToReceive')
  })

  it('should not allow removing liquidity if they receive less than the minimum eth', async () => {
    const amount = one

    await expect(
      Pool.connect(accounts[1]).removeLiquidity(amount, amount.mul(20), 0)
    ).to.be.revertedWith('Pool: ethOut < minEthToReceive')
  })

  it('should allow account 1 to remove liquidity tokens', async () => {
    const amount = one.mul(100)

    await Pool.connect(accounts[1]).removeLiquidity(amount, 0, 0)
    const balance = await Pool.balanceOf(accounts[1].address)

    expect(balance).to.equal('0')
  })
})
