import { PropertyType } from "../../utils/src/property";

export interface LabelProperty {
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



export interface LabelRegistryConfig {
    privateKey?: string;              // Optional private key. You can use connect later
    connection?: NetworkConnection;   // Optional network connection. Default devnet
    registryAddress?: string;         // Optional contract address if already deployed
    debug?: boolean;                  // Optional debug flag
}

export interface ContextNodeConfig {
    privateKey?: string;             // Optional private key. You can use connect later
    connection?: NetworkConnection;  // Optional network connection. Default devnet
    nodeAddress?: string;            // Optional contract address if already deployed
    registryAddress?: string;        // Optional label registry address
    debug?: boolean;                  // Optional debug flag
}

export enum RelationStatus {
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
  
export interface Relation {
    ragId: string;
    relationType: string;
    startTimestamp: number;
    endTimestamp: number;
    status: RelationStatus;
    notes: string;
}