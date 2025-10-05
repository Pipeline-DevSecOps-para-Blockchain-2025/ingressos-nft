import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock wagmi hooks for testing
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
  })),
  useConnect: vi.fn(() => ({
    connect: vi.fn(),
    connectors: [],
    isPending: false,
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
  })),
  useChainId: vi.fn(() => 1),
  useSwitchChain: vi.fn(() => ({
    switchChain: vi.fn(),
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    data: null,
    isLoading: false,
    isSuccess: false,
    isError: false,
  })),
  usePublicClient: vi.fn(() => ({
    getGasPrice: vi.fn(),
    estimateFeesPerGas: vi.fn(),
  })),
}))

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_WALLETCONNECT_PROJECT_ID: 'test-project-id',
  },
  writable: true,
})
