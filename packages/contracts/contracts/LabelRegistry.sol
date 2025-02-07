// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

/**
 * @title LabelRegistry
 * @dev Manages labels for Nodes and their valid properties.
 */
contract LabelRegistry is Ownable {
  enum PropertyType { INVALID, STRING, NUMBER, DATE, HOUR, BOOLEAN }

  // Fields.
  struct Property {
    string name;
    bool isActive;
    PropertyType propertyType;
    bool exists;
  }

  // Entity : Label or Edge.
  struct Entity {
    string name;
    mapping(bytes32 => Property) properties;
    string[] propertyNames;
    bool exists;
  }

  // Edge available Relations.
  struct EdgeConfig {
    bytes32 fromLabelId;
    bytes32 toLabelId;
    bool isActive;
  }

  mapping(bytes32 => Entity) private labels;
  string[] private registeredLabels;
  mapping(bytes32 => Entity) private edges;
  string[] private registeredEdges;
  
  // Allowed Edges.
  mapping(bytes32 => EdgeConfig[]) private edgeConfigs;
  mapping(bytes32 => mapping(bytes32 => mapping(bytes32 => bool))) private validEdgePaths;

  // Events.
  event LabelAdded(bytes32 indexed labelId, string name);
  event EdgeAdded(bytes32 indexed labelId, string name);
  event PropertyAdded(bytes32 indexed entityId, bytes32 indexed PropertyId, string name);
  event PropertyUpdated(bytes32 indexed entityId, bytes32 indexed propertyId, bool isActive);
  event EdgeConfigured(bytes32 indexed edgeId, bytes32 fromLabelId, bytes32 toLabelId);
  event EdgeRemoved(bytes32 indexed edgeId, bytes32 fromLabelId, bytes32 toLabelId);

  // Custom errors with parameters for better debugging
  error EntityAlreadyExists(bytes32 entityId);
  error EntityNotFound(bytes32 entityId);
  error PropertyAlreadyExists(bytes32 entityId, bytes32 propertyId);
  error PropertyNotFound(bytes32 entityId, bytes32 propertyId);
  error EdgeNotFound(bytes32 edgeId);
  error InvalidLabelPair(bytes32 fromLabelId, bytes32 toLabelId);
  error EdgeAlreadyConfigured(bytes32 edgeId, bytes32 fromLabelId, bytes32 toLabelId);


  /**
   * @dev Constructor
   */
  constructor() Ownable(msg.sender) {}

    /**
     * @dev Computes entity ID (works for both labels and edges)
     */
    function _computeEntityId(string calldata name) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), name));
    }

    /**
     * @dev Computes property ID from parent entity and property name
     */
    function _computePropertyId(bytes32 entityId, string calldata propertyName) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(entityId, propertyName));
    }

    /**
     * @dev Public function to get an entity ID (useful for external calls)
     */
    function getEntityId(string calldata name) public view returns (bytes32) {
        return _computeEntityId(name);
    }

    /**
     * @dev Public function to get a property ID (useful for external calls)
     */
    function getPropertyId(bytes32 entityId, string calldata propertyName) public pure returns (bytes32) {
        return _computePropertyId(entityId, propertyName);
    }

  /**
   * @dev Internal function to add an entity (label or edge)
   */
  function _addEntity(
    string calldata name,
    mapping(bytes32 => Entity) storage entities,
    string[] storage registeredNames
  ) private returns (bytes32) {
    bytes32 entityId = _computeEntityId(name);
    if (entities[entityId].exists) revert EntityAlreadyExists(entityId);

    Entity storage entity = entities[entityId];
    entity.name = name;
    entity.exists = true;
    registeredNames.push(name);
    return entityId;
  }

  /**
   * @dev Retrieves an entity from the given mapping by its ID.
   * Reverts with `EntityNotFound` error if the entity does not exist.
   * @param entityId The ID of the entity to retrieve.
   * @param entities The mapping of entities to search.
   * @return The entity corresponding to the given ID.
   */
  function _getEntity(bytes32 entityId, mapping(bytes32 => Entity) storage entities) private view returns (Entity storage) {
    if (!entities[entityId].exists) revert EntityNotFound(entityId);
    return entities[entityId];
  }

  /**
   * @dev Adds a new property to an entity (label or edge).
   * Reverts with `PropertyAlreadyExists` error if the property already exists.
   * @param entityId The ID of the entity to add the property to.
   * @param propertyName The name of the property to add.
   * @param propertyType The type of the property (STRING, NUMBER, etc.).
   * @param entities The mapping of entities (labels or edges) to search.
   */
  function _addProperty(
    bytes32 entityId,
    string calldata propertyName,
    PropertyType propertyType,
    mapping(bytes32 => Entity) storage entities
  ) private {
    Entity storage entity = _getEntity(entityId, entities);
    bytes32 propertyId = _computePropertyId(entityId, propertyName);
    if (entity.properties[propertyId].exists) {
      revert PropertyAlreadyExists(entityId, propertyId);
    }
    entity.properties[propertyId] = Property({
      name: propertyName,
      propertyType: propertyType,
      isActive: true,
      exists: true
    });
    entities[entityId].propertyNames.push(propertyName);
    emit PropertyAdded(entityId, propertyId, propertyName);
  }
    
  /**
   * @dev Sets the active status of a property in an entity (label or edge).
   * Reverts with `PropertyNotFound` error if the property does not exist.
   * @param entityId The ID of the entity containing the property.
   * @param propertyId The ID of the property to update.
   * @param isActive The new active status of the property.
   * @param entities The mapping of entities (labels or edges) to search.
   */
  function _setPropertyStatus(
    bytes32 entityId,
    bytes32 propertyId,
    bool isActive,
    mapping(bytes32 => Entity) storage entities
  ) private {
    Entity storage entity = _getEntity(entityId, entities);
    if (!entity.properties[propertyId].exists) {
      revert PropertyNotFound(entityId, propertyId);
    }
    entity.properties[propertyId].isActive = isActive;
    emit PropertyUpdated(entityId, propertyId, isActive);
  }

  /**
  * @dev Add a new label
  */
  function addLabel(string calldata name) external onlyOwner {
    bytes32 labelId = _addEntity(name, labels, registeredLabels);
    emit LabelAdded(labelId, name);
  }

  /**
   * @dev Retrieves the label name and its properties by label ID.
   * Reverts with `LabelNotFound` error if the label does not exist.
   * @param labelId The ID of the label to retrieve.
   * @return exists A boolean indicating if the label exists.
   * @return name The name of the label.
   * @return fields The list of property names associated with the label.
   */
  function getLabelById(bytes32 labelId) public view returns (bool exists, string memory name, string[] memory fields) {
    Entity storage label = labels[labelId];
    return (label.exists, label.name, label.propertyNames);
  }

  /**
   * @dev Returns all labels
   */
  function getLabels() public view returns (string[] memory) {
    return registeredLabels;
  }

  /**
   * @dev Adds a new property to a label.
   * Reverts with `LabelNotFound` error if the label does not exist.
   * @param labelId The ID of the label to add the property to.
   * @param propertyName The name of the property to add.
   * @param propertyType The type of the property (STRING, NUMBER, etc.).
   */
  function addLabelProperty(
    bytes32 labelId, 
    string calldata propertyName,
    PropertyType propertyType
  ) 
    external onlyOwner 
  {
    _addProperty(labelId, propertyName, propertyType, labels);
  }

  /**
   * @dev Sets the active status of a property in a label.
   * Reverts with `LabelNotFound` error if the label does not exist.
   * Reverts with `PropertyNotFound` error if the property does not exist.
   * @param labelId The ID of the label containing the property.
   * @param propertyId The ID of the property to update.
   * @param isActive The new active status of the property.
   */
  function setLabelProperty(bytes32 labelId, bytes32 propertyId, bool isActive)
    external onlyOwner 
  {
     _setPropertyStatus(labelId, propertyId, isActive, labels);
  }
  
  /**
   * @dev Retrieves the type of a property in a label.
   * @param labelId The ID of the label containing the property.
   * @param propertyId The ID of the property to retrieve.
   * @return The type of the property (STRING, NUMBER, etc.).
   */
  function getLabelProperty(bytes32 labelId, bytes32 propertyId) public view returns (PropertyType) {
    Entity storage label = _getEntity(labelId, labels);
    return label.properties[propertyId].propertyType;
  }

  /** EDGES */

  /**
   * @dev Adds a new edge to the registry.
   * @param edgeName The name of the edge.
   */
  function addEdge(string calldata edgeName, bytes32 fromLabelId, bytes32 toLabelId) 
    external onlyOwner
  {
    // Verify both labels exist
    if (!labels[fromLabelId].exists || !labels[toLabelId].exists) {
        revert InvalidLabelPair(fromLabelId, toLabelId);
    }
    
    bytes32 edgeId = _addEntity(edgeName, edges, registeredEdges);

    // Check if this configuration already exists
    if (validEdgePaths[edgeId][fromLabelId][toLabelId]) {
        revert EdgeAlreadyConfigured(edgeId, fromLabelId, toLabelId);
    }

    // Store the configuration
    EdgeConfig memory config = EdgeConfig({
        fromLabelId: fromLabelId,
        toLabelId: toLabelId,
        isActive: true
    });
    
    edgeConfigs[edgeId].push(config);
    validEdgePaths[edgeId][fromLabelId][toLabelId] = true;
    emit EdgeAdded(edgeId, edgeName);
  }

   /**
   * @dev Retrieves the label name and its properties by label ID.
   * Reverts with `LabelNotFound` error if the label does not exist.
   * @param edgeId The ID of the label to retrieve.
   * @return exists A boolean indicating if the label exists.
   * @return edgeName The name of the label.
   * @return edgeProperties The list of property names associated with the label.
   */
  function getEdgeById(bytes32 edgeId)  public view returns (bool exists, string memory edgeName, string[] memory edgeProperties) {
    Entity storage edge = edges[edgeId];
    return (edge.exists, edge.name, edge.propertyNames);
  }

  /**
   * @dev Returns all edges.
   */
  function getEdges() public view returns (string[] memory) {
    return registeredEdges;
  }

    /**
   * @dev Adds a new property to an edge.
   * Reverts with `EdgeNotFound` error if the edge does not exist.
   * @param edgeId The ID of the edge to add the property to.
   * @param propertyName The name of the property to add.
   * @param propertyType The type of the property (STRING, NUMBER, etc.).
   */
  function addEdgeProperty(
    bytes32 edgeId, 
    string calldata propertyName,
    PropertyType propertyType
  ) 
    external onlyOwner
  {
    _addProperty(edgeId, propertyName, propertyType, edges);
  }

  function getEdgeProperties(bytes32 edgeId) public view returns (string[] memory) {
    Entity storage edge = _getEntity(edgeId, edges);
    return edge.propertyNames;
  }

  /**
   * @dev Sets the active status of a property in an edge.
   * Reverts with `EdgeNotFound` error if the edge does not exist.
   * Reverts with `PropertyNotFound` error if the property does not exist.
   * @param edgeId The ID of the edge containing the property.
   * @param propertyId The ID of the property to update.
   * @param isActive The new active status of the property.
   */
  function setEdgeProperty(bytes32 edgeId, bytes32 propertyId, bool isActive)
    external onlyOwner
  {
    _setPropertyStatus(edgeId, propertyId, isActive, edges);
  }

  /**
   * @dev Retrieves the type of a property in an edge.
   * @param edgeId The ID of the edge containing the property.
   * @param propertyId The ID of the property to retrieve.
   * @return The type of the property (STRING, NUMBER, etc.).
   */
  function getEdgeProperty(bytes32 edgeId, bytes32 propertyId) public view returns (PropertyType) {
    Entity storage edge = _getEntity(edgeId, edges);
    return edge.properties[propertyId].propertyType;
  }


/**
 * @dev Validates if an edge can be used between two label instances
 * @param edgeId The ID of the edge to validate
 * @param fromLabelId The ID of the source label
 * @param toLabelId The ID of the target label---+
 * @return bool indicating if the edge is valid between the labels
 */
function isValidEdge(
    bytes32 edgeId,
    bytes32 fromLabelId,
    bytes32 toLabelId
) public view returns (bool) {
    return validEdgePaths[edgeId][fromLabelId][toLabelId];
}

/**
 * @dev Gets all configured paths for an edge
 * @param edgeId The ID of the edge
 * @return fromLabels Array of source label IDs
 * @return toLabels Array of target label IDs
 * @return activeFlags Array of active status flags
 */
function getEdgeConfigurations(bytes32 edgeId) 
    public 
    view 
    returns (
        bytes32[] memory fromLabels, 
        bytes32[] memory toLabels,
        bool[] memory activeFlags
    ) 
{
    EdgeConfig[] storage configs = edgeConfigs[edgeId];
    fromLabels = new bytes32[](configs.length);
    toLabels = new bytes32[](configs.length);
    activeFlags = new bool[](configs.length);
    
    for (uint i = 0; i < configs.length; i++) {
        fromLabels[i] = configs[i].fromLabelId;
        toLabels[i] = configs[i].toLabelId;
        activeFlags[i] = configs[i].isActive;
    }
    
    return (fromLabels, toLabels, activeFlags);
}
}