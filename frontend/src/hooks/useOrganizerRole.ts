import { useReadContract } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'
import { CONTRACT_ROLES } from '../contracts'

export interface UseOrganizerRoleReturn {
  isOrganizer: boolean
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export const useOrganizerRole = (): UseOrganizerRoleReturn => {
  const { address, isConnected } = useWallet()
  const { contractAddress, isContractReady } = useIngressosContract()

  const {
    data: hasRole,
    isLoading,
    error,
    refetch
  } = useReadContract({
    ...contractAddress ? {
      address: contractAddress,
      abi: [
        {
          name: 'hasRole',
          type: 'function',
          stateMutability: 'view',
          inputs: [
            { name: 'role', type: 'bytes32' },
            { name: 'account', type: 'address' }
          ],
          outputs: [{ name: '', type: 'bool' }],
        }
      ],
      functionName: 'hasRole',
      args: [CONTRACT_ROLES.ORGANIZER_ROLE, address],
    } : {},
    query: {
      enabled: isContractReady && isConnected && !!address,
    },
  })

  return {
    isOrganizer: Boolean(hasRole),
    isLoading,
    error: error as Error | null,
    refetch,
  }
}
