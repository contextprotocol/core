import { ethers } from 'ethers';
import { Logger } from '../../shared/src/logger';
import { NodeTypeRegistry } from './nodeTypeRegistry';
import { Property,  PropertyType, Document, Edge, EdgeStatus, NodeType, EntityType } from "../../shared/src";
import { NodeProperty, GraphNodeConfig, RPC_URLS, NetworkConnection } from './types';
import GraphNodeABI 
    from '../../contracts/artifacts/contracts/GraphNode.sol/GraphNode.json';
import  dotenv from 'dotenv';
dotenv.config();

// Builder pattern for creating labels with fluent interface
class NodeBuilder {
    private parent: GraphNode;
    private properties: NodeProperty[] = [];
    private documents: string[] = [];
    private graphNodeName: string = '';
  
    constructor(graphNodeName: string, parent: GraphNode) {
        this.graphNodeName = graphNodeName;
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
      if (this.parent.debug) Logger.info(`Saving GraphNode with NodeType ${this.graphNodeName}`, { prefix: 'Node' });
      const { nodeId, properties } = await this.parent.addNode(this.graphNodeName);

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
        name: this.graphNodeName,
        properties: this.properties
      };
    }
  }

  // EdgeBuilder class
class EdgeBuilder {
    private parent: GraphNode;
    private properties: NodeProperty[] = [];
    private edgeName: string;
    private descriptor: string;
    private toNodeAddress?: string;
  
