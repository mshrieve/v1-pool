import { BigNumber } from 'ethers'

const one = BigNumber.from(10).pow(18)
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

const swapXforY = (x: BigNumber, y: BigNumber, amount: BigNumber) => {
  // compute invariant
  const k = x.mul(y)
  // feeRate = .03
  const fee = amount.mul(feeRate).div(one)
  // update x
  x = x.add(amount)
  // yOut = y - k / (x - fee)
  const yOut = y.sub(k.div(x.sub(fee)))

  return yOut
}

export { computeExpectedTokensReceived, computeExpectedEthReceived }
