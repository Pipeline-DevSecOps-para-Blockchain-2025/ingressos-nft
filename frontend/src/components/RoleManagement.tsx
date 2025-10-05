import React, { useState } from 'react'
import { useIngressosContract } from '../hooks/useIngressosContract'
import { useTransactionHandler } from '../hooks/useTransactionHandler'
import type { Address } from 'viem'

interface RoleManagementProps {
  className?: string
}

interface RoleAction {
  address: string
  action: 'grant' | 'revoke'
  role: 'organizer'
}

const RoleManagement: React.FC<RoleManagementProps> = ({
  className = ''
}) => {
  const { grantOrganizerRole, revokeOrganizerRole } = useIngressosContract()
  const {
    executeTransaction,
    isExecuting,
    executionError,
    transaction,
    isPending,
    isConfirming,
    isConfirmed,
    isFailed,
    resetTransaction
  } = useTransactionHandler()

  const [address, setAddress] = useState('')
  const [addressError, setAddressError] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<RoleAction | null>(null)

  // Real organizers data - we'll need to implement a hook to fetch this
  const [organizers] = useState<Address[]>([
    // This should be fetched from the contract using hasRole
    // For now, let's add your address since you just granted yourself the role
    '0xf8A28aD8194384c64f1CC078dB77C4EaeC3A8091',
  ])

  const validateAddress = (addr: string): boolean => {
    if (!addr) {
      setAddressError('Address is required')
      return false
    }

    if (!addr.startsWith('0x')) {
      setAddressError('Address must start with 0x')
      return false
    }

    if (addr.length !== 42) {
      setAddressError('Address must be 42 characters long')
      return false
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      setAddressError('Invalid address format')
      return false
    }

    setAddressError(null)
    return true
  }

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim()
    setAddress(value)

    if (value) {
      validateAddress(value)
    } else {
      setAddressError(null)
    }
  }

  const handleGrantRole = async () => {
    if (!validateAddress(address)) {
      return
    }

    setPendingAction({ address, action: 'grant', role: 'organizer' })

    try {
      await executeTransaction(
        grantOrganizerRole,
        [address as Address],
        {
          onSuccess: (hash) => {
            console.log('Grant role transaction submitted:', hash)
            setAddress('')
            setPendingAction(null)
          },
          onError: (error) => {
            console.error('Grant role failed:', error)
            setPendingAction(null)
          }
        }
      )
    } catch (error) {
      setPendingAction(null)
    }
  }

  const handleRevokeRole = async (targetAddress: Address) => {
    setPendingAction({ address: targetAddress, action: 'revoke', role: 'organizer' })

    try {
      await executeTransaction(
        revokeOrganizerRole,
        [targetAddress],
        {
          onSuccess: (hash) => {
            console.log('Revoke role transaction submitted:', hash)
            setPendingAction(null)
          },
          onError: (error) => {
            console.error('Revoke role failed:', error)
            setPendingAction(null)
          }
        }
      )
    } catch (error) {
      setPendingAction(null)
    }
  }

  const isProcessing = isExecuting || isPending || isConfirming

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Grant Organizer Role */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Grant Organizer Role
        </h3>
        <p className="text-gray-600 mb-4">
          Grant organizer permissions to allow users to create and manage events.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="grantAddress" className="block text-sm font-medium text-gray-700 mb-2">
              Wallet Address
            </label>
            <input
              type="text"
              id="grantAddress"
              value={address}
              onChange={handleAddressChange}
              placeholder="0x..."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm ${addressError ? 'border-red-300' : 'border-gray-300'
                }`}
              disabled={isProcessing}
            />
            {addressError && (
              <p className="mt-1 text-sm text-red-600">{addressError}</p>
            )}
          </div>

          <button
            onClick={handleGrantRole}
            disabled={!address || !!addressError || isProcessing}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isProcessing && pendingAction?.action === 'grant' ? 'Granting...' : 'Grant Organizer Role'}
          </button>
        </div>
      </div>

      {/* Current Organizers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Current Organizers
        </h3>
        <p className="text-gray-600 mb-4">
          Users with organizer permissions can create and manage events.
        </p>

        {organizers.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">👥</div>
            <p className="text-gray-600">No organizers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {organizers.map((organizerAddress) => (
              <div
                key={organizerAddress}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="font-mono text-sm text-gray-900">
                    {organizerAddress}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Organizer Role
                  </p>
                </div>
                <button
                  onClick={() => handleRevokeRole(organizerAddress)}
                  disabled={isProcessing}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isProcessing && pendingAction?.address === organizerAddress && pendingAction?.action === 'revoke'
                    ? 'Revoking...'
                    : 'Revoke'
                  }
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transaction Status */}
      {(isProcessing || isConfirmed || isFailed) && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Transaction Status
          </h3>

          {isProcessing && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Processing role management transaction...
            </div>
          )}

          {isConfirmed && (
            <div className="text-green-600">
              ✅ Role management transaction confirmed!
              {transaction.hash && (
                <div className="mt-2 text-xs font-mono break-all">
                  {transaction.hash}
                </div>
              )}
            </div>
          )}

          {isFailed && (
            <div className="text-red-600">
              ❌ Transaction failed: {executionError?.message}
              <button
                onClick={resetTransaction}
                className="ml-2 text-sm underline hover:no-underline"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default RoleManagement