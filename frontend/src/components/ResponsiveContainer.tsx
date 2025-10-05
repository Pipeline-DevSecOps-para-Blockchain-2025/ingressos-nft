import React from 'react'
import { useBreakpoint } from '../hooks/useMediaQuery'

interface ResponsiveContainerProps {
  children: React.ReactNode
  className?: string
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
  padding?: boolean
}

const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = true
}) => {
  const breakpoint = useBreakpoint()

  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm': return 'max-w-sm'
      case 'md': return 'max-w-md'
      case 'lg': return 'max-w-lg'
      case 'xl': return 'max-w-xl'
      case '2xl': return 'max-w-2xl'
      case 'full': return 'max-w-full'
      default: return 'max-w-xl'
    }
  }

  const getPaddingClass = () => {
    if (!padding) return ''
    
    switch (breakpoint) {
      case 'xs':
      case 'sm':
        return 'px-4 py-6'
      case 'md':
        return 'px-6 py-8'
      case 'lg':
      case 'xl':
        return 'px-8 py-10'
      default:
        return 'px-4 py-6'
    }
  }

  return (
    <div className={`mx-auto ${getMaxWidthClass()} ${getPaddingClass()} ${className}`}>
      {children}
    </div>
  )
}

export default ResponsiveContainer