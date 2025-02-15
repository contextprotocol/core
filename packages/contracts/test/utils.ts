const { ethers } = require("hardhat");
const { Document, Property, PropertyType, IdGenerator } = require("../../shared/src");

// Helper function to add multiple documents
export async function addMultipleDocuments(nodeId: string, contract: any, contractAddress: string, owner: any) {  
  const testUrl = "ipfs://QmTest123";
  const testUrl2 = "ar://TestAR456";
  const testUrl3 = "ipfs://QmTest789";
  const urls = [testUrl, testUrl2, testUrl3];
  const documentIds = [];

  for (const url of urls) {
    await contract.connect(owner).addDocument(nodeId, url);
    documentIds.push(await IdGenerator.generateDocumentId(contractAddress, url));
  }

  return documentIds;
}

// Generate all IDs for the test.
function getIds(address: string) {
  const personaName = "Persona";
  const personaId = IdGenerator.generateNodeTypeId(address, personaName);
  const organizationName = "Organization";
  const organizationId = IdGenerator.generateNodeTypeId(address, organizationName);
  
  return {
    personaName,
    personaId,
    organizationName,
    organizationId,
    propertyName: "Name",
    propertyAge: "Age",
    propertyRole: "Role",
    edgeName: "WORKS_AT",
    edgeId: IdGenerator.generateNodeTypeId(address, "WORKS_AT"),
    propertyNameId: Property.generateId(address, personaId, "Name"),
    propertyAgeId: Property.generateId(address,personaId, "Age"),
    propertyRoleId: Property.generateId(address, personaId, "Role"),
  };
}

// Deploy NodeTypeRegistry contract
export async function deployNodeTypeRegistry() {
  const accounts = await ethers.getSigners();
  const owner = accounts[0];
  const NodeTypeRegistry = await ethers.getContractFactory("NodeTypeRegistry", owner);
  const nodeType = await NodeTypeRegistry.deploy();
  const definitionAddress = await nodeType.getAddress();
  return {
    owner,
    ids: getIds(definitionAddress),
    otherAccount: accounts[1],
    contract: nodeType,
    address: definitionAddress
  };
}

// Deploy ContextNode contract
export async function deployGraphNode() {
  const accounts = await ethers.getSigners();
  const NodeTypeRegistry = await ethers.getContractFactory("NodeTypeRegistry", accounts[0]);
  const nodeType = await NodeTypeRegistry.deploy();
  const nodeTypeRegistryAddress = await nodeType.getAddress();
  
  const organizationId = IdGenerator.generateNodeTypeId(nodeTypeRegistryAddress, "Organization");
  await nodeType.addNodeType("Organization");
  await nodeType.addProperty(organizationId, "name", PropertyType.STRING);
  await nodeType.addProperty(organizationId, "age", PropertyType.NUMBER);
  await nodeType.addProperty(organizationId, "startDate", PropertyType.DATE);
  await nodeType.addProperty(organizationId, "startTime", PropertyType.TIME);
  await nodeType.addProperty(organizationId, "isActive", PropertyType.BOOLEAN);
  const personaId = IdGenerator.generateNodeTypeId(nodeTypeRegistryAddress, "Persona");
  await nodeType.addNodeType("Persona");
  const edgeTypeId = IdGenerator.generateNodeTypeId(nodeTypeRegistryAddress, "WORKS_AT");
  await nodeType.addEdge("WORKS_AT", organizationId, personaId);
  await nodeType.addProperty(edgeTypeId, "prop_date", PropertyType.DATE);
  await nodeType.addProperty(edgeTypeId, "prop_time", PropertyType.TIME);
  await nodeType.addProperty(edgeTypeId, "prop_string", PropertyType.STRING);
  await nodeType.addProperty(edgeTypeId, "prop_boolean", PropertyType.BOOLEAN);
  await nodeType.addProperty(edgeTypeId, "prop_number", PropertyType.NUMBER);
  
  const GraphNode = await ethers.getContractFactory("GraphNode");
  const organization = await GraphNode.connect(accounts[1]).deploy(organizationId, nodeTypeRegistryAddress);
  const organizationAddress = await organization.getAddress();

  // Deploy relation contract with accounts[2]
  const persona = await GraphNode.connect(accounts[2]).deploy(personaId, nodeTypeRegistryAddress);
  const personaAddress = await persona.getAddress();
  const nodeOrganizationId = await organization.nodeId();

  const knowledge = {
    organizationId,
    nodeOrganizationId,
    personaId,
    edgeTypeId,
    owner: accounts[1],
    relation: accounts[2],
    nodeTypeRegistry: nodeType,
    nodeTypeRegistryAddress: nodeTypeRegistryAddress,
    organization,
    organizationAddress,
    persona,
    personaAddress,
    otherOwner: accounts[3],
  };

  // Prepare base.
  return knowledge;
}
