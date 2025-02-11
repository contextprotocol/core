# Context Protocol Smart Contracts

This package contains the core smart contracts for the Context Protocol, implementing a flexible and extensible system for managing labeled nodes, their properties, documents, and relationships.

## Overview

The Context Protocol consists of two main contracts:

1. **LabelRegistry**: Manages the schema and validation rules for the protocol
   - Label definitions and their properties
   - Edge type definitions and configurations
   - Property type validation
   - Edge path validation

2. **ContextNode**: Implements a node instance with the following features:
   - Property management
   - Document management
   - Edge (relationship) management
   - Access control

## Contract Architecture

### LabelRegistry

The Label Registry serves as the schema manager for the entire protocol. It defines:

- **Labels**: Node types with defined property sets
- **Edge Types**: Relationship types between labels
- **Property Types**: Supported data types (String, Number, Date, Hour, Boolean)
- **Edge Configurations**: Valid paths between different label types

### ContextNode

Each Context Node represents an instance of a label with:

- **Properties**: Typed key-value pairs
- **Documents**: Associated URLs with indexing status
- **Edges**: Relationships to other nodes with:
  - Properties
  - Documents
  - Status management (PENDING, ACCEPTED, REJECTED, DELETED, FINISHED)

## Getting Started

### Prerequisites

- Node.js >= 18
- Hardhat
- TypeScript
- Bun

### Installation

```bash
bun install
```

### Build

```bash
bun run build
```

## Contract Usage

### Deploying a Label Registry

```typescript
const LabelRegistry = await ethers.getContractFactory("LabelRegistry");
const registry = await LabelRegistry.deploy();
await registry.deployed();
```

### Creating a Node

```typescript
const ContextNode = await ethers.getContractFactory("ContextNode");
const node = await ContextNode.deploy(registryAddress, labelId);
await node.deployed();
```

### Managing Properties

```typescript
// Add a property
await node.setProperty(propertyId, propertyValue);

// Get a property
const value = await node.getProperty(propertyId);
```

### Managing Documents

```typescript
// Add a document
await node.addDocument(url);

// Get document details
const doc = await node.getDocument(documentId);
```

### Managing Edges

```typescript
// Create an edge
await node.addEdge(entityId, targetNodeAddress, descriptor);

// Add documents to edge
await node.addEdgeDocument(edgeId, url);

// Update edge status
await node.updateEdgeStatus(edgeId, newStatus);
```

## Property Types

The protocol supports the following property types:

- `STRING`: Text values
- `NUMBER`: Numeric values
- `DATE`: Date values (Unix timestamp)
- `HOUR`: Time values (HH:MM format)
- `BOOLEAN`: True/false values

## Edge States

Edges (relationships) can have the following states:

- `PENDING`: Initial state
- `ACCEPTED`: Approved by target node
- `REJECTED`: Rejected by target node
- `DELETED`: Removed by source node
- `FINISHED`: Completed relationship

## License

MIT License
