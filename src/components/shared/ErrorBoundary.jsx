import { Component } from 'react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0 }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
    this.setState((prev) => ({ errorCount: prev.errorCount + 1 }))
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env?.DEV
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '300px',
          gap: '16px',
          padding: '40px',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)', fontWeight: 600 }}>
            Something went wrong
          </h2>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '400px' }}>
            This section encountered an error. The rest of the app is still working.
          </p>
          {this.state.errorCount > 2 && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--status-error, #ef4444)' }}>
              This error has occurred {this.state.errorCount} times.
            </p>
          )}
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              backgroundColor: 'var(--accent, #00d4ff)',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            Try Again
          </button>
          {isDev && this.state.error && (
            <pre style={{
              margin: '16px 0 0',
              padding: '12px',
              fontSize: '11px',
              fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--status-error, #ef4444)',
              backgroundColor: 'var(--bg-tertiary, rgba(239,68,68,0.08))',
              borderRadius: '6px',
              maxWidth: '500px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}
            </pre>
          )}
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
