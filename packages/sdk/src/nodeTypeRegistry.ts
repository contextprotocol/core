import { ethers } from 'ethers';
import { Logger } from '../../shared/src/logger';
import { PropertyType, Property, NodeType } from "../../shared/src";
import { NodeTypeRegistryConfig, RPC_URLS, NetworkConnection } from './types';
import { NodeTypeProperty } from './types';
import NodeTypeRegistryABI
    from '../../contracts/artifacts/contracts/NodeTypeRegistry.sol/NodeTypeRegistry.json';
import  dotenv from 'dotenv';
dotenv.config();

// Builder pattern for creating nodetypes with fluent interface
class NodeBuilder {
    private parent: NodeTypeRegistry;
    private properties: { name: string; type: PropertyType }[] = [];
    isEdge: boolean = false;
    from: string = '';
    to: string = '';
  
    constructor(private name: string, isEdge: boolean, parent: NodeTypeRegistry, from: string = '', to: string = '') {
        this.parent = parent;
        this.isEdge = isEdge;
        this.from = from;
        this.to = to;
    }
  
    property(name: string, type: PropertyType): NodeBuilder {
      this.properties.push({ name, type });
      return this;
    }
  
    async save() {
      const type = this.isEdge ? 'Edge' : 'NodeType';
      if (this.parent.debug) Logger.info(`Saving ${this.name}`, { prefix: 'Registry' });
    
      try {
        // Save Properties.
        const { entityId, properties } = await this.parent.addEntity(this.name, type, { fromNodeTypeName: this.from, toNodeTypeName: this.to });
        const addedProperties = [];
        
        for (const property of this.properties) {
          if (properties.some(p => p.name === property.name)) {
            if (this.parent.debug) Logger.info(`Property already exists: ${property.name}`, { prefix: type });
          } else {
            await this.parent.addEntityProperty(entityId, this.name, property.name, property.type);
            addedProperties.push(property);
            if (this.parent.debug) Logger.success(`Added property: ${property.name}`, { prefix: type });
          }
        }
        
        return { name: this.name, properties: addedProperties };
      } catch (e: any) {
        if (this.parent.debug) Logger.error(e.message ?? e, { prefix: type });
        throw e;
      }
    }
  }

// NodeTypeRegistry class
export class NodeTypeRegistry {
    private provider: ethers.Provider;
    private wallet?: ethers.Signer;
    public contract?: ethers.Contract;
    public nodeTypeRegistryAddress?: string;
    public debug: boolean = false;

