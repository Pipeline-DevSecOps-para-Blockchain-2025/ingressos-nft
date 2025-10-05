import React from 'react'
import Modal from './Modal'
import TransferTicket from './TransferTicket'
import type { TicketMetadata } from '../hooks/useUserTickets'

interface TransferTicketModalProps {
  isOpen: boolean
  ticket: TicketMetadata | null
  onClose: () => void
  onSuccess?: (transactionHash: string) => void
}

const TransferTicketModal: React.FC<TransferTicketModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onSuccess
}) => {
  if (!ticket) return null

  const handleSuccess = (transactionHash: string) => {
    onSuccess?.(transactionHash)
    // Don't auto-close to let user see success message
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="max-w-lg"
    >
      <TransferTicket
        ticket={ticket}
        onSuccess={handleSuccess}
        onCancel={onClose}
      />
    </Modal>
  )
}

export default TransferTicketModal