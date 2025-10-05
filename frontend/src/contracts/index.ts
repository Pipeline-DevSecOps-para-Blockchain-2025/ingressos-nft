import { INGRESSOS_ABI } from './IngressosABI'

// Contract configuration
export const INGRESSOS_CONTRACT_ADDRESS = {
  // Mainnet - to be updated when deployed
  1: '0x0000000000000000000000000000000000000000',
  // Sepolia testnet - to be updated when deployed  
  11155111: '0x84FF135Be2a9cE9741F679fB527851d40646393E',
  // Hardhat local
  31337: '0x0000000000000000000000000000000000000000',
} as const

// Export the ABI
export { INGRESSOS_ABI }

// Supported chains configuration
export const SUPPORTED_CHAINS = {
  MAINNET: 1,
  SEPOLIA: 11155111,
  HARDHAT: 31337,
} as const

// Contract roles (from the smart contract)
export const CONTRACT_ROLES = {
  ADMIN_ROLE: '0x0000000000000000000000000000000000000000000000000000000000000000',
  ORGANIZER_ROLE: '0x4d2e7a1e3f5dd6e203f087b15756ccf0e4ccd947fe1b639a38540089a1e47f63', // keccak256("ORGANIZER_ROLE")
} as const

// Event status enum (matching the smart contract)
export const EVENT_STATUS = {
  ACTIVE: 0,
  PAUSED: 1,
  CANCELLED: 2,
  COMPLETED: 3,
} as const

export type EventStatus = typeof EVENT_STATUS[keyof typeof EVENT_STATUS]
export type SupportedChainId = keyof typeof INGRESSOS_CONTRACT_ADDRESS