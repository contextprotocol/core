const { ethers } = require("hardhat");
import { Document, Property, PropertyType, Label } from "../../utils/src";




// Helper function to add multiple documents
export async function addMultipleDocuments(node: any) {
  const testUrl = "ipfs://QmTest123";
  const testUrl2 = "ar://TestAR456";
  const testUrl3 = "ipfs://QmTest789";
  const urls = [testUrl, testUrl2, testUrl3];
  const documentIds = [];

  for (const url of urls) {
    await node.contract.connect(node.owner).addDocument(url);
    documentIds.push(await Document.generateId(node.contractAddress, url));
  }

  return documentIds;
}

// Generate all IDs for the test.
function getIds(address: string) {
  const labelId = Label.generateId(address, "Persona");
  return {
    labelName: "Persona",
    propertyName: "Name",
    propertyAge: "Age",
    propertyRelation: "is friend of",
    field1Name: "field1",
    field2Name: "field2",
    labelId,
    propertyNameId: Property.generateId(labelId, "Name"),
    propertyAgeId: Property.generateId(labelId, "Age"),
    propertyRelationId: Property.generateId(labelId, "is friend of"),
    property1Id: Property.generateId(labelId, "field1"),
    property2Id: Property.generateId(labelId, "field2"),
  };
}

// Deploy LabelRegistry contract
export async function deployLabelRegistry() {
  const accounts = await ethers.getSigners();
  const owner = accounts[0];
  const LabelRegistry = await ethers.getContractFactory("LabelRegistry", owner);
  const labelRegistry = await LabelRegistry.deploy();
  const definitionAddress = await labelRegistry.getAddress();
  const definitions = {
    owner,
    ids: getIds(definitionAddress),
    otherAccount: accounts[1],
    contract: labelRegistry,
    address: definitionAddress,
  };

  return definitions;
}

// Deploy ContextNode contract
export async function deployContextNode() {
  const accounts = await ethers.getSigners();
  const LabelRegistry = await ethers.getContractFactory("LabelRegistry", accounts[0]);
  const labelRegistry = await LabelRegistry.deploy();
  const definitionAddress = await labelRegistry.getAddress();
  
  const organizationId = Label.generateId(definitionAddress, "Organization");
  await labelRegistry.addLabel("Organization");
  await labelRegistry.addLabelProperty(organizationId, "name", PropertyType.STRING);
  await labelRegistry.addLabelProperty(organizationId, "age", PropertyType.NUMBER);
  await labelRegistry.addLabelProperty(organizationId, "createdAt", PropertyType.DATE);
  await labelRegistry.addLabelProperty(organizationId, "startTime", PropertyType.TIME);
  await labelRegistry.addLabelProperty(organizationId, "isActive", PropertyType.BOOLEAN);
  const personaId = Label.generateId(definitionAddress, "Organization");
  await labelRegistry.addLabel("Persona");
  const edgeId = Label.generateId(definitionAddress, "Worker");
  await labelRegistry.addEdge("Worker", organizationId, personaId); // 1 for STRING
  await labelRegistry.addEdgeProperty(edgeId, "start", PropertyType.DATE);
  await labelRegistry.addEdgeProperty(edgeId, "end", PropertyType.DATE);
  await labelRegistry.addEdgeProperty(edgeId, "position", PropertyType.STRING);
  
  const ContextNode = await ethers.getContractFactory("ContextNode");
  const contract = await ContextNode.connect(accounts[1]).deploy(organizationId, definitionAddress);
  const contractAddress = await contract.getAddress();

  // Deploy relation contract with accounts[2]
  const persona = await ContextNode.connect(accounts[2]).deploy(personaId, definitionAddress);
  const personaAddress = await persona.getAddress();

  const knowledge = {
    organizationId,
    personaId,
    edgeId,
    owner: accounts[1],
    relation: accounts[2],
    label: labelRegistry,
    labelAddress: definitionAddress,
    contract,
    contractAddress,
    persona,
    personaAddress,
    otherOwner: accounts[3],
  };

  // Prepare base.
  return knowledge;
}

