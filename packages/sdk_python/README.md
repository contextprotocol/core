# Context Protocol Python SDK

This is the official Python SDK for Context Protocol, providing a Python interface to interact with Context Protocol smart contracts.

## Installation

```bash
pip install context-protocol-sdk
```

## Quick Start

```python
from context_protocol_sdk import GraphNode, GraphNodeConfig
from dotenv import load_dotenv
import asyncio

load_dotenv()  # Load environment variables from .env file

async def main():
    # Initialize the SDK
    config = GraphNodeConfig(
        connection='testnet',
        debug=True
    )
    graph_node = GraphNode(config)

    # Create a new node
    node = graph_node.node("ExampleNode")
    node.property("name", "Example")
    node.property("description", "This is an example node")
    node.document("https://example.com/doc1")
    
    node_id = await node.save()
    print(f"Created node with ID: {node_id}")

    # Create an edge
    edge = graph_node.edge("REFERENCES", "example reference")
    edge.to_node("0x123...")  # Target node address
    edge.property("weight", 1)
    
    edge_id = await edge.save()
    print(f"Created edge with ID: {edge_id}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Features

- Full Python implementation of the Context Protocol SDK
- Async/await support for all blockchain operations
- Type hints for better IDE support
- Builder pattern for creating nodes and edges
- Comprehensive error handling
- Debug mode for detailed logging

## Requirements

- Python 3.8 or higher
- web3.py
- python-dotenv

## Environment Variables

Create a `.env` file in your project root with:

```
PRIVATE_KEY=your_private_key
NODE_ADDRESS=deployed_node_address
NODE_TYPE_REGISTRY_ADDRESS=registry_address
RPC_URL=your_rpc_url
```

## Documentation

For detailed documentation, please visit [docs.contextprotocol.com](https://docs.contextprotocol.com)

## License

MIT
