import { useState, useCallback } from 'react'

export default function RoomInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [handleSend])

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      gap: '8px',
    }}>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Message the team..."
        style={{
          flex: 1,
          resize: 'none',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)',
          border: `1px solid ${focused ? 'var(--accent)' : 'var(--border-color)'}`,
          borderRadius: '6px',
          padding: '8px 12px',
          fontSize: '14px',
          fontFamily: 'inherit',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
      />
      <button
        onClick={handleSend}
        disabled={!text.trim() || disabled}
        style={{
          backgroundColor: 'var(--accent)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          padding: '8px 16px',
          cursor: (!text.trim() || disabled) ? 'default' : 'pointer',
          fontWeight: 600,
          alignSelf: 'flex-end',
          opacity: (!text.trim() || disabled) ? 0.5 : 1,
          transition: 'opacity 0.15s',
        }}
      >
        Send
      </button>
    </div>
  )
}
