import { useState, useCallback } from 'react'
import { usePublicClient } from 'wagmi'
import { useWallet } from './useWallet'
import { useIngressosContract } from './useIngressosContract'

export interface GasEstimate {
  gasLimit: bigint
  gasPrice: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  totalGasCost: bigint
  isEIP1559: boolean
}

export interface UseGasEstimationReturn {
  gasEstimate: GasEstimate | null
  isEstimating: boolean
  error: Error | null
  estimateGas: (
    functionName: string,
    args: any[],
    value?: bigint
  ) => Promise<GasEstimate | null>
  estimatePurchaseTicketGas: (eventId: number, ticketPrice: bigint) => Promise<GasEstimate | null>
  formatGasCost: (gasCost: bigint) => string
}

export const useGasEstimation = (): UseGasEstimationReturn => {
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null)
  const [isEstimating, setIsEstimating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const publicClient = usePublicClient()
  const { address } = useWallet()
  const { contractAddress, formatPrice } = useIngressosContract()

  const estimateGas = useCallback(async (
    functionName: string,
    _args: any[],
    _value?: bigint
  ): Promise<GasEstimate | null> => {
    if (!publicClient || !address || !contractAddress) {
      setError(new Error('Missing required dependencies for gas estimation'))
      return null
    }

    setIsEstimating(true)
    setError(null)

    try {
      // Get current gas price
      const gasPrice = await publicClient.getGasPrice()
      
      // Check if the network supports EIP-1559
      let maxFeePerGas: bigint | undefined
      let maxPriorityFeePerGas: bigint | undefined
      let isEIP1559 = false

      try {
        const feeData = await publicClient.estimateFeesPerGas()
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          maxFeePerGas = feeData.maxFeePerGas
          maxPriorityFeePerGas = feeData.maxPriorityFeePerGas
          isEIP1559 = true
        }
      } catch {
        // Network doesn't support EIP-1559, use legacy gas pricing
        isEIP1559 = false
      }

      // For now, we'll use mock gas limits based on function type
      // In a real implementation, you would estimate gas using the contract
      let gasLimit: bigint

      switch (functionName) {
        case 'purchaseTicket':
          gasLimit = BigInt(150000) // Typical for NFT minting
          break
        case 'transferFrom':
          gasLimit = BigInt(80000) // Typical for NFT transfer
          break
        case 'createEvent':
          gasLimit = BigInt(200000) // Typical for contract state changes
          break
        default:
          gasLimit = BigInt(100000) // Default estimate
      }

      // Calculate total gas cost
      const effectiveGasPrice = isEIP1559 && maxFeePerGas ? maxFeePerGas : gasPrice
      const totalGasCost = gasLimit * effectiveGasPrice

      const estimate: GasEstimate = {
        gasLimit,
        gasPrice,
        maxFeePerGas,
        maxPriorityFeePerGas,
        totalGasCost,
        isEIP1559
      }

      setGasEstimate(estimate)
      return estimate

    } catch (err) {
      const error = err as Error
      setError(error)
      console.error('Gas estimation failed:', error)
      return null
    } finally {
      setIsEstimating(false)
    }
  }, [publicClient, address, contractAddress])

  const estimatePurchaseTicketGas = useCallback(async (
    eventId: number,
    ticketPrice: bigint
  ): Promise<GasEstimate | null> => {
    return estimateGas('purchaseTicket', [eventId], ticketPrice)
  }, [estimateGas])

  const formatGasCost = useCallback((gasCost: bigint): string => {
    return formatPrice(gasCost)
  }, [formatPrice])

  return {
    gasEstimate,
    isEstimating,
    error,
    estimateGas,
    estimatePurchaseTicketGas,
    formatGasCost,
  }
}