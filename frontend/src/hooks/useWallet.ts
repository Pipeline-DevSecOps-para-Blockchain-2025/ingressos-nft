import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from 'wagmi'
import { useCallback, useEffect } from 'react'
import useUserStore from '../stores/userStore'
import { formatAddress } from '../utils'

export interface UseWalletReturn {
  // Connection state
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  
  // Chain information
  chainId: number
  isCorrectNetwork: boolean
  
  // Connection methods
  connect: (connectorId?: string) => void
  disconnect: () => void
  switchNetwork: (chainId: number) => void
  
  // Utility methods
  formatAddress: (address?: string) => string
  
  // Available connectors
  connectors: Array<{
    id: string
    name: string
    icon?: string
  }>
}

// Supported chain IDs for the application
const SUPPORTED_CHAIN_IDS = [1, 11155111, 31337] // mainnet, sepolia, hardhat

export const useWallet = (): UseWalletReturn => {
  const { address, isConnected, isConnecting, isReconnecting } = useAccount()
  const { connect: wagmiConnect, connectors, isPending: isConnectPending } = useConnect()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  
  const { setUser, clearUser } = useUserStore()
  
  // Check if current network is supported
  const isCorrectNetwork = SUPPORTED_CHAIN_IDS.includes(chainId)
  
  // Update user store when wallet state changes
  useEffect(() => {
    if (isConnected && address) {
      setUser({
        address,
        isConnected: true,
        // TODO: Check if user is organizer/admin from contract
        isOrganizer: false,
        isAdmin: false,
      })
    } else {
      clearUser()
    }
  }, [isConnected, address, setUser, clearUser])
  
  // Connect to wallet
  const connect = useCallback((connectorId?: string) => {
    const connector = connectorId 
      ? connectors.find(c => c.id === connectorId)
      : connectors[0] // Default to first available connector
    
    if (connector) {
      wagmiConnect({ connector })
    }
  }, [connectors, wagmiConnect])
  
  // Disconnect wallet
  const disconnect = useCallback(() => {
    wagmiDisconnect()
    clearUser()
  }, [wagmiDisconnect, clearUser])
  
  // Switch network
  const switchNetwork = useCallback((targetChainId: number) => {
    if (SUPPORTED_CHAIN_IDS.includes(targetChainId)) {
      switchChain({ chainId: targetChainId as 1 | 11155111 | 31337 })
    }
  }, [switchChain])
  
  // Format address for display
  const formatAddressDisplay = useCallback((addr?: string) => {
    return formatAddress(addr || address || '')
  }, [address])
  
  // Map connectors to a simpler format
  const mappedConnectors = connectors.map(connector => ({
    id: connector.id,
    name: connector.name,
    icon: connector.icon,
  }))
  
  return {
    // Connection state
    address,
    isConnected,
    isConnecting: isConnecting || isConnectPending,
    isReconnecting,
    
    // Chain information
    chainId,
    isCorrectNetwork,
    
    // Connection methods
    connect,
    disconnect,
    switchNetwork,
    
    // Utility methods
    formatAddress: formatAddressDisplay,
    
    // Available connectors
    connectors: mappedConnectors,
  }
}