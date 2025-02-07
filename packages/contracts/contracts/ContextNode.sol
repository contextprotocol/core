// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { LabelRegistry } from "./LabelRegistry.sol";
import "hardhat/console.sol";

/**
 * @title ContextNode
 * @dev Manages Properties, documents, and edges for a specific node
 */
contract ContextNode is Ownable {
  // Relation status
  enum RelationStatus { INVALID, PENDING, DELETED, ACCEPTED, REJECTED, FINISHED }

  // Label registry
  LabelRegistry public labelRegistry;
  bytes32 public labelId;
  
  // Is Private.
  bool public isPrivate = false;
  
  struct PropertyInput {
    bytes32 propertyId;
    bytes value;
  }

  // Property events.
  event PropertyUpdated(
    bytes32 indexed propertyId,
    bytes value,
    address indexed updatedBy
  );
  
  // Property errors.
  error InvalidLabelId();
  error InvalidPropertyId();
  
  // Property mappings.
  mapping(bytes32 => bytes) public propertyValues;
  bytes32[] public propertyIds;

  // Document structure.
  struct Document {
    string url;
    bool isIndexed;
  }
  
  // Document events.
  event DocumentAdded(
    bytes32 indexed documentId,
    string indexed url,
    address indexed addedBy
  );
  
  event DocumentDeactivated(
    bytes32 indexed documentId,
    address indexed deactivatedBy
  );
  
  // Document errors.
  error DocumentAlreadyExists();
  error InvalidURL();
  error InvalidDocumentId();
  
  // Document mappings.
  mapping(bytes32 => Document) public documents;
  bytes32[] public documentIds;
  
  // Relation structure.
  struct Relation {
    bytes32 entityId;
    address nodeId;
    RelationStatus status;
    string descriptor;
    mapping(bytes32 => bytes) propertyValues;
    bytes32[] propertyIds;
  }
  
  struct RelationView {
    bytes32 entityId;
    address nodeId;
    string descriptor;
    RelationStatus status;
  }

  // Relation events.
  event EdgeAdded(
    bytes32 edgeId,
    bytes32 entityId,
    address indexed nodeIdFrom,
    address indexed nodeIdTo
  );
  
  event EdgeStatusUpdated(
    bytes32 indexed edgeId,
    RelationStatus oldStatus,
    RelationStatus newStatus,
    address indexed updatedBy
  );

  event EdgePropertyUpdated(
    bytes32 indexed edgeId,
    bytes32 indexed propertyId,
    bytes value,
    address indexed updatedBy
);
  
  // Relation mappings.
  mapping(bytes32 => Relation) public edges;
  bytes32[] public edgeIds;
  
  // Relation errors.
  error InvalidRelationId();
  error RelationAlreadyAccepted();
  error UnauthorizedAccess();
  error InvalidPropertyType();
  error InvalidStatusTransition();
  error InvalidPropertyForEdge();
  
/**
 * @dev Constructor for the ContextNode contract.
 * Initializes the contract with a label ID and a label registry address.
 * Reverts if the label does not exist in the label registry.
 * @param _labelId The ID of the label to associate with this context node.
 * @param _labelRegistry The address of the label registry contract.
 */
constructor(bytes32 _labelId, address _labelRegistry) Ownable(msg.sender) {
  labelId = _labelId;   
  labelRegistry = LabelRegistry(_labelRegistry);
  // This call will revert if the label does not exist
  labelRegistry.getLabelById(labelId);
}

  /**
   * @dev Internal function to compute entity ID
  */
  function _computeEdgeId(bytes32 entityId, address to,  string memory descriptor) private pure returns (bytes32) {
    return keccak256(abi.encodePacked(entityId, to, descriptor));
  }

  function _computeDocumentId(string memory url) private view returns (bytes32) {
    return keccak256(abi.encodePacked(address(this), url));
  }

    function getLabelId() external view returns (address, bytes32) {
        return (address(labelRegistry), labelId);
    }

    function setProperties(PropertyInput[] calldata properties) external onlyOwner {
        for (uint i = 0; i < properties.length; i++) {
            PropertyInput memory prop = properties[i];
            
            // Get property type from edge registry
            propertyValues[prop.propertyId] = prop.value;
            emit PropertyUpdated(
                prop.propertyId,
                prop.value,
                msg.sender
            );
        }
    }

    function setProperty(bytes32 propertyId, bytes memory value) external onlyOwner {
        propertyValues[propertyId] = value;
        propertyIds.push(propertyId);
        emit PropertyUpdated(
            propertyId,
            value,
            msg.sender
        );
    }

    function getProperty(bytes32 propertyId)  external  view 
    returns (bytes memory value, LabelRegistry.PropertyType propertyType) 
    {
        // Get property type from label registry
        propertyType = labelRegistry.getLabelProperty(labelId, propertyId);
        return (propertyValues[propertyId], propertyType);
    }
    
    function addDocument(string memory url) external onlyOwner {
        // Check if URL is not empty
        if (bytes(url).length == 0) revert InvalidURL();
        bytes32 documentId = _computeDocumentId(url);
        if (bytes(documents[documentId].url).length > 0) revert DocumentAlreadyExists();

        // Add document to array
        documents[documentId] = Document(url, true);
        documentIds.push(documentId);
        
        // Store index and mark URL as existing
        emit DocumentAdded(
            documentId,
            url,
            msg.sender
        );
    }

    function getDocument(bytes32 documentId) external view returns (Document memory) {
        return documents[documentId];
    }

    function getDocumentIds() external view returns (bytes32[] memory) {
        return documentIds;
    }

    function forgetDocument(bytes32 documentId) external onlyOwner {
        if (bytes(documents[documentId].url).length == 0) revert InvalidDocumentId();
        documents[documentId].isIndexed = false;
        emit DocumentDeactivated(documentId, msg.sender);
    }

    function addEdge(bytes32 entityId, address nodeId, string memory descriptor) public {
        // This will fail if the edge is not valid
        labelRegistry.getEdgeById(entityId);
        // Check if the edge is valid
        ContextNode node = ContextNode(nodeId);
        if (!labelRegistry.isValidEdge(entityId,labelId, node.labelId())) revert InvalidRelationId();

        // Only one type of edge per node field.
        bytes32 edgeId =_computeEdgeId(entityId, nodeId, descriptor);
        if (edges[edgeId].nodeId != address(0)) revert InvalidRelationId();
        labelRegistry.getEdgeById(entityId);

        Relation storage edge = edges[edgeId];
        edge.entityId = entityId;
        edge.nodeId = nodeId;
        edge.descriptor = descriptor;
        edge.status = RelationStatus.PENDING;
        edgeIds.push(edgeId);

        emit EdgeAdded(
            edgeId,
            entityId,
            address(this),
            nodeId
        );
    }

    function getEdge(bytes32 edgeId) external view returns (RelationView memory) {
        Relation storage r = edges[edgeId];
        return RelationView(r.entityId, r.nodeId, r.descriptor, r.status);
    }

    function getEdgeIds() external view returns (bytes32[] memory) {
        return edgeIds;
    }

    function updateEdgeStatus(bytes32 edgeId, RelationStatus newStatus) 
        external 
    {
        Relation storage edge = edges[edgeId];
        if (edge.nodeId == address(0)) revert InvalidRelationId();
        
        // Check authorization
        bool isOwner = msg.sender == owner();
        bool isInvitedParty = msg.sender == edge.nodeId;

        // Validate authorization and status transition
        if (!isValidStatusTransition(edge.status, newStatus, isOwner, isInvitedParty)) {
            revert InvalidStatusTransition();
        }

        RelationStatus oldStatus = edge.status;
        edge.status = newStatus;

        emit EdgeStatusUpdated(
            edgeId,
            oldStatus,
            newStatus,
            msg.sender
        );
    }

    function answerEdge(address nodeId, bytes32 edgeId, RelationStatus status) public onlyOwner {
        ContextNode node = ContextNode(nodeId);
        node.updateEdgeStatus(edgeId, status);
    }

    function setEdgeProperties(bytes32 edgeId, PropertyInput[] calldata properties) 
        external 
        onlyOwner 
    {
        Relation storage edge = edges[edgeId];
        if (edge.nodeId == address(0)) revert InvalidRelationId();
        if (edge.status != RelationStatus.PENDING) revert UnauthorizedAccess();

        for (uint i = 0; i < properties.length; i++) {
            PropertyInput memory prop = properties[i];
            
            edge.propertyValues[prop.propertyId] = prop.value;
            edge.propertyIds.push(prop.propertyId);

            emit EdgePropertyUpdated(
                edgeId,
                prop.propertyId,
                prop.value,
                msg.sender
            );
        }
    }

    function getEdgeProperty(bytes32 edgeId, bytes32 propertyId) 
        external 
        view 
        returns (bytes memory) 
    {
        Relation storage edge = edges[edgeId];
        if (edge.nodeId == address(0)) revert InvalidRelationId();

        return edge.propertyValues[propertyId];
    }

    function isValidStatusTransition(
        RelationStatus currentStatus,
        RelationStatus newStatus,
        bool isOwner,
        bool isInvitedParty
    ) 
        internal 
        pure 
        returns (bool) 
    {
        // If current status is a terminal state, no transitions allowed
        if (currentStatus == RelationStatus.REJECTED ||
            currentStatus == RelationStatus.DELETED ||
            currentStatus == RelationStatus.FINISHED) {
            return false;
        }

        // Handle transitions from PENDING
        if (currentStatus == RelationStatus.PENDING) {
            // Owner can only DELETE from PENDING
            if (isOwner) {
                return newStatus == RelationStatus.DELETED;
            }
            // Invited party can ACCEPT,REJECT or move to FINISHED from PENDING
            if (isInvitedParty) {
                return newStatus == RelationStatus.ACCEPTED ||
                       newStatus == RelationStatus.REJECTED ||
                       newStatus == RelationStatus.FINISHED;
            }
            return false;
        }

        // Handle transitions from ACCEPTED
        if (currentStatus == RelationStatus.ACCEPTED) {
            // Both parties can move to FINISHED
            if (isOwner || isInvitedParty) {
                return newStatus == RelationStatus.FINISHED;
            }
            return false;
        }

        return false;
    }

}
