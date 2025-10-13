import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, hardhat } from 'wagmi/chains'
import { metaMask, walletConnect, injected } from 'wagmi/connectors'

// WalletConnect project ID - should be set in environment variables
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id'

// App metadata from environment variables
const appName = import.meta.env.VITE_APP_NAME || 'Ingressos NFT Ticketing'
const appDescription = import.meta.env.VITE_APP_DESCRIPTION || 'Web3 NFT Ticketing Platform'
const appUrl = import.meta.env.VITE_APP_URL || 'http://localhost:5173'
const appIcon = import.meta.env.VITE_APP_ICON || 'http://localhost:5173/vite.svg'
const spoliaRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL || 'https://sepolia.drpc.org'

export const config = createConfig({
  chains: [mainnet, sepolia, hardhat],
  connectors: [
    metaMask(),
    walletConnect({
      projectId,
      metadata: {
        name: appName,
        description: appDescription,
        url: appUrl,
        icons: [appIcon]
      }
    }),
    injected()
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(spoliaRpcUrl),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
