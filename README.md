## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## 🏗️ Project Structure

```
ingressos-nft/
├── contracts/              # Foundry smart contract project
│   ├── src/               # Smart contract source code
│   ├── script/            # Deployment scripts
│   ├── test/              # Contract tests
│   └── README.md          # Contract-specific documentation
├── frontend/              # React frontend application
│   ├── src/               # Frontend source code
│   ├── public/            # Static assets
│   └── README.md          # Frontend-specific documentation
└── README.md              # This file
```

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) or npm
- [Foundry](https://book.getfoundry.sh/getting-started/installation)
- Sepolia testnet ETH

### 1. Smart Contracts
```bash
cd contracts
forge install
forge build
forge test

# Deploy (after setting up .env)
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast
```

### 2. Frontend
```bash
cd frontend
pnpm install
pnpm dev
```

## 📋 Features

### Smart Contract Features
- **ERC721 NFT Tickets**: Each ticket is a unique NFT
- **Role-based Access Control**: Admin and Organizer roles
- **Event Management**: Create, pause, cancel, complete events
- **Revenue Management**: Automatic revenue tracking and withdrawal
- **Refund System**: Automatic refunds for cancelled events

### Frontend Features
- **Admin Panel**: Role management and platform oversight
- **Organizer Dashboard**: Event creation and management
- **Wallet Integration**: MetaMask and WalletConnect support
- **Real-time Updates**: Live contract state synchronization
- **Responsive Design**: Mobile-friendly interface

## 🎯 Deployed Contract

### Sepolia Testnet
- **Contract Address**: `0x84FF135Be2a9cE9741F679fB527851d40646393E`
- **Etherscan**: [View Contract](https://sepolia.etherscan.io/address/0x84FF135Be2a9cE9741F679fB527851d40646393E)

## 📚 Documentation

- [Smart Contracts Documentation](./contracts/README.md)
- [Frontend Documentation](./frontend/README.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