    constructor(edgeName: string, descriptor: string, parent: GraphNode) {
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
        if (this.properties.length > 0) {
            await this.parent.addProperties(
                edgeId,
                this.edgeName,
                this.properties
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

// GraphNode class
export class GraphNode {
    private provider: ethers.Provider;
    private wallet?: ethers.Signer;
    public contract?: ethers.Contract;
    public nodeAddress?: string;
    public nodeTypeRegistry?: NodeTypeRegistry;
    public nodeTypeId?: string;
    public graphNodeName?: string;
    public debug: boolean = false;

    /**
     * Creates an instance of ContextNde.
     * 
     * @param {GraphNodeConfig} config
     * The configuration object for the GraphNode.
     * @param {NetworkConnection} [config.connection='testnet']
     * The network connection to use (e.g., 'mainnet', 'testnet').
     * @param {string} [config.privateKey]
     * The private key for the wallet. If not provided,
     * it will use the PRIVATE_KEY from environment variables.
     * @param {string} [config.nodeAddress]
     * The address of the contract. If provided, the contract will be initialized.
     * @throws {Error} If the wallet is not initialized and a registry address is provided.
     */
    constructor(config: GraphNodeConfig) {
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
                GraphNodeABI.abi,
                this.wallet);
            this.nodeAddress = config.nodeAddress;
        }

        const registryAddress = config.nodeTypeRegistryAddress ?? process.env.NODE_TYPE_REGISTRY_ADDRESS;
        if (registryAddress) {
            this.nodeTypeRegistry = new NodeTypeRegistry({ nodeTypeRegistryAddress: registryAddress, debug: this.debug });
        }
    }

        /**
     * Deploys the NodeTypeRegistry contract if it is not already deployed.
     * 
     * @returns {Promise<string>} The address of the deployed contract.
     * @throws {Error} If the wallet is not initialized.
     */
        private async deploy(nodeTypeId: string): Promise<string> {
            const factory = new ethers.ContractFactory(
                GraphNodeABI.abi, GraphNodeABI.bytecode, this.wallet
            );
            if (this.debug) Logger.loading('Deploying node...', { prefix: 'Node' });
            const nodeTypeRegistryAddress = this.nodeTypeRegistry?.nodeTypeRegistryAddress as string;
            try {
                const contract = await factory.deploy(nodeTypeId, nodeTypeRegistryAddress);
                await contract.waitForDeployment();
            
                this.nodeAddress = await contract.getAddress();
                if (this.debug) {
                    Logger.success('Node Deployed successfully', { prefix: 'Node' });
                    Logger.result('Address:', this.nodeAddress as string, { prefix: 'Node' });
                }
                    this.contract = new ethers.Contract(
                    this.nodeAddress,
                    GraphNodeABI.abi,
                    this.wallet
                );
            } catch (e) {
                this.error(e, 'Node');
            }
            return this.nodeAddress ?? '';  
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
        if (!this.nodeTypeRegistry) {
            console.log("Creating GraphNode -> checkRegistry -> error");
            this.error({msg: 'Label Registry not initialized'}, 'Registry');
        }
    }

    async addNode(graphNodeName: string): Promise<{nodeId: string , properties: any[]}> {
        this.checkWallet();
        this.checkRegistry();
        
        this.graphNodeName = graphNodeName;
        if (!this.contract) {
            const entity = await this.nodeTypeRegistry?.getEntity(graphNodeName);
            if (!entity || !entity.exists || entity.entityType !== EntityType.NODE) {
                this.error({msg: 'NodeType not found'}, 'Node');
            }
            this.nodeTypeId = entity?.entityId as string;
            this.nodeAddress = await this.deploy(this.nodeTypeId);
        } else {
            const entity = await this.nodeTypeRegistry?.getEntity(graphNodeName);
            this.nodeTypeId = entity?.entityId as string;
            return { nodeId: this.nodeAddress as string, properties: [] };
        }
        
        return {nodeId: this.nodeAddress, properties: []};
    }

    async getEdge(edgeName: string, toNodeAddress: string, decorator: string): Promise<{edgeId: string, edgeTypeId: string, edgeExists: boolean}> { 
        this.checkContract();
        const address = this.nodeTypeRegistry?.nodeTypeRegistryAddress as string;
        const edgeTypeId = NodeType.generateId(address, edgeName);
        const edgeType = await this.nodeTypeRegistry?.getEdgeById(edgeTypeId);
        if (edgeType?.exists === false) return { edgeId: "0x", edgeTypeId, edgeExists: false };
        const edgeId = Edge.generateId(edgeType?.edgeId as string, toNodeAddress, decorator);
        if (this.debug) Logger.warn(`Verify toNodeAddress is a valid relation`, { prefix: 'TODO' });
        try {
            const edge = await this.contract?.getEdge(edgeId);
            const status = Number(edge[3]);
            const edgeExists = status !== EdgeStatus.INVALID;
            return { edgeId, edgeTypeId, edgeExists };
        } catch (error) {
            return { edgeId, edgeTypeId, edgeExists: false };
        }
    }

    async addEdge(edgeName: string, toNodeAddress: string, descriptor: string): Promise<string> {
        this.checkContract();
        this.checkRegistry();
        const {edgeId, edgeTypeId, edgeExists} = await this.getEdge(edgeName, toNodeAddress, descriptor);
        if (edgeExists) {
            if (this.debug) Logger.result('Edge already exists', edgeName, { prefix: 'Edge' });
            return edgeId;
        } else {
            try {
                if (this.debug) Logger.warn(`Verify toNodeAddress is Set`, { prefix: 'TODO' });
                console.log("Creating GraphNode -> addEdge -> toNodeAddress", toNodeAddress);   
                if (this.debug) Logger.loading(`Adding edge to ${toNodeAddress}`, { prefix: 'Edge' });
                console.log("Creating GraphNode -> addEdge ", edgeTypeId, descriptor);
                const tx = await this.contract?.addEdge(edgeTypeId, toNodeAddress, descriptor);
                await tx.wait();
                if (this.debug) Logger.success(`Edge added successfully`, { prefix: 'Edge' });
                return edgeId;
            } catch (error: any) {
                this.error({ msg: 'Failed to add edge'}, 'Edge');
            }
            return edgeId;
        }

    }

    async setEdgeProperties(edgeId: string, edgeName:string,  properties: any) {
        /*
        this.checkContract();
        this.checkRegistry();
        // Get edge details from registry
        this.checkContract();

        const [edgeTypeId, nodeId, ] = await this.contract?.getEdge(edgeId);
        console.log(edgeTypeId);
        const edgeType = await this.nodeTypeRegistry?.getEdgeById(edgeTypeId);
        console.log(edgeType);
        if (!edgeType?.properties.includes(key)) {
            this.error({msg: `Property ${key} not found for edge ${edgeId}`}, 'Edge');
        }
        const propertyId = Property.generateId(edgeTypeId, key);
        const propertyType = await this.nodeTypeRegistry?.getNodeTypeProperty(edgeTypeId, propertyId) as number;
        // console.log(propertyType);
*/
/*        if (!edge || !edge.exists) {
            throw new Error(`Edge ${edgeId} not found in registry`);
        }

        // Get property details from registry
        const propertyId = Property.generateId(edgeId, key);
        const propertyType = await this.nodeTypeRegistry?.getEdgeProperty(edgeId, propertyId);
        if (!propertyType) {
            throw new Error(`Property ${key} not found for edge ${edgeId}`);
        }

        // Encode the value using the correct property type
        const bytesValue = Property.encodeValue(propertyType, value);

        try {
            if (this.debug) Logger.loading(`Setting property ${key} of type ${PropertyType[propertyType]}`, { prefix: 'Edge' });
            // const tx = await this.contract?.setProperty(propertyId, bytesValue);
        } catch (error: any) {
            this.error({ msg: `Failed to set edge property ${error.message || ""}`}, 'Edge');
        }*/
    }



    async addProperties(edgeId: string, edgeName:string,  properties: any) {  
        
       const nodeTypeId: string = this.nodeTypeId as string;
        if (!nodeTypeId || !this.graphNodeName) this.error({msg: 'NodeType not initialized'}, 'Node');
        console.log("Creating GraphNode -> addProperty -> nodeTypeId", nodeTypeId);

        // Get property information from registry
        const nodeType = await this.nodeTypeRegistry?.getEntity(this.graphNodeName as string);
        if (!nodeType || !nodeType.exists) this.error({msg: 'NodeType not found'}, 'Node');
        console.log(nodeType, edgeId, properties);
/*    
        // Actual value
        const actualValue:any = await this.getProperty(key);
        if (actualValue === value) {
            if (this.debug) Logger.result('Property already exists', key, { prefix: 'Registry' });
            return;
        }

        // Get Value.
        const propertyId = Property.generateId(nodeTypeId, key);
        const propertyType: PropertyType = await this.nodeTypeRegistry?.getNodeTypeProperty(nodeTypeId, propertyId) as number;
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
            */
    }


    async getProperty(propertyName: string): Promise<any> {
        /*
        if (!this.nodeTypeId || !this.graphNodeName) {
            throw new Error('Label not initialized');
        }

        // Generate property ID
        const propertyId = Property.generateId(this.nodeTypeId, propertyName);
        
        // Get property from contract
        const result = await this.contract?.getProperty(propertyId);
        if (!result) {
            throw new Error(`Property ${propertyName} not found`);
        }
        
        const [value, propertyType] = result;
        return Property.decodeValue(propertyType, value);
        */

    }

    async addDocument(url: string): Promise<string> {
        /*
        this.checkContract();
        
        if (!url || url.trim() === '') {
            this.error({msg: 'Invalid URL'}, 'Document');
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
        }*/
    }

    async removeDocument(url: string): Promise<void> {
        /*
        this.checkContract();
        
        try {
            if (this.debug) Logger.info(`Removing document: ${url}`, { prefix: 'Document' });
            
            const documentId = await Document.generateId(this.nodeAddress as string, url);
            await this.contract?.forgetDocument(documentId);
            
            if (this.debug) Logger.success(`Document removed successfully`, { prefix: 'Document' });
        } catch (error: any) {
            this.error({msg: `Failed to remove document: ${error.message}`}, 'Document');
            throw error;
        }
            */
    }

    async getDocuments(): Promise<string[]> {
        /*
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
        }*/
    }
}
