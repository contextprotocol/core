import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@typechain/hardhat';

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      viaIR: true
    }
  },
  typechain: {
    outDir: 'src/typechain',
    target: 'ethers-v6',
    alwaysGenerateOverloads: false,
    externalArtifacts: ['external/*.json'], // optional array of glob patterns
  }
};

export default config;
