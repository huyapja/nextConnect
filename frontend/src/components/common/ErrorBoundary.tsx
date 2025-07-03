import React, { Component, ReactNode } from 'react'
import { TiWarning } from 'react-icons/ti'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg min-h-[200px]">
          <TiWarning className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Đã xảy ra lỗi
          </h2>
          <p className="text-sm text-red-600 dark:text-red-300 text-center mb-4">
            Có lỗi không mong muốn xảy ra. Vui lòng tải lại trang hoặc thử lại sau.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Tải lại trang
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 w-full">
              <summary className="cursor-pointer text-sm text-red-600 dark:text-red-400">
                Chi tiết lỗi (Development)
              </summary>
              <pre className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs overflow-auto max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary 