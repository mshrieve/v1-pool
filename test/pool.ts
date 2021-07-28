import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import BigNumber from 'bignumber.js'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Pool', () => {
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
  })

  it('should mint the first two accounts 100 tokens', async () => {
    const amount = eDecimals.times(100).toString()
    await Token.mint(accounts[0].address, amount)
    await Token.mint(accounts[1].address, amount)

    const balance0 = await Token.balanceOf(accounts[0].address)
    expect(balance0).to.equal(amount)
    const balance1 = await Token.balanceOf(accounts[1].address)
    expect(balance1).to.equal(amount)
  })

  it('should be initialized', async () => {
    const token = await Pool.token()
    expect(token).to.equal(Token.address)
  })

  it('should initially have no liquidity', async () => {
    const supply = (await Pool.totalSupply()).toString()
    expect(supply).to.equal('0')
  })

  it('should add initial liquidity', async () => {
    // initially put 10 eth and 10 tokens in the pool
    const amount = eDecimals.times(10).toString()

    await expect(
      Pool.addLiquidity(amount, { value: amount })
    ).to.be.revertedWith('ERC20: transfer amount exceeds allowance')

    await Token.approve(Pool.address, amount)
    await Pool.addLiquidity(amount, { value: amount })

    const expectedSupply = eDecimals.times(100).toString()
    const supply = (await Pool.totalSupply()).toString()
    expect(supply).to.equal(expectedSupply)
  })

  it('should have minted account 0 all the supply', async () => {
    const expectedBalance = eDecimals.times(100).toString()

    const balance = (await Pool.balanceOf(accounts[0].address)).toString()

    expect(balance).to.equal(expectedBalance)
  })
})
