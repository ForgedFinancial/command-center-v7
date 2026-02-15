import React, { Component } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppProvider } from './context/AppContext'
import './index.css'

// Top-level error boundary — cannot use AppContext (it wraps the provider)
class RootErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('RootErrorBoundary caught:', error, errorInfo)
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
          height: '100vh',
          gap: '16px',
          padding: '40px',
          backgroundColor: '#0a0e1a',
          color: '#94a3b8',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}>
          <div style={{ fontSize: '48px' }}>💥</div>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#e2e8f0', fontWeight: 600 }}>
            Application Error
          </h2>
          <p style={{ margin: 0, fontSize: '13px', textAlign: 'center', maxWidth: '400px' }}>
            The application failed to load. This is likely a critical error.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#0a0e1a',
              backgroundColor: '#00d4ff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
          {isDev && this.state.error && (
            <pre style={{
              margin: '16px 0 0',
              padding: '12px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#ef4444',
              backgroundColor: 'rgba(239,68,68,0.08)',
              borderRadius: '6px',
              maxWidth: '500px',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {this.state.error.message}{'\n'}{this.state.error.stack}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <AppProvider>
        <App />
      </AppProvider>
    </RootErrorBoundary>
  </React.StrictMode>
)
