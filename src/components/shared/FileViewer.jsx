import { useState, useEffect } from 'react'
import { syncClient } from '../../api/syncClient'
import { ENDPOINTS } from '../../config/api'

export default function FileViewer({ agentId, filename, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setContent(null)

    syncClient
      .getWorkspaceFile(agentId, filename)
      .then((data) => {
        if (!cancelled) {
          setContent(typeof data === 'string' ? data : JSON.stringify(data, null, 2))
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Unable to load file — API endpoint not connected. File will be available when the sync server is configured.'
          )
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [agentId, filename])

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '720px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <span style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
            📄 {filename}
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '13px',
            lineHeight: '1.6',
            color: 'var(--text-secondary)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              <div className="loading-spinner" style={{ margin: '0 auto 12px' }} />
              Loading...
            </div>
          )}
          {error && (
            <div
              style={{
                padding: '20px',
                borderRadius: '8px',
                background: 'rgba(255,160,0,0.08)',
                border: '1px solid rgba(255,160,0,0.2)',
                color: 'var(--text-muted)',
                fontSize: '14px',
                fontFamily: 'inherit',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          )}
          {content && content}
        </div>
      </div>
    </div>
  )
}
