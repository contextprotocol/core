import { ethers } from 'ethers';

export enum EntityType {
    INVALID = 0,
    NODE = 1,
    EDGE = 2
}

export class NodeType {

    // Helper function to compute Id
    static generateId(contractAddress: string, name: string): string {
        return ethers.keccak256(ethers.concat([
        ethers.getBytes(contractAddress),
        ethers.toUtf8Bytes(name)
        ]));
    }

}