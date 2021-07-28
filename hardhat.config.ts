/**
 * @type import('hardhat/config').HardhatUserConfig
 */

import '@nomiclabs/hardhat-waffle'
import '@nomiclabs/hardhat-ethers'

module.exports = {
  solidity: '0.8.0',
  settings: {},
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts'
  }
}
