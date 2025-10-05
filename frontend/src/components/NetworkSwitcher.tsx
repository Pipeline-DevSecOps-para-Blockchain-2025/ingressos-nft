import React from 'react'
import { useWallet } from '../hooks/useWallet'

interface NetworkSwitcherProps {
  className?: string
}

const NetworkSwitcher: React.FC<NetworkSwitcherProps> = ({ className = '' }) => {
  const { chainId, isCorrectNetwork, switchNetwork } = useWallet()

  const networks = [
    { id: 1, name: 'Ethereum Mainnet', color: 'bg-blue-500' },
    { id: 11155111, name: 'Sepolia Testnet', color: 'bg-purple-500' },
    { id: 31337, name: 'Hardhat Local', color: 'bg-gray-500' },
  ]

  const currentNetwork = networks.find(n => n.id === chainId)

  if (isCorrectNetwork) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className={`w-3 h-3 rounded-full ${currentNetwork?.color || 'bg-gray-400'}`}></div>
        <span className="text-sm text-gray-600">{currentNetwork?.name || `Chain ${chainId}`}</span>
      </div>
    )
  }

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        <span className="text-sm font-medium text-red-800">Unsupported Network</span>
      </div>

      <p className="text-sm text-red-700 mb-3">
        Please switch to a supported network to use this application.
      </p>

      <div className="space-y-2">
        {networks.map((network) => (
          <button
            key={network.id}
            onClick={() => switchNetwork(network.id)}
            className="w-full flex items-center gap-3 p-2 text-left border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className={`w-3 h-3 rounded-full ${network.color}`}></div>
            <span className="text-sm text-red-800">{network.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default NetworkSwitcher
