import { useState, useCallback, useRef, useEffect } from 'react'

const AGENTS = ['clawd', 'kyle', 'soren', 'mason', 'sentinel']

const AGENT_ICONS = {
  clawd:    '🔨',
  kyle:     '🖥️',
  soren:    '📐',
  mason:    '⚒️',
  sentinel: '🔍',
}

export default function RoomInput({ onSend, disabled }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const [mention, setMention] = useState(null) // { query, start }
  const [selectedIdx, setSelectedIdx] = useState(0)
  const textareaRef = useRef(null)

  // Detect @mention trigger
  const detectMention = useCallback((value, cursor) => {
    const before = value.slice(0, cursor)
    const match = before.match(/@(\w*)$/)
    if (match) {
      return { query: match[1].toLowerCase(), start: match.index }
    }
    return null
  }, [])

  const filteredAgents = mention
    ? AGENTS.filter(a => a.startsWith(mention.query))
    : []

  const handleChange = useCallback((e) => {
    const val = e.target.value
    const cursor = e.target.selectionStart
    setText(val)
    const m = detectMention(val, cursor)
    setMention(m)
    setSelectedIdx(0)
  }, [detectMention])

  const insertMention = useCallback((agent) => {
    if (!mention) return
    const before = text.slice(0, mention.start)
    const after = text.slice(textareaRef.current?.selectionStart || mention.start)
    const trimmedAfter = after.startsWith('@') ? after.slice(after.indexOf(' ') >= 0 ? 0 : after.length) : after
    const newText = `${before}@${agent} ${trimmedAfter.trimStart()}`
    setText(newText)
    setMention(null)
    // Restore focus
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + agent.length + 2
        textareaRef.current.focus()
        textareaRef.current.setSelectionRange(pos, pos)
      }
    }, 0)
  }, [text, mention])

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
    setMention(null)
  }, [text, disabled, onSend])

  const handleKeyDown = useCallback((e) => {
    if (mention && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => (i + 1) % filteredAgents.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => (i - 1 + filteredAgents.length) % filteredAgents.length)
        return
      }
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault()
        insertMention(filteredAgents[selectedIdx])
        return
      }
      if (e.key === 'Escape') {
        setMention(null)
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }, [mention, filteredAgents, selectedIdx, insertMention, handleSend])

  // Close dropdown on click outside
  useEffect(() => {
    const handler = (e) => {
      if (!textareaRef.current?.contains(e.target)) setMention(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      padding: '12px 16px',
      borderTop: '1px solid var(--border-color)',
      backgroundColor: 'var(--bg-secondary)',
      display: 'flex',
      gap: '8px',
      position: 'relative',
    }}>
      {/* @mention dropdown */}
      {mention && filteredAgents.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '16px',
          marginBottom: '4px',
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          zIndex: 100,
          minWidth: '180px',
        }}>
          <div style={{
            padding: '6px 10px 4px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            borderBottom: '1px solid var(--border-color)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Mention Agent
          </div>
          {filteredAgents.map((agent, i) => (
            <div
              key={agent}
              onMouseDown={(e) => { e.preventDefault(); insertMention(agent) }}
              style={{
                padding: '8px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                backgroundColor: i === selectedIdx ? 'var(--bg-tertiary)' : 'transparent',
                transition: 'background-color 0.1s',
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <span style={{ fontSize: '16px' }}>{AGENT_ICONS[agent]}</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)', fontSize: '13px' }}>
                @{agent}
              </span>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        rows={2}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Message the team... (@mention to route)"
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
