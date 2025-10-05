import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import WalletConnection from '../WalletConnection'

// Mock the useWallet hook
vi.mock('../../hooks/useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: undefined,
    isConnected: false,
    isConnecting: false,
    chainId: 1,
    isCorrectNetwork: true,
    connect: vi.fn(),
    disconnect: vi.fn(),
    switchNetwork: vi.fn(),
    formatAddress: vi.fn(() => '0x1234...7890'),
    connectors: [
      { id: 'metaMask', name: 'MetaMask' },
      { id: 'walletConnect', name: 'WalletConnect' },
    ],
  })),
}))

describe('WalletConnection', () => {
  it('should render connect button when not connected', () => {
    render(<WalletConnection />)
    
    expect(screen.getByText('Connect Wallet')).toBeInTheDocument()
  })

  it('should render component without crashing', () => {
    const { container } = render(<WalletConnection />)
    expect(container).toBeInTheDocument()
  })
})