import { GraphNode  } from '../src/index';
import { Logger, EdgeStatus } from '../../shared/src';

// Usage Example:
async function updateNode() {
    Logger.info('Setting up knowledge graph...');

    const org = new GraphNode({ debug: true, nodeAddress: process.env.NODE_ADDRESS_ORGANIZATION });
    const alex = new GraphNode({ debug: true, nodeAddress: process.env.NODE_ADDRESS_PERSONA });

     await org.node('Organization')
         .property('name', 'Context')
         .property('founded', 2021)
         .property('employee', 10)
       .save();

    const orgProperties = await org.getProperties(org.nodeId);
    console.log(orgProperties);

    // Define Organization label with properties and relationships
    await alex.node('Persona')
        .property('name', 'Alex')
        .property('founded', 2021)
        .document('ipfs://QmTest123')
        .document('https://example.com/doc1')
      .save();

    const alexProperties = await alex.getProperties(alex.nodeId);
     console.log(alexProperties);
    await alex.addDocument(alex.nodeId, 'https://example.com/doc3');

    // Get edge between org and alex
    const edgeStatus = await org.edge('WORKS_AT', 'founder')
        .to(alex.nodeAddress as string)
        .status();

    if (edgeStatus === EdgeStatus.PENDING) {
        await alex.edge('WORKS_AT', 'founder')
            .from(org.nodeAddress as string)
            .accept();
    } else {
        Logger.error('Edge is not in PENDING status');
    }
}

updateNode();
