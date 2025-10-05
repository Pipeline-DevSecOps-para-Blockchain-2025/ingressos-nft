# Web3 Ticketing Interface

A React-based frontend application for interacting with the Ingressos NFT ticketing smart contract.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **ethers.js** for blockchain interactions
- **wagmi + viem** for wallet connection management
- **React Query** for server state management
- **Zustand** for global state management

## Project Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Main application pages
├── hooks/              # Custom React hooks for Web3 interactions
├── stores/             # Zustand stores for state management
├── utils/              # Utility functions and helpers
├── types/              # TypeScript type definitions
├── contracts/          # Contract ABIs and addresses
└── assets/             # Static assets and images
```

## Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start development server:
   ```bash
   pnpm run dev
   ```

3. Build for production:
   ```bash
   pnpm run build
   ```

## Dependencies Installed

### Core Web3 Libraries
- `ethers@^6.15.0` - Ethereum library for blockchain interactions
- `wagmi@^2.17.1` - React hooks for Ethereum
- `viem@^2.37.6` - TypeScript interface for Ethereum
- `@wagmi/core@^2.21.0` - Core wagmi functionality
- `@wagmi/connectors@^5.10.1` - Wallet connectors

### State Management & Data Fetching
- `@tanstack/react-query@^5.89.0` - Data fetching and caching
- `zustand@^5.0.8` - Lightweight state management

### Styling
- `tailwindcss@^4.1.13` - Utility-first CSS framework
- `@tailwindcss/postcss@^4.1.13` - PostCSS plugin for Tailwind CSS v4
- `autoprefixer@^10.4.21` - CSS vendor prefixing

## Wallet Connection Infrastructure ✅

The wallet connection infrastructure has been implemented with the following features:

### Components
- **WalletConnection**: Main component for connecting/disconnecting wallets
- **NetworkSwitcher**: Component for switching between supported networks
- **useWallet**: Custom hook for wallet state management

### Features Implemented
- ✅ MetaMask and WalletConnect support
- ✅ Network detection and switching (Mainnet, Sepolia, Hardhat)
- ✅ Wallet state management with Zustand
- ✅ Connection/disconnection flows
- ✅ Address formatting utilities
- ✅ Comprehensive error handling
- ✅ TypeScript support with proper types
- ✅ Unit tests for core functionality

### Supported Networks
- Ethereum Mainnet (Chain ID: 1)
- Sepolia Testnet (Chain ID: 11155111)
- Hardhat Local (Chain ID: 31337)

### Environment Setup
Copy `.env.example` to `.env` and configure:
```bash
VITE_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

## Smart Contract Integration ✅

The smart contract integration has been implemented with comprehensive functionality:

### Contract Configuration
- **Contract ABI**: Complete ABI extracted from the Ingressos smart contract
- **Multi-chain Support**: Configured for Mainnet, Sepolia, and Hardhat networks
- **Type Safety**: Full TypeScript support with proper types and interfaces

### Hooks Implemented
- **useContract**: Base contract interaction hook
- **useIngressosContract**: Specialized hook for Ingressos contract methods
- **useTransactionStatus**: Transaction status tracking and monitoring
- **useTransactionHandler**: Comprehensive transaction execution with error handling

### Contract Methods Available
- ✅ **Event Management**: Create, read, update event status
- ✅ **Ticket Operations**: Purchase tickets, get ticket info, transfer tickets
- ✅ **Role Management**: Grant/revoke organizer roles, check permissions
- ✅ **Revenue Management**: Withdraw revenue, check withdrawable amounts
- ✅ **NFT Operations**: Standard ERC721 functions (transfer, approve, etc.)

### Error Handling
- ✅ **Contract Error Parsing**: User-friendly error messages
- ✅ **Transaction Failures**: Comprehensive error categorization
- ✅ **Network Issues**: Automatic error detection and handling
- ✅ **User Rejections**: Graceful handling of cancelled transactions

### Testing
- ✅ **Unit Tests**: Complete test coverage for contract interactions
- ✅ **Error Handling Tests**: Comprehensive error scenario testing
- ✅ **Mock Integration**: Proper mocking for isolated testing

### Components
- **ContractStatus**: Real-time contract status and user role display

## Event Browsing and Discovery Interface ✅

The event browsing and discovery interface has been implemented with comprehensive functionality:

### Components Implemented
- **EventCard**: Beautiful event display cards with status indicators and actions
- **EventList**: Grid layout with filtering, search, and pagination
- **EventDetail**: Full event information modal with purchase integration
- **Modal**: Reusable modal wrapper with keyboard and click-outside handling

### Features Available
- ✅ **Event Display**: Rich event cards with images, status, and availability
- ✅ **Search & Filtering**: Real-time search by name, description, venue
- ✅ **Advanced Filters**: Filter by status, price range, date range, organizer
- ✅ **Event Details**: Comprehensive event information modal
- ✅ **Responsive Design**: Mobile-friendly grid layout and interactions
- ✅ **Loading States**: Skeleton loading and pagination support

### Event Information Displayed
- Event name, description, and venue
- Date and time with timezone handling
- Ticket price in ETH with formatting
- Availability and sold percentage
- Event status (Active, Paused, Cancelled, Completed)
- Organizer address with copy functionality
- Event ID and creation date

### Filtering Capabilities
- **Text Search**: Search across event names, descriptions, and venues
- **Status Filter**: Filter by event status (Active, Paused, etc.)
- **Price Range**: Filter events by ticket price range
- **Date Range**: Filter by event date (future implementation)
- **Organizer**: Filter by specific organizer address

### User Experience
- ✅ **Interactive Cards**: Hover effects and click handling
- ✅ **Modal Integration**: Detailed event view in overlay
- ✅ **Purchase Integration**: Ready for ticket purchasing flow
- ✅ **Error Handling**: Graceful error states and empty states
- ✅ **Accessibility**: Keyboard navigation and screen reader support

### Data Management
- **useEvents Hook**: Comprehensive event data fetching and caching
- **React Query Integration**: Efficient data caching and synchronization
- **Infinite Pagination**: Load more events as needed
- **Real-time Filtering**: Client-side filtering with performance optimization

### Testing
- ✅ **Hook Tests**: Complete test coverage for useEvents functionality
- ✅ **Component Tests**: EventCard component testing with various states
- ✅ **Filter Tests**: Search and filtering functionality testing
- ✅ **Mock Integration**: Proper mocking for isolated testing

### Navigation
- **Events Page**: Dedicated page for event browsing
- **Navigation Integration**: Seamless navigation between home and events
- **Modal Routing**: Event details accessible via modal overlay

## Next Steps

The event browsing and discovery interface is complete. The next tasks will involve:

1. ✅ ~~Setting up wallet connection infrastructure~~
2. ✅ ~~Creating smart contract integration~~
3. ✅ ~~Building event browsing and discovery interface~~
4. Implementing ticket purchasing flows

## Development Notes

- The project uses TypeScript with strict type checking
- Tailwind CSS is configured for responsive design
- All Web3 dependencies are installed and ready for integration
- Project structure follows the design specifications from the requirements
