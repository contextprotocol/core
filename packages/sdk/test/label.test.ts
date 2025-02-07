// test.ts
import { expect, test, describe, beforeAll } from "bun:test";
import { LabelRegistry } from '../src';
import { Logger } from '../src/utils';

import dotenv from 'dotenv';

dotenv.config();
let labelRegistry:LabelRegistry;
let labelRegistryAddress:string = '';

const start = 1;
const stop = 7;

describe('LabelRegistry', () => {
    beforeAll(async () => {
        if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not found in .env');
        const privateKey = process.env.PRIVATE_KEY;
        labelRegistry = new LabelRegistry({ privateKey, registryAddress: labelRegistryAddress });
    });

    test('1. Should deploy a Label Registry', async () => {
        if (start <= 1 && stop >= 1) {
            Logger.trace('Deploy Registry', 'test 1')
            labelRegistryAddress = await labelRegistry.deploy();
            expect(labelRegistry).toBeDefined();
            Logger.info(`labelRegistry = ${labelRegistryAddress}`, 'Test 1');
        } else Logger.trace('Skipping test', 'Test 1');
    }, 20000);

    test('2. Should add a Label', async () => {
        if (start <= 2 && stop >= 2) {
            Logger.trace('Add Label Organization', 'test 2')
            const labelId = await labelRegistry.addLabel("Organization");
            expect(labelId).toBeDefined();
            Logger.info(`labelId = ${labelId}`, 'Test 2');
        } else Logger.trace('Skipping test', 'Test 2');
    }, 20000);

    test('3. Should Get info about a Label', async () => {
        if (start <= 3 && stop >= 3) {
            const labels = await labelRegistry.getLabels();
            const organization = await labelRegistry.getLabel("Organization");
            expect(labels).toBeDefined();
            expect(labels[0]).toBe("Organization"); 
            Logger.info(`labels = ${labels.length}`, 'Test 3');
            Logger.info(`isValidLabel = ${await labelRegistry.isValidLabel(organization.labelId)}`, 'Test 3');
            const label = await labelRegistry.getLabel("Organization");
            expect(label.name).toBe("Organization");
        } else Logger.trace('Skipping test', 'Test 3');
    }, 20000);

    test('4. Should add a Field to the Node Type', async () => {
        if (start <= 4 && stop >= 4) {
            Logger.trace('Add properties to Organization', 'test 4')
            const propertyIdName = await labelRegistry.addLabelProperty("Organization", "name", 1);
            Logger.info(`propertyId (name) = ${propertyIdName}`, 'Test 4');
            const propertyIdAge = await labelRegistry.addLabelProperty("Organization", "age", 2);
            Logger.info(`propertyId (age) = ${propertyIdAge}`, 'Test 4');
        } else Logger.trace('Skipping test', 'Test 4');
    }, 20000);

    test('5. Should Create an edge', async () => {
        if (start <= 5 && stop >= 5) {
            const organization = await labelRegistry.getLabel("Organization");
            Logger.trace('Create Persona Label', 'test 5')
            const labelPersonaId = await labelRegistry.addLabel("Persona");
            Logger.trace('Create Edge', 'test 5')
            const edgeId = await labelRegistry.addEdge("Worker", organization.labelId, labelPersonaId);
            Logger.info(`EdgeId = ${edgeId}`, 'Test 5');
        } else Logger.trace('Skipping test', 'Test 5');
    }, 20000);

    test('6. Should Get info about a Label', async () => {
        if (start <= 6 && stop >= 6) {
            const edge = await labelRegistry.getEdge("Worker");
            // expect(edge.edgeId).toBe(edgeId);
        } else Logger.trace('Skipping test', 'Test 6');
    }, 20000);

    test('7.Add properties to an Edge', async () => {
        if (start <= 7 && stop >= 7) {
            Logger.trace('Create Property Start', 'test 7')
            await labelRegistry.addEdgeProperty("Worker", "start", 2);
            Logger.trace('Create Property end', 'test 7')
            await labelRegistry.addEdgeProperty("Worker", "end", 2);
            Logger.trace('Create Property position', 'test 7')
            await labelRegistry.addEdgeProperty("Worker", "position", 1);
        } else Logger.trace('Skipping test', 'Test 7');
    },20000);

});
