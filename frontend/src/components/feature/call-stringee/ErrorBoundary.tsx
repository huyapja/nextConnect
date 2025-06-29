import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class CallErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('📞 [CallErrorBoundary] Call component crashed:', error, errorInfo)
    
    // Log error to toast for user feedback
    // Don't use toast here as it might cause more errors
  }

  public render() {
    if (this.state.hasError) {
      // Fallback UI
      return (
        this.props.fallback || (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div style={{
              backgroundColor: '#1f2937',
              padding: '40px',
              borderRadius: '20px',
              textAlign: 'center',
              maxWidth: '400px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
              <h3 style={{ 
                margin: '0 0 16px 0', 
                fontSize: '20px',
                fontWeight: '600'
              }}>
                Lỗi cuộc gọi
              </h3>
              <p style={{ 
                margin: '0 0 24px 0', 
                color: '#9ca3af',
                lineHeight: '1.5'
              }}>
                Đã xảy ra lỗi với cuộc gọi. Vui lòng thử lại.
              </p>
              <button
                onClick={() => {
                  // Reset error state
                  this.setState({ hasError: false, error: undefined })
                  // Close modal by dispatching event
                  window.location.reload()
                }}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Tải lại trang
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
} 