import { ethers } from 'hardhat'
import { Contract } from 'ethers'
import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

describe('Pool Initialization', () => {
  let Pool: Contract
  let Token: Contract

  let accounts: SignerWithAddress[]

  before(async () => {
    accounts = await ethers.getSigners()

    const TokenFactory = await ethers.getContractFactory('Token')
    Token = await TokenFactory.deploy()
    await Token.deployed()

    const PoolFactory = await ethers.getContractFactory('Pool')
    Pool = await PoolFactory.deploy(Token.address)
    await Pool.deployed()
  })

  it('should be initialized', async () => {
    const token = await Pool.token()
    expect(token).to.equal(Token.address)
  })

  it('should initially have no liquidity', async () => {
    const supply = await Pool.totalSupply()
    expect(supply).to.equal('0')
  })
})
