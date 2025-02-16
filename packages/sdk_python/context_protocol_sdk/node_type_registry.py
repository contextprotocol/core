from typing import Optional, Dict, Any
from web3 import Web3
from web3.contract import Contract
from eth_typing import Address
from eth_utils import to_checksum_address
import json
import os
from dotenv import load_dotenv

load_dotenv()

class NodeTypeRegistry:
    def __init__(self, node_type_registry_address: str, debug: bool = False):
        self.debug = debug
        self.w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL', 'http://localhost:8545')))
        
        # Load contract ABI and create contract instance
        with open('path/to/NodeTypeRegistry.json') as f:  # Update path
            contract_json = json.load(f)
        
        self.contract = self.w3.eth.contract(
            address=to_checksum_address(node_type_registry_address),
            abi=contract_json['abi']
        )
        self.address = node_type_registry_address

    async def property_id(self, node_type_id: str, property_key: str) -> str:
        """Get the property ID for a given node type and property key"""
        # Implementation using web3.py to call the contract method
        return await self.contract.functions.propertyId(node_type_id, property_key).call()

    async def get_edge_by_id(self, edge_type_id: str) -> Dict[str, Any]:
        """Get edge information by ID"""
        # Implementation using web3.py to call the contract method
        edge_data = await self.contract.functions.getEdgeById(edge_type_id).call()
        return {
            'edge_id': edge_data[0],
            'exists': edge_data[1]
        }

    async def get_node_type(self, node_type_id: str) -> Dict[str, Any]:
        """Get node type information"""
        # Implementation using web3.py to call the contract method
        node_type_data = await self.contract.functions.getNodeType(node_type_id).call()
        return {
            'node_type_id': node_type_data[0],
            'exists': node_type_data[1]
        }
