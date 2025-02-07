import { ethers } from 'ethers';
import { Logger } from '../../utils/src/logger';
import { PropertyType, Property, Label } from "../../utils/src";
import { LabelRegistryConfig, RPC_URLS, NetworkConnection } from './types';
import { LabelProperty } from './types';
import LabelRegistryABI
    from '../../contracts/artifacts/contracts/LabelRegistry.sol/LabelRegistry.json';
import  dotenv from 'dotenv';
dotenv.config();

// Builder pattern for creating labels with fluent interface
class EntityBuilder {
    private parent: LabelRegistry;
    private properties: LabelProperty[] = [];
    isEdge: boolean = false;
    from: string = '';
    to: string = '';
  
    constructor(private name: string, isEdge: boolean, parent: LabelRegistry, from: string = '', to: string = '') {
        this.parent = parent;
        this.isEdge = isEdge;
        this.from = from;
        this.to = to;
    }
  
    property(name: string, type: PropertyType): EntityBuilder {
      this.properties.push({ name, type });
      return this;
    }
  
    async save() {
      const type = this.isEdge ? 'Edge' : 'Label';
      if (this.parent.debug) Logger.info(`Saving ${this.name}`, { prefix: 'Registry' });
    
      // Save Properties.
      if (this.isEdge) {
        const { edgeId, properties } = await this.parent.addEdge(this.name, this.from, this.to);
        for( const property of this.properties) {
            if (properties.includes(property.name)) {
                if (this.parent.debug) Logger.result('Property already exists', property.name, { prefix: 'Registry' });
            } else {
                await this.parent.addEdgeProperty(edgeId, this.name, property.name, property.type);
            }
        }
      } else {
        const { labelId, properties } = await this.parent.addLabel(this.name);
        for( const property of this.properties) {
            if (properties.includes(property.name)) {
                if (this.parent.debug) Logger.result('Property already exists', property.name, { prefix: 'Registry' });
            } else {
                await this.parent.addLabelProperty(labelId, this.name, property.name, property.type);
            }
        }
      }
      return {
        name: this.name,
        properties: this.properties
      };
    }
  }

// LabelRegistry class
export class LabelRegistry {
    private provider: ethers.Provider;
    private wallet?: ethers.Signer;
    public contract?: ethers.Contract;
    public registryAddress?: string;
    public debug: boolean = false;

    /**
     * Creates an instance of LabelRegistry.
     * 
     * @param {LabelRegistryConfig} config
     * The configuration object for the LabelRegistry.
     * @param {NetworkConnection} [config.connection='testnet']
     * The network connection to use (e.g., 'mainnet', 'testnet').
     * @param {string} [config.privateKey]
     * The private key for the wallet. If not provided,
     * it will use the PRIVATE_KEY from environment variables.
     * @param {string} [config.registryAddress]
     * The address of the registry contract. If provided, the contract will be initialized.
     * @throws {Error} If the wallet is not initialized and a registry address is provided.
     */
    constructor(config: LabelRegistryConfig) {
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
            if (this.debug) Logger.info(`Wallet setup`, { prefix: 'Wallet' });
        } else if (this.debug) Logger.warn(`Not initialized`, { prefix: 'Wallet' });

