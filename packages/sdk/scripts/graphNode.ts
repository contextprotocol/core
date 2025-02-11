import { GraphNode } from '../src/index';
import { Logger } from '../../shared/src/logger';

// Usage Example:
async function updateNode() {
    Logger.info('Setting up knowledge graph...');

    const context = new GraphNode({ debug: true, nodeAddress: process.env.NODE_ADDRESS_ORGANIZATION });
    const alex = new GraphNode({ debug: true, nodeAddress: process.env.NODE_ADDRESS_PERSONA });

    /*await context.node('Organization')
        .property('name', 'Context')
        .property('founded', 2021)
        .property('employee', 10)
      .save();

    // Define Organization label with properties and relationships
    await alex.node('Persona')
        .property('name', 'Alex')
        .property('founded', 2021)
        .document('ipfs://QmTest123')
        .document('https://example.com/doc1')
      .save();
 
      await alex.addDocument('https://example.com/doc3');*/

      await context.edge('WORKS_AT', 'founder')
        .to(alex.nodeAddress as string)
        .property('role', 'CEO')
        .property('start', new Date('2021-01-01'))
        .save();
  }

  updateNode();
