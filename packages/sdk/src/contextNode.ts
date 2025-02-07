import { ethers } from 'ethers';
import { Logger } from '../../utils/src/logger';
import { LabelRegistry } from './labelRegistry';
import { Property,  PropertyType, Document, Edge, EdgeStatus } from "../../utils/src";
import { NodeProperty, ContextNodeConfig, RPC_URLS, NetworkConnection } from './types';
import ContextNodeABI 
    from '../../contracts/artifacts/contracts/ContextNode.sol/ContextNode.json';
import  dotenv from 'dotenv';
dotenv.config();

// Builder pattern for creating labels with fluent interface
class NodeBuilder {
    private parent: ContextNode;
    private properties: NodeProperty[] = [];
    private documents: string[] = [];
    private labelName: string = '';
  
    constructor(labelName: string, parent: ContextNode) {
        this.labelName = labelName;
        this.parent = parent;
    }
  
    property(key: string, value: any ): NodeBuilder {
      this.properties.push({ key, value, type: PropertyType.NUMBER, propertyId: '' });
      return this;
    }

    // Add document to the node
    document(url: string): NodeBuilder {
      this.documents.push(url);
      return this;
    }

    async save() {
      if (this.parent.debug) Logger.info(`Saving Node with Label ${this.labelName}`, { prefix: 'Node' });
      const { nodeId, properties } = await this.parent.addNode(this.labelName);

        // Save properties
        for( const property of this.properties) {

            if (properties.includes(property.key)) {
                if (this.parent.debug) Logger.result('Property already exists', property.key, { prefix: 'Registry' });
            } else {
                await this.parent.addProperty(property.key, property.value);
            }
        }

        // Save documents
        for (const url of this.documents) {
            await this.parent.addDocument(url);
        }
    
    return {
        name: this.labelName,
        properties: this.properties
      };
    }
  }

  // EdgeBuilder class
class EdgeBuilder {
    private parent: ContextNode;
    private properties: NodeProperty[] = [];
    private edgeName: string;
    private descriptor: string;
    private toNodeAddress?: string;
  
    constructor(edgeName: string, descriptor: string, parent: ContextNode) {
        this.edgeName = edgeName;
        this.descriptor = descriptor;
        this.parent = parent;
    }
  
    property(key: string, value: any): EdgeBuilder {
        this.properties.push({ key, value, type: PropertyType.NUMBER, propertyId: '' });
        return this;
    }

    to(nodeAddress: string): EdgeBuilder {
        this.toNodeAddress = nodeAddress;
        return this;
    }
  
    async save() {
        if (!this.toNodeAddress) {
            throw new Error('Target node not specified. Use .to(nodeAddress) before saving');
        }

        // Add the edge
        const edgeId = await this.parent.addEdge(this.edgeName, this.toNodeAddress, this.descriptor);

        // Set edge properties
        for (const property of this.properties) {
            await this.parent.setEdgeProperty(
                edgeId,
                property.key,
                property.value
            );
        }

        return {
            type: this.edgeName,
            descriptor: this.descriptor,
            to: this.toNodeAddress,
            properties: this.properties
        };
    }
}

// ContextNode class
export class ContextNode {
    private provider: ethers.Provider;
    private wallet?: ethers.Signer;
    public contract?: ethers.Contract;
    public nodeAddress?: string;
    public labelRegistry?: LabelRegistry;
    public labelId?: string;
    public labelName?: string;
    public debug: boolean = false;

