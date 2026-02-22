import { useEffect, useMemo, useState } from 'react'

export default function AgentSuggestionModal({ open, text, loading, onApply, onRegenerate, onClose }) {
  const [visible, setVisible] = useState('')
  const [i, setI] = useState(0)

  useEffect(() => {
    if (!open) return
    setVisible('')
    setI(0)
  }, [open, text])

  useEffect(() => {
    if (!open || !text) return
    if (i >= text.length) return
    const t = setTimeout(() => {
      setVisible(v => v + text[i])
      setI(v => v + 1)
    }, 20)
    return () => clearTimeout(t)
  }, [open, text, i])

  const cursor = useMemo(() => (loading || i < (text?.length || 0) ? '▋' : ''), [loading, i, text])
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(7,9,15,0.85)', backdropFilter: 'blur(20px)' }}>
      <div style={{ width: 640, maxWidth: 'calc(100% - 32px)', margin: '80px auto 0', background: '#0E1320', border: '1px solid rgba(0,212,255,0.3)', boxShadow: '0 0 40px rgba(0,212,255,0.15)', borderRadius: 14, padding: 18 }}>
        <button onClick={onClose} style={{ float: 'right', background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>✕</button>
        <div style={{ color: '#E2E8F0', fontWeight: 600, marginBottom: 8 }}>Analyzing project...</div>
        <div style={{ minHeight: 140, whiteSpace: 'pre-wrap', color: '#E2E8F0', fontSize: 13 }}>{visible}{cursor}</div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button onClick={onApply} style={{ background: '#00D4FF', color: '#031018', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Apply Suggestion</button>
          <button onClick={onRegenerate} style={{ background: 'transparent', color: '#94A3B8', border: '1px solid rgba(148,163,184,0.24)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>Regenerate</button>
        </div>
      </div>
    </div>
  )
}
