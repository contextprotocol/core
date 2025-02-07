const { ethers } = require("hardhat");


// event DocumentAdded(address storeId, address documentId, string name);
export async function getResultsAddDocument(domainId: string, targetName: string) {
    const Store = await ethers.getContractFactory("Store");
    const store = Store.attach(domainId);
    
    const filter = store.filters.DocumentAdded();
    const events = await store.queryFilter(filter);
    
    const matchingEvents = events.filter((event: any) => event.args.name === targetName);
    if (matchingEvents.length === 0) {
      throw new Error(`No DocumentAdded events found for name: ${targetName}`);
    }
  
    // Verify the event arguments
    const results = matchingEvents.map((event:any) => {
      const { nameId, storeId, documentId, fromNameId, name } = event.args;
      return { nameId, storeId, documentId, fromNameId, name };
    });
    return results[0];
  }

// event DocumentWritten(address storeId, address documentId, address fromNameId, uint64 version);
  export async function getResultsWriteDocument(domainId: string, documentId: string) {
    const Store = await ethers.getContractFactory("Store");
    const store = Store.attach(domainId);
    
    const filter = store.filters.DocumentWritten();
    const events = await store.queryFilter(filter);
    
    const matchingEvents = events.filter((event: any) => event.args.documentId === documentId);
    if (matchingEvents.length === 0) {
      throw new Error(`No DocumentAdded events found for name: ${documentId}`);
    }
  
    // Verify the event arguments
    const results = matchingEvents.map((event:any) => {
      const { nameId, storeId, documentId, fromNameId, version } = event.args;
      return { nameId, storeId, documentId, fromNameId, version };
    });
    return results[0];
  }