    /**
     * Creates an instance of ContextNde.
     * 
     * @param {ContextNodeConfig} config
     * The configuration object for the ContextNode.
     * @param {NetworkConnection} [config.connection='testnet']
     * The network connection to use (e.g., 'mainnet', 'testnet').
     * @param {string} [config.privateKey]
     * The private key for the wallet. If not provided,
     * it will use the PRIVATE_KEY from environment variables.
     * @param {string} [config.nodeAddress]
     * The address of the contract. If provided, the contract will be initialized.
     * @throws {Error} If the wallet is not initialized and a registry address is provided.
     */
    constructor(config: ContextNodeConfig) {
        const connection: NetworkConnection = config.connection ?? 'testnet';
        const rpcUrl: string = RPC_URLS[connection];
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.debug = config.debug ?? false;

        // Wallet and connect.
        const privateKey = config.privateKey ?? process.env.PRIVATE_KEY;
        if (privateKey && privateKey !== '') {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        // Initialize contract if address provided
        const nodeAddress = config.nodeAddress ?? process.env.NODE_ADDRESS;
        if (nodeAddress) {
            this.checkWallet();
            this.contract = new ethers.Contract(
                nodeAddress,
                ContextNodeABI.abi,
                this.wallet);
            this.nodeAddress = config.nodeAddress;
        }

        const registryAddress = config.registryAddress ?? process.env.REGISTRY_ADDRESS;
        if (registryAddress) {
            this.labelRegistry = new LabelRegistry({ registryAddress: registryAddress, debug: this.debug });
        }
    }

    /**
     * @param e Error
     */
    error(e:any, prefix: string) {
        if (this.debug) Logger.error(e.msg, { prefix });
        else throw new Error(e);
        process.exit(1);
    }

    /**
     * Connects to the Ethereum network using the provided private key.
     * 
     * @param privateKey - The private key to use for connecting to the Ethereum network.
     * @throws Will throw an error if the connection fails.
     */
    connect(privateKey: string): void {
        this.wallet = new ethers.Wallet(privateKey, this.provider);
        this.contract?.connect(this.wallet);
    }

    /**
     * Retrieves the address of the wallet.
    */
    async getWallet(){
        const address = await this.wallet?.getAddress();
        if (address && this.debug) Logger.result('Wallet', address, { prefix: 'Wallet' });
    }

    /**
     * Checks if the wallet is initialized.
     */
    private checkWallet() {
        if (!this.wallet) {
            if (this.debug) Logger.fatal('Wallet not initialized', { prefix: 'Wallet' }); 
            else throw new Error('Wallet not initialized');
        }
    }

    /**
    * Checks if the contract is initialized.
    */
    private checkContract() {
        if (!this.contract) {
            if (this.debug) Logger.fatal('Contract not initialized', { prefix: 'Registry' }); 
            else throw new Error('Contract not initialized');
        }
    }

    // Create a new label with builder pattern
    node(name: string): NodeBuilder {
            return new NodeBuilder(name, this);
    }

    // Create a new edge with builder pattern
    edge(type: string, descriptor: string): EdgeBuilder {
        return new EdgeBuilder(type, descriptor, this);
    }

    // Check registry.
    async checkRegistry(): Promise<void> {
        if (!this.labelRegistry) {
            this.error('Label Registry not initialized', 'Registry');
        }
    }

    async addNode(labelName: string): Promise<{nodeId: string , properties: any[]}> {
        this.checkWallet();
        this.checkRegistry();
        this.labelName = labelName;
        if (!this.contract) {
            const label = await this.labelRegistry?.getLabel(labelName);
            this.labelId = label?.labelId as string;
            this.nodeAddress = await this.deploy(label?.labelId as string);
        } else {
            
            const label = await this.labelRegistry?.getLabel(this.labelName?? '');
            this.labelId = label?.labelId as string;
            return { nodeId: this.nodeAddress as string, properties: [] };
        }
        
        return {nodeId: this.nodeAddress, properties: []};
    }

    async getEdge(edgeName: string, toNodeAddress: string, decorator: string): Promise<{edgeId: string, relationId: string, edgeExists: boolean}> { 
        this.checkContract();
        const relation = await this.labelRegistry?.getEdge(edgeName);
        const relationId = relation?.edgeId || '0x';
        if (relation?.exists === false) return { edgeId: "0x", relationId, edgeExists: false };
        const edgeId = Edge.generateId(relation?.edgeId as string, toNodeAddress, decorator);
        if (this.debug) Logger.warn(`Verify toNodeAddress is a valid relation`, { prefix: 'TODO' });
        try {
            const edge = await this.contract?.getEdge(edgeId);
            const status = Number(edge[3]);
            const edgeExists = status !== EdgeStatus.INVALID;
            return { edgeId, relationId, edgeExists };
        } catch (error) {
            return { edgeId, relationId, edgeExists: false };
        }
    }

    async addEdge(edgeName: string, toNodeAddress: string, descriptor: string): Promise<string> {
        this.checkContract();
        const {edgeId, relationId, edgeExists} = await this.getEdge(edgeName, toNodeAddress, descriptor);
        if (edgeExists) {
            if (this.debug) Logger.result('Edge already exists', edgeName, { prefix: 'Edge' });
            return edgeId;
        } else {
            try {
                if (this.debug) Logger.warn(`Verify toNodeAddress is Set`, { prefix: 'TODO' });
                if (this.debug) Logger.loading(`Adding edge to ${toNodeAddress}`, { prefix: 'Edge' });
                const tx = await this.contract?.addEdge(relationId, toNodeAddress, descriptor);
                await tx.wait();
                if (this.debug) Logger.success(`Edge added successfully`, { prefix: 'Edge' });
                return edgeId;
            } catch (error: any) {
                this.error({ msg: 'Failed to add edge'}, 'Edge');
            }
            return edgeId;
        }

    }

    async changeEdgeStatus(edgeId: string, key: string, value: any) {
        this.checkContract();
        Logger.warn(`TODO: Change Edge Status`, { prefix: 'TODO' });
        /*
        const propertyId = Property.generateId(edgeId, key);
        const bytesValue = Property.encodeValue(PropertyType.NUMBER, value);

        try {
            console.log(propertyId, bytesValue);
            if (this.debug) Logger.loading(`Setting property ${key} of type ${PropertyType[PropertyType.NUMBER]}`, { prefix: 'Edge' });
            // const tx = await this.contract?.setProperty(propertyId, bytesValue);
        } catch (error: any) {
            this.error({ msg: `Failed to set edge property ${error.message || ""}`}, 'Edge');
        }*/
    }

    async setEdgeProperty(edgeId: string, key: string, value: any) {
        this.checkContract();
        Logger.warn(`TODO: Verify edgeId is a valid edge`, { prefix: 'TODO' });
        /*
        const propertyId = Property.generateId(edgeId, key);
        const bytesValue = Property.encodeValue(PropertyType.NUMBER, value);

        try {
            console.log(propertyId, bytesValue);
            if (this.debug) Logger.loading(`Setting property ${key} of type ${PropertyType[PropertyType.NUMBER]}`, { prefix: 'Edge' });
            // const tx = await this.contract?.setProperty(propertyId, bytesValue);
        } catch (error: any) {
            this.error({ msg: `Failed to set edge property ${error.message || ""}`}, 'Edge');
        }*/
    }

    /**
     * Deploys the LabelRegistry contract if it is not already deployed.
     * 
     * @returns {Promise<string>} The address of the deployed contract.
     * @throws {Error} If the wallet is not initialized.
     */
    private async deploy(labelId: string): Promise<string> {
        const factory = new ethers.ContractFactory(
            ContextNodeABI.abi, ContextNodeABI.bytecode, this.wallet
        );
        if (this.debug) Logger.loading('Deploying node...', { prefix: 'Node' });
        const registreyAddress = this.labelRegistry?.registryAddress as string;
        try {
            const contract = await factory.deploy(labelId, registreyAddress);
            await contract.waitForDeployment();
        
            this.nodeAddress = await contract.getAddress();
            if (this.debug) {
                Logger.success('Node Deployed successfully', { prefix: 'Node' });
                Logger.result('Address:', this.nodeAddress as string, { prefix: 'Node' });
            }
                this.contract = new ethers.Contract(
                this.nodeAddress,
                ContextNodeABI.abi,
                this.wallet
            );
        } catch (e) {
            this.error(e, 'Node');
        }
        return this.nodeAddress ?? '';  
    }

    async addProperty(key: string, value: any) {   
       const labelId: string = this.labelId as string;
        if (!labelId || !this.labelName) this.error('Label not initialized', 'Node');

        // Get property information from registry
        const label = await this.labelRegistry?.getLabel(this.labelName as string);
        if (!label || !label.exists) this.error('Label not found', 'Node');
    
        // Actual value
        const actualValue:any = await this.getProperty(key);
        if (actualValue === value) {
            if (this.debug) Logger.result('Property already exists', key, { prefix: 'Registry' });
            return;
        }

        // Get Value.
        const propertyId = Property.generateId(labelId, key);
        const propertyType: PropertyType = await this.labelRegistry?.getLabelProperty(labelId, propertyId) as number;
        const bytesValue: Uint8Array = Property.encodeValue(propertyType, value);

        // Set the property in the contract
        try {
            if (this.debug) Logger.loading(`Setting property ${key} of type ${PropertyType[propertyType]}`, { prefix: 'Node' });
            const tx = await this.contract?.setProperty(propertyId, bytesValue);
            await tx.wait();
            if (this.debug) Logger.success(`Property ${key} set successfully`, { prefix: 'Node' });
    
            return propertyId;
        } catch (error) {
            if (this.debug) Logger.error(`Failed to set property ${key}: ${error}`, { prefix: 'Node' });
            throw error;
        }
    }


    async getProperty(propertyName: string): Promise<any> {
        if (!this.labelId || !this.labelName) {
            throw new Error('Label not initialized');
        }

        // Generate property ID
        const propertyId = Property.generateId(this.labelId, propertyName);
        
        // Get property from contract
        const result = await this.contract?.getProperty(propertyId);
        if (!result) {
            throw new Error(`Property ${propertyName} not found`);
        }
        
        const [value, propertyType] = result;
        return Property.decodeValue(propertyType, value);

    }

    async addDocument(url: string): Promise<string> {
        this.checkContract();
        
        if (!url || url.trim() === '') {
            this.error('Invalid URL', 'Document');
        }

        try {
            if (this.debug) Logger.loading('Saving Document...', { prefix: 'Node' });
            const tx = await this.contract?.addDocument(url);
            await tx.wait();
            if (this.debug) Logger.success(`Document added successfully`, { prefix: 'Document' });
            
            return url;
        } catch (error: any) {
            if (this.debug) Logger.info(`Document already exists: ${url}`, { prefix: 'Document' });
            return url;
        }
    }

    async removeDocument(url: string): Promise<void> {
        this.checkContract();
        
        try {
            if (this.debug) Logger.info(`Removing document: ${url}`, { prefix: 'Document' });
            
            const documentId = await Document.generateId(this.nodeAddress as string, url);
            await this.contract?.forgetDocument(documentId);
            
            if (this.debug) Logger.success(`Document removed successfully`, { prefix: 'Document' });
        } catch (error: any) {
            this.error(`Failed to remove document: ${error.message}`, 'Document');
            throw error;
        }
    }

    async getDocuments(): Promise<string[]> {
        this.checkContract();
        
        try {
            const documentIds = await this.contract?.getDocumentIds();
            const documents: string[] = [];
            
            for (const documentId of documentIds) {
                const doc = await this.contract?.getDocument(documentId);
                if (doc && doc.isIndexed) {
                    documents.push(doc.url);
                }
            }
            
            return documents;
        } catch (error) {
            this.error({ msg: 'Failed to get Documents'}, 'Document');
            throw error;
        }
    }
}