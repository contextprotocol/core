// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { NodeTypeRegistry } from "./NodeTypeRegistry.sol";
import "hardhat/console.sol";

/**
 * @title GraphNode
 * @dev Manages Properties, documents, and edges for a specific node
 */
contract GraphNode is Ownable {
  // Edge status
  enum EdgeStatus { INVALID, PENDING, DELETED, ACCEPTED, REJECTED, FINISHED }

  // Node Type registry
  NodeTypeRegistry public nodeTypeRegistry;
  bytes32 public nodeId;
  bytes32 public nodeTypeId;
  
  // Is Private.
  bool public isPrivate = false;
  
  struct PropertyInput {
    bytes32 propertyTypeId;
    bytes value;
  }

  // Document structure.
  struct Document {
    string url;
    bool isIndexed;
  }
  
  // Entity structure.
  struct Entity {
    bytes32 edgeTypeId;
    address nodeId;
    EdgeStatus status;
    string descriptor;
    mapping(bytes32 => bytes) propertyValues;
    mapping(bytes32 => Document) documents;
    bytes32[] documentIds;
  }
  
  struct EntityView {
    bytes32 edgeTypeId;
    address nodeId;
    string descriptor;
    EdgeStatus status;
    bytes32[] documentIds;
  }


  event EdgeAdded(
    bytes32 entityId,
    bytes32 edgeTypeId,
    address indexed nodeIdFrom,
    address indexed nodeIdTo
  );

  event StatusUpdated(
    bytes32 indexed entityId,
    EdgeStatus oldStatus,
    EdgeStatus newStatus,
    address indexed updatedBy
  );

  event PropertyUpdated(
    bytes32 indexed entityId,
    bytes32 indexed propertyTypeId,
    bytes value,
    address indexed updatedBy
  );
  
  event DocumentAdded(
    bytes32 indexed entityId,
    bytes32 indexed documentId,
    string indexed url,
    address addedBy
  );
  
  event DocumentNotIndexed(
    bytes32 indexed entityId,
    bytes32 indexed documentId,
    address indexed deactivatedBy
  );

  // Entity mappings.
  mapping(bytes32 => Entity) public entities;
  bytes32[] public entityIds;
  
  // Edge errors.
  error InvalidId();
  error EdgeAlreadyAccepted();
  error UnauthorizedAccess();
  error InvalidPropertyType();
  error InvalidStatusTransition();
  error InvalidPropertyForEdge();

  // Document errors.
  error DocumentAlreadyExists();
  error InvalidURL();
  error InvalidDocumentId();

  constructor(bytes32 _nodeTypeId, address _nodeTypeRegistry) Ownable(msg.sender) {
    // Public parameters of the contract.
    nodeId = keccak256(abi.encodePacked(address(this)));
    nodeTypeId = _nodeTypeId;   
    nodeTypeRegistry = NodeTypeRegistry(_nodeTypeRegistry);

    // This call will revert if the entity does not exist
    (bool exists, , , , NodeTypeRegistry.EntityType entityType)
      = nodeTypeRegistry.getEntity(nodeTypeId);
    if (!exists || entityType != NodeTypeRegistry.EntityType.NODETYPE) revert InvalidId();
    
    Entity storage nodeEntity = entities[nodeId];
      nodeEntity.edgeTypeId = nodeTypeId;  // Using nodeTypeId as edgeTypeId for the node itself
      nodeEntity.nodeId = address(this);
      nodeEntity.status = EdgeStatus.ACCEPTED;  // Node is always accepted
      nodeEntity.descriptor = "self";
  }

  function _computeEdgeId(bytes32 entityId, address to, string memory descriptor) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(entityId, to, descriptor));
  }

  function _computeDocumentId(string memory url) private view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this), url));
  }

  function getLabelId() external view returns (address, bytes32) {
    return (address(nodeTypeRegistry), nodeTypeId);
  }

  function setProperties(bytes32 entityId, PropertyInput[] calldata properties) external onlyOwner {
      Entity storage entity = entities[entityId];
      if (entity.nodeId == address(0)) revert InvalidId();
      // Edges can't be changed after the Status has been changed.
      if (nodeId != entityId && entity.status != EdgeStatus.PENDING) revert UnauthorizedAccess();

      for (uint i = 0; i < properties.length; i++) {
          PropertyInput memory prop = properties[i];
          nodeTypeRegistry.getPropertyType(prop.propertyTypeId);
          entity.propertyValues[prop.propertyTypeId] = prop.value;

          emit PropertyUpdated(
              entityId,
              prop.propertyTypeId,
              prop.value,
              msg.sender
          );
      }
  }

