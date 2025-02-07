import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { deployContextNode, addMultipleDocuments  } from "./utils";
import { Property, Document, Edge, EdgeStatus } from "../../utils/src";

const { ethers } = require("hardhat");

describe("KnowledgeBase", function () {
    // DEPLOYMENT.
    describe("Deployment", function () {
        it("Should set the right owner and be active by default", async function () {
            const node = await loadFixture(deployContextNode);
            expect(await node.contract.owner()).to.equal(node.owner.address);
        });

        it("Should set the correct Label", async function () {
            const node = await loadFixture(deployContextNode);
            expect(await node.contract.labelId()).to.equal(node.organizationId);
        });

        it("Should be public by default", async function () {
            const node = await loadFixture(deployContextNode);
            expect(await node.contract.isPrivate()).to.be.false;
        });
    });

    // PROPERTIES.
    describe("Properties", function () {
        const stringAsBytes = Property.stringToBytes("Jhon");
        const numberAsBytes = Property.numberToBytes(50);

        // String Test
        it("Should set a string property correctly", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyNameId = Property.generateId(node.organizationId, "name");
            await node.contract.connect(node.owner).setProperty(propertyNameId, stringAsBytes);
            const storedValue = Property.bytesToString(await node.contract.propertyValues(propertyNameId));
            expect(storedValue).to.equal("Jhon");
        });

        // Number.
        it("Should set a number property correctly", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyNumberId = Property.generateId(node.organizationId, "age");
            const testNumber = 42;
            const numberAsBytes = Property.numberToBytes(testNumber);
            
            await node.contract.connect(node.owner).setProperty(propertyNumberId, numberAsBytes);
            
            const storedValue = Property.bytesToNumber(await node.contract.propertyValues(propertyNumberId));
            expect(storedValue).to.equal(testNumber);
        });

        // Date/Timestamp test
        it("Should set a date property correctly", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyDateId = Property.generateId(node.organizationId, "createdAt");
            const testDate = new Date('2024-02-06T12:00:00Z');
            const dateAsBytes = Property.dateToBytes(testDate);
            
            await node.contract.connect(node.owner).setProperty(propertyDateId, dateAsBytes);
            
            const storedValue = Property.bytesToDate(await node.contract.propertyValues(propertyDateId));
            expect(storedValue.getTime()).to.equal(testDate.getTime());
        });

        // Time/Hour test
        it("Should set a time property correctly", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyTimeId = Property.generateId(node.organizationId, "startTime");
            const testTime = "14:30";
            const timeAsBytes = Property.timeToBytes(testTime);
            
            await node.contract.connect(node.owner).setProperty(propertyTimeId, timeAsBytes);
            
            const storedValue = Property.bytesToTime(await node.contract.propertyValues(propertyTimeId));
            expect(storedValue).to.equal(testTime);
            const property = await node.contract.getProperty(propertyTimeId);
            expect(property[1]).to.equal(4n);
        });

        // Boolean test
        it("Should set a boolean property correctly", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyBoolId = Property.generateId(node.organizationId, "isActive");
            const testBool = true;
            const boolAsBytes = Property.booleanToBytes(testBool);
            
            await node.contract.connect(node.owner).setProperty(propertyBoolId, boolAsBytes);
            
            const storedValue = Property.bytesToBoolean(await node.contract.propertyValues(propertyBoolId));
            expect(storedValue).to.equal(testBool);
        });

        it("Should emit PropertyStringUpdated event when setting string", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyNameId = Property.generateId(node.organizationId, "name");
            await expect(await node.contract.connect(node.owner).setProperty(propertyNameId, stringAsBytes))
                .to.emit(node.contract, "PropertyUpdated")
                .withArgs(propertyNameId, stringAsBytes ,node.owner.address);
        });
        it("Should revert when non-owner tries to set string property", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyNameId = Property.generateId(node.organizationId, "name");
            
            await expect(
                node.contract.connect(node.otherOwner).setProperty(propertyNameId, stringAsBytes)
            ).to.be.revertedWithCustomError(node.contract, "OwnableUnauthorizedAccount");
        });
        it("Should add multiple properties", async function () {
            const node = await loadFixture(deployContextNode);
            const propertyNameId = Property.generateId(node.organizationId, "name");
            const propertyAgeId = Property.generateId(node.organizationId, "age");
            await node.contract.connect(node.owner).setProperties(
                [{propertyId: propertyNameId, value: stringAsBytes},
                {propertyId: propertyAgeId, value: numberAsBytes}]
            );
            let storedValue = await node.contract.propertyValues(propertyNameId);
            const storedString = ethers.toUtf8String(storedValue);
            expect(storedString).to.equal("Jhon");

            // storedValue = await node.contract.propertyValues(propertyAgeId);
            // expect(storedValue).to.equal(numberAsBytes);
        });
    });

    // DOCUMENT.
    describe("Documents", function () {
        const testUrl = "ipfs://QmTest123";
        const testUrl2 = "ar://TestAR456";

        describe("Adding Documents", function () {
            it("Should add a document correctly", async function () {
                const node = await loadFixture(deployContextNode);
                const documentId = await Document.generateId(node.contractAddress, testUrl);
                const tx = await node.contract.connect(node.owner).addDocument(testUrl);

                // Check event emission
                await expect(tx)
                    .to.emit(node.contract, "DocumentAdded")
                    .withArgs(documentId, testUrl, node.owner.address);

                // Check document state
                const doc = await node.contract.documents(documentId);
                expect(doc.url).to.equal(testUrl);
                expect(doc.isIndexed).to.be.true;
            });

            it("Should not allow adding empty URL", async function () {
                const node = await loadFixture(deployContextNode);
                await expect(
                    node.contract.connect(node.owner).addDocument("")
                ).to.be.revertedWithCustomError(node.contract, "InvalidURL");
            });

            it("Should not allow adding duplicate URL", async function () {
                const node = await loadFixture(deployContextNode);
                await node.contract.connect(node.owner).addDocument(testUrl);
                
                await expect(
                    node.contract.connect(node.owner).addDocument(testUrl)
                ).to.be.revertedWithCustomError(node.contract, "DocumentAlreadyExists");
            });

            it("Should not allow non-owner to add document", async function () {
                const node = await loadFixture(deployContextNode);
                const [nonOwner] = await ethers.getSigners();
                
                await expect(
                    node.contract.connect(nonOwner).addDocument(testUrl)
                ).to.be.revertedWithCustomError(node.contract, "OwnableUnauthorizedAccount");
            });
        });

        describe("Forgetting Documents", function () {
            
            it("Should forget a document correctly", async function () {
                const node = await loadFixture(deployContextNode);
                await node.contract.connect(node.owner).addDocument(testUrl);
                const documentId = await Document.generateId(node.contractAddress, testUrl);
                const tx = await node.contract.connect(node.owner).forgetDocument(documentId);

                // Check event emission
                await expect(tx)
                    .to.emit(node.contract, "DocumentDeactivated")
                    .withArgs(documentId, node.owner.address);

                // Check document state
                const doc = await node.contract.documents(documentId);
                expect(doc.url).to.equal(testUrl);
                expect(doc.isIndexed).to.be.false;
            });

            it("Should not allow forgetting non-existent document", async function () {
                const node = await loadFixture(deployContextNode);
                const fakeDocumentId = ethers.keccak256(ethers.toUtf8Bytes("fake"));
                
                await expect(
                    node.contract.connect(node.owner).forgetDocument(fakeDocumentId)
                ).to.be.revertedWithCustomError(node.contract, "InvalidDocumentId");
            });

            it("Should not allow non-owner to forget document", async function () {
                const node = await loadFixture(deployContextNode);
                await node.contract.connect(node.owner).addDocument(testUrl);
                
                const documentId = await Document.generateId(node.contractAddress, testUrl);
                const [nonOwner] = await ethers.getSigners();

                await expect(
                    node.contract.connect(nonOwner).forgetDocument(documentId)
                ).to.be.revertedWithCustomError(node.contract, "OwnableUnauthorizedAccount");
            });

            it("Can forget already forgotten document", async function () {
                const node = await loadFixture(deployContextNode);
                await node.contract.connect(node.owner).addDocument(testUrl);
                
                const documentId = await Document.generateId(node.contractAddress, testUrl);
                await node.contract.connect(node.owner).forgetDocument(documentId);

                // Should be able to forget again without error
                const tx = await node.contract.connect(node.owner).forgetDocument(documentId);
                await expect(tx)
                    .to.emit(node.contract, "DocumentDeactivated")
                    .withArgs(documentId, node.owner.address);
            });
        });


        describe("Document List", function () {
            it("Should return empty list initially", async function () {
                const node = await loadFixture(deployContextNode);
                const documentIds = await node.contract.getDocumentIds();
                expect(documentIds).to.be.an('array').that.is.empty;
            });

            it("Should return all document IDs in order of addition", async function () {
                const node = await loadFixture(deployContextNode);
                const expectedIds = await addMultipleDocuments(node);
                
                const documentIds = await node.contract.getDocumentIds();
                
                expect(documentIds).to.have.lengthOf(3);
                expectedIds.forEach((id, index) => {
                    expect(documentIds[index]).to.equal(id);
                });
            });

            it("Should maintain list after forgetting documents", async function () {
                const node = await loadFixture(deployContextNode);
                const documentIds = await addMultipleDocuments(node);
                
                // Forget middle document
                await node.contract.connect(node.owner).forgetDocument(documentIds[1]);
                
                const listedIds = await node.contract.getDocumentIds();
                expect(listedIds).to.have.lengthOf(3);
                expect(listedIds[1]).to.equal(documentIds[1]);

                // Verify document is marked as not indexed but still in list
                const document = await node.contract.getDocument(documentIds[1]);
                expect(document.isIndexed).to.be.false;
            });

            it("Should match document IDs with their content", async function () {
                const node = await loadFixture(deployContextNode);
                await addMultipleDocuments(node);
                
                const documentIds = await node.contract.getDocumentIds();
                
                for (const id of documentIds) {
                    const document = await node.contract.getDocument(id);
                    const computedId = await Document.generateId(node.contractAddress, document.url);
                    expect(computedId).to.equal(id);
                }
            });
        });
    });

    // Relations.
    describe("Relations", function () {
        describe("Adding Relations", function () {
            const descriptor = "is the CEO";
            it("Should add a new relation successfully", async function () {
                const node = await loadFixture(deployContextNode);
                const expectedRelationId = Edge.generateId(node.edgeId, node.personaAddress, descriptor);
                await expect(node.contract.addEdge(
                    node.edgeId,
                    node.personaAddress,
                    descriptor
                )).to.emit(node.contract, "EdgeAdded")
                  .withArgs(
                      expectedRelationId,
                      node.edgeId,
                      node.contractAddress,
                      node.personaAddress
                  );
    
                const relation = await node.contract.getEdge(expectedRelationId);
                expect(relation[0]).to.equal(node.edgeId);
                expect(relation[1]).to.equal(node.personaAddress);
                expect(relation[2]).to.equal(descriptor);
                expect(relation[3]).to.equal(EdgeStatus.PENDING); // PENDING status*/
                
            });

            it("Should revert when adding relation with invalid field type", async function () {
                const node = await loadFixture(deployContextNode);
   
                // Try to add relation using string field
                await expect(node.contract.addEdge(
                    node.personaId,
                    node.personaAddress,
                    descriptor
                )).to.be.revertedWithCustomError(node.contract, "InvalidRelationId");
            });

            it("Should revert when adding duplicate relation", async function () {
                const node = await loadFixture(deployContextNode);
                
                await expect(node.contract.addEdge(
                    node.edgeId,
                    node.personaAddress,
                    descriptor
                ))
    
                await expect(node.contract.addEdge(
                    node.edgeId,
                    node.personaAddress,
                    "now COO"
                ))

                await expect(node.contract.addEdge(
                    node.personaId,
                    node.personaAddress,
                    "now COO"
                )).to.be.revertedWithCustomError(node.contract, "InvalidRelationId");

                const relations = await node.contract.getEdgeIds();
                expect(relations.length).to.equal(2);
            });
        });

        describe("Updating Relation Status", function () {
            const descriptor = "is the CEO";
            it("Should allow invited party to accept pending relation", async function () {
                const node = await loadFixture(deployContextNode);
                const relationId = Edge.generateId(node.edgeId, node.personaAddress, descriptor );
                await node.contract.addEdge( node.edgeId, node.personaAddress,descriptor);
                await node.persona.answerEdge(node.contractAddress, relationId, EdgeStatus.ACCEPTED); 
                const relation = await node.contract.getEdge(relationId);
                expect(relation[3]).to.equal(EdgeStatus.ACCEPTED);
            });

            it("Should allow owner to delete pending relation", async function () {
                const node = await loadFixture(deployContextNode);
                const relationId = Edge.generateId( node.edgeId, node.personaAddress, descriptor );
                await node.contract.addEdge( node.edgeId, node.personaAddress,descriptor);
    
                await expect(node.contract.updateEdgeStatus( relationId, EdgeStatus.DELETED))
                    .to.emit(node.contract, "EdgeStatusUpdated")
                    .withArgs(relationId, EdgeStatus.PENDING, EdgeStatus.DELETED, await node.owner.getAddress());
                  
                const relation = await node.contract.getEdge(relationId);
                expect(relation[3]).to.equal(EdgeStatus.DELETED);
  
            });
        });

        describe("Edge Properties", function() {
            const descriptor = "is the CEO";
        
            describe("Setting Edge Properties", function() {
                it("Should set edge properties correctly", async function() {
                    const node = await loadFixture(deployContextNode);
                    const edgeId = Edge.generateId(node.edgeId, node.personaAddress, descriptor);
                    await node.contract.addEdge(node.edgeId, node.personaAddress, descriptor);
        
                    // Create property values
                    const startDate = new Date('2024-01-01');
                    const startTimeString = "09:00";
                    const isActive = true;
                    const position = "Senior Executive";
                    
                    // Convert values to bytes
                    const dateAsBytes = Property.dateToBytes(startDate);
                    const timeAsBytes = Property.timeToBytes(startTimeString);
                    const boolAsBytes = Property.booleanToBytes(isActive);
                    const stringAsBytes = Property.stringToBytes(position);
        
                    // Create property inputs
                    const propertyInputs = [
                        { 
                            propertyId: Property.generateId(node.edgeId, 'startDate'),
                            value: dateAsBytes
                        },
                        {
                            propertyId: Property.generateId(node.edgeId, 'startTime'),
                            value: timeAsBytes
                        },
                        {
                            propertyId: Property.generateId(node.edgeId, 'isActive'),
                            value: boolAsBytes
                        },
                        {
                            propertyId: Property.generateId(node.edgeId, 'position'),
                            value: stringAsBytes
                        }
                    ];
        
                    // Set properties
                    await node.contract.connect(node.owner).setEdgeProperties(edgeId, propertyInputs);
        
                    // Verify date property
                    let storedValue = await node.contract.getEdgeProperty(edgeId, propertyInputs[0].propertyId);
                    let recoveredDate = Property.bytesToDate(storedValue);
                    expect(recoveredDate.getTime()).to.equal(startDate.getTime());
                
                    // Verify time property
                    storedValue = await node.contract.getEdgeProperty(edgeId, propertyInputs[1].propertyId);
                    let recoveredTime = Property.bytesToTime(storedValue);
                    expect(recoveredTime).to.equal(startTimeString);
                
                    // Verify boolean property
                    storedValue = await node.contract.getEdgeProperty(edgeId, propertyInputs[2].propertyId);
                    let recoveredBoolean = Property.bytesToBoolean(storedValue);
                    expect(recoveredBoolean).to.equal(isActive);
                
                    // Verify string property
                    storedValue = await node.contract.getEdgeProperty(edgeId, propertyInputs[3].propertyId);
                    let recoveredString = Property.bytesToString(storedValue);
                    expect(recoveredString).to.equal(position);
                });
        
                it("Should emit EdgePropertyUpdated event", async function() {
                    const node = await loadFixture(deployContextNode);
                    const edgeId = Edge.generateId(node.edgeId, node.personaAddress, descriptor);
                    await node.contract.addEdge(node.edgeId, node.personaAddress, descriptor);
        
                    const propertyId = Property.generateId(node.edgeId, 'position');
                    const stringAsBytes = Property.stringToBytes("CEO");
                    
                    const propertyInput = [{
                        propertyId: propertyId,
                        value: stringAsBytes
                    }];
        
                    await expect(node.contract.connect(node.owner)
                        .setEdgeProperties(edgeId, propertyInput))
                        .to.emit(node.contract, "EdgePropertyUpdated")
                        .withArgs(edgeId, propertyId, stringAsBytes, node.owner.address);
                });
        
                it("Should revert when edge doesn't exist", async function() {
                    const node = await loadFixture(deployContextNode);
                    const nonExistentEdgeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
                    
                    const propertyInput = [{
                        propertyId: Property.generateId(node.edgeId, 'position'),
                        value: Property.stringToBytes("CEO")
                    }];
        
                    await expect(node.contract.connect(node.owner)
                        .setEdgeProperties(nonExistentEdgeId, propertyInput))
                        .to.be.revertedWithCustomError(node.contract, "InvalidRelationId");
                });
        
                it("Should revert when edge is not in PENDING status", async function() {
                    const node = await loadFixture(deployContextNode);
                    const edgeId = Edge.generateId(node.edgeId, node.personaAddress,descriptor);
                    
                    // Add edge and accept it
                    await node.contract.addEdge(node.edgeId, node.personaAddress, descriptor);
                    await node.persona.answerEdge(node.contractAddress, edgeId, EdgeStatus.ACCEPTED);
        
                    const propertyInput = [{
                        propertyId: Property.generateId(node.edgeId, 'position'),
                        value: Property.stringToBytes("CEO")
                    }];
        
                    await expect(node.contract.connect(node.owner)
                        .setEdgeProperties(edgeId, propertyInput))
                        .to.be.revertedWithCustomError(node.contract, "UnauthorizedAccess");
                });
        
                it("Should revert when non-owner tries to set properties", async function() {
                    const node = await loadFixture(deployContextNode);
                    const edgeId = Edge.generateId(node.edgeId, node.personaAddress, descriptor);
                    await node.contract.addEdge(node.edgeId, node.personaAddress, descriptor);
        
                    const propertyInput = [{
                        propertyId: Property.generateId(node.edgeId, 'position'),
                        value: Property.stringToBytes("CEO")
                    }];
        
                    await expect(node.contract.connect(node.otherOwner)
                        .setEdgeProperties(edgeId, propertyInput))
                        .to.be.revertedWithCustomError(node.contract, "OwnableUnauthorizedAccount");
                });
            });
        
            describe("Getting Edge Properties", function() {
                it("Should retrieve edge properties correctly", async function() {
                    const node = await loadFixture(deployContextNode);
                    const edgeId = Edge.generateId(node.edgeId, node.personaAddress, descriptor);
                    await node.contract.addEdge(node.edgeId, node.personaAddress, descriptor);
        
                    const startDate = new Date('2024-01-01');
                    const dateAsBytes = Property.dateToBytes(startDate);
                    const propertyId = Property.generateId(node.edgeId, 'startDate');
        
                    await node.contract.connect(node.owner).setEdgeProperties(edgeId, [{
                        propertyId: propertyId,
                        value: dateAsBytes
                    }]);
        
                    const storedValue = await node.contract.getEdgeProperty(edgeId, propertyId);
                    const recoveredDate = Property.bytesToDate(storedValue);
                    expect(recoveredDate.getTime()).to.equal(startDate.getTime());
                });
        
                it("Should revert when getting property of non-existent edge", async function() {
                    const node = await loadFixture(deployContextNode);
                    const nonExistentEdgeId = ethers.keccak256(ethers.toUtf8Bytes("nonexistent"));
                    const propertyId = Property.generateId(node.edgeId, 'startDate');
        
                    await expect(node.contract.getEdgeProperty(nonExistentEdgeId, propertyId))
                        .to.be.revertedWithCustomError(node.contract, "InvalidRelationId");
                });
            });
        });
    });
});
