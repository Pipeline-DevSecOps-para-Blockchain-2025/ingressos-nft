import { renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWallet } from '../useWallet'

// Mock the wagmi hooks
const mockConnect = vi.fn()
const mockDisconnect = vi.fn()
const mockSwitchChain = vi.fn()

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true,
    isConnecting: false,
    isReconnecting: false,
  })),
  useConnect: vi.fn(() => ({
    connect: mockConnect,
    connectors: [
      { id: 'metaMask', name: 'MetaMask', icon: 'metamask.svg' },
      { id: 'walletConnect', name: 'WalletConnect', icon: 'walletconnect.svg' },
    ],
    isPending: false,
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: mockDisconnect,
  })),
  useChainId: vi.fn(() => 11155111), // Sepolia
  useSwitchChain: vi.fn(() => ({
    switchChain: mockSwitchChain,
  })),
}))

// Mock the user store
vi.mock('../../stores/userStore', () => ({
  default: vi.fn(() => ({
    setUser: vi.fn(),
    clearUser: vi.fn(),
  })),
}))

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return wallet connection state', () => {
    const { result } = renderHook(() => useWallet())

    expect(result.current.address).toBe('0x1234567890123456789012345678901234567890')
    expect(result.current.isConnected).toBe(true)
    expect(result.current.isConnecting).toBe(false)
    expect(result.current.chainId).toBe(11155111)
    expect(result.current.isCorrectNetwork).toBe(true)
  })

  it('should format address correctly', () => {
    const { result } = renderHook(() => useWallet())

    const formatted = result.current.formatAddress()
    expect(formatted).toBe('0x1234...7890')
  })

  it('should provide available connectors', () => {
    const { result } = renderHook(() => useWallet())

    expect(result.current.connectors).toHaveLength(2)
    expect(result.current.connectors[0]).toEqual({
      id: 'metaMask',
      name: 'MetaMask',
      icon: 'metamask.svg',
    })
  })

  it('should call connect with correct connector', () => {
    const { result } = renderHook(() => useWallet())

    result.current.connect('metaMask')
    expect(mockConnect).toHaveBeenCalledWith({
      connector: { id: 'metaMask', name: 'MetaMask', icon: 'metamask.svg' },
    })
  })

  it('should call disconnect', () => {
    const { result } = renderHook(() => useWallet())

    result.current.disconnect()
    expect(mockDisconnect).toHaveBeenCalled()
  })

  it('should switch network for supported chains', () => {
    const { result } = renderHook(() => useWallet())

    result.current.switchNetwork(1) // Mainnet
    expect(mockSwitchChain).toHaveBeenCalledWith({ chainId: 1 })
  })

  it('should not switch network for unsupported chains', () => {
    const { result } = renderHook(() => useWallet())

    result.current.switchNetwork(999) // Unsupported chain
    expect(mockSwitchChain).not.toHaveBeenCalled()
  })
})
