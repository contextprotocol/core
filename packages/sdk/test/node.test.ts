// test.ts
import { expect, test, describe, beforeAll } from "bun:test";
import { ContextNode } from '../src';
import { Logger } from '../src/utils';

import dotenv from 'dotenv';

dotenv.config();
let contextNode:ContextNode;
let nodeAddress:string = '';
let labelRegistryAddress:string = '0xd127FFE42FD1fcBed1817d6B60afe621Fe11f314';

const start = 1;
const stop = 1;

describe('ContextNode', () => {
    beforeAll(async () => {
        contextNode = new ContextNode({ nodeAddress });
    });

    test('1. Should deploy a Context Node', async () => {
        if (start <= 1 && stop >= 1) {
            nodeAddress = await contextNode.createNode("Organization", labelRegistryAddress);
            expect(contextNode).toBeDefined();
            Logger.info(`contextNode = ${nodeAddress}`, 'Test 1');
        } else Logger.trace('Skipping test', 'Test 1');
    }, 20000);

    test('2. Should Write properties Name and Age & Test results', async () => {
        if (start <= 2 && stop >= 2) {
            const settings = { Name: 'John Doe', Age: 30 };
            
        } else Logger.trace('Skipping test', 'Test 2');
    }, 20000);

    test('3. Should Add a Document', async () => {
        if (start <= 3 && stop >= 3) {
        } else Logger.trace('Skipping test', 'Test 3');
    }, 20000);

    test('4. Should add a Relation', async () => {
        if (start <= 4 && stop >= 4) {
        } else Logger.trace('Skipping test', 'Test 4');
    }, 20000);
});
