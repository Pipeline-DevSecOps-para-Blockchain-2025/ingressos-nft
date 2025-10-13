import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { useChainId } from 'wagmi'
import { INGRESSOS_ABI, INGRESSOS_CONTRACT_ADDRESS } from '../contracts'
import { useCallback, useMemo } from 'react'
import type { Address } from 'viem'

export interface UseContractReturn {
  // Contract address for current chain
  contractAddress: Address | null

  // Read functions
  readContract: typeof useReadContract

  // Write functions
  writeContract: any
  writeContractAsync: any

  // Transaction status
  isWritePending: boolean
  writeError: Error | null

  // Wait for transaction
  waitForTransaction: (hash: `0x${string}`) => ReturnType<typeof useWaitForTransactionReceipt>

  // Helper functions
  getContractConfig: (functionName: string) => {
    address: Address
    abi: typeof INGRESSOS_ABI
    functionName: string
  }
}

export const useContract = (): UseContractReturn => {
  const chainId = useChainId()
  const { writeContract, writeContractAsync, isPending: isWritePending, error: writeError } = useWriteContract()

  // Get contract address for current chain
  const contractAddress = useMemo((): Address | null => {
    const address = INGRESSOS_CONTRACT_ADDRESS[chainId]
    return address && address !== '0x0000000000000000000000000000000000000000'
      ? address
      : null
  }, [chainId])

  // Helper to get contract configuration
  const getContractConfig = useCallback((functionName: string) => {
    if (!contractAddress) {
      throw new Error(`Contract not deployed on chain ${chainId}`)
    }

    return {
      address: contractAddress,
      abi: INGRESSOS_ABI,
      functionName,
    }
  }, [contractAddress, chainId])

  // Wait for transaction helper
  const waitForTransaction = useCallback((hash: Address) => {
    return useWaitForTransactionReceipt({ hash })
  }, [])

  return {
    contractAddress,
    readContract: useReadContract,
    writeContract,
    writeContractAsync,
    isWritePending,
    writeError,
    waitForTransaction,
    getContractConfig,
  }
}
