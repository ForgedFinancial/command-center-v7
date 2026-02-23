import { useApp } from '../../context/AppContext'

/**
 * Full-width banner shown when connection is lost
 * Does NOT auto-dismiss - only clears when connection restored
 */
export function ConnectionBanner() {
  const { state } = useApp()

  // Only show when disconnected
  if (state.isConnected) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        padding: '10px 16px',
        backgroundColor: 'var(--status-error)',
        color: '#fff',
        textAlign: 'center',
        fontSize: '14px',
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: '#fff',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <span>Connection lost — retrying...</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        style={{
          color: '#fff',
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.7)',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '13px',
          cursor: 'pointer',
          textDecoration: 'underline',
        }}
      >
        Reconnect
      </button>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}
      </style>
    </div>
  )
}

export default ConnectionBanner
