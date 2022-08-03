require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");

module.exports = {
  solidity: "0.8.9",
  networks: {
    hardhat: {
      chainId: 1337
    },
    goerli: {
      url: "https://goerli.infura.io/v3/1fc7c7c3701c4083b769e561ae251f9a",
      accounts: [process.env.pk]
    },
    mainnet: {
      url: "https://mainnet.infura.io/v3/1fc7c7c3701c4083b769e561ae251f9a",
      accounts: [process.env.pk]
    },
    mumbai: {
      url: "https://matic-testnet-archive-rpc.bwarelabs.com",
      accounts: [process.env.pk],
      gasPrice: 35000000000,
      saveDeployments: true,
    },
    polygon: {
      url: "https://polygon-rpc.com/",
      accounts: [process.env.pk]
    }
  },
  etherscan: {
    apiKey:  {
      goerli: "FARJNGJG333JFB35Q646T73WNVJD69HDH1"
    },
    customChains: [
      {
        network: "goerli",
        chainId: 5,
        urls: {
          apiURL: "https://api-goerli.etherscan.io/api",
          browserURL: "https://goerli.etherscan.io"
        }
      }
    ]
  }
};