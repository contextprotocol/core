// propertyUtils.ts
import { ethers } from 'ethers';

export enum PropertyType {
    INVALID = 0,
    STRING = 1,
    NUMBER = 2,
    DATE = 3,
    TIME = 4,
    BOOLEAN = 5
}

export class Property {

    // Helper function to compute propertyId
    static generateId(nodeAddress: string, entityId: string, propertyName: string)
    : string {
        // Property ID is just a hash of entityId and propertyName
        return ethers.keccak256(ethers.concat([
            ethers.getBytes(nodeAddress),
            ethers.getBytes(entityId),
            ethers.toUtf8Bytes(propertyName)
        ]));
    }

    static getPropertyType(propertyType: PropertyType): PropertyType {
        return propertyType;
    }

    static formatResults(results: any): any {
        if (results.length === 0) {
            return [];
        }
        const ids = results[0];
        const names = results[1];
        const types = results[2];
        const values = results[3];
        const formattedResult:any = {};

        for (let i = 0; i < ids.length; i++) {
            if (values[i] !== '0x') {
                formattedResult[names[i]] = {
                    'propertyId': ids[i],
                    'propertyType': types[i],
                    'value': Property.decodeValue(types[i], values[i])
                }
            }
        }
        return formattedResult;
    }


    // Helper function to encode property value
    static encodeValue(propertyType: PropertyType, value: any): Uint8Array {
        // Convert value to bytes based on property type
        let bytesValue: Uint8Array;
        switch (propertyType) {
            case PropertyType.STRING:
                bytesValue = this.stringToBytes(String(value));
                break;
            case PropertyType.NUMBER:
                bytesValue = this.numberToBytes(Number(value));
                break;
            case PropertyType.DATE:
                bytesValue = this.dateToBytes(new Date(value));
                break;
            case PropertyType.TIME:
                bytesValue = this.timeToBytes(String(value));
                break;
            case PropertyType.BOOLEAN:
                bytesValue = this.booleanToBytes(Boolean(value));
                break;
            default:
                throw new Error(`Unsupported property type: ${propertyType}`);
        }
        return bytesValue;
    }

    static decodeValue(propertyType: PropertyType, value: Uint8Array): any {
        // Convert bytes to appropriate type
        switch (Number(propertyType)) {
            case PropertyType.STRING:
                return Property.bytesToString(value);
            case PropertyType.NUMBER:
                return Property.bytesToNumber(value);
            case PropertyType.DATE:
                return Property.bytesToDate(value);
            case PropertyType.TIME:
                return Property.bytesToTime(value);
            case PropertyType.BOOLEAN:
                return Property.bytesToBoolean(value);
            default:
                throw new Error(`Unsupported property type: ${propertyType}`);
        }
    }

    /**
     * Convert string to bytes
     */
    static stringToBytes(value: string): Uint8Array {
        return ethers.toUtf8Bytes(value);
    }

    /**
     * Convert bytes to string
     */
    static bytesToString(value: string | Uint8Array): string {
        return ethers.toUtf8String(value);
    }

    /**
     * Convert number to bytes
     * Supports integers up to 2^53 - 1
     */
    static numberToBytes(value: number): Uint8Array {
    // Ensure we have a valid number
    if (value === null || value === undefined || isNaN(value)) {
        throw new Error('Invalid number value');
    }

    // Convert to BigInt and then to bytes
    try {
        return ethers.toBeArray(BigInt(value));
    } catch (error) {
        throw new Error(`Failed to convert number to bytes: ${error}`);
    }
    }

    /**
     * Convert bytes to number
     */
    static bytesToNumber(bytes: string | Uint8Array): number {
        if (!bytes || (typeof bytes === 'string' && bytes === '0x')) {
            return 0; // Return default value for empty bytes
        }
    
        try {
            const bigIntValue = ethers.toBigInt(bytes);
            // Check if the number is within safe integer range
            if (bigIntValue <= BigInt(Number.MAX_SAFE_INTEGER)) {
                return Number(bigIntValue);
            }
            throw new Error('Number too large for safe conversion');
        } catch (error) {
            if (typeof bytes === 'string' && bytes === '0x') {
                return 0;
            }
            throw new Error(`Failed to convert bytes to number: ${error}`);
        }
    }

    /**
     * Convert Date to bytes
     * Stores as Unix timestamp (seconds since epoch)
     */
    static dateToBytes(value: Date): Uint8Array {
        const timestamp = Math.floor(value.getTime() / 1000); // Convert to seconds
        return this.numberToBytes(timestamp);
    }

    /**
     * Convert bytes to Date
     */
    static bytesToDate(value: string | Uint8Array): Date {
        const timestamp = this.bytesToNumber(value);
        return new Date(timestamp * 1000); // Convert seconds to milliseconds
    }

    /**
     * Convert time (HH:mm) to bytes
     * Stores as minutes since midnight (0-1439)
     */
    static timeToBytes(value: string): Uint8Array {
        const [hours, minutes] = value.split(':').map(Number);
        if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
            throw new Error('Invalid time format');
        }
        const totalMinutes = hours * 60 + minutes;
        return this.numberToBytes(totalMinutes);
    }

    /**
     * Convert bytes to time (HH:mm)
     */
    static bytesToTime(value: string | Uint8Array): string {
        const totalMinutes = this.bytesToNumber(value);
        if (totalMinutes < 0 || totalMinutes > 1439) {
            throw new Error('Invalid time value');
        }
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    /**
     * Convert boolean to bytes
     */
    static booleanToBytes(value: boolean): Uint8Array {
        return this.numberToBytes(value ? 1 : 0);
    }

    /**
     * Convert bytes to boolean
     */
    static bytesToBoolean(value: string | Uint8Array): boolean {
        const num = this.bytesToNumber(value);
        return num === 1;
    }
}