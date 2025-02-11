// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/**
 * @title NodeTypeRegistry
 * @dev Manages nodetypes for Nodes and their valid properties.
 */
contract NodeTypeRegistry is Ownable {
  enum PropertyType { INVALID, STRING, NUMBER, DATE, HOUR, BOOLEAN }
  enum EntityType { INVALID, NODETYPE, EDGE }

  // Fields.
  struct Entity {
    bool exists;
    string name;
    EntityType entityType;
    bytes32 fromNodeTypeId; // 0x0 for NodeTypes
    bytes32 toNodeTypeId;   // 0x0 for NodeTypes
    bytes32[] propertyIds;  // List of property IDs associated with this entity
  }

  struct Property {
    bool exists;
    string name;
    PropertyType propertyType;
    bool isActive;
    bytes32 entityId;  // The entity this property belongs to
  }

  // Single mapping for all entities (both NodeTypes and Edges)
  mapping(bytes32 => Entity) private entities;
  // Direct mapping from propertyId to Property
  mapping(bytes32 => Property) private properties;
  
  string[] private registeredNodeTypes;
  string[] private registeredEdges;
  
  // Events
  event EntityAdded(bytes32 indexed entityId, string name, bytes32 fromNodeTypeId, bytes32 toNodeTypeId);
  event PropertyAdded(bytes32 indexed propertyId, string name, PropertyType propertyType, bytes32 indexed entityId);
  event PropertyUpdated(bytes32 indexed propertyId, bool isActive);

  // Custom errors
  error EntityNotFound(bytes32 entityId);
  error EntityAlreadyExists(bytes32 entityId);
  error PropertyAlreadyExists(bytes32 propertyId);
  error PropertyNotFound(bytes32 propertyId);
  error InvalidNodeTypePair(bytes32 fromNodeTypeId, bytes32 toNodeTypeId);

  /**
   * @dev Constructor
   */
  constructor() Ownable(msg.sender) {}

  /**
   * @dev Computes entity ID (works for both nodetypes and edges)
   */
  function _computeEntityId(string calldata name) private view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this), name));
  }

  /**
   * @dev Computes property ID (works for both nodetypes and edges)
   */
  function _computePropertyId(string calldata name, bytes32 entityId) private view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this), entityId, name));
  }

  /**
   * @dev Public function to get an entity ID (useful for external calls)
   */
  function getEntityId(string calldata name) public view returns (bytes32) {
    return _computeEntityId(name);
  }

  /**
   * @dev Add a new NodeType
   */
  function addNodeType(string calldata name) external onlyOwner {
    bytes32 entityId = _computeEntityId(name);
    if (entities[entityId].exists) revert EntityAlreadyExists(entityId);
    
    Entity storage entity = entities[entityId];
    entity.exists = true;
    entity.name = name;
    entity.fromNodeTypeId = bytes32(0);
    entity.toNodeTypeId = bytes32(0);
    entity.entityType = EntityType.NODETYPE;
    registeredNodeTypes.push(name);
    
    emit EntityAdded(entityId, name, bytes32(0), bytes32(0));
  }

  /**
   * @dev Add a new Edge type with its valid node type connections
   */
  function addEdge(string calldata name, bytes32 fromNodeTypeId, bytes32 toNodeTypeId) external onlyOwner {
    if (!entities[fromNodeTypeId].exists || !entities[toNodeTypeId].exists) {
      revert InvalidNodeTypePair(fromNodeTypeId, toNodeTypeId);
    }

    bytes32 entityId = _computeEntityId(name);
    if (entities[entityId].exists) revert EntityAlreadyExists(entityId);
    
    Entity storage entity = entities[entityId];
    entity.exists = true;
    entity.name = name;
    entity.fromNodeTypeId = fromNodeTypeId;
    entity.toNodeTypeId = toNodeTypeId;
    entity.entityType = EntityType.EDGE;
    registeredEdges.push(name);
    
    emit EntityAdded(entityId, name, fromNodeTypeId, toNodeTypeId);
  }

  /**
   * @dev Add property using property ID
   */
  function addProperty(
    bytes32 entityId,
    string calldata propertyName,
    PropertyType propertyType
  ) external onlyOwner {
    if (!entities[entityId].exists) revert EntityNotFound(entityId);

    bytes32 propertyId = _computePropertyId(propertyName, entityId);
    if (properties[propertyId].exists) revert PropertyAlreadyExists(propertyId);

    Property storage property = properties[propertyId];
    property.exists = true;
    property.name = propertyName;
    property.propertyType = propertyType;
    property.isActive = true;
    property.entityId = entityId;

    // Add property to entity's property list
    entities[entityId].propertyIds.push(propertyId);

    emit PropertyAdded(propertyId, propertyName, propertyType, entityId);
  }

  /**
   * @dev Get entity details (works for both NodeTypes and Edges)
   */
  function getEntity(bytes32 entityId) public view returns (
    bool exists,
    string memory name,
    bytes32 fromNodeTypeId,
    bytes32 toNodeTypeId,
    EntityType entityType
  ) {
    Entity storage entity = entities[entityId];
    return (
      entity.exists,
      entity.name,
      entity.fromNodeTypeId,
      entity.toNodeTypeId,
      entity.entityType
    );
  }

  /**
   * @dev Get property type using just the propertyId
   */
  function getPropertyType(bytes32 propertyId) public view returns (PropertyType) {
    Property storage property = properties[propertyId];
    if (!property.exists) revert PropertyNotFound(propertyId);
    return property.propertyType;
  }

  /**
   * @dev Get all properties of an entity
   */
  function getEntityProperties(bytes32 entityId) public view returns (
    bytes32[] memory propertyIds,
    string[] memory propertyNames,
    PropertyType[] memory propertyTypes
  ) {
    Entity storage entity = entities[entityId];
    if (!entity.exists) revert EntityNotFound(entityId);

    uint256 length = entity.propertyIds.length;
    propertyNames = new string[](length);
    propertyTypes = new PropertyType[](length);

    for (uint256 i = 0; i < length; i++) {
      bytes32 propertyId = entity.propertyIds[i];
      Property storage property = properties[propertyId];
      propertyNames[i] = property.name;
      propertyTypes[i] = property.propertyType;
    }

    return (entity.propertyIds, propertyNames, propertyTypes);
  }

  /**
   * @dev Check if an entity has a specific property
   */
  function hasProperty(bytes32 entityId, bytes32 propertyId) public view returns (bool) {
    Entity storage entity = entities[entityId];
    if (!entity.exists) revert EntityNotFound(entityId);

    Property storage property = properties[propertyId];
    return property.exists && property.entityId == entityId;
  }

  /**
   * @dev Check if an edge connection is valid between two node types
   */
  function isValidEdge(bytes32 edgeTypeId, bytes32 fromNodeTypeId, bytes32 toNodeTypeId) public view returns (bool) {
    Entity storage edge = entities[edgeTypeId];
    return edge.exists && edge.fromNodeTypeId == fromNodeTypeId && edge.toNodeTypeId == toNodeTypeId;
  }

  function getNodeTypes() public view returns (string[] memory) {
    return registeredNodeTypes;
  }

  function getEdges() public view returns (string[] memory) {
    return registeredEdges;
  }
}