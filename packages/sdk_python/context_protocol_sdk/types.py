from dataclasses import dataclass
from enum import Enum, auto
from typing import Optional, Any, TypedDict, Literal

RPC_URLS = {
    'testnet': 'https://testnet.example.com',  # Replace with actual testnet URL
    'mainnet': 'https://mainnet.example.com'   # Replace with actual mainnet URL
}

NetworkConnection = Literal['testnet', 'mainnet']

class PropertyType(Enum):
    INVALID = 0
    STRING = auto()
    NUMBER = auto()
    BOOLEAN = auto()
    ADDRESS = auto()
    BYTES = auto()

class EdgeStatus(Enum):
    INVALID = 0
    PENDING = auto()
    ACCEPTED = auto()
    REJECTED = auto()

@dataclass
class NodeProperty:
    key: str
    value: Any
    type: PropertyType
    property_id: str = ''

@dataclass
class GraphNodeConfig:
    connection: Optional[NetworkConnection] = 'testnet'
    private_key: Optional[str] = None
    node_address: Optional[str] = None
    node_type_registry_address: Optional[str] = None
    debug: bool = False
