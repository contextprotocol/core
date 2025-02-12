import { ethers } from 'ethers';

export enum EntityType {
    INVALID = 0,
    NODE = 1,
    EDGE = 2
}

export enum EdgeStatus {
  INVALID = 0,
  PENDING = 1,
  DELETED = 2,
  ACCEPTED = 3,
  REJECTED = 4,
  FINISHED = 5
}

export class IdGenerator {
  
    static generateGraphNodeId(graphNodeAddress: string)
    : string {
      return ethers.keccak256(ethers.concat([
        ethers.getBytes(graphNodeAddress)
      ]));
    }
    
    // Helper function to compute relationId
    static generateEdgeId(relationId: string, to:string,  descriptor: string)
    : string {
      return ethers.keccak256(ethers.concat([
        ethers.getBytes(relationId),
        ethers.getBytes(to),
        ethers.toUtf8Bytes(descriptor)
      ]));
    }

    // Helper function to compute Id
    static generateNodeTypeId(contractAddress: string, name: string): string {
        return ethers.keccak256(ethers.concat([
        ethers.getBytes(contractAddress),
        ethers.toUtf8Bytes(name)
        ]));
    }

    // Helper function to compute documentId
    static generateDocumentId(contractAddress: string, url: string)
    : string {
        return ethers.keccak256(ethers.concat([
            ethers.getBytes(contractAddress),
            ethers.toUtf8Bytes(url)
        ]));
    }

  }