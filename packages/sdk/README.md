# Context Protocol SDK

TypeScript SDK for interacting with Context Protocol's decentralized RAG infrastructure.

## Installation

```bash
npm install @contextprotocol/sdk
```

## Quick Start

```typescript
import { LabelRegistry, ContextNode } from '@contextprotocol/sdk';
import { PropertyType } from '@contextprotocol/utils';

// Deploy registry and create schema
const registry = new LabelRegistry({ debug: true });
await registry.deploy();

// Create a label type
await registry.label('Organization')
  .property('name', PropertyType.STRING)
  .property('founded', PropertyType.NUMBER)
  .save();

// Create a node instance
const node = new ContextNode({ debug: true });
await node.node('Organization')
  .property('name', 'Context')
  .property('founded', 2023)
  .save();
```

## Core Components

### LabelRegistry

The `LabelRegistry` class manages the schema and rules for your knowledge graph.

```typescript
const registry = new LabelRegistry({
  connection: 'testnet',     // Network connection
  privateKey: 'your_key',    // Optional: Wallet private key
  registryAddress: 'addr',   // Optional: Existing registry address
  debug: true               // Optional: Enable debug logging
});
```

#### Creating Labels

Labels define node types with their properties:

```typescript
// Builder pattern for creating labels
await registry.label('Person')
  .property('name', PropertyType.STRING)
  .property('age', PropertyType.NUMBER)
  .property('birthDate', PropertyType.DATE)
  .property('startTime', PropertyType.TIME)
  .property('isActive', PropertyType.BOOLEAN)
  .save();
```

#### Defining Relations

Define valid relationships between labels:

```typescript
await registry.edge('WORKS_AT', 'Person', 'Organization')
  .property('role', PropertyType.STRING)
  .property('startDate', PropertyType.DATE)
  .save();
```

### ContextNode

The `ContextNode` class represents a node in your knowledge graph. It manages properties, documents, and relationships.

```typescript
const node = new ContextNode({
  connection: 'testnet',      // Network connection
  privateKey: 'your_key',     // Optional: Wallet private key
  nodeAddress: 'addr',        // Optional: Existing node address
  registryAddress: 'addr',    // Label registry address
  debug: true                // Optional: Enable debug logging
});
```

#### Managing Properties

Add and update node properties:

```typescript
await node.node('Organization')
  .property('name', 'Context Protocol')
  .property('founded', 2023)
  .property('isActive', true)
  .save();

// Get property value
const name = await node.getProperty('name');
```

#### Managing Documents

Add and manage documents for RAG:

```typescript
// Add documents individually
await node.addDocument('ipfs://QmDocument1');

// Add multiple documents during node creation
await node.node('Organization')
  .property('name', 'Context')
  .document('ipfs://QmDocument1')
  .document('ipfs://QmDocument2')
  .save();

// Remove document
await node.removeDocument('ipfs://QmDocument1');

// Get all documents
const docs = await node.getDocuments();
```

#### Managing Relations

Create and manage relationships with other nodes:

```typescript
// Create relation using builder pattern
await node.edge('WORKS_AT', 'employee')
  .to(otherNodeAddress)
  .property('role', 'Engineer')
  .property('startDate', new Date('2023-01-01'))
  .save();

// Get edge information
const edge = await node.getEdge('WORKS_AT', otherNodeAddress, 'employee');
```

## Debug Mode

Enable debug mode for detailed logging:

```typescript
const registry = new LabelRegistry({ debug: true });
const node = new ContextNode({ debug: true });
```

Debug output includes:
- Contract deployment status
- Transaction confirmations
- Property updates
- Document management
- Relationship changes

## Error Handling

The SDK uses a custom error system:

```typescript
try {
  await node.addDocument('invalid-url');
} catch (error) {
  if (error.message.includes('InvalidURL')) {
    // Handle invalid URL error
  }
}
```

Common error types:
- `InvalidURL`: Invalid document URL
- `DocumentAlreadyExists`: Duplicate document
- `InvalidPropertyType`: Wrong property type
- `InvalidRelation`: Invalid relationship
- `UnauthorizedAccess`: Permission denied

## TypeScript Support

The SDK is written in TypeScript and provides full type definitions:

```typescript
import { 
  LabelRegistry, 
  ContextNode,
  ContextNodeConfig,
  LabelRegistryConfig,
  PropertyType,
  EdgeStatus
} from '@contextprotocol/sdk';
```

## Environment Variables

The SDK uses these environment variables:

```env
PRIVATE_KEY=your_wallet_private_key
REGISTRY_ADDRESS=deployed_registry_address
NODE_ADDRESS=deployed_node_address
```

## License

MIT
