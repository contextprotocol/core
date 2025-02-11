import { ethers } from 'ethers';

export enum EdgeStatus {
  INVALID = 0,
  PENDING = 1,
  DELETED = 2,
  ACCEPTED = 3,
  REJECTED = 4,
  FINISHED = 5
}

export class Edge {

    // Helper function to compute relationId
    static generateId(relationId: string, to:string,  descriptor: string)
    : string {
      return ethers.keccak256(ethers.concat([
        ethers.getBytes(relationId),
        ethers.getBytes(to),
        ethers.toUtf8Bytes(descriptor)
      ]));
    }

  }