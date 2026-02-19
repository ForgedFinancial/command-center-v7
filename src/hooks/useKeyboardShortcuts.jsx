import { useEffect, useState, useCallback } from 'react'

export function useKeyboardShortcuts({ onSwitchPipeline, onNewLead, onCloseModal, onFocusSearch }) {
  const [showHelp, setShowHelp] = useState(false)

  const handleKeyDown = useCallback((e) => {
    const tag = e.target.tagName
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable

    // Esc always works
    if (e.key === 'Escape') {
      if (showHelp) { setShowHelp(false); return }
      onCloseModal?.()
      return
    }

    if (isInput) return

    // ? = show help
    if (e.key === '?') {
      e.preventDefault()
      setShowHelp(v => !v)
      return
    }

    // / = focus search
    if (e.key === '/') {
      e.preventDefault()
      onFocusSearch?.()
      return
    }

    // N = new lead
    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault()
      onNewLead?.()
      return
    }

    // 1-7 = switch pipeline
    const num = parseInt(e.key)
    if (num >= 1 && num <= 7) {
      e.preventDefault()
      onSwitchPipeline?.(num - 1)
      return
    }
  }, [onSwitchPipeline, onNewLead, onCloseModal, onFocusSearch, showHelp])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return { showHelp, setShowHelp }
}

export function KeyboardShortcutOverlay({ onClose }) {
  const shortcuts = [
    ['1–7', 'Switch pipeline'],
    ['N', 'New lead'],
    ['Esc', 'Close modal'],
    ['/', 'Focus search'],
    ['?', 'Toggle this help'],
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '360px', background: 'var(--theme-surface)', borderRadius: '16px',
          border: '1px solid var(--theme-border)', padding: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
          ⌨️ Keyboard Shortcuts
        </h3>
        {shortcuts.map(([key, desc]) => (
          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--theme-border-subtle)' }}>
            <kbd style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
              background: 'var(--theme-bg)', border: '1px solid var(--theme-border)',
              color: 'var(--theme-text-primary)', fontFamily: 'monospace',
            }}>{key}</kbd>
            <span style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>{desc}</span>
          </div>
        ))}
        <button
          onClick={onClose}
          style={{
            marginTop: '16px', width: '100%', padding: '8px', borderRadius: '8px',
            border: '1px solid var(--theme-border)', background: 'transparent',
            color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
          }}
        >Close (Esc)</button>
      </div>
    </div>
  )
}
