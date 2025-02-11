import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployGraphNode, addMultipleDocuments  } from "./utils";
import { Property, Document, Edge, EdgeStatus } from "../../shared/src";

const { ethers } = require("hardhat");
const testUrl = "ipfs://QmTest123";
const testUrl2 = "ar://TestAR456";

describe("KnowledgeBase", function () {
    // DEPLOYMENT.
    describe("Deployment", function () {
        it("Should set the right owner and be active by default", async function () {
            const node = await loadFixture(deployGraphNode);
            expect(await node.organization.owner()).to.equal(node.owner.address);
            expect(await node.organization.nodeId()).to.exist
        });
        it("Should set the correct Label", async function () {
            const node = await loadFixture(deployGraphNode);
            expect(await node.organization.nodeTypeId()).to.equal(node.organizationId);
        });

        it("Should be public by default", async function () {
            const node = await loadFixture(deployGraphNode);
            expect(await node.organization.isPrivate()).to.be.false;
        });
    });

    // PROPERTIES.
    describe("Properties", function () {
        // String Test
        it("Should set a string property correctly", async function () {
            const node = await loadFixture(deployGraphNode);
            const testDate = new Date('2024-02-06T12:00:00Z')
            const dateAsBytes = Property.dateToBytes(testDate);
            const properties = [{
                propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.organizationId, "name"),
                value: Property.stringToBytes("Jhon")
            }, {
                propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.organizationId, "age"),
                value: Property.numberToBytes(50)
            }, {
                propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.organizationId, "startDate"),
                value: dateAsBytes
            },{
                propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.organizationId, "startTime"),
                value: Property.timeToBytes("14:30")
            }, {
                propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.organizationId, "isActive"),
                value: Property.booleanToBytes(true)
            }
            ];
            await node.organization.connect(node.owner).setProperties(node.nodeOrganizationId, properties);
            const result = Property.formatResults(await node.organization.getProperties(node.nodeOrganizationId));

            expect(result['name'].value).to.equal("Jhon");
            expect(result['age'].value).to.equal(50);
            expect(result['startDate'].value.getTime()).to.equal(testDate.getTime());
            expect(result['startTime'].value).to.equal("14:30");
            expect(result['isActive'].value).to.equal(true);
        });

        // Time/Hour test

        // Boolean test
        it("Should emit PropertyStringUpdated event when setting string", async function () {
            const node = await loadFixture(deployGraphNode);
            const propertyNameId = Property.generateId(node.nodeTypeRegistryAddress,node.organizationId, "name");
            const properties = [{ propertyTypeId: propertyNameId, value: Property.stringToBytes("Jhon") }];
            await expect(node.organization.connect(node.owner).setProperties(node.nodeOrganizationId, properties))
                .to.emit(node.organization, "PropertyUpdated")
                .withArgs(node.nodeOrganizationId, propertyNameId, Property.stringToBytes("Jhon") ,node.owner.address);
        });
        it("Should revert when non-owner tries to set string property", async function () {
            const node = await loadFixture(deployGraphNode);
            const propertyNameId = Property.generateId(node.nodeTypeRegistryAddress,node.organizationId, "name");
            const properties = [{ propertyTypeId: propertyNameId, value: Property.stringToBytes("Jhon") }];
            
            await expect(
                node.organization.connect(node.otherOwner).setProperties(node.nodeOrganizationId, properties)
            ).to.be.revertedWithCustomError(node.organization, "OwnableUnauthorizedAccount");
        });
    });

    // DOCUMENT.

        describe("Adding Documents", function () {
            it("Should add a document correctly", async function () {
                const node = await loadFixture(deployGraphNode);
                const documentId = await Document.generateId(node.organizationAddress, testUrl);
                const tx = await node.organization.connect(node.owner).addDocument(node.nodeOrganizationId, testUrl);

                // Check event emission
                await expect(tx)
                    .to.emit(node.organization, "DocumentAdded")
                    .withArgs(node.nodeOrganizationId, documentId, testUrl, node.owner.address);

                // Check document state
                const doc = await node.organization.getDocument(node.nodeOrganizationId, documentId);
                expect(doc.url).to.equal(testUrl);
                expect(doc.isIndexed).to.be.true;
            });

            it("Should not allow adding empty URL", async function () {
                const node = await loadFixture(deployGraphNode);
                await expect(
                    node.organization.connect(node.owner).addDocument(node.nodeOrganizationId, "")
                ).to.be.revertedWithCustomError(node.organization, "InvalidURL");
            });

            it("Should not allow adding duplicate URL", async function () {
                const node = await loadFixture(deployGraphNode);
                await node.organization.connect(node.owner).addDocument(node.nodeOrganizationId,testUrl);
                
                await expect(
                    node.organization.connect(node.owner).addDocument(node.nodeOrganizationId,testUrl)
                ).to.be.revertedWithCustomError(node.organization, "DocumentAlreadyExists");
            });

            it("Should not allow non-owner to add document", async function () {
                const node = await loadFixture(deployGraphNode);
                const [nonOwner] = await ethers.getSigners();
                
                await expect(
                    node.organization.connect(nonOwner).addDocument(node.nodeOrganizationId,testUrl)
                ).to.be.revertedWithCustomError(node.organization, "OwnableUnauthorizedAccount");
            });
        });

        describe("Forgetting Documents", function () {
            
            it("Should forget a document correctly", async function () {
                const node = await loadFixture(deployGraphNode);
                await node.organization.connect(node.owner).addDocument(node.nodeOrganizationId, testUrl);
                const documentId = await Document.generateId(node.organizationAddress, testUrl);
                const tx = await node.organization.connect(node.owner).forgetDocument(node.nodeOrganizationId, documentId);

                // Check event emission
                await expect(tx)
                    .to.emit(node.organization, "DocumentNotIndexed")
                    .withArgs(node.nodeOrganizationId, documentId, node.owner.address);

                // Check document state
                const doc = await node.organization.getDocument(node.nodeOrganizationId, documentId);
                expect(doc.url).to.equal(testUrl);
                expect(doc.isIndexed).to.be.false;
            });

            it("Should not allow forgetting non-existent document", async function () {
                const node = await loadFixture(deployGraphNode);
                const fakeDocumentId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
                
                await expect(
                    node.organization.connect(node.owner).forgetDocument(node.nodeOrganizationId, fakeDocumentId)
                ).to.be.revertedWithCustomError(node.organization, "InvalidDocumentId");
            });

            it("Should not allow non-owner to forget document", async function () {
                const node = await loadFixture(deployGraphNode);
                await node.organization.connect(node.owner).addDocument(node.nodeOrganizationId, testUrl);
                
                const documentId = await Document.generateId(node.organizationAddress, testUrl);
                const [nonOwner] = await ethers.getSigners();

                await expect(
                    node.organization.connect(nonOwner).forgetDocument(node.nodeOrganizationId, documentId)
                ).to.be.revertedWithCustomError(node.organization, "OwnableUnauthorizedAccount");
            });

            it("Can forget already forgotten document", async function () {
                const node = await loadFixture(deployGraphNode);
                await node.organization.connect(node.owner).addDocument(node.nodeOrganizationId, testUrl);
                
                const documentId = await Document.generateId(node.organizationAddress, testUrl);
                await node.organization.connect(node.owner).forgetDocument(node.nodeOrganizationId, documentId);

                // Should be able to forget again without error
                const tx = await node.organization.connect(node.owner).forgetDocument(node.nodeOrganizationId, documentId);
                await expect(tx)
                    .to.emit(node.organization, "DocumentNotIndexed")
                    .withArgs(node.nodeOrganizationId, documentId, node.owner.address);
            });
        });


        describe("Document List", function () {
            it("Should return empty list initially", async function () {
                const node = await loadFixture(deployGraphNode);
                const documentIds = await node.organization.getDocuments(node.nodeOrganizationId);
                expect(documentIds).to.be.an('array').that.is.empty;
            });

            it("Should return all document IDs in order of addition", async function () {
                const node = await loadFixture(deployGraphNode);
                const expectedIds = await addMultipleDocuments(node.nodeOrganizationId, node.organization, node.organizationAddress, node.owner);
                
                const documentIds = await node.organization.getDocuments(node.nodeOrganizationId);
                
                expect(documentIds).to.have.lengthOf(3);
                expectedIds.forEach((id, index) => {
                    expect(documentIds[index]).to.equal(id);
                });
            });

            it("Should maintain list after forgetting documents", async function () {
                const node = await loadFixture(deployGraphNode);
                const documentIds = await addMultipleDocuments(node.nodeOrganizationId, node.organization, node.organizationAddress, node.owner);
                
                // Forget middle document
                await node.organization.connect(node.owner).forgetDocument(node.nodeOrganizationId, documentIds[1]);
                
                const listedIds = await node.organization.getDocuments(node.nodeOrganizationId);                expect(listedIds).to.have.lengthOf(3);
                expect(listedIds[1]).to.equal(documentIds[1]);

                // Verify document is marked as not indexed but still in list
                const document = await node.organization.getDocument(node.nodeOrganizationId, documentIds[1]);
                expect(document.isIndexed).to.be.false;
            });

            it("Should match document IDs with their content", async function () {
                const node = await loadFixture(deployGraphNode);
                await addMultipleDocuments(node.nodeOrganizationId, node.organization, node.organizationAddress, node.owner);
                
                const documentIds = await node.organization.getDocuments(node.nodeOrganizationId);
                
                for (const id of documentIds) {
                    const document = await node.organization.getDocument(node.nodeOrganizationId, id);
                    const computedId = await Document.generateId(node.organizationAddress, document.url);
                    expect(computedId).to.equal(id);
                }
        });
    });

    // Relations.
        describe("Adding Edges", function () {
            const descriptor = "is the CEO";
            it("Should add a new relation successfully", async function () {
                const node = await loadFixture(deployGraphNode);
                const edgeId = Edge.generateId(node.edgeTypeId, node.personaAddress, descriptor);
                await expect(node.organization.addEdge(
                    node.edgeTypeId,
                    node.personaAddress,
                    descriptor
                )).to.emit(node.organization, "EdgeAdded")
                  .withArgs(
                    edgeId,
                      node.edgeTypeId,
                      node.organizationAddress,
                      node.personaAddress
                  );
    
                const relation = await node.organization.getEdgeById(edgeId);
                expect(relation[0]).to.equal(node.edgeTypeId);
                expect(relation[1]).to.equal(node.personaAddress);
                expect(relation[2]).to.equal(descriptor);
                expect(relation[3]).to.equal(EdgeStatus.PENDING); // PENDING status
                
            });

            it("Should revert when adding relation with invalid field type", async function () {
                const node = await loadFixture(deployGraphNode);
   
                // Try to add relation using string field
                await expect(node.organization.addEdge(
                    node.personaId,
                    node.personaAddress,
                    descriptor
                )).to.be.revertedWithCustomError(node.organization, "InvalidId");
            });

            it("Should revert when adding duplicate relation", async function () {
                const node = await loadFixture(deployGraphNode);
                
                await expect(node.organization.addEdge(
                    node.edgeTypeId,
                    node.personaAddress,
                    descriptor
                ))
    
                await expect(node.organization.addEdge(
                    node.edgeTypeId,
                    node.personaAddress,
                    "now COO"
                ))

                await expect(node.organization.addEdge(
                    node.personaId,
                    node.personaAddress,
                    "now COO"
                )).to.be.revertedWithCustomError(node.organization, "InvalidId");

                const relations = await node.organization.getEdgeIds();
                expect(relations.length).to.equal(2);
            });
        });

        describe("Updating Relation Status", function () {
            const descriptor = "is the CEO";
            it("Should allow invited party to accept pending relation", async function () {
                const node = await loadFixture(deployGraphNode);
                const relationId = Edge.generateId(node.edgeTypeId, node.personaAddress, descriptor );
                await node.organization.addEdge( node.edgeTypeId, node.personaAddress,descriptor);
                await node.persona.answerEdge(node.organizationAddress, relationId, EdgeStatus.ACCEPTED); 
                const relation = await node.organization.getEdgeById(relationId);
                expect(relation[3]).to.equal(EdgeStatus.ACCEPTED);
            });

            it("Should allow owner to delete pending relation", async function () {
                const node = await loadFixture(deployGraphNode);
                const relationId = Edge.generateId( node.edgeTypeId, node.personaAddress, descriptor );
                await node.organization.addEdge( node.edgeTypeId, node.personaAddress,descriptor);
    
                await expect(node.organization.updateStatus( relationId, EdgeStatus.DELETED))
                    .to.emit(node.organization, "StatusUpdated")
                    .withArgs(relationId, EdgeStatus.PENDING, EdgeStatus.DELETED, await node.owner.getAddress());
                  
                const relation = await node.organization.getEdgeById(relationId);
                expect(relation[3]).to.equal(EdgeStatus.DELETED);
  
            });
        });

        describe("Edge Properties", function () {
            // String Test
            it("Should set a string property correctly", async function () {
                const node = await loadFixture(deployGraphNode);
                const testDate = new Date('2024-02-06T12:00:00Z')
                const dateAsBytes = Property.dateToBytes(testDate);
                const properties = [{
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.edgeTypeId, "prop_string"),
                    value: Property.stringToBytes("Jhon")
                }, {
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.edgeTypeId, "prop_number"),
                    value: Property.numberToBytes(50)
                }, {
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.edgeTypeId, "prop_date"),
                    value: dateAsBytes
                },{
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.edgeTypeId, "prop_time"),
                    value: Property.timeToBytes("14:30")
                }, {
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress, node.edgeTypeId, "prop_boolean"),
                    value: Property.booleanToBytes(true)
                }
                ];
                const edgeId = Edge.generateId(node.edgeTypeId, node.personaAddress, 'edge1');
                await node.organization.addEdge( node.edgeTypeId, node.personaAddress, 'edge1');

                await node.organization.connect(node.owner).setProperties(edgeId, properties);
                const result = Property.formatResults(await node.organization.getProperties(edgeId));
    
                expect(result['prop_string'].value).to.equal("Jhon");
                expect(result['prop_number'].value).to.equal(50);
                expect(result['prop_date'].value.getTime()).to.equal(testDate.getTime());
                expect(result['prop_time'].value).to.equal("14:30");
                expect(result['prop_boolean'].value).to.equal(true);
            });

        
            it("Should revert when edge is not in PENDING status", async function() {
                const node = await loadFixture(deployGraphNode);
                const propertyNameId = Property.generateId(node.nodeTypeRegistryAddress,node.edgeTypeId, "prop_string");
                const properties = [{ propertyTypeId: propertyNameId, value: Property.stringToBytes("Jhon") }];
                const edgeId = Edge.generateId(node.edgeTypeId, node.personaAddress, "edge1");
                
                // Add edge and accept it
                await node.organization.addEdge(node.edgeTypeId, node.personaAddress, "edge1");
                await node.persona.answerEdge(node.organizationAddress, edgeId, EdgeStatus.ACCEPTED);
    
                const propertyInput = [{
                    propertyTypeId: Property.generateId(node.nodeTypeRegistryAddress,node.edgeTypeId, 'position'),
                    value: Property.stringToBytes("CEO")
                }];
    
                await expect(node.organization.connect(node.owner)
                    .setProperties(edgeId, properties))
                    .to.be.revertedWithCustomError(node.organization, "UnauthorizedAccess");
            });
        });

        describe("Edge Documents", function() {
            it("Should add a document correctly", async function () {
                const node = await loadFixture(deployGraphNode);
                const edgeId = Edge.generateId(node.edgeTypeId, node.personaAddress, "edge1");
                await node.organization.addEdge(node.edgeTypeId, node.personaAddress, "edge1");
                const documentId = await Document.generateId(node.organizationAddress, testUrl);
                const tx = await node.organization.connect(node.owner).addDocument(edgeId, testUrl);

                // Check event emission
                await expect(tx)
                    .to.emit(node.organization, "DocumentAdded")
                    .withArgs(edgeId, documentId, testUrl, node.owner.address);

                // Check document state
                const doc = await node.organization.getDocument(edgeId, documentId);
                expect(doc.url).to.equal(testUrl);
                expect(doc.isIndexed).to.be.true;
        });
    });
});
