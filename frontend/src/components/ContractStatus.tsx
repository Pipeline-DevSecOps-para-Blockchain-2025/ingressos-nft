import React from 'react'
import { useIngressosContract } from '../hooks/useIngressosContract'
import { useWallet } from '../hooks/useWallet'
import { CONTRACT_ROLES } from '../contracts'

const ContractStatus: React.FC = () => {
  const { contractAddress, isContractReady, hasRole, getNextEventId } = useIngressosContract()
  const { address, isConnected } = useWallet()

  // Check if user has organizer role
  const organizerRoleCheck = hasRole(CONTRACT_ROLES.ORGANIZER_ROLE as `0x${string}`, address as `0x${string}`)
  const adminRoleCheck = hasRole(CONTRACT_ROLES.ADMIN_ROLE as `0x${string}`, address as `0x${string}`)
  const nextEventIdQuery = getNextEventId()

  if (!isConnected) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-800 mb-2">Contract Status</h3>
        <p className="text-gray-600">Connect your wallet to view contract status</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h3 className="font-medium text-gray-800 mb-4">Smart Contract Status</h3>
      
      <div className="space-y-3">
        {/* Contract Address */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Contract Address:</span>
          <span className="text-sm font-mono">
            {contractAddress ? (
              <span className="text-green-600">{contractAddress.slice(0, 10)}...{contractAddress.slice(-8)}</span>
            ) : (
              <span className="text-red-600">Not deployed</span>
            )}
          </span>
        </div>

        {/* Contract Ready Status */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Contract Ready:</span>
          <span className={`text-sm font-medium ${isContractReady ? 'text-green-600' : 'text-red-600'}`}>
            {isContractReady ? '✅ Ready' : '❌ Not Ready'}
          </span>
        </div>

        {/* Next Event ID */}
        {isContractReady && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Next Event ID:</span>
            <span className="text-sm font-medium">
              {nextEventIdQuery.isLoading ? (
                'Loading...'
              ) : nextEventIdQuery.error ? (
                'Error'
              ) : (
                nextEventIdQuery.data?.toString() || 'N/A'
              )}
            </span>
          </div>
        )}

        {/* User Roles */}
        {isContractReady && address && (
          <>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Admin Role:</span>
              <span className={`text-sm font-medium ${adminRoleCheck.data ? 'text-green-600' : 'text-gray-400'}`}>
                {adminRoleCheck.isLoading ? 'Checking...' : adminRoleCheck.data ? '✅ Yes' : '❌ No'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Organizer Role:</span>
              <span className={`text-sm font-medium ${organizerRoleCheck.data ? 'text-green-600' : 'text-gray-400'}`}>
                {organizerRoleCheck.isLoading ? 'Checking...' : organizerRoleCheck.data ? '✅ Yes' : '❌ No'}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Contract Integration Status */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isContractReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {isContractReady ? 'Smart contract integration active' : 'Smart contract not available'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default ContractStatus