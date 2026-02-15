import { useEffect } from 'react'

/**
 * Individual toast notification
 * Types: success, error, warning, info
 * Auto-dismisses after 8 seconds
 */
const typeStyles = {
  success: {
    borderColor: 'var(--status-online)',
    icon: '\u2713', // checkmark
  },
  error: {
    borderColor: 'var(--status-error)',
    icon: '\u2717', // X
  },
  warning: {
    borderColor: 'var(--status-busy)',
    icon: '\u26A0', // warning triangle
  },
  info: {
    borderColor: 'var(--accent)',
    icon: '\u2139', // info circle
  },
}

export function Toast({ id, type = 'info', message, onClose }) {
  const config = typeStyles[type] || typeStyles.info

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id)
    }, 8000)

    return () => clearTimeout(timer)
  }, [id, onClose])

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderLeft: `4px solid ${config.borderColor}`,
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.2s ease-out',
        minWidth: '280px',
        maxWidth: '400px',
      }}
    >
      <span
        style={{
          fontSize: '18px',
          color: config.borderColor,
          flexShrink: 0,
        }}
      >
        {config.icon}
      </span>
      <span
        style={{
          flex: 1,
          fontSize: '14px',
          color: 'var(--text-primary)',
        }}
      >
        {message}
      </span>
      <button
        onClick={() => onClose(id)}
        style={{
          background: 'none',
          border: 'none',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '16px',
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Close"
      >
        \u2715
      </button>
      <style>
        {`
          @keyframes slideIn {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </div>
  )
}

export default Toast