    /**
     * Creates an instance of NodeTypeRegistry.
     * 
     * @param {NodeTypeRegistryConfig} config
     * The configuration object for the NodeTypeRegistry.
     * @param {NetworkConnection} [config.connection='testnet']
     * The network connection to use (e.g., 'mainnet', 'testnet').
     * @param {string} [config.privateKey]
     * The private key for the wallet. If not provided,
     * it will use the PRIVATE_KEY from environment variables.
     * @param {string} [config.nodeTypeRegistryAddress]
     * The address of the registry contract. If provided, the contract will be initialized.
     * @throws {Error} If the wallet is not initialized and a registry address is provided.
     */
    constructor(config: NodeTypeRegistryConfig) {
        const connection: NetworkConnection = config.connection ?? 'devnet';
        if (connection!= 'devnet') {
            this.error('Invalid connection. Only Devnet available at the moment', 'Connection');
        }
        const rpcUrl: string = RPC_URLS[connection];
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.debug = config.debug ?? false;

        // Wallet and connect.
        const privateKey = config.privateKey ?? process.env.PRIVATE_KEY;
        if (privateKey && privateKey !== '') {
            this.wallet = new ethers.Wallet(privateKey, this.provider);
        }

        // Initialize contract if address provided
        const nodeTypeRegistryAddress = config.nodeTypeRegistryAddress ?? process.env.NODE_TYPE_REGISTRY_ADDRESS;
        if (nodeTypeRegistryAddress) {
            this.checkWallet();
            this.contract = new ethers.Contract(
                nodeTypeRegistryAddress,
                NodeTypeRegistryABI.abi,
                this.wallet);
            this.nodeTypeRegistryAddress = nodeTypeRegistryAddress;
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
     * Deploys the NodeTypeRegistry contract if it is not already deployed.
     * 
     * @returns {Promise<string>} The address of the deployed contract.
     * @throws {Error} If the wallet is not initialized.
     */
        async deploy(): Promise<string> {
            this.checkWallet();
            if (!this.contract) {
                const factory = new ethers.ContractFactory(
                    NodeTypeRegistryABI.abi, NodeTypeRegistryABI.bytecode, this.wallet
                );
                if (this.debug) Logger.loading('Deploying registry...', { prefix: 'Registry' });
                const contract = await factory.deploy();
                await contract.waitForDeployment();
                this.nodeTypeRegistryAddress = await contract.getAddress();
                if (this.debug) {
                    Logger.success('Deployed successfully', { prefix: 'Registry' });
                    Logger.result('Address:', this.nodeTypeRegistryAddress as string, { prefix: 'Registry' });
                }
            
                this.contract = new ethers.Contract(
                    this.nodeTypeRegistryAddress,
                    NodeTypeRegistryABI.abi,
                    this.wallet
                );
            } else {
                Logger.result('Address:', this.nodeTypeRegistryAddress as string, { prefix: 'Registry' });
                if (this.debug) Logger.warn('Registry already deployed', { prefix: 'Registry' });
            }
            return this.nodeTypeRegistryAddress ?? '';  
        }
    
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
    
    // Create a new nodetypes with builder pattern
    nodeType(name: string): NodeBuilder {
        return new NodeBuilder(name, false, this);
    }

    // Create a new nodetypes with builder pattern
    edge(name: string, from: string, to: string): NodeBuilder {
        return new NodeBuilder(name, true, this, from, to);
    }

    async propertyId(nodeTypeId: string, propertyName: string): Promise<string> {
        return Property.generateId(this.nodeTypeRegistryAddress ?? '', nodeTypeId, propertyName);
    }

    async getProperties(nodeTypeId: string): Promise<{ name: string; type: PropertyType }[]> {
        const [propertyIds, propertyNames, propertyTypes] = await this.contract?.getEntityProperties(nodeTypeId);
        
        // Map the arrays into an array of objects
        return propertyNames.map((name: string, index: number) => ({
            name,
            type: propertyTypes[index]
        }));
    }

    /**
     * Retrieves a nodetypes by its name.
     *
     * @param nodetypesName - The name of the nodetypes to retrieve.
     * @returns an object containing the nodetypes's Information.
     */
    async getEntity(nodetypesName: string): Promise<{ 
        entityId: string, 
        exists: boolean, 
        name: string, 
        fromNodeTypeId: string,
        toNodeTypeId: string,
        entityType: number,
        properties: { name: string; type: PropertyType }[] 
    }> {
        const entityId = NodeType.generateId(this.nodeTypeRegistryAddress ?? '', nodetypesName);
        const nodetypes = await this.contract?.getEntity(entityId);
        let properties: { name: string; type: PropertyType }[] = [];
        const exists = nodetypes[0] as boolean;
        if (exists) {
            properties = await this.getProperties(entityId);
        }
        // No need to fetch property types here as they can be fetched when needed
        return { 
            entityId, 
            exists, 
            name: nodetypes[1], 
            fromNodeTypeId: nodetypes[2],
            toNodeTypeId: nodetypes[3],
            entityType: parseInt(nodetypes[4]),
            properties
        };
    }

    /**
     * Adds a nodetypes to the registry.
     * @param entityName - The name of the nodetypes to be added.
     * @returns A promise that resolves to the nodetypes ID.
     */         
    async addEntity(entityName: string, entityType: string = 'NodeType', params?: { fromNodeTypeName?: string; toNodeTypeName?: string }): Promise<{
        entityId: string,
        properties: { name: string; type: PropertyType }[]
    }> {
        this.checkWallet();
        this.checkContract();
        try {
            const entityId = NodeType.generateId(this.nodeTypeRegistryAddress ?? '', entityName);
            const entity = await this.getEntity(entityName);
            
            if (entity.exists) {
                if (this.debug) Logger.info(`${entityType} already exists: ` + entityName, { prefix: entityType });
                return { entityId, properties: entity.properties };
            }

            if (this.debug) Logger.loading(`Adding ${entityType} ${entityName}...`, { prefix: entityType });
            let tx;
            if (entityType === 'NodeType') {
                tx = await this.contract?.addNodeType(entityName);
            } else if (entityType === 'Edge' && params) {
                const from = await this.getEntity(params.fromNodeTypeName as string);
                const to = await this.getEntity(params.fromNodeTypeName as string);
                tx = await this.contract?.addEdge(entityName, from.entityId, to.entityId);
            }
            await tx.wait();
            
            if (this.debug) Logger.success(`${entityType} created: ${entityName}`, { prefix: entityType });
            return { entityId, properties: [] };
        } catch (e: any) {
            if (this.debug) Logger.error(e.message ?? e, { prefix: entityType });
            throw e;
        }
    }

    /**
     * Adds a property to a nodetypes in the registry.
     *
     * @param nodeTypeId - The Id of the edge to which the property will be added.
     * @param nodetypesName - The name of the nodetypes to which the property will be added.
     * @param propertyName - The name of the property to add to the edge.
     * @param propertyType - The type of the property being added.
     * @returns A promise that resolves to the ID of the added property.
     *
     * @throws Will throw an error if the edge cannot be found
     */
    async addEntityProperty(
        nodeTypeId: string,
        nodetypesName: string,
        propertyName: string,
        propertyType: PropertyType
    ): Promise<string> {
        this.checkWallet();
        this.checkContract();
        try {
            const propertyId = await this.propertyId(nodeTypeId, propertyName);
            if (this.debug) Logger.loading(`Adding property ${propertyName} to NodeType ${nodetypesName}...`, { prefix: 'Property' });
            
            const tx = await this.contract?.addProperty(nodeTypeId, propertyName, Property.getPropertyType(propertyType));
            await tx.wait();
            
            if (this.debug) Logger.success(`Added Property ${propertyName} to NodeType ${nodetypesName}`, { prefix: 'Property' });
            return propertyId;
        } catch (e: any) {
            if (this.debug) Logger.error(e.message ?? e, { prefix: 'Property' });
            throw e;
        }
    }
  

    /**
     * Retrieves the edges from the contract.
     *
     * @returns {Promise<string[]>} array of edge strings.
     */
    async getEdges(): Promise<string[]> {
        const edges = await this.contract?.getEdges();
        return edges;
    }

        /**
     * Retrieves the list of nodetypes from the contract.
     *
     * @returns {Promise<string[]>} A promise that resolves to an array of nodetypes strings.
   */
        async getEntities(): Promise<{ nodeTypes: string[]; edges: string[] }> {
            const nodeTypes = await this.contract?.getNodeTypes();
            const edges  = await this.contract?.getEdges();
            return { nodeTypes, edges };
        }
    }
