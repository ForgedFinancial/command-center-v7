import { useState, useEffect } from 'react'
import { syncClient } from '../../api/syncClient'

function renderContent(text) {
  const lines = text.split('\n')
  return lines.map((line, i) => {
    if (!line) return <div key={i} style={{ height: '8px' }} />

    if (line.startsWith('#')) {
      const text = line.replace(/^#+\s*/, '')
      return (
        <div key={i} style={{ color: '#00d4ff', fontWeight: '700', fontSize: '14px', lineHeight: '1.8', marginTop: '8px' }}>
          {text}
        </div>
      )
    }

    const parts = line.split(/(\*\*[^*]+\*\*)/)
    return (
      <div key={i} style={{ fontSize: '13px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <span key={j} style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{part.slice(2, -2)}</span>
          }
          return <span key={j}>{part}</span>
        })}
      </div>
    )
  })
}

export default function FileViewer({ agentId, filename, isLog, onClose }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!agentId || !filename) return
    setLoading(true)
    setError(null)

    const endpoint = isLog
      ? `/api/agents/${agentId}/logs/${filename}`
      : `/api/workspace/${agentId}/${filename}`

    syncClient.request(endpoint)
      .then(data => setContent(data?.content || null))
      .catch(err => setError(err?.message || 'Failed to load file'))
      .finally(() => setLoading(false))
  }, [agentId, filename, isLog])

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
            wordBreak: 'break-word',
          }}
        >
          {loading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Loading…
            </div>
          ) : error ? (
            <div
              style={{
                padding: '20px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: '#ef4444',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              {error}
            </div>
          ) : content ? renderContent(content) : (
            <div
              style={{
                padding: '20px',
                borderRadius: '8px',
                background: 'rgba(255,160,0,0.08)',
                border: '1px solid rgba(255,160,0,0.2)',
                color: 'var(--text-muted)',
                fontSize: '14px',
                textAlign: 'center',
              }}
            >
              No preview available for this file.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