        // Initialize contract if address provided
        const registryAddress = config.registryAddress ?? process.env.REGISTRY_ADDRESS;
        if (registryAddress) {
            this.checkWallet();
            this.contract = new ethers.Contract(
                registryAddress,
                LabelRegistryABI.abi,
                this.wallet);
            this.registryAddress = registryAddress;
            if (this.debug) Logger.result(`Registry`, registryAddress,  { prefix: 'Registry' });
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
    label(name: string): EntityBuilder {
        return new EntityBuilder(name, false, this);
    }

    // Create a new label with builder pattern
    edge(name: string, from: string, to: string): EntityBuilder {
        return new EntityBuilder(name, true, this, from, to);
    }

    /**
     * Deploys the LabelRegistry contract if it is not already deployed.
     * 
     * @returns {Promise<string>} The address of the deployed contract.
     * @throws {Error} If the wallet is not initialized.
     */
    async deploy(): Promise<string> {
        this.checkWallet();
        if (!this.contract) {
            const factory = new ethers.ContractFactory(
                LabelRegistryABI.abi, LabelRegistryABI.bytecode, this.wallet
            );
            if (this.debug) Logger.loading('Deploying registry...', { prefix: 'Registry' });
            const contract = await factory.deploy();
            await contract.waitForDeployment();
            this.registryAddress = await contract.getAddress();
            if (this.debug) {
                Logger.success('Deployed successfully', { prefix: 'Registry' });
                Logger.result('Address:', this.registryAddress as string, { prefix: 'Registry' });
            }
        
            this.contract = new ethers.Contract(
                this.registryAddress,
                LabelRegistryABI.abi,
                this.wallet
            );
        } else {
            Logger.result('Address:', this.registryAddress as string, { prefix: 'Registry' });
            if (this.debug) Logger.warn('Registry already deployed', { prefix: 'Registry' });
        }
        return this.registryAddress ?? '';  
    }

    /**
     * Retrieves the list of labels from the contract.
     *
     * @returns {Promise<string[]>} A promise that resolves to an array of label strings.
    */
    async getLabels(): Promise<string[]> {
        const labels = await this.contract?.getLabels();
        return labels;
    }

    /**
     * Retrieves a label by its name.
     *
     * @param labelName - The name of the label to retrieve.
     * @returns an object containing the label's Information.
     */
    async getLabel(labelName: string): Promise<{ labelId:string, exists: boolean, name: string, properties: string[] }> {
        const labelId = Label.generateId(this.registryAddress ?? '', labelName);
        const label = await this.contract?.getLabelById(labelId);
        for (const property of label[2]) {
            const propertyId = Property.generateId(labelId, property);
            const propertyType = await this.contract?.getLabelProperty(labelId, propertyId);
        }
        return { labelId, exists: label[0], name: label[1], properties: label[2] };
    }

    /**
     * Adds a label to the registry.
     * @param labelName - The name of the label to be added.
     * @returns A promise that resolves to the label ID.
     */
    async addLabel(labelName: string): Promise<{labelId: string , properties: string[]}> {
        this.checkWallet();
        this.checkContract();
        const labelId = Label.generateId(this.registryAddress ?? '', labelName);
        const label = await this.getLabel(labelName);
        if (label.exists) {
            if (this.debug) Logger.result('Label already exists', labelName,  { prefix: 'Label' });
            return {labelId, properties: label.properties};
        } else {
            if (this.debug) Logger.loading(`Adding label ${labelName}...`, { prefix: 'Label' });
            try {
                const tx = await this.contract?.addLabel(labelName);
                await tx.wait();
            } catch (e: any) {
                console.log("error", e);
                // this.error(e, 'Label');
            }
            if (this.debug) Logger.success(`Label created: ${labelName}`, { prefix: 'Label' });
        }
        return {labelId, properties: []};
    }

    /**
     * Adds a property to a label in the registry.
     *
     * @param labelId - The Id of the edge to which the property will be added.
     * @param labelName - The name of the label to which the property will be added.
     * @param propertyName - The name of the property to add to the edge.
     * @param propertyType - The type of the property being added.
     * @returns A promise that resolves to the ID of the added property.
     *
     * @throws Will throw an error if the edge cannot be found
     */
    async addLabelProperty(
        labelId: string,
        labelName: string,
        propertyName: string,
        propertyType: PropertyType
    ): Promise<string> {
        this.checkWallet();
        this.checkContract();
        const propertyId = Property.generateId(labelId, propertyName);
        if (this.debug) Logger.loading(`Adding property ${propertyName}  to Label ${labelName}...`, { prefix: 'Label' });
        try {
            const tx = await this.contract?.addLabelProperty(labelId, propertyName, propertyType);
            await tx.wait();
        } catch (e: any) {
            this.error(e, 'Label');
        }
        if (this.debug) Logger.success(`Added Property ${propertyName} to Label ${labelName}`, { prefix: 'Label' });
        
        return propertyId;
    }

    async getLabelProperty(labelId: string, propertyId: string) {
        const property = await this.contract?.getLabelProperty(labelId, propertyId);
        return Number(property);

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
     * Retrieves the edgeId for a given edge.
     * @param edgeName The name of the edge to retrieve.
     * @returns The computed edgeId for the edge.
    */

       async getEdge(edgeName: string) : Promise<{
        edgeId:string,
        exists: boolean,
        name: string,
        properties: string[]
    }> {
        const edgeId = Label.generateId(this.registryAddress ?? '', edgeName);
        const edge = await this.contract?.getEdge(edgeId);
        return { edgeId, exists: edge[0], name: edge[1], properties: edge[2] };
    }

        /**
     * Retrieves the edgeId for a given edge.
     * @param edgeName The name of the edge to retrieve.
     * @returns The computed edgeId for the edge.
    */
        async getEdgeById(edgeId: string) : Promise<{
            edgeId:string,
            exists: boolean,
            name: string,
            properties: string[]
        }> {
            const edge = await this.contract?.getEdge(edgeId);
            return { edgeId, exists: edge[0], name: edge[1], properties: edge[2] };
        }

    /**
     * Adds a new edge to the registry.
     * @param edgeName The name of the edge to add.
     * @returns The computed edgeId for the newly-created edge.
     */
    async addEdge(edgeName: string, fromLabel: string, toLabel: string): Promise<{edgeId: string , properties: string[]}> {
        this.checkWallet();
        this.checkContract();
        const edgeId = Label.generateId(this.registryAddress ?? '', edgeName);
        const edge = await this.getEdge(edgeName);
        const from = await this.getLabel(fromLabel);
        const to = await this.getLabel(toLabel);
        if (!from.exists || !to.exists) {
            if (this.debug) Logger.fatal(`Labels not found: "${fromLabel}" and "${toLabel}"`, { prefix: 'Edge' });
            else throw new Error('Labels not found');
        }
        if (edge.exists) {
            if (this.debug) Logger.result('Label already exists', edgeName,  { prefix: 'Edge' });
            return {edgeId, properties: edge.properties};
        } else {
            if (this.debug) Logger.loading(`Adding label ${edgeName}...`, { prefix: 'Edge' });
            try {
                const tx = await this.contract?.addEdge(edgeName, from.labelId, to.labelId);
                await tx.wait();
            } catch (e: any) {
                this.error(e, 'Edge');
            }
            if (this.debug) Logger.success('Added edge', { prefix: 'Edge' });
        }
        return {edgeId, properties: []};
    }

    /**
     * Adds a property to an edge in the registry.
     *
     * @param edgeId - The ID of the edge to which the property will be added.
     * @param edgeName - The name of the edge to which the property will be added.
     * @param propertyName - The name of the property to add to the edge.
     * @param propertyType - The type of the property being added.
     * @returns A promise that resolves to the ID of the added property.
     *
     * @throws Will throw an error if the edge cannot be found
     */
    async addEdgeProperty(
        edgeId: string,
        edgeName: string,
        propertyName: string,
        propertyType: PropertyType
    ): Promise<string> {
        this.checkWallet();
        this.checkContract();
        const propertyId = Property.generateId(edgeId, propertyName);
        if (this.debug) Logger.loading(`Adding property ${propertyName} to Edge ${edgeName}...`, { prefix: 'Edge' });
        try {
            const tx = await this.contract?.addEdgeProperty(edgeId, propertyName, propertyType);
            await tx.wait();
        } catch (e: any) {
            this.error(e, 'Edge');
        }
        if (this.debug) Logger.success(`Added property ${propertyName} to Edge ${edgeName}`, { prefix: 'Edge' });
        return propertyId;
    }
}