function getProperties(bytes32 entityId) external view returns (
    bytes32[] memory propertyIds,
    string[] memory names,
    NodeTypeRegistry.PropertyType[] memory propertyTypes,
    bytes[] memory values
) {
    Entity storage entity = entities[entityId];
    if (entity.nodeId == address(0)) revert InvalidId();

    // Get all possible properties for this entity type
    (bytes32[] memory allPropertyIds, string[] memory allNames , NodeTypeRegistry.PropertyType[] memory types) = 
        nodeTypeRegistry.getEntityProperties(entity.edgeTypeId);

    // Initialize return arrays with the same length
    propertyIds = new bytes32[](allPropertyIds.length);
    propertyTypes = new NodeTypeRegistry.PropertyType[](allPropertyIds.length);
    values = new bytes[](allPropertyIds.length);
    names = new string[](allPropertyIds.length);

    // Populate arrays with actual values
    for (uint i = 0; i < allPropertyIds.length; i++) {
        propertyIds[i] = allPropertyIds[i];
        names[i] = allNames[i];
        propertyTypes[i] = types[i];
        values[i] = entity.propertyValues[allPropertyIds[i]];
    }

    return (propertyIds, names, propertyTypes, values);
  }

  function addEdge(bytes32 edgeTypeId, address toNodeId, string memory descriptor) public onlyOwner {
    // Verify edge type exists
    (bool exists, , , , NodeTypeRegistry.EntityType entityType)
      = nodeTypeRegistry.getEntity(edgeTypeId);
    if (!exists || entityType != NodeTypeRegistry.EntityType.EDGE) revert InvalidId();
    // Can't connect to itself.
    if (toNodeId == address(this)) revert InvalidId();

    // Check if the edge is valid between node types
    GraphNode node = GraphNode(toNodeId);
    if (!nodeTypeRegistry.isValidEdge(edgeTypeId, nodeTypeId, node.nodeTypeId())) 
      revert InvalidId();

    bytes32 entityId = _computeEdgeId(edgeTypeId, toNodeId, descriptor);
    if (entities[entityId].nodeId != address(0)) revert InvalidId();

    Entity storage entity = entities[entityId];
    entity.edgeTypeId = edgeTypeId;
    entity.nodeId = toNodeId;
    entity.descriptor = descriptor;
    entity.status = EdgeStatus.PENDING;
    entityIds.push(entityId);

    emit EdgeAdded(
      entityId,
      edgeTypeId,
      address(this),
      toNodeId
    );
  }

  function getEdgeById(bytes32 entityId) external view returns (EntityView memory) {
    Entity storage r = entities[entityId];
    return EntityView(r.edgeTypeId, r.nodeId, r.descriptor, r.status, r.documentIds);
  }

  function getEdgeIds() external view returns (bytes32[] memory) {
    return entityIds;
  }

  function updateStatus(bytes32 entityId, EdgeStatus newStatus) external {
    Entity storage entity = entities[entityId];
    if (entity.nodeId == address(0)) revert InvalidId();
    
    bool isOwner = msg.sender == owner();
    bool isInvitedParty = msg.sender == entity.nodeId;

    if (!isValidStatusTransition(entity.status, newStatus, isOwner, isInvitedParty)) {
      revert InvalidStatusTransition();
    }

    EdgeStatus oldStatus = entity.status;
    entity.status = newStatus;

    emit StatusUpdated(
      entityId,
      oldStatus,
      newStatus,
      msg.sender
    );
  }

  function answerEdge(address toNodeId, bytes32 entityId, EdgeStatus status) public onlyOwner {
    GraphNode node = GraphNode(toNodeId);
    node.updateStatus(entityId, status);
  }



  function addDocument(bytes32 entityId, string calldata url) 
    external 
    onlyOwner 
  {
    Entity storage entity = entities[entityId];
    if (entity.nodeId == address(0)) revert InvalidId();

    bytes32 documentId = _computeDocumentId(url);
    if (bytes(entity.documents[documentId].url).length > 0) revert DocumentAlreadyExists();
    if (bytes(url).length == 0) revert InvalidURL();

    entity.documents[documentId] = Document({
      url: url,
      isIndexed: true
    });
    entity.documentIds.push(documentId);

    emit DocumentAdded(
      entityId,
      documentId,
      url,
      msg.sender
    );
  }

    function forgetDocument(bytes32 entityId, bytes32 documentId) external onlyOwner {
      Entity storage entity = entities[entityId];
      if (bytes(entity.documents[documentId].url).length == 0) revert InvalidDocumentId();
      entity.documents[documentId].isIndexed = false;
      emit DocumentNotIndexed(entityId, documentId, msg.sender);
    }


  function getDocuments(bytes32 entityId) 
    external 
    view 
    returns (bytes32[] memory) 
  {
    Entity storage entity = entities[entityId];
    if (entity.nodeId == address(0)) revert InvalidId();
    
    return entity.documentIds;
  }

  function getDocument(bytes32 entityId, bytes32 documentId) 
    external 
    view 
    returns (Document memory) 
  {
    Entity storage entity = entities[entityId];
    if (entity.nodeId == address(0)) revert InvalidId();
    
    Document storage doc = entity.documents[documentId];
    if (bytes(doc.url).length == 0) revert InvalidDocumentId();
    
    return doc;
  }

  function isValidStatusTransition(
    EdgeStatus currentStatus,
    EdgeStatus newStatus,
    bool isOwner,
    bool isInvitedParty
  ) internal pure returns (bool) {
    if (currentStatus == EdgeStatus.PENDING) {
      if (isOwner) {
        return newStatus == EdgeStatus.DELETED;
      }
      if (isInvitedParty) {
        return newStatus == EdgeStatus.ACCEPTED || 
               newStatus == EdgeStatus.REJECTED;
      }
    }
    
    if (currentStatus == EdgeStatus.ACCEPTED) {
      if (isOwner || isInvitedParty) {
        return newStatus == EdgeStatus.FINISHED;
      }
    }
    
    return false;
  }
}
