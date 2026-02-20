import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble'

function formatDateSeparator(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function getDateKey(ts) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

export default function MessageFeed({ messages }) {
  const containerRef = useRef(null)
  const shouldAutoScroll = useRef(true)

  const handleScroll = () => {
    const el = containerRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    shouldAutoScroll.current = atBottom
  }

  useEffect(() => {
    if (shouldAutoScroll.current && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (!messages || messages.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No messages yet. Agents will post updates here.</span>
      </div>
    )
  }

  const items = []
  let lastDateKey = null
  for (const msg of messages) {
    const dk = getDateKey(msg.ts)
    if (dk !== lastDateKey) {
      items.push({ type: 'separator', date: msg.ts, key: 'sep-' + dk })
      lastDateKey = dk
    }
    items.push({ type: 'message', msg, key: msg.id || msg.ts })
  }

  return (
    <div ref={containerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
      {items.map((item) =>
        item.type === 'separator' ? (
          <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 12px' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDateSeparator(item.date)}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-color)' }} />
          </div>
        ) : (
          <MessageBubble key={item.key} message={item.msg} />
        )
      )}
    </div>
  )
}
