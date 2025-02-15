import { expect } from "chai";
import { ethers } from "hardhat";
import { deployNodeTypeRegistry } from "./utils";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { IdGenerator, Property } from "../../shared/src";

// test for NodeTypeRegistry
describe("NodeTypeRegistry", function () {

  // Deploy the contract.
  describe("Deployment", function () {
    it("Should set the right owner and be active by default", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      expect(await registry.contract.owner()).to.equal(registry.owner.address);
    });
  });

  // Node Type Management
  describe("NodeType Management", function () {
    it("Should add a new node type", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      await expect(registry.contract.addNodeType(registry.ids.personaName))
        .to.emit(registry.contract, "EntityAdded")
        .withArgs(registry.ids.personaId, registry.ids.personaName, ethers.ZeroHash, ethers.ZeroHash);

      const nodeTypes = await registry.contract.getNodeTypes();
      expect(nodeTypes).to.include(registry.ids.personaName);

      const entity = await registry.contract.getEntity(registry.ids.personaId);
      expect(entity.exists).to.be.true;
      expect(entity.name).to.equal(registry.ids.personaName);
      expect(entity.fromNodeTypeId).to.equal(ethers.ZeroHash);
      expect(entity.toNodeTypeId).to.equal(ethers.ZeroHash);
    });

    it("Should revert when adding duplicate node type", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      await registry.contract.addNodeType(registry.ids.personaName);
      await expect(registry.contract.addNodeType(registry.ids.personaName))
        .to.be.revertedWithCustomError(registry.contract, "EntityAlreadyExists");
    });

    it("Should only allow owner to add node type", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      await expect(registry.contract.connect(registry.otherAccount).addNodeType(registry.ids.personaName))
        .to.be.revertedWithCustomError(registry.contract, "OwnableUnauthorizedAccount");
    });
  });

  // Property Management
  describe("Property Management", function () {
    it("Should add a property to a node type", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");
      await registry.contract.addNodeType("Organization");
      
      const propertyId = Property.generateId(registry.address, nodeTypeId, "name");
      await expect(registry.contract.addProperty(nodeTypeId, "name", 1)) // 1 = STRING
        .to.emit(registry.contract, "PropertyAdded")
        .withArgs(propertyId, "name", 1, nodeTypeId);

      const propertyType = await registry.contract.getPropertyType(propertyId);
      expect(propertyType).to.equal(1); // STRING
    });

    it("Should list all properties of an entity", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      await registry.contract.addNodeType("Person");
      
      // Add multiple properties
      const namePropertyId = Property.generateId(registry.address, nodeTypeId, "name");
      const agePropertyId = Property.generateId(registry.address, nodeTypeId, "age");
      const birthdayPropertyId = Property.generateId(registry.address, nodeTypeId, "birthday");
      
      await registry.contract.addProperty(nodeTypeId, "name", 1); // STRING
      await registry.contract.addProperty(nodeTypeId, "age", 2);   // NUMBER
      await registry.contract.addProperty(nodeTypeId, "birthday", 3); // DATE
      
      const [propertyIds, propertyNames, propertyTypes] = await registry.contract.getEntityProperties(nodeTypeId);
      
      expect(propertyIds).to.have.length(3);
      expect(propertyNames).to.have.length(3);
      expect(propertyTypes).to.have.length(3);
      
      expect(propertyNames).to.include("name");
      expect(propertyNames).to.include("age");
      expect(propertyNames).to.include("birthday");
      
      // Verify property types
      const nameIndex = propertyNames.findIndex((name:string) => name === "name");
      const ageIndex = propertyNames.findIndex((name:string) => name === "age");
      const birthdayIndex = propertyNames.findIndex((name:string) => name === "birthday");
      
      expect(propertyTypes[nameIndex]).to.equal(1); // STRING
      expect(propertyTypes[ageIndex]).to.equal(2);  // NUMBER
      expect(propertyTypes[birthdayIndex]).to.equal(3); // DATE
    });

    it("Should check if entity has a property", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      await registry.contract.addNodeType("Person");
      
      const namePropertyId = Property.generateId(registry.address, nodeTypeId, "name");
      await registry.contract.addProperty(nodeTypeId, "name", 1);
      
      expect(await registry.contract.hasProperty(nodeTypeId, namePropertyId)).to.be.true;
      
      const nonExistentPropertyId = Property.generateId(registry.address, nodeTypeId, "nonexistent");
      expect(await registry.contract.hasProperty(nodeTypeId, nonExistentPropertyId)).to.be.false;
    });

    it("Should revert when adding duplicate property", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");
      await registry.contract.addNodeType("Organization");
      
      const propertyId = Property.generateId(registry.address, nodeTypeId, "name");
      await registry.contract.addProperty(nodeTypeId, "name", 1);
      await expect(registry.contract.addProperty(nodeTypeId, "name", 1))
        .to.be.revertedWithCustomError(registry.contract, "PropertyAlreadyExists");
    });

    it("Should revert when getting non-existent property", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");
      const propertyId = Property.generateId(registry.address, nodeTypeId, "nonexistent");
      
      await expect(registry.contract.getPropertyType(propertyId))
        .to.be.revertedWithCustomError(registry.contract, "PropertyNotFound");
    });

    it("Should revert when getting properties of non-existent entity", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nonExistentId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
      
      await expect(registry.contract.getEntityProperties(nonExistentId))
        .to.be.revertedWithCustomError(registry.contract, "EntityNotFound");
    });
  });

  // Edge Management
  describe("Edge Management", function () {
    it("Should add a new edge type between two node types", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);

      // Create two node types first
      const personNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      const orgNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");

      await registry.contract.addNodeType("Person");
      await registry.contract.addNodeType("Organization");

      const edgeTypeId = IdGenerator.generateNodeTypeId(registry.address, "WORKS_AT");
      await expect(registry.contract.addEdge("WORKS_AT", personNodeTypeId, orgNodeTypeId))
        .to.emit(registry.contract, "EntityAdded")
        .withArgs(edgeTypeId, "WORKS_AT", personNodeTypeId, orgNodeTypeId);

      const edges = await registry.contract.getEdges();
      expect(edges).to.include("WORKS_AT");

      const entity = await registry.contract.getEntity(edgeTypeId);
      expect(entity.exists).to.be.true;
      expect(entity.name).to.equal("WORKS_AT");
      expect(entity.fromNodeTypeId).to.equal(personNodeTypeId);
      expect(entity.toNodeTypeId).to.equal(orgNodeTypeId);
    });

    it("Should validate edge connections correctly", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);

      const personNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      const orgNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");

      await registry.contract.addNodeType("Person");
      await registry.contract.addNodeType("Organization");

      const edgeTypeId = IdGenerator.generateNodeTypeId(registry.address, "WORKS_AT");
      await registry.contract.addEdge("WORKS_AT", personNodeTypeId, orgNodeTypeId);

      expect(await registry.contract.isValidEdge(edgeTypeId, personNodeTypeId, orgNodeTypeId)).to.be.true;
      expect(await registry.contract.isValidEdge(edgeTypeId, orgNodeTypeId, personNodeTypeId)).to.be.false;
    });

    it("Should revert when adding edge with invalid node types", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const invalidNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Invalid");

      await registry.contract.addNodeType("Person");

      const personNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      await expect(registry.contract.addEdge("WORKS_AT", personNodeTypeId, invalidNodeTypeId))
        .to.be.revertedWithCustomError(registry.contract, "InvalidNodeTypePair");
    });
  });

  describe("View Functions", function () {
    it("Should return all node types and edges", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);

      await registry.contract.addNodeType("Person");
      await registry.contract.addNodeType("Organization");

      const personNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Person");
      const orgNodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");

      await registry.contract.addEdge("WORKS_AT", personNodeTypeId, orgNodeTypeId);

      const nodeTypes = await registry.contract.getNodeTypes();
      expect(nodeTypes.length).to.equal(2);
      expect(nodeTypes).to.deep.include("Person");
      expect(nodeTypes).to.deep.include("Organization");

      const edges = await registry.contract.getEdges();
      expect(edges.length).to.equal(1);
      expect(edges).to.deep.include("WORKS_AT");
    });

    it("Should return correct property type", async function () {
      const registry = await loadFixture(deployNodeTypeRegistry);
      const nodeTypeId = IdGenerator.generateNodeTypeId(registry.address, "Organization");
      await registry.contract.addNodeType("Organization");

      const propertyId = Property.generateId(registry.address, nodeTypeId, "name");
      await registry.contract.addProperty(nodeTypeId, "name", 1);
      const propertyType = await registry.contract.getPropertyType(propertyId);
      expect(propertyType).to.equal(1); // STRING
    });
  });
});
