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
  })

  it('should revert if no liquidity in pool', async () => {
    await expect(Pool.getPrice()).to.be.revertedWith(
      'Pool: pool has no liquidity'
    )
  })

  it('should get price', async () => {
    const amount = one.mul(10)

    await Token.approve(Pool.address, amount)

    const tx = await Pool.addLiquidity(amount, {
      value: amount
    })
    await tx.wait()

    const price = await Pool.getPrice()
    expect(price).to.equal(one)
  })
})
