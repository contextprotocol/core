import ethers, { Interface, TransactionReceipt } from 'ethers';
 

export class EventParser {
    static parseReceiptEvents(
        receipt: TransactionReceipt,
        contractInterface: Interface,
        eventName: string
    ): any[] {
        if (!receipt.logs) {
            throw new Error('No logs found in transaction receipt');
        }

        const events: any[] = [];
        for (const log of receipt.logs) {
            try {
                const parsedLog = contractInterface.parseLog(log);
                if (parsedLog === null) throw new Error('Log not parsed');
                if (parsedLog.name === eventName) {
                    events.push(parsedLog.args);
                }
            } catch (error) {
                continue; 
            }
        }
        if (events.length === 0) {
            throw new Error(`No ${eventName} events found in transaction receipt`);
        }
        return events;
    }

    static getFirstEventArgs(
        receipt: TransactionReceipt,
        contractInterface: ethers.Interface,
        eventName: string,
        agentId: string
    ): any {
        const events = this.parseReceiptEvents(receipt, contractInterface, eventName);
        const filteredEvents = events.filter((event) => event[0] === agentId);
        return filteredEvents[0];
    }
}

