# @ctxai/utils

Shared utilities and helper functions for Context Protocol's decentralized RAG system.

## Installation

```bash
npm install @ctxai/utils
```

## Core Components

### Property Types

Enums and utilities for handling typed properties in the protocol:

```typescript
enum PropertyType {
    INVALID,
    STRING,
    NUMBER,
    DATE,
    TIME,
    BOOLEAN
}
```

### Property Helpers

Functions for encoding and decoding property values:

```typescript
// Convert values to bytes for contract storage
Property.stringToBytes("Hello")  // String to bytes
Property.numberToBytes(42)       // Number to bytes
Property.dateToBytes(new Date()) // Date to bytes
Property.timeToBytes("14:30")    // Time to bytes
Property.booleanToBytes(true)    // Boolean to bytes

// Convert bytes back to values
Property.bytesToString(bytes)    // Bytes to string
Property.bytesToNumber(bytes)    // Bytes to number
Property.bytesToDate(bytes)      // Bytes to date
Property.bytesToTime(bytes)      // Bytes to time
Property.bytesToBoolean(bytes)   // Bytes to boolean
```

### Document Utilities

Functions for handling documents and their IDs:

```typescript
// Generate document ID from contract address and URL
Document.generateId(contractAddress, "ipfs://QmDocument1")

// Validate document URL
Document.validateUrl("ipfs://QmDocument1")
```

### Label Utilities

Functions for managing label identifiers:

```typescript
// Generate label ID from registry address and name
Label.generateId(registryAddress, "Organization")

// Generate property ID for a label
Property.generateId(labelId, "name")
```

### Edge Utilities

Functions for managing relationships and their states:

```typescript
// Edge status enumeration
enum EdgeStatus {
    INVALID,
    PENDING,
    DELETED,
    ACCEPTED,
    REJECTED,
    FINISHED
}

// Generate edge ID from components
Edge.generateId(edgeId, targetAddress, descriptor)
```

### Logging Utilities

Colored console logging for better development experience:

```typescript
import { Logger } from '@ctxai/utils';

Logger.info('Operation started');
Logger.success('Operation completed');
Logger.error('Operation failed');
Logger.warn('Operation warning');
Logger.loading('Operation in progress');
Logger.result('Key', 'Value');
```

## Usage Examples

### Property Manipulation

```typescript
import { Property, PropertyType } from '@ctxai/utils';

// Encoding values for contract storage
const stringValue = Property.encodeValue(PropertyType.STRING, "Hello");
const numberValue = Property.encodeValue(PropertyType.NUMBER, 42);
const dateValue = Property.encodeValue(PropertyType.DATE, new Date());
const timeValue = Property.encodeValue(PropertyType.TIME, "14:30");
const boolValue = Property.encodeValue(PropertyType.BOOLEAN, true);

// Decoding values from contract storage
const decodedString = Property.decodeValue(PropertyType.STRING, stringValue);
const decodedNumber = Property.decodeValue(PropertyType.NUMBER, numberValue);
const decodedDate = Property.decodeValue(PropertyType.DATE, dateValue);
const decodedTime = Property.decodeValue(PropertyType.TIME, timeValue);
const decodedBool = Property.decodeValue(PropertyType.BOOLEAN, boolValue);
```

### Working with Documents

```typescript
import { Document } from '@ctxai/utils';

// Generate document ID
const documentId = Document.generateId(
    "0x123...abc",  // Contract address
    "ipfs://QmDocument1"
);

// Validate document URL
if (Document.validateUrl("ipfs://QmDocument1")) {
    // URL is valid
}
```

### Managing Labels and Edges

```typescript
import { Label, Edge } from '@ctxai/utils';

// Generate label ID
const labelId = Label.generateId(
    "0x123...abc",  // Registry address
    "Organization"
);

// Generate edge ID
const edgeId = Edge.generateId(
    "0x456...def",  // Edge type ID
    "0x789...ghi",  // Target address
    "employee"      // Descriptor
);
```

### Debug Logging

```typescript
import { Logger } from '@ctxai/utils';

// Different logging levels with optional prefix
Logger.info('Starting process', { prefix: 'Init' });
Logger.loading('Processing data', { prefix: 'Data' });
Logger.success('Process completed', { prefix: 'Done' });
Logger.error('Process failed', { prefix: 'Error' });
Logger.warn('Missing optional data', { prefix: 'Warning' });
Logger.result('Process output', '42', { prefix: 'Result' });
```

## API Reference

### Property

- `encodeValue(type: PropertyType, value: any): Uint8Array`
- `decodeValue(type: PropertyType, bytes: Uint8Array): any`
- `generateId(parentId: string, propertyName: string): string`

### Document

- `generateId(contractAddress: string, url: string): string`
- `validateUrl(url: string): boolean`

### Label

- `generateId(registryAddress: string, name: string): string`

### Edge

- `generateId(edgeId: string, targetAddress: string, descriptor: string): string`

### Logger

- `info(message: string, options?: LogOptions): void`
- `success(message: string, options?: LogOptions): void`
- `error(message: string, options?: LogOptions): void`
- `warn(message: string, options?: LogOptions): void`
- `loading(message: string, options?: LogOptions): void`
- `result(key: string, value: string, options?: LogOptions): void`

## Testing

```bash
npm test
```

## License

MIT
