// Contract error handling utilities

export interface ContractError {
  name: string
  message: string
  userMessage: string
  code?: string
}

// Known contract errors from the Ingressos contract
export const CONTRACT_ERRORS = {
  EventNotFound: 'EventNotFound',
  EventSoldOut: 'EventSoldOut',
  EventNotActive: 'EventNotActive',
  InsufficientPayment: 'InsufficientPayment',
  UnauthorizedOrganizer: 'UnauthorizedOrganizer',
  NoFundsToWithdraw: 'NoFundsToWithdraw',
  RefundFailed: 'RefundFailed',
} as const

// User-friendly error messages
const ERROR_MESSAGES: Record<string, string> = {
  [CONTRACT_ERRORS.EventNotFound]: 'Event not found. Please check the event ID.',
  [CONTRACT_ERRORS.EventSoldOut]: 'This event is sold out. No more tickets available.',
  [CONTRACT_ERRORS.EventNotActive]: 'This event is not currently active for ticket sales.',
  [CONTRACT_ERRORS.InsufficientPayment]: 'Insufficient payment. Please check the ticket price.',
  [CONTRACT_ERRORS.UnauthorizedOrganizer]: 'You are not authorized to perform this action. Organizer role required.',
  [CONTRACT_ERRORS.NoFundsToWithdraw]: 'No funds available to withdraw for this event.',
  [CONTRACT_ERRORS.RefundFailed]: 'Refund transaction failed. Please try again.',

  // Common wallet/network errors
  'User rejected the request': 'Transaction was cancelled by user.',
  'insufficient funds': 'Insufficient funds in your wallet.',
  'gas required exceeds allowance': 'Transaction requires more gas than available.',
  'nonce too low': 'Transaction nonce is too low. Please try again.',
  'replacement transaction underpriced': 'Replacement transaction fee is too low.',
  'network changed': 'Network was changed during transaction.',
  'unsupported chain': 'This chain is not supported.',
}

// Parse contract error from various error formats
export const parseContractError = (error: any): ContractError => {
  let errorName = 'Unknown'
  let errorMessage = 'An unknown error occurred'
  let userMessage = 'Something went wrong. Please try again.'

  try {
    // Handle different error formats
    if (error?.cause?.reason) {
      errorMessage = error.cause.reason
    } else if (error?.reason) {
      errorMessage = error.reason
    } else if (error?.message) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    // Extract error name from revert reason
    if (errorMessage.includes('revert')) {
      const revertMatch = errorMessage.match(/revert (.+?)(?:\(|$)/)
      if (revertMatch) {
        errorName = revertMatch[1].trim()
      }
    }

    // Check for known contract errors
    for (const [, value] of Object.entries(CONTRACT_ERRORS)) {
      if (errorMessage.includes(value) || errorName.includes(value)) {
        errorName = value
        break
      }
    }

    // Get user-friendly message
    userMessage = ERROR_MESSAGES[errorName] || ERROR_MESSAGES[errorMessage] || userMessage

    // Handle specific error patterns
    if (errorMessage.toLowerCase().includes('user rejected')) {
      userMessage = ERROR_MESSAGES['User rejected the request']
    } else if (errorMessage.toLowerCase().includes('insufficient funds')) {
      userMessage = ERROR_MESSAGES['insufficient funds']
    } else if (errorMessage.toLowerCase().includes('gas')) {
      userMessage = ERROR_MESSAGES['gas required exceeds allowance']
    }

  } catch (parseError) {
    console.error('Error parsing contract error:', parseError)
  }

  return {
    name: errorName,
    message: errorMessage,
    userMessage,
    code: error?.code,
  }
}

// Check if error is a user rejection
export const isUserRejectedError = (error: any): boolean => {
  const errorMessage = error?.message || error?.reason || ''
  return errorMessage.toLowerCase().includes('user rejected') ||
         errorMessage.toLowerCase().includes('user denied') ||
         error?.code === 4001
}

// Check if error is a network/connection error
export const isNetworkError = (error: any): boolean => {
  const errorMessage = error?.message || error?.reason || ''
  return errorMessage.toLowerCase().includes('network') ||
         errorMessage.toLowerCase().includes('connection') ||
         errorMessage.toLowerCase().includes('timeout') ||
         error?.code === -32603
}

// Check if error is insufficient funds
export const isInsufficientFundsError = (error: any): boolean => {
  const errorMessage = error?.message || error?.reason || ''
  return errorMessage.toLowerCase().includes('insufficient funds') ||
         errorMessage.toLowerCase().includes('insufficient balance')
}

// Format error for display
export const formatErrorForDisplay = (error: any): string => {
  const parsedError = parseContractError(error)
  return parsedError.userMessage
}

// Get error severity level
export const getErrorSeverity = (error: any): 'low' | 'medium' | 'high' => {
  if (isUserRejectedError(error)) {
    return 'low' // User intentionally cancelled
  }

  if (isNetworkError(error)) {
    return 'medium' // Network issues, might be temporary
  }

  if (isInsufficientFundsError(error)) {
    return 'medium' // User needs to add funds
  }

  return 'high' // Contract errors, unexpected issues
}
