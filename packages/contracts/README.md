# @contextprotocol/contracts

Smart contracts for Context Protocol's decentralized verifiable RAG system.

## Overview

This package contains the core smart contracts that power Context Protocol:

- `LabelRegistry.sol`: Registry contract that defines and validates node types and their relationships
- `ContextNode.sol`: Node contract that manages documents and verified relations for RAG systems

## Installation

```bash
npm install @contextprotocol/contracts
```

## Local Development

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npx hardhat compile
```

3. Run tests:
```bash
npx hardhat test
```

4. Run tests with coverage:
```bash
npx hardhat coverage
```

## Contract Deployment

### 1. Set Up Environment

Create a `.env` file:
```env
PRIVATE_KEY=your_wallet_private_key
INFURA_KEY=your_infura_key
ETHERSCAN_API_KEY=your_etherscan_key
```

### 2. Deploy Label Registry

```bash
npx hardhat run scripts/deploy-registry.ts --network <network>
```

### 3. Deploy Context Node

```bash
npx hardhat run scripts/deploy-node.ts --network <network>
```

### Supported Networks

- `localhost` - Local development
- `goerli` - Ethereum Goerli testnet
- `mainnet` - Ethereum mainnet

## Contract Verification

Verify contracts on Etherscan:

```bash
npx hardhat verify --network <network> <contract_address> <constructor_args>
```

Example:
```bash
# Verify LabelRegistry
npx hardhat verify --network goerli <registry_address>

# Verify ContextNode
npx hardhat verify --network goerli <node_address> "labelId" "registryAddress"
```

## Contract Documentation

### LabelRegistry

The `LabelRegistry` contract manages label types and their relationships. It defines:

- Label types with properties
- Valid relationship types between labels
- Property type validation (STRING, NUMBER, DATE, etc.)

Example:
```solidity
interface ILabelRegistry {
    function addLabel(string calldata name) external;
    function addLabelProperty(bytes32 labelId, string calldata name, PropertyType propertyType) external;
    function addEdge(string calldata name, bytes32 fromLabelId, bytes32 toLabelId) external;
}
```

### ContextNode

The `ContextNode` contract represents a node in the knowledge graph. It handles:

- Document management for RAG systems
- Typed properties based on label definition
- Verified relationships with other nodes

Example:
```solidity
interface IContextNode {
    function addDocument(string memory url) external;
    function setProperty(bytes32 propertyId, bytes memory value) external;
    function addEdge(bytes32 entityId, address nodeId, string memory descriptor) external;
}
```

## Testing

The test suite includes:

- Unit tests for each contract
- Integration tests for contract interactions
- Property-based tests for edge cases
- Gas optimization tests

Run specific test suites:
```bash
# Run LabelRegistry tests
npx hardhat test test/LabelRegistry.ts

# Run ContextNode tests
npx hardhat test test/ContextNode.ts
```

## Security

These contracts implement:

- Access control using OpenZeppelin's `Ownable`
- Input validation and type checking
- Event emission for all state changes
- Status validation for relationship changes

## Gas Optimization

The contracts are optimized for gas efficiency:

- Minimal storage operations
- Efficient data structures
- Batch operations where possible
- Storage packing for small values

## Events

Monitor contract activity through these events:

```solidity
// LabelRegistry Events
event LabelAdded(bytes32 indexed labelId, string name);
event EdgeAdded(bytes32 indexed labelId, string name);
event PropertyAdded(bytes32 indexed entityId, bytes32 indexed PropertyId, string name);

// ContextNode Events
event PropertyUpdated(bytes32 indexed propertyId, bytes value, address indexed updatedBy);
event DocumentAdded(bytes32 indexed documentId, string indexed url, address indexed addedBy);
event EdgeAdded(bytes32 edgeId, bytes32 entityId, address indexed nodeIdFrom, address indexed nodeIdTo);
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for any new functionality
4. Run the test suite
5. Submit a pull request

## License

MIT
