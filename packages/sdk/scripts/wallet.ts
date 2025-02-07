// scripts/generate-wallet.ts

/**
 * This script generates a new Ethereum wallet via Ethers.js.
 * It logs the address, mnemonic, and private key to the console.
 */

import { ethers } from 'ethers';
import { Logger } from '../../utils/src/logger';

/**
 * Generates a new Ethereum wallet and logs its details.
 */
function generateWallet() {
    // Generate a random wallet
    const wallet = ethers.Wallet.createRandom();

    Logger.success('Wallet generated successfully!');
    Logger.result('Address:', wallet.address, { prefix: 'Wallet' });
    Logger.result('Private Key:', wallet.privateKey, { prefix: 'Wallet' });
    Logger.result('Mnemonic:', wallet.mnemonic?.phrase ?? '', { prefix: 'Wallet' });
    Logger.warn('Update .env file');
    Logger.warn(`PRIVATE_KEY=${wallet.privateKey}`);
}

// Generate the wallet
generateWallet();