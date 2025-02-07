import { LabelRegistry } from '../src/index';
import { PropertyType } from "../../utils/src";
import { Logger } from '../../utils/src/logger';

// Usage Example:
async function setupRegistry() {
    Logger.info('Setting up knowledge graph...');
    const registry = new LabelRegistry({ debug: true, registryAddress: "" });
    await registry.deploy();

    Logger.success('Label Registry deployed successfully!');
    Logger.result('Address:', registry.registryAddress ?? '', { prefix: 'Label Registry' });
    Logger.warn('Update .env file');
    Logger.warn(`REGISTRY_ADDRESS=${registry.registryAddress}`);
  
    // Define Organization label with properties and relationships
    await registry.label('Persona')
      .property('name', PropertyType.STRING)
      .property('founded', PropertyType.NUMBER)
      .property('employee', PropertyType.NUMBER)
      .property('incorporated', PropertyType.DATE)
      .property('opensAt', PropertyType.TIME)
      .property('isActive', PropertyType.BOOLEAN)
      .save();

    await registry.label('Organization')
      .property('name', PropertyType.STRING)
      .property('founded', PropertyType.NUMBER)
      .property('employee', PropertyType.NUMBER)
      .save();

    Logger.array('Labels', await registry.getLabels());

    await registry.edge('WORKS_AT', 'Organization', 'Persona')
        .property('role', PropertyType.STRING)
        .property('start', PropertyType.NUMBER)
        .property('end', PropertyType.NUMBER)
        .save();

    Logger.array('Edges', await registry.getEdges());
  }

  setupRegistry();