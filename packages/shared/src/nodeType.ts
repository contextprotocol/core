import { ethers } from 'ethers';

export class NodeType {
    static LABEL = ethers.keccak256(ethers.toUtf8Bytes("LABEL"));
    static EDGE = ethers.keccak256(ethers.toUtf8Bytes("EDGE"));

    // Helper function to compute Id
    static generateId(contractAddress: string, name: string): string {
        return ethers.keccak256(ethers.concat([
        ethers.getBytes(contractAddress),
        ethers.toUtf8Bytes(name)
        ]));
    }

}