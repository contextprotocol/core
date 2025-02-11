
import { ethers } from 'ethers';

export class Document {
    // Helper function to compute documentId
    static generateId(contractAddress: string, url: string)
    : string {
    return ethers.keccak256(ethers.concat([
        ethers.getBytes(contractAddress),
        ethers.toUtf8Bytes(url)
    ]));
    }
}