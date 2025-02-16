from typing import Optional, List, Any, Dict, Tuple
from web3 import Web3
from web3.contract import Contract
from eth_typing import Address
from eth_utils import to_checksum_address
import json
import os
from dotenv import load_dotenv

from .types import GraphNodeConfig, NodeProperty, EdgeStatus, PropertyType
from .node_type_registry import NodeTypeRegistry

load_dotenv()

class NodeBuilder:
    def __init__(self, graph_node_name: str, parent: 'GraphNode'):
        self.graph_node_name = graph_node_name
        self.parent = parent
        self.properties: List[NodeProperty] = []
        self.documents: List[str] = []

    def property(self, key: str, value: Any) -> 'NodeBuilder':
        self.properties.append(NodeProperty(key=key, value=value, type=PropertyType.INVALID))
        return self

    def document(self, url: str) -> 'NodeBuilder':
        self.documents.append(url)
        return self

    async def save(self):
        if self.parent.debug:
            print(f"Saving GraphNode with NodeType {self.graph_node_name}")

        # Add node (if not deployed)
        await self.parent.add_node(self.graph_node_name)

        # Get property IDs from registry and set them
        for prop in self.properties:
            prop.property_id = await self.parent.node_type_registry.property_id(
                self.parent.node_type_id, prop.key
            )

        # Save properties
        await self.parent.add_properties(self.parent.node_id, self.properties)

        # Add documents
        for doc in self.documents:
            await self.parent.add_document(self.parent.node_id, doc)

        return self.parent.node_id


class EdgeBuilder:
    def __init__(self, edge_name: str, descriptor: str, parent: 'GraphNode'):
        self.edge_name = edge_name
        self.descriptor = descriptor
        self.parent = parent
        self.properties: List[NodeProperty] = []
        self.documents: List[str] = []
        self.from_node_address: Optional[str] = None
        self.to_node_address: Optional[str] = None

    def property(self, key: str, value: Any) -> 'EdgeBuilder':
        self.properties.append(NodeProperty(key=key, value=value, type=PropertyType.INVALID))
        return self

    def document(self, url: str) -> 'EdgeBuilder':
        self.documents.append(url)
        return self

    def from_node(self, node_address: str) -> 'EdgeBuilder':
        self.from_node_address = to_checksum_address(node_address)
        return self

    def to_node(self, node_address: str) -> 'EdgeBuilder':
        self.to_node_address = to_checksum_address(node_address)
        return self

    async def save(self):
        if not self.to_node_address:
            raise ValueError("Target node address must be set")

        edge_id = await self.parent.add_edge(
            self.edge_name,
            self.to_node_address,
            self.descriptor
        )

        if self.properties:
            await self.parent.set_edge_properties(
                edge_id,
                self.edge_name,
                self.properties
            )

        for doc in self.documents:
            await self.parent.add_document(edge_id, doc)

        return edge_id

    async def accept(self):
        if not self.to_node_address:
            raise ValueError("Target node address must be set")
        
        edge_id = await self.parent.add_edge(
            self.edge_name,
            self.to_node_address,
            self.descriptor
        )
        await self.parent.answer_edge(self.to_node_address, edge_id, EdgeStatus.ACCEPTED)

    async def status(self) -> EdgeStatus:
        if not self.to_node_address:
            raise ValueError("Target node address must be set")
        
        edge_data = await self.parent.get_edge(
            self.edge_name,
            self.to_node_address,
            self.descriptor
        )
        return edge_data[3] if edge_data else EdgeStatus.INVALID


class GraphNode:
    def __init__(self, config: GraphNodeConfig):
        self.debug = config.debug
        
        # Setup Web3 provider
        rpc_url = config.connection or 'testnet'
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        
        # Setup wallet
        private_key = config.private_key or os.getenv('PRIVATE_KEY')
        if private_key:
            self.account = self.w3.eth.account.from_key(private_key)
        else:
            self.account = None

        # Initialize contract if address provided
        self.contract = None
        node_address = config.node_address or os.getenv('NODE_ADDRESS')
        if node_address:
            self._check_wallet()
            with open('path/to/GraphNode.json') as f:  # Update path
                contract_json = json.load(f)
            self.contract = self.w3.eth.contract(
                address=to_checksum_address(node_address),
                abi=contract_json['abi']
            )
            self.node_address = node_address

        # Setup registry
        registry_address = config.node_type_registry_address or os.getenv('NODE_TYPE_REGISTRY_ADDRESS')
        if registry_address:
            self.node_type_registry = NodeTypeRegistry(
                node_type_registry_address=registry_address,
                debug=self.debug
            )
        else:
            self.node_type_registry = None

        self.node_id = ''
        self.node_type_id = ''
        self.graph_node_name = ''

    def _check_wallet(self):
        if not self.account:
            raise ValueError("Wallet not initialized")

    def _check_contract(self):
        if not self.contract:
            raise ValueError("Contract not initialized")

    def _check_registry(self):
        if not self.node_type_registry:
            raise ValueError("Registry not initialized")

    async def deploy(self, node_type_id: str) -> str:
        """Deploy a new GraphNode contract"""
        self._check_wallet()
        
        # Contract deployment logic here using web3.py
        # This would involve loading the contract bytecode and deploying it
        
        return "deployed_address"  # Return the deployed contract address

    def node(self, name: str) -> NodeBuilder:
        """Create a new node with builder pattern"""
        return NodeBuilder(name, self)

    def edge(self, edge_type: str, descriptor: str) -> EdgeBuilder:
        """Create a new edge with builder pattern"""
        return EdgeBuilder(edge_type, descriptor, self)

    async def add_node(self, graph_node_name: str) -> Dict[str, Any]:
        self._check_contract()
        self._check_registry()
        
        # Implementation of adding a node to the graph
        # This would involve calling the smart contract method
        
        return {"node_id": "generated_node_id", "properties": []}

    async def add_edge(self, edge_name: str, to_node_address: str, descriptor: str) -> str:
        self._check_contract()
        self._check_registry()
        
        # Implementation of adding an edge
        # This would involve calling the smart contract method
        
        return "edge_id"

    async def set_edge_properties(self, edge_id: str, edge_name: str, properties: List[NodeProperty]):
        self._check_contract()
        
        # Implementation of setting edge properties
        # This would involve calling the smart contract method
        pass

    async def get_properties(self, node_id: str) -> List[Any]:
        self._check_contract()
        
        # Implementation of getting properties
        # This would involve calling the smart contract method
        
        return []

    async def add_properties(self, node_id: str, properties: List[NodeProperty]):
        self._check_contract()
        
        # Implementation of adding properties
        # This would involve calling the smart contract method
        pass

    async def get_property(self, property_name: str) -> Any:
        self._check_contract()
        
        # Implementation of getting a specific property
        # This would involve calling the smart contract method
        pass

    async def add_document(self, node_id: str, url: str) -> str:
        self._check_contract()
        
        # Implementation of adding a document
        # This would involve calling the smart contract method
        
        return "document_id"

    async def remove_document(self, url: str):
        self._check_contract()
        
        # Implementation of removing a document
        # This would involve calling the smart contract method
        pass

    async def get_documents(self) -> List[str]:
        self._check_contract()
        
        # Implementation of getting documents
        # This would involve calling the smart contract method
        
        return []

    async def answer_edge(self, to_node_address: str, edge_id: str, status: EdgeStatus):
        self._check_contract()
        
        # Implementation of answering an edge
        # This would involve calling the smart contract method
        pass
