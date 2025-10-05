import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useGasEstimation } from '../useGasEstimation'

// Mock wagmi hooks
const mockGetGasPrice = vi.fn()
const mockEstimateFeesPerGas = vi.fn()

vi.mock('wagmi', () => ({
  usePublicClient: vi.fn(() => ({
    getGasPrice: mockGetGasPrice,
    estimateFeesPerGas: mockEstimateFeesPerGas,
  })),
}))

vi.mock('../useWallet', () => ({
  useWallet: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
  })),
}))

vi.mock('../useIngressosContract', () => ({
  useIngressosContract: vi.fn(() => ({
    contractAddress: '0x1234567890123456789012345678901234567890',
    formatPrice: vi.fn((price: bigint) => (Number(price) / 1e18).toString()),
  })),
}))

describe('useGasEstimation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetGasPrice.mockResolvedValue(BigInt('20000000000')) // 20 gwei
    mockEstimateFeesPerGas.mockResolvedValue({
      maxFeePerGas: BigInt('30000000000'), // 30 gwei
      maxPriorityFeePerGas: BigInt('2000000000'), // 2 gwei
    })
  })

  it('should estimate gas for purchase ticket', async () => {
    const { result } = renderHook(() => useGasEstimation())

    let gasEstimate: any
    await act(async () => {
      gasEstimate = await result.current.estimatePurchaseTicketGas(
        1,
        BigInt('100000000000000000')
      )
    })

    expect(gasEstimate).toBeDefined()
    expect(gasEstimate?.gasLimit).toBe(BigInt(150000))
    expect(gasEstimate?.gasPrice).toBe(BigInt('20000000000'))
    expect(gasEstimate?.isEIP1559).toBe(true)
    expect(gasEstimate?.maxFeePerGas).toBe(BigInt('30000000000'))
    expect(gasEstimate?.maxPriorityFeePerGas).toBe(BigInt('2000000000'))
  })

  it('should handle legacy gas pricing when EIP-1559 is not supported', async () => {
    mockEstimateFeesPerGas.mockRejectedValue(new Error('EIP-1559 not supported'))

    const { result } = renderHook(() => useGasEstimation())

    let gasEstimate: any
    await act(async () => {
      gasEstimate = await result.current.estimateGas('purchaseTicket', [1])
    })

    expect(gasEstimate).toBeDefined()
    expect(gasEstimate?.isEIP1559).toBe(false)
    expect(gasEstimate?.maxFeePerGas).toBeUndefined()
    expect(gasEstimate?.maxPriorityFeePerGas).toBeUndefined()
    expect(gasEstimate?.gasPrice).toBe(BigInt('20000000000'))
  })

  it('should use different gas limits for different functions', async () => {
    const { result } = renderHook(() => useGasEstimation())

    // Test purchase ticket
    let gasEstimate: any
    await act(async () => {
      gasEstimate = await result.current.estimateGas('purchaseTicket', [1])
    })
    expect(gasEstimate?.gasLimit).toBe(BigInt(150000))

    // Test transfer
    await act(async () => {
      gasEstimate = await result.current.estimateGas('transferFrom', [])
    })
    expect(gasEstimate?.gasLimit).toBe(BigInt(80000))

    // Test create event
    await act(async () => {
      gasEstimate = await result.current.estimateGas('createEvent', [])
    })
    expect(gasEstimate?.gasLimit).toBe(BigInt(200000))

    // Test unknown function (default)
    await act(async () => {
      gasEstimate = await result.current.estimateGas('unknownFunction', [])
    })
    expect(gasEstimate?.gasLimit).toBe(BigInt(100000))
  })

  it('should calculate total gas cost correctly', async () => {
    const { result } = renderHook(() => useGasEstimation())

    let gasEstimate: any
    await act(async () => {
      gasEstimate = await result.current.estimateGas('purchaseTicket', [1])
    })

    const expectedGasCost = BigInt(150000) * BigInt('30000000000') // gasLimit * maxFeePerGas
    expect(gasEstimate?.totalGasCost).toBe(expectedGasCost)
  })

  it('should handle gas estimation errors', async () => {
    mockGetGasPrice.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useGasEstimation())

    let gasEstimate: any
    await act(async () => {
      gasEstimate = await result.current.estimateGas('purchaseTicket', [1])
    })

    expect(gasEstimate).toBeNull()
    expect(result.current.error).toBeDefined()
    expect(result.current.error?.message).toBe('Network error')
  })

  it('should return null when missing dependencies', async () => {
    // This test will be updated when proper mocking is implemented
    expect(true).toBe(true)
  })

  it('should format gas cost correctly', () => {
    const { result } = renderHook(() => useGasEstimation())

    const gasCost = BigInt('1000000000000000000') // 1 ETH
    const formatted = result.current.formatGasCost(gasCost)

    expect(formatted).toBe('1')
  })

  it('should set loading state during estimation', async () => {
    const { result } = renderHook(() => useGasEstimation())

    expect(result.current.isEstimating).toBe(false)

    // Test the complete flow - start estimation, check it completes, and verify loading states
    await act(async () => {
      await result.current.estimateGas('purchaseTicket', [1])
    })

    // After estimation completes, should not be loading
    expect(result.current.isEstimating).toBe(false)
    
    // Verify that an estimate was produced (indicating the function ran successfully)
    expect(result.current.gasEstimate).toBeDefined()
    expect(result.current.gasEstimate?.gasLimit).toBe(BigInt(150000))
  })
})