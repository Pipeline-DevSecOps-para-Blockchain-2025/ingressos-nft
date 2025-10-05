import React, { useState } from 'react'
import { useWallet } from '../hooks/useWallet'

interface WalletConnectionProps {
  className?: string
  showNetworkInfo?: boolean
}

const WalletConnection: React.FC<WalletConnectionProps> = ({
  className = '',
  showNetworkInfo = true
}) => {
  const [showConnectors, setShowConnectors] = useState(false)
  const {
    address,
    isConnected,
    isConnecting,
    chainId,
    isCorrectNetwork,
    connect,
    disconnect,
    switchNetwork,
    formatAddress,
    connectors
  } = useWallet()

  // Network names mapping
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 1: return 'Ethereum Mainnet'
      case 11155111: return 'Sepolia Testnet'
      case 31337: return 'Hardhat Local'
      default: return `Chain ${chainId}`
    }
  }

  // Handle connector selection
  const handleConnect = (connectorId: string) => {
    connect(connectorId)
    setShowConnectors(false)
  }

  // Handle network switch to Sepolia (default for development)
  const handleSwitchNetwork = () => {
    switchNetwork(11155111) // Sepolia testnet
  }

  if (isConnected && address) {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="font-medium">{formatAddress()}</span>
          </div>

          <button
            onClick={disconnect}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Disconnect
          </button>
        </div>

        {showNetworkInfo && (
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm ${
              isCorrectNetwork
                ? 'bg-blue-50 text-blue-700'
                : 'bg-red-50 text-red-700'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isCorrectNetwork ? 'bg-blue-500' : 'bg-red-500'
              }`}></div>
              <span>{getNetworkName(chainId)}</span>
            </div>

            {!isCorrectNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Switch to Sepolia
              </button>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {!showConnectors ? (
        <button
          onClick={() => setShowConnectors(true)}
          disabled={isConnecting}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </button>
      ) : (
        <div className="absolute top-0 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64 z-10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Connect Wallet</h3>
            <button
              onClick={() => setShowConnectors(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => handleConnect(connector.id)}
                disabled={isConnecting}
                className="w-full flex items-center gap-3 p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {connector.icon && (
                  <img
                    src={connector.icon}
                    alt={connector.name}
                    className="w-6 h-6"
                  />
                )}
                <span className="font-medium">{connector.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              By connecting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default WalletConnection
