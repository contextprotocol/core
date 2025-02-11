import { PropertyType } from "../../shared/src/property";

export interface NodeTypeProperty {
    name: string;
    type: PropertyType;
}

export interface NodeProperty {
    key: string;
    value: string | number;
    type: PropertyType;
    propertyId: string; 
}
  


export type NetworkConnection = 'devnet' | 'testnet' | 'mainnet';

export const RPC_URLS: Record<NetworkConnection, string> = {
    devnet: 'https://rpc.context-testnet-one.t.raas.gelato.cloud',
    testnet: 'https://rpc.context-testnet-one.t.raas.gelato.cloud',
    mainnet: 'https://rpc.context-testnet-one.t.raas.gelato.cloud'
};



export interface NodeTypeRegistryConfig {
    privateKey?: string;              // Optional private key. You can use connect later
    connection?: NetworkConnection;   // Optional network connection. Default devnet
    nodeTypeRegistryAddress?: string;         // Optional contract address if already deployed
    debug?: boolean;                  // Optional debug flag
}

export interface GraphNodeConfig {
    privateKey?: string;             // Optional private key. You can use connect later
    connection?: NetworkConnection;  // Optional network connection. Default devnet
    nodeAddress?: string;            // Optional contract address if already deployed
    nodeTypeRegistryAddress?: string;        // Optional label registry address
    debug?: boolean;                  // Optional debug flag
}

export enum EdgeStatus {
    PENDING,
    DELETED,
    ACCEPTED,
    REJECTED,
    FINISHED
}
  
export interface Document {
    url: string;
    isIndexed: boolean;
}
  
export interface Edge {
    nodeId: string;
    edgeType: string;
    startTimestamp: number;
    endTimestamp: number;
    status: EdgeStatus;
    notes: string;
}