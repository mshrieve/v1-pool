import { BigNumber } from 'ethers'

const one = BigNumber.from(10).pow(18)
// feeRate = .03, with 18 decimals
const feeRate = BigNumber.from(10).pow(16).mul(3)

const computeExpectedEthReceived = (
  ethPool: BigNumber,
  tokenPool: BigNumber,
  amount: BigNumber
) => swapXforY(tokenPool, ethPool, amount)

const computeExpectedTokensReceived = (
  ethPool: BigNumber,
  tokenPool: BigNumber,
  amount: BigNumber
) => swapXforY(ethPool, tokenPool, amount)

const swapXforY = (x: BigNumber, y: BigNumber, dx: BigNumber) => {
  // compute invariant
  const k = x.mul(y)
  // compute fee
  const fee = dx.mul(feeRate).div(one)
  // dy = y - k / (x + dx - fee)
  const dy = y.sub(k.div(x.add(dx).sub(fee)))
  return dy
}

export { computeExpectedTokensReceived, computeExpectedEthReceived }
