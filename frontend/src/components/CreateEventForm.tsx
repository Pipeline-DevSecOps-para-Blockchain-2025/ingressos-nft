import React, { useState } from 'react'
import type { CreateEventParams } from '../hooks/useOrganizerEvents'

interface CreateEventFormProps {
  onSubmit: (params: CreateEventParams) => Promise<void>
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  onSubmit,
  onCancel,
  isLoading = false,
  className = ''
}) => {
  const [formData, setFormData] = useState<CreateEventParams>({
    name: '',
    description: '',
    date: new Date(),
    venue: '',
    ticketPrice: '',
    maxSupply: 100,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof CreateEventParams, string>>>({})

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CreateEventParams, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Event name is required'
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Event description is required'
    }

    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required'
    }

    if (!formData.ticketPrice || parseFloat(formData.ticketPrice) <= 0) {
      newErrors.ticketPrice = 'Valid ticket price is required'
    }

    if (formData.maxSupply <= 0) {
      newErrors.maxSupply = 'Max supply must be greater than 0'
    }

    if (formData.date <= new Date()) {
      newErrors.date = 'Event date must be in the future'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    try {
      await onSubmit(formData)
      // Reset form on success
      setFormData({
        name: '',
        description: '',
        date: new Date(),
        venue: '',
        ticketPrice: '',
        maxSupply: 100,
      })
      setErrors({})
    } catch (error) {
      console.error('Error creating event:', error)
    }
  }

  const handleInputChange = (field: keyof CreateEventParams, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  return (
    <div className={`bg-white rounded-lg p-6 ${className}`}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create New Event
        </h2>
        <p className="text-gray-600">
          Fill in the details to create a new ticketed event
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Event Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Event Name *
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter event name"
            disabled={isLoading}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Describe your event"
            disabled={isLoading}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        {/* Date and Venue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
              Event Date & Time *
            </label>
            <input
              type="datetime-local"
              id="date"
              value={formatDateForInput(formData.date)}
              onChange={(e) => handleInputChange('date', new Date(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.date ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={isLoading}
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date}</p>
            )}
          </div>

          <div>
            <label htmlFor="venue" className="block text-sm font-medium text-gray-700 mb-2">
              Venue *
            </label>
            <input
              type="text"
              id="venue"
              value={formData.venue}
              onChange={(e) => handleInputChange('venue', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.venue ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Event venue"
              disabled={isLoading}
            />
            {errors.venue && (
              <p className="mt-1 text-sm text-red-600">{errors.venue}</p>
            )}
          </div>
        </div>

        {/* Ticket Price and Max Supply */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="ticketPrice" className="block text-sm font-medium text-gray-700 mb-2">
              Ticket Price (ETH) *
            </label>
            <input
              type="number"
              id="ticketPrice"
              value={formData.ticketPrice}
              onChange={(e) => handleInputChange('ticketPrice', e.target.value)}
              step="0.001"
              min="0"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.ticketPrice ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.05"
              disabled={isLoading}
            />
            {errors.ticketPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.ticketPrice}</p>
            )}
          </div>

          <div>
            <label htmlFor="maxSupply" className="block text-sm font-medium text-gray-700 mb-2">
              Max Tickets *
            </label>
            <input
              type="number"
              id="maxSupply"
              value={formData.maxSupply}
              onChange={(e) => handleInputChange('maxSupply', parseInt(e.target.value) || 0)}
              min="1"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.maxSupply ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="100"
              disabled={isLoading}
            />
            {errors.maxSupply && (
              <p className="mt-1 text-sm text-red-600">{errors.maxSupply}</p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? 'Creating Event...' : 'Create Event'}
          </button>
          
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default CreateEventForm