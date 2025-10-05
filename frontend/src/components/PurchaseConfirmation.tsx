import React from 'react'
import Modal from './Modal'
import PurchaseTicket from './PurchaseTicket'
import type { EventWithId } from '../hooks/useEvents'

interface PurchaseConfirmationProps {
  isOpen: boolean
  event: EventWithId | null
  onClose: () => void
  onSuccess?: (transactionHash: string, tokenId: number) => void
}

const PurchaseConfirmation: React.FC<PurchaseConfirmationProps> = ({
  isOpen,
  event,
  onClose,
  onSuccess
}) => {
  if (!event) return null

  const handleSuccess = (transactionHash: string, tokenId: number) => {
    onSuccess?.(transactionHash, tokenId)
    // Don't auto-close to let user see success message
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="max-w-md"
    >
      <PurchaseTicket
        event={event}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

export default PurchaseConfirmation