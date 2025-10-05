import { describe, it, expect } from 'vitest'
import {
  parseContractError,
  isUserRejectedError,
  isNetworkError,
  isInsufficientFundsError,
  formatErrorForDisplay,
  getErrorSeverity,
} from '../contractErrors'

describe('contractErrors', () => {
  describe('parseContractError', () => {
    it('should parse EventNotFound error', () => {
      const error = { message: 'revert EventNotFound(1)' }
      const parsed = parseContractError(error)

      expect(parsed.name).toBe('EventNotFound')
      expect(parsed.userMessage).toBe('Event not found. Please check the event ID.')
    })

    it('should parse EventSoldOut error', () => {
      const error = { reason: 'EventSoldOut' }
      const parsed = parseContractError(error)

      expect(parsed.name).toBe('EventSoldOut')
      expect(parsed.userMessage).toBe('This event is sold out. No more tickets available.')
    })

    it('should handle user rejection error', () => {
      const error = { message: 'User rejected the request' }
      const parsed = parseContractError(error)

      expect(parsed.userMessage).toBe('Transaction was cancelled by user.')
    })

    it('should handle insufficient funds error', () => {
      const error = { message: 'insufficient funds for gas' }
      const parsed = parseContractError(error)

      expect(parsed.userMessage).toBe('Insufficient funds in your wallet.')
    })

    it('should handle unknown errors gracefully', () => {
      const error = { message: 'Some unknown error' }
      const parsed = parseContractError(error)

      expect(parsed.name).toBe('Unknown')
      expect(parsed.userMessage).toBe('Something went wrong. Please try again.')
    })

    it('should handle string errors', () => {
      const error = 'String error message'
      const parsed = parseContractError(error)

      expect(parsed.message).toBe('String error message')
    })
  })

  describe('isUserRejectedError', () => {
    it('should detect user rejection by message', () => {
      expect(isUserRejectedError({ message: 'User rejected the request' })).toBe(true)
      expect(isUserRejectedError({ message: 'User denied transaction' })).toBe(true)
      expect(isUserRejectedError({ reason: 'user rejected' })).toBe(true)
    })

    it('should detect user rejection by code', () => {
      expect(isUserRejectedError({ code: 4001 })).toBe(true)
    })

    it('should return false for non-rejection errors', () => {
      expect(isUserRejectedError({ message: 'Network error' })).toBe(false)
      expect(isUserRejectedError({ code: 500 })).toBe(false)
    })
  })

  describe('isNetworkError', () => {
    it('should detect network errors', () => {
      expect(isNetworkError({ message: 'Network connection failed' })).toBe(true)
      expect(isNetworkError({ message: 'Connection timeout' })).toBe(true)
      expect(isNetworkError({ code: -32603 })).toBe(true)
    })

    it('should return false for non-network errors', () => {
      expect(isNetworkError({ message: 'User rejected' })).toBe(false)
    })
  })

  describe('isInsufficientFundsError', () => {
    it('should detect insufficient funds errors', () => {
      expect(isInsufficientFundsError({ message: 'insufficient funds' })).toBe(true)
      expect(isInsufficientFundsError({ message: 'insufficient balance' })).toBe(true)
    })

    it('should return false for other errors', () => {
      expect(isInsufficientFundsError({ message: 'User rejected' })).toBe(false)
    })
  })

  describe('formatErrorForDisplay', () => {
    it('should format contract errors for display', () => {
      const error = { message: 'revert EventSoldOut(1)' }
      const formatted = formatErrorForDisplay(error)

      expect(formatted).toBe('This event is sold out. No more tickets available.')
    })

    it('should format user rejection for display', () => {
      const error = { message: 'User rejected the request' }
      const formatted = formatErrorForDisplay(error)

      expect(formatted).toBe('Transaction was cancelled by user.')
    })
  })

  describe('getErrorSeverity', () => {
    it('should return low severity for user rejections', () => {
      const error = { message: 'User rejected the request' }
      expect(getErrorSeverity(error)).toBe('low')
    })

    it('should return medium severity for network errors', () => {
      const error = { message: 'Network connection failed' }
      expect(getErrorSeverity(error)).toBe('medium')
    })

    it('should return medium severity for insufficient funds', () => {
      const error = { message: 'insufficient funds' }
      expect(getErrorSeverity(error)).toBe('medium')
    })

    it('should return high severity for contract errors', () => {
      const error = { message: 'revert EventNotFound(1)' }
      expect(getErrorSeverity(error)).toBe('high')
    })
  })
})
