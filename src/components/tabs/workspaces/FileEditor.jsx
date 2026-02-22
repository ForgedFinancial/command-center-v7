import { useMemo, useState } from 'react'
import { formatFileSize } from './workspaceUtils'

function renderInline(line, keyPrefix) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={key}>{part.slice(2, -2)}</strong>
    }
    return <span key={key}>{part}</span>
  })
}

function MarkdownPreview({ content }) {
  const lines = content.split('\n')
  return (
    <div style={{ fontSize: '13px', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
      {lines.map((line, index) => {
        const key = `line-${index}`
        if (line.startsWith('# ')) {
          return <h1 key={key} style={{ fontSize: '20px', margin: '0 0 10px', color: 'var(--text-primary)' }}>{line.slice(2)}</h1>
        }
        if (line.startsWith('## ')) {
          return <h2 key={key} style={{ fontSize: '17px', margin: '10px 0 8px', color: 'var(--text-primary)' }}>{line.slice(3)}</h2>
        }
        if (line.startsWith('### ')) {
          return <h3 key={key} style={{ fontSize: '15px', margin: '8px 0 6px', color: 'var(--text-primary)' }}>{line.slice(4)}</h3>
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <div key={key} style={{ paddingLeft: '10px' }}>- {renderInline(line.slice(2), key)}</div>
        }
        if (!line.trim()) {
          return <div key={key} style={{ height: '8px' }} />
        }
        return <div key={key}>{renderInline(line, key)}</div>
      })}
    </div>
  )
}

export default function FileEditor({
  file,
  content,
  loading,
  saving,
  error,
  isDirty,
  remoteChanged,
  onChange,
  onSave,
  onDiscard,
  onClose,
  onReload,
}) {
  const [showPreview, setShowPreview] = useState(false)

  const modifiedText = useMemo(() => {
    if (!file?.lastModified) return '--'
    try {
      return new Date(file.lastModified).toLocaleString()
    } catch {
      return '--'
    }
  }, [file?.lastModified])

  if (!file) {
    return (
      <div
        className="glass-panel"
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
          fontSize: '14px',
        }}
      >
        Select a file from the tree to begin editing.
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div
        style={{
          borderBottom: '1px solid var(--border-color)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {file.filename}{isDirty ? ' *' : ''}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {file.path}
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {formatFileSize(file.size)} | {modifiedText}
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
          <button
            type="button"
            onClick={() => setShowPreview(value => !value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: showPreview ? 'var(--theme-accent-muted)' : 'transparent',
              color: showPreview ? 'var(--theme-accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            {showPreview ? 'Hide Preview' : 'Split Preview'}
          </button>
          <button
            type="button"
            onClick={onDiscard}
            disabled={!isDirty || saving}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: isDirty ? 'pointer' : 'not-allowed',
              opacity: isDirty ? 1 : 0.5,
              fontSize: '12px',
            }}
          >
            Discard
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!isDirty || saving}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--theme-accent)',
              background: isDirty ? 'var(--theme-accent)' : 'transparent',
              color: isDirty ? '#ffffff' : 'var(--text-muted)',
              cursor: isDirty ? 'pointer' : 'not-allowed',
              opacity: saving ? 0.7 : 1,
              fontSize: '12px',
              minWidth: '78px',
            }}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            Close
          </button>
        </div>
      </div>

      {remoteChanged && (
        <div
          style={{
            margin: '10px 14px 0',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'rgba(245,158,11,0.1)',
            color: 'var(--text-secondary)',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          This file changed on VPS.
          <button
            type="button"
            onClick={onReload}
            style={{
              marginLeft: 'auto',
              padding: '4px 8px',
              borderRadius: '4px',
              border: '1px solid rgba(245,158,11,0.4)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Reload
          </button>
        </div>
      )}

      {error && (
        <div
          style={{
            margin: '10px 14px 0',
            padding: '8px 10px',
            borderRadius: '6px',
            border: '1px solid rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.08)',
            color: '#ef4444',
            fontSize: '12px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, padding: '12px 14px 14px', gap: '10px' }}>
        <textarea
          value={content}
          onChange={(event) => onChange(event.target.value)}
          disabled={loading}
          spellCheck={false}
          placeholder={loading ? 'Loading file content...' : 'File content'}
          style={{
            flex: 1,
            minHeight: 0,
            resize: 'none',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--theme-bg-primary)',
            color: 'var(--text-primary)',
            padding: '14px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '12px',
            lineHeight: 1.6,
            outline: 'none',
            opacity: loading ? 0.7 : 1,
          }}
        />

        {showPreview && (
          <div
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--theme-bg-secondary)',
              padding: '14px',
            }}
          >
            <MarkdownPreview content={content} />
          </div>
        )}
      </div>
    </div>
  )
}
