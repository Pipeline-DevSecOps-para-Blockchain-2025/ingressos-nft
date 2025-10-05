import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
    onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
    hasError: boolean
    error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo)
        this.props.onError?.(error, errorInfo)
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null })
    }

    private handleReload = () => {
        window.location.reload()
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback
            }

            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                        <div className="text-red-600 mb-4">
                            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>

                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                            Something went wrong
                        </h2>

                        <p className="text-gray-600 mb-6">
                            We encountered an unexpected error. Please try again or reload the page.
                        </p>

                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-medium text-gray-900 mb-2">Error Details:</h3>
                                <pre className="text-xs text-gray-700 overflow-auto">
                                    {this.state.error.message}
                                </pre>
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={this.handleRetry}
                                className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                Try Again
                            </button>
                            <button
                                onClick={this.handleReload}
                                className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Reload Page
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
