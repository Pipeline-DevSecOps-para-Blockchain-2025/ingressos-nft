import { useEffect, useCallback, useRef } from 'react'

interface UseKeyboardNavigationOptions {
  onEscape?: () => void
  onEnter?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onArrowLeft?: () => void
  onArrowRight?: () => void
  onTab?: (event: KeyboardEvent) => void
  enabled?: boolean
  preventDefault?: boolean
}

export const useKeyboardNavigation = (options: UseKeyboardNavigationOptions = {}) => {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    enabled = true,
    preventDefault = true
  } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return

    switch (event.key) {
      case 'Escape':
        if (onEscape) {
          if (preventDefault) event.preventDefault()
          onEscape()
        }
        break
      case 'Enter':
        if (onEnter) {
          if (preventDefault) event.preventDefault()
          onEnter()
        }
        break
      case 'ArrowUp':
        if (onArrowUp) {
          if (preventDefault) event.preventDefault()
          onArrowUp()
        }
        break
      case 'ArrowDown':
        if (onArrowDown) {
          if (preventDefault) event.preventDefault()
          onArrowDown()
        }
        break
      case 'ArrowLeft':
        if (onArrowLeft) {
          if (preventDefault) event.preventDefault()
          onArrowLeft()
        }
        break
      case 'ArrowRight':
        if (onArrowRight) {
          if (preventDefault) event.preventDefault()
          onArrowRight()
        }
        break
      case 'Tab':
        if (onTab) {
          onTab(event)
        }
        break
    }
  }, [enabled, preventDefault, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab])

  useEffect(() => {
    if (enabled) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}

// Hook for managing focus within a container
export const useFocusManagement = (containerRef: React.RefObject<HTMLElement>) => {
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    return Array.from(containerRef.current.querySelectorAll(focusableSelectors))
  }, [containerRef])

  const focusFirst = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[0].focus()
    }
  }, [getFocusableElements])

  const focusLast = useCallback(() => {
    const elements = getFocusableElements()
    if (elements.length > 0) {
      elements[elements.length - 1].focus()
    }
  }, [getFocusableElements])

  const trapFocus = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const elements = getFocusableElements()
    if (elements.length === 0) return

    const firstElement = elements[0]
    const lastElement = elements[elements.length - 1]
    const activeElement = document.activeElement as HTMLElement

    if (event.shiftKey) {
      // Shift + Tab
      if (activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      }
    } else {
      // Tab
      if (activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
  }, [getFocusableElements])

  return {
    focusFirst,
    focusLast,
    trapFocus,
    getFocusableElements
  }
}
