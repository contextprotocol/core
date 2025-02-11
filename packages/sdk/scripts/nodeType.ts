import { NodeTypeRegistry } from '../src/index';
import { PropertyType } from "../../shared/src";
import { Logger } from '../../shared/src/logger';

// Usage Example:
async function setupRegistry() {
    Logger.info('Setting up knowledge graph...');
    const registry = new NodeTypeRegistry({ debug: true, nodeTypeRegistryAddress: process.env.NODE_TYPE_REGISTRY_ADDRESS });  
    await registry.deploy();

    Logger.success('Registry deployed successfully!');
    Logger.result('Address:', registry.nodeTypeRegistryAddress ?? '', { prefix: 'Node Type Registry' });
    Logger.warn('Update .env file');
    Logger.warn(`REGISTRY_ADDRESS=${registry.nodeTypeRegistryAddress}`);
  
    // Define Organization label with properties and relationships
    await registry.nodeType('Persona')
      .property('name', PropertyType.STRING)
      .property('founded', PropertyType.NUMBER)
      .property('employee', PropertyType.NUMBER)
      .property('incorporated', PropertyType.DATE)
      .property('opensAt', PropertyType.TIME)
      .property('isActive', PropertyType.BOOLEAN)
      .save();

    await registry.nodeType('Organization')
      .property('name', PropertyType.STRING)
      .property('founded', PropertyType.NUMBER)
      .property('employee', PropertyType.NUMBER)
      .save();

    await registry.edge('WORKS_AT', 'Organization', 'Persona')
        .property('role', PropertyType.STRING)
        .property('start', PropertyType.NUMBER)
        .property('end', PropertyType.NUMBER)
        .save();

    const entities = await registry.getEntities();
    Logger.array('NodeTypes', entities.nodeTypes);
    Logger.array('Edges', entities.edges);

    const properties = await registry.getEntity('Organization');
    Logger.result('Properties', properties.name);
  }

  setupRegistry();
