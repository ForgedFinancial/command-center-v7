import { useEffect, useCallback } from 'react'

export default function Modal({ isOpen, onClose, title, width = 640, children, footer }) {
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--theme-modal-overlay)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: `${width}px`,
          maxWidth: '90vw',
          maxHeight: '80vh',
          backgroundColor: 'var(--theme-surface)',
          borderRadius: '16px',
          border: '1px solid var(--theme-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 24px 48px var(--theme-shadow)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--theme-border-subtle)',
          flexShrink: 0,
        }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--theme-text-secondary)',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              lineHeight: 1,
            }}
            onMouseOver={(e) => { e.target.style.color = 'var(--theme-text-primary)'; e.target.style.backgroundColor = 'var(--theme-surface-hover)' }}
            onMouseOut={(e) => { e.target.style.color = 'var(--theme-text-secondary)'; e.target.style.backgroundColor = 'transparent' }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--theme-border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
            flexShrink: 0,
          }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
