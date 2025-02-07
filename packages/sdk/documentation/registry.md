# Context Protocol Label Registry SDK Documentation

## Introduction

The Context Protocol uses Knowledge Graphs to create a decentralized network of verified data that can be used by AI agents. Each node in the graph represents an entity (like an organization, person, or document) and contains its own Retrieval-Augmented Generation (RAG) system, enabling AI agents to access and reason about verified information.

### Core Concepts

- **Labels**: Define types of nodes (e.g., Organization, Person, Document)
- **Properties**: Attributes associated with labels (e.g., name, age, date)
- **Edges**: Define relationships between nodes
- **RAG System**: Each node maintains its own context for AI interactions

## LabelRegistry SDK

The LabelRegistry SDK provides a TypeScript interface to interact with the Context Protocol's smart contracts. It enables developers to create and manage labels, properties, and edges in the knowledge graph.

### Installation

```bash
npm install @context-protocol/label-registry
```

### Initialization

```typescript
import { LabelRegistry } from '@context-protocol/label-registry';

const registry = new LabelRegistry({
    connection: 'testnet', // or 'mainnet'
    privateKey: process.env.PRIVATE_KEY,
    registryAddress: 'YOUR_REGISTRY_ADDRESS' // optional
});
```

### Configuration Options

- `connection`: Network connection ('testnet' or 'mainnet')
- `privateKey`: Private key for transaction signing
- `registryAddress`: Address of deployed registry contract (optional)

## Working with Labels

### Creating a Label

Labels are the fundamental building blocks that define node types in your knowledge graph.

```typescript
// Create a new label
const labelId = await registry.addLabel("Organization");

// Get label information
const label = await registry.getLabel("Organization");
console.log(label);
// Output: {
//   labelId: "0x...",
//   exists: true,
//   name: "Organization",
//   properties: []
// }
```

### Adding Properties to Labels

Properties define the attributes that can be associated with a label.

```typescript
import { FieldType } from '@context-protocol/label-registry';

// Add string property
const namePropertyId = await registry.addLabelProperty(
    "Organization",
    "name",
    FieldType.STRING
);

// Add numeric property
const employeeCountPropertyId = await registry.addLabelProperty(
    "Organization",
    "employeeCount",
    FieldType.NUMBER
);

// Get label properties
const properties = await registry.getLabelProperties(labelId);
```

## Working with Edges

Edges define relationships between different types of nodes in your knowledge graph.

### Creating Edges

```typescript
// First, create both labels that will be connected
const orgLabelId = await registry.addLabel("Organization");
const personLabelId = await registry.addLabel("Person");

// Create an edge type between them
const edgeId = await registry.addEdge(
    "Employee",
    orgLabelId,
    personLabelId
);

// Add properties to the edge
await registry.addEdgeProperty(
    "Employee",
    "startDate",
    FieldType.NUMBER
);
```

### Querying Edge Information

```typescript
// Get edge details
const edge = await registry.getEdge("Employee");
console.log(edge);
// Output: {
//   edgeId: "0x...",
//   exists: true,
//   name: "Employee",
//   properties: ["startDate"]
// }

// Get edge properties
const edgeProps = await registry.getEdgeProperties(edge.edgeId);
```

## Integrating with RAG Systems

Each node in the Context Protocol can maintain its own RAG (Retrieval-Augmented Generation) system, enabling AI agents to access verified information.

### Example: Creating an Organization with RAG

```typescript
// 1. Create the organization label
const orgLabelId = await registry.addLabel("Organization");

// 2. Add required properties
await registry.addLabelProperty("Organization", "name", FieldType.STRING);
await registry.addLabelProperty("Organization", "description", FieldType.STRING);
await registry.addLabelProperty("Organization", "verified", FieldType.NUMBER);

// 3. Create a node instance (requires Context Node contract)
const nodeContract = new ContextNode(orgLabelId, registry.address);

// 4. Set node properties
await nodeContract.setProperties([
    {
        propertyId: namePropertyId,
        stringValue: "Acme Corp",
        numberValue: 0
    },
    {
        propertyId: descriptionPropertyId,
        stringValue: "A leading technology company",
        numberValue: 0
    }
]);

// 5. Add documents for RAG
await nodeContract.addDocument("https://acme.com/about");
```

## Best Practices

1. **Label Design**
   - Create clear, specific label types
   - Use descriptive property names
   - Consider future extensibility

2. **Edge Relationships**
   - Define clear relationship semantics
   - Add relevant properties to edges
   - Validate relationship constraints

3. **RAG Integration**
   - Keep documents focused and relevant
   - Update documents when information changes
   - Consider privacy implications

## Error Handling

The SDK throws specific errors that should be handled in your application:

```typescript
try {
    await registry.addLabel("Organization");
} catch (error) {
    if (error.message.includes("EntityAlreadyExists")) {
        console.log("Label already exists");
    } else {
        console.error("Unexpected error:", error);
    }
}
```

## Complete Example: Building a Company Directory

```typescript
async function buildCompanyDirectory() {
    // 1. Set up registry
    const registry = new LabelRegistry({
        connection: 'testnet',
        privateKey: process.env.PRIVATE_KEY
    });

    // 2. Create basic labels
    const orgId = await registry.addLabel("Organization");
    const deptId = await registry.addLabel("Department");
    const employeeId = await registry.addLabel("Employee");

    // 3. Create relationships
    await registry.addEdge("HasDepartment", orgId, deptId);
    await registry.addEdge("WorksIn", employeeId, deptId);

    // 4. Add properties
    await registry.addLabelProperty("Organization", "name", FieldType.STRING);
    await registry.addLabelProperty("Department", "name", FieldType.STRING);
    await registry.addLabelProperty("Employee", "name", FieldType.STRING);
    await registry.addLabelProperty("Employee", "title", FieldType.STRING);

    // 5. Add edge properties
    await registry.addEdgeProperty("WorksIn", "startDate", FieldType.NUMBER);
    await registry.addEdgeProperty("WorksIn", "role", FieldType.STRING);
}
```

## Security Considerations

1. **Private Key Management**
   - Never hardcode private keys
   - Use environment variables or secure key management
   - Consider using hardware security modules for production

2. **Access Control**
   - Only owners can modify labels and properties
   - Implement proper authorization checks
   - Audit all security-critical operations

3. **Data Verification**
   - Validate all input data
   - Implement proper error handling
   - Consider using TypeScript's strict mode

## Support and Resources

- GitHub Repository: [context-protocol/sdk](https://github.com/context-protocol/sdk)
- Documentation: [docs.ctx.xyz](https://docs.ctx.xyz)
- Community Forum: [forum.ctx.xyz](https://forum.ctx.xyz)
