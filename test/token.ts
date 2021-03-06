import { ethers } from 'hardhat'
import { Contract, BigNumber } from 'ethers'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Token', () => {
  let Token: Contract

  let accounts: SignerWithAddress[]
  const one = BigNumber.from(10).pow(18)

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()
    await Token.deployed()
  })

  it('should mint the first two accounts 100 tokens', async () => {
    const amount = one.mul(100)
    await Token.mint(accounts[0].address, amount)
    await Token.mint(accounts[1].address, amount)

    const balance0 = await Token.balanceOf(accounts[0].address)
    expect(balance0).to.equal(amount)
    const balance1 = await Token.balanceOf(accounts[1].address)
    expect(balance1).to.equal(amount)
  })
})
