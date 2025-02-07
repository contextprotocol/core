import { expect } from "chai";
import { ethers }from "hardhat";
import { deployLabelRegistry } from "./utils";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { Label, Property } from "../../utils/src";

// test for LabelRegistry
describe("LabelRegistry", function () {

  // Deploy the contract.
  describe("Deployment", function () {
    it("Should set the right owner and be active by default", async function () {
      const labels = await loadFixture(deployLabelRegistry);
      expect(await labels.contract.owner()).to.equal(labels.owner.address);
    });
  });

  // Node Type Management
  describe("Label Management", function () {
    it("Should add a new node type", async function () {
      const labels = await loadFixture(deployLabelRegistry);
      await expect(labels.contract.addLabel(labels.ids.labelName))
        .to.emit(labels.contract, "LabelAdded")
        .withArgs(labels.ids.labelId, labels.ids.labelName);
      const nodeTypes = await labels.contract.getLabels();
      expect(nodeTypes).to.include(labels.ids.labelName);
      // const label = await labels.contract.getLabelById(labels.ids.labelId)).to.be.true;
    });

    it("Should revert when adding duplicate node type", async function () {
        const labels = await loadFixture(deployLabelRegistry);
        await labels.contract.addLabel(labels.ids.labelName);
        await expect(labels.contract.addLabel(labels.ids.labelName))
            .to.be.revertedWithCustomError(labels.contract, "EntityAlreadyExists");
    });

    it("Should only allow owner to add node type", async function () {
        const labels = await loadFixture(deployLabelRegistry);
        await expect(labels.contract.connect(labels.otherAccount).addLabel(labels.ids.labelName))
            .to.be.revertedWithCustomError(labels.contract, "OwnableUnauthorizedAccount");
    });
    
});

// Property Management
describe("Property Management", function () {
    it("Should add a property to a label", async function () {
        const labels = await loadFixture(deployLabelRegistry);

        const labelId = Label.generateId(labels.address, "Organization");
        await labels.contract.addLabel("Organization");
        const propertyId = Property.generateId(labelId, "Name");
        await expect(labels.contract.addLabelProperty(labelId, "Name", 1)) // 1 = TEXT
            .to.emit(labels.contract, "PropertyAdded")
            .withArgs(labelId, propertyId, "Name");

        const label = await labels.contract.getLabelById(labelId);
        expect(label[0]).to.equal(true);
        expect(label[1]).to.equal("Organization");
        expect(label[2]).to.include("Name");
    });

    it("Should revert when adding properties to non-existent node type", async function () {
        const { contract } = await loadFixture(deployLabelRegistry);
        const nonExistentLabelId = ethers.randomBytes(32);

        await expect(contract.addLabelProperty(nonExistentLabelId, "TestField", 1))
            .to.be.revertedWithCustomError(contract, "EntityNotFound");
    });

    it("Should update property status", async function () {
        const labels = await loadFixture(deployLabelRegistry);
        
        // Setup Organization.
        const labelId = Label.generateId(labels.address, "Organization");
        await labels.contract.addLabel("Organization");
        const propertyId = Property.generateId(labelId, "Name");
        await labels.contract.addLabelProperty(labelId, "Name", 1); // 1 = TEXT

        await expect(labels.contract.setLabelProperty(labelId, propertyId, false))
            .to.emit(labels.contract, "PropertyUpdated")
            .withArgs(labelId, propertyId, false);
    });

    it("Should revert when updating non-existent field", async function () {
        const labels = await loadFixture(deployLabelRegistry);
        const nonExistentFieldId = ethers.randomBytes(32);

        await labels.contract.addLabel(labels.ids.labelName);

        await expect(labels.contract.setLabelProperty(labels.ids.labelId, nonExistentFieldId, false))
            .to.be.revertedWithCustomError(labels.contract, "PropertyNotFound");
    });
});

// View Functions
describe("View Functions", function () {
    it("Should return all node types", async function () {
        const { contract } = await loadFixture(deployLabelRegistry);
        const nodeType1 = "Type1";
        const nodeType2 = "Type2";

        await contract.addLabel(nodeType1);
        await contract.addLabel(nodeType2);

        const nodeTypes = await contract.getLabels();
        expect(nodeTypes).to.include(nodeType1);
        expect(nodeTypes).to.include(nodeType2);
        expect(nodeTypes.length).to.equal(2);
    });

    it("Should return all fields for a node type", async function () {
        const labels = await loadFixture(deployLabelRegistry);

        await labels.contract.addLabel(labels.ids.labelName);
        await labels.contract.addLabelProperty(labels.ids.labelId, "field1", 1);
        await labels.contract.addLabelProperty(labels.ids.labelId, "field2", 2);
        await labels.contract.addLabelProperty(labels.ids.labelId, "field3", 3);
        await labels.contract.addLabelProperty(labels.ids.labelId, "field4", 4);

        const label = await labels.contract.getLabelById(labels.ids.labelId);
        expect(label[2]).to.include("field1");
        expect(label[2]).to.include("field2");
        expect(label[2].length).to.equal(4);

        const property1Id = Property.generateId(labels.ids.labelId, "field1");
        const property1 = await labels.contract.getLabelProperty(labels.ids.labelId, property1Id);
        expect(property1).to.equal(1n);

        const property2Id = Property.generateId(labels.ids.labelId, "field2");
        const property2 = await labels.contract.getLabelProperty(labels.ids.labelId, property2Id);
        expect(property2).to.equal(2n);
    });
  });

  // Relations Functions
  describe("Edge Functions", function () {
    it("Should add an edge", async function () {
      const labels = await loadFixture(deployLabelRegistry);
      const labelOrganizationId = Label.generateId(labels.address, "Organization");
      await labels.contract.addLabel("Organization");

      const labelPersonaId = Label.generateId(labels.address, "Organization");
      await labels.contract.addLabel("Persona");

      const edgeId = Label.generateId(labels.address, "Worker");
      await labels.contract.addEdge("Worker", labelOrganizationId, labelPersonaId);

      // Can I generate an edge Between two labels?
      const valid = await labels.contract.isValidEdge(edgeId, labelOrganizationId, labelPersonaId);

      // Add properties start and end as number.
      await labels.contract.addEdgeProperty(edgeId, "start", 2);
      await labels.contract.addEdgeProperty(edgeId, "end", 2);
      await labels.contract.addEdgeProperty(edgeId, "poition", 1);

      const conf = await labels.contract.getEdgeConfigurations(edgeId);
      expect(conf[0][0]).to.equal(labelOrganizationId);
      expect(conf[1][0]).to.equal(labelPersonaId);
      expect(conf[2][0]).to.equal(true);
    });
  });
});
