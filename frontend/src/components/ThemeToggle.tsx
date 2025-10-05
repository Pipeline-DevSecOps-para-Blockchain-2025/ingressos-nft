import React from 'react'
import { useTheme } from '../hooks/useTheme'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = false
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme()

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
  }

  const getIcon = (themeType: 'light' | 'dark' | 'system') => {
    switch (themeType) {
      case 'light':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        )
      case 'dark':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )
      case 'system':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  if (showLabel) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-600 dark:text-gray-400">Theme:</span>
        <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {(['light', 'dark', 'system'] as const).map((themeOption) => (
            <button
              key={themeOption}
              onClick={() => handleThemeChange(themeOption)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                theme === themeOption
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label={`Switch to ${themeOption} theme`}
            >
              {getIcon(themeOption)}
              <span className="capitalize">{themeOption}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        const nextTheme = resolvedTheme === 'light' ? 'dark' : 'light'
        handleThemeChange(nextTheme)
      }}
      className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${className}`}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} theme`}
    >
      {getIcon(resolvedTheme)}
    </button>
  )
}

export default ThemeToggle
