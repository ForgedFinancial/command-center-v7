import { useRef, useEffect, useCallback } from 'react'
import MessageBubble from './MessageBubble'

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getDateKey(ts) {
  return new Date(ts).toDateString()
}

export default function MessageFeed({ messages }) {
  const containerRef = useRef(null)
  const shouldAutoScroll = useRef(true)

  const handleScroll = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    shouldAutoScroll.current = atBottom
  }, [])

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: '14px',
      }}>
        No messages yet. Agents will post updates here.
      </div>
    )
  }

  const sorted = [...messages].sort((a, b) => new Date(a.ts) - new Date(b.ts))

  let lastDateKey = null

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}
    >
      {sorted.map((msg, i) => {
        const dateKey = getDateKey(msg.ts)
        let separator = null
        if (dateKey !== lastDateKey) {
          lastDateKey = dateKey
          separator = (
            <div key={'sep-' + i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              margin: '16px 0 12px',
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {formatDateSeparator(msg.ts)}
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            </div>
          )
        }
        return (
          <div key={msg.id || i}>
            {separator}
            <MessageBubble message={msg} />
          </div>
        )
      })}
    </div>
  )
